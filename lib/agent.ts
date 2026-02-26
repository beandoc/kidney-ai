import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";

// --- Types & State ---

interface AgentState {
    input: string;
    chatHistory: BaseMessage[];
    context: string;
    sources: string[];
    draftAnswer: string;
    verdict: "PASS" | "FAIL" | "RETRY" | "TERMINATE";
    feedback: string;
    iteration: number;
    patientData?: any;
    memory?: string[];
    thoughts?: string;
}

// --- Constants ---
const MAX_ITERATIONS = 1; // Simplified for high-speed hybrid RAG

// --- Node: Verifier (The Medical QA) ---
// Checks for correctness and hallucinations
async function verifierNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Verifier] Checking for inaccuracies...");
    try {
        const model = getChatModel();
        const prompt = `
    You are a Senior Medical Verification Agent (Reasoning Mode).
    
    CONTEXT: ${state.context}
    VITAL STATS: ${JSON.stringify(state.patientData)}
    DRAFT ANSWER: ${state.draftAnswer}
    
    TASK: Verify the answer against medical guidelines and the patient's specific health data.
    
    CRITICAL COST-SAVING RULE:
    If the DRAFT ANSWER is EXACTLY "Sorry, I don't know the answer for this question. Consult your nephrologist.", you MUST output the verdict as "PASS". Do not fail it.
    
    OUTPUT FORMAT:
    <thought>
    Detail your clinical reasoning here. Check if the draft correctly applied the patient's vitals to the guidelines. 
    Point out any inconsistencies or missing citations.
    </thought>
    
    JSON:
    {
      "verdict": "PASS" or "FAIL",
      "reasoning": "Audit summary."
    }
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);
        const text = response.content as string;

        // Extract Reasoning Block
        const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/);
        const thoughts = thoughtMatch ? thoughtMatch[1].trim() : "No reasoning provided.";

        let result = { verdict: "FAIL", reasoning: "Verification format error. Retrying for safety." };
        try {
            const jsonPart = text.includes("JSON:") ? text.split("JSON:")[1] : text;
            const stripped = jsonPart.replace(/```json|```/g, "").trim();
            result = JSON.parse(stripped);
        } catch (e) {
            console.warn("[Node: Verifier] JSON Parse fail, defaulting to FAIL for safety", e);
        }

        return {
            verdict: result.verdict === "PASS" ? "PASS" : "FAIL",
            feedback: result.reasoning,
            thoughts: thoughts
        };
    } catch (e: any) {
        console.error("[Node: Verifier] Global Error:", e);
        if (e?.message?.includes("429") || e?.status === 429) {
            throw e; // Rethrow quota limits to main agent loop
        }
        return { verdict: "FAIL", feedback: "Technical verification failure.", thoughts: "Safe failure due to internal error." };
    }
}

import { searchSemantic } from "./langchain/pinecone";

// --- Main Agent Loop (Simulated Graph) ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log("[Agent] Session starting for query:", input);
    try {
        // Step 0: Language Detection & Semantic Search Support
        yield "__STATUS__:🌐 Analyzing Query Language...\n";
        const languageModel = getChatModel();

        const languageAnalysis = await languageModel.invoke([
            new HumanMessage(`You are a language analyzer.
            USER QUERY: "${input}"
            
            TASK:
            1. Detect if this is English, Hindi (translated or Romanized), or Marathi (translated or Romanized).
            2. Provide a clean English medical search query for this input.
            
            Return ONLY a JSON object:
            {"originalLanguage": "English|Hindi|Marathi", "searchQuery": "english medical query"}`)
        ]);

        let searchInput = input;
        let originalLanguage = "English";

        try {
            const analysis = JSON.parse(languageAnalysis.content.toString().replace(/```json|```/g, "").trim());
            searchInput = analysis.searchQuery;
            originalLanguage = analysis.originalLanguage;
            console.log(`[Agent] Language: ${originalLanguage}, Search Query: ${searchInput}`);
        } catch (e) {
            console.warn("[Agent] Language analysis parse fail, falling back to raw input");
        }

        // Step 1: Hybrid Knowledge Retrieval (Consolidated Keyword + Semantic)
        yield "__STATUS__:📖 Scanning Guidelines (Hybrid Search)... \n";

        // Run both in parallel for speed
        const [keywordDocs, semanticDocs] = await Promise.all([
            searchPageIndex(searchInput),
            searchSemantic(searchInput, 5)
        ]);

        // Merge and deduplicate by source/title/content
        const allDocs = [...keywordDocs, ...semanticDocs];
        const seen = new Set();
        const uniqueDocs = allDocs.filter(doc => {
            const id = `${doc.metadata.source}-${doc.metadata.title}-${doc.pageContent.slice(0, 100)}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        console.log(`[Agent] Retrieval: ${keywordDocs.length} keywords, ${semanticDocs.length} semantic. Total unique: ${uniqueDocs.length}`);

        // Cap context
        let context = formatPageIndexContext(uniqueDocs);
        if (context.length > 26000) {
            context = context.slice(0, 26000) + "\n...[truncated for brevity]";
        }

        const sources = uniqueDocs.map(d => `${d.metadata.source}${d.metadata.title ? ` - ${d.metadata.title}` : ""}`);
        const uniqueSources = Array.from(new Set(sources));

        if (uniqueSources.length > 0) {
            yield `__SOURCES__:${JSON.stringify(uniqueSources)}\n`;
        }

        // Step 2: Initial Draft Generation
        yield "__STATUS__:✍️ Drafting Medical Answer...\n";

        const model = getChatModel();
        const prompt = `
            You are a Kidney Health Assistant. 
            
            TASK:
            1. Response Language: You MUST answer strictly in the SAME LANGUAGE as the user's question (detected as ${originalLanguage}). Use Devanagari script for Hindi/Marathi.
            2. Content: Answer using ONLY the provided Guidelines.
            3. Citations: You MUST use inline citations for EVERY medical fact you state. 
               Format: [Source Name, Section/Page] (e.g., [KDIGO 2024, Section 2.1]).
            4. Fallback: If the answer is not in the guidelines, say "Sorry, I don't know the answer for this question." in the user's language.
            5. Tone: Professional, direct, and concise.

            USER QUESTION: ${input}
            ENGLISH TRANSLATION: ${searchInput}
            GUIDELINES:
            ${context}
            
            Answer:
        `;

        const draftResponse = await model.invoke([new HumanMessage(prompt)]);
        const draftAnswer = draftResponse.content.toString();

        // Step 3: Verification Pass (The Safety Valve)
        yield "__STATUS__:🛡️ Verifying Safety & Accuracy...\n";

        const verificationState: AgentState = {
            input,
            chatHistory,
            context,
            sources: uniqueSources,
            draftAnswer,
            verdict: "RETRY",
            feedback: "",
            iteration: 0,
            patientData: {} // Empty for now, can be populated if we had user profiles
        };

        const audit = await verifierNode(verificationState);
        console.log(`[Agent] Verification: ${audit.verdict} - ${audit.feedback}`);

        if (audit.verdict === "FAIL") {
            yield "__STATUS__:⚠️ Refining Answer based on Medical Safety Audit...\n";
            const retryPrompt = `
                You are a Kidney Health Assistant. 
                Your previous answer failed a medical safety audit. 
                
                REASON FOR FAILURE: ${audit.feedback}
                LLM THOUGHTS: ${audit.thoughts}
                
                CRITICAL FIX: Please rewrite the answer addressing the feedback above. 
                Ensure it strictly follows the guidelines:
                ${context}
                
                Question: ${input}
                New Answer:
            `;
            const finalStream = await model.stream([new HumanMessage(retryPrompt)]);
            yield "__CLEAR_STATUS__\n";
            for await (const chunk of finalStream) {
                yield chunk.content as string;
            }
        } else {
            // PASS - Stream the original draft (we didn't stream it before to avoid hallucinations)
            yield "__CLEAR_STATUS__\n";
            // Since we already have the draftAnswer, we just yield it. 
            // To make it feel "streamy", we could split it or just send it.
            // But usually we prefer streaming from the start. 
            // IMPROVEMENT: In PASS case, we already have the answer.
            yield draftAnswer;
        }

        yield "\n\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        yield "__CLEAR_STATUS__\n";
        yield `I encountered a problem: ${globalError?.message || String(globalError)}`;
    }
}
