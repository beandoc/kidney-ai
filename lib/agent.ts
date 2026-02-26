import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import * as fs from "fs";
import * as path from "path";
import { getProfile } from "./memory";

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
const MAX_ITERATIONS = 2;

// --- Node 0: Router (Triage) ---
// Determines if the question is within the medical scope of the assistant
async function routerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Router] Triaging query...");
    try {
        const model = getChatModel();
        const prompt = `
    You are a Kidney Health Triage Agent.
    
    USER QUERY: ${state.input}
    
    TASK: Decide if this query is related to kidney health, general medical advice, or diet.
    If it is about weather, sports, politics, or general non-medical chat, reply with "TERMINATE".
    Otherwise, reply with "PROCEED".
    
    REPLY ONLY THE WORD.
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);
        const result = (response.content as string).trim().toUpperCase();
        console.log("[Node: Router] Result:", result);

        return {
            verdict: result === "TERMINATE" ? "TERMINATE" : "RETRY"
        };
    } catch (error: any) {
        console.error("[Node: Router] Error:", error);
        if (error?.message?.includes("429") || error?.status === 429) {
            throw error; // Rethrow quota limits to main agent loop
        }
        return { verdict: "RETRY" }; // Default to proceed if triage fails
    }
}

// --- Node 1: Clinical Data (Mock SQL Agent) ---
// Fetches records from a structured source (Phase 2, Node B)
async function patientNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Patient Data] Querying clinical database...");
    try {
        const filePath = path.join(process.cwd(), "knowledge_base", "patients.json");
        if (!fs.existsSync(filePath)) return { patientData: null };
        const patients = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // For demo, we assume the session belongs to pt-001
        return { patientData: patients[0]?.vitals || null };
    } catch (e) {
        console.error("[Node: Patient Data] Error:", e);
        return { patientData: null };
    }
}

// --- Node 2: Memory Retrieval (Mem0 Logic) ---
// Fetches long-term facts/allergies (Phase 3)
async function memoryNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Memory] Accessing patient medical profile...");
    try {
        const profile = getProfile("user-test");
        return { memory: profile.medicalFacts };
    } catch (e) {
        console.error("[Node: Memory] Error:", e);
        return { memory: [] };
    }
}

// --- Node 3: Researcher ---
// Finds info and drafts an answer
async function researcherNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log(`[Node: Researcher] Researching: ${state.input}`);
    try {
        // Decide what to search for (use the feedback if this is a retry)
        const searchQuery = state.feedback ? `Specifically find: ${state.feedback}` : state.input;

        const docs = await searchPageIndex(searchQuery);
        const newContext = formatPageIndexContext(docs);

        // Wait 1s between retrieval reasoning and draft generation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Extract unique sources for the UI
        const newSources = docs.map(d => `${d.metadata.source}${d.metadata.title ? ` - ${d.metadata.title}` : ""}`);
        const uniqueSources = Array.from(new Set([...state.sources, ...newSources]));

        // Combine with existing context to build a complete picture
        const combinedContext = state.context ? `${state.context}\n\n${newContext}` : newContext;

        const model = getChatModel();
        const prompt = `
    You are a Kidney Health Research Agent.
    
    USER QUESTION: ${state.input}
    
    RESOURCES: ${combinedContext}
    
    TASK: Answer the user's question USING ONLY the information provided in the RESOURCES block above.
    
    STRICT RULES:
    1. If the RESOURCES provided do not clearly contain the answer to the user's question, you MUST reply EXACTLY with: "Sorry, I don't know the answer for this question. Consult your nephrologist." Do not attempt to guess or use outside knowledge.
    2. Answer the question comprehensively based on the resources.
    3. Always cite sources from the text like this: [Source: Name].
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);

        return {
            context: combinedContext,
            sources: uniqueSources,
            draftAnswer: response.content as string,
            iteration: state.iteration + 1
        };
    } catch (error: any) {
        console.error("[Node: Researcher] Error:", error);
        if (error?.message?.includes("429") || error?.status === 429) {
            throw error; // Rethrow quota limits to main agent loop
        }
        return { draftAnswer: "I encountered an error while researching. Please try again.", iteration: state.iteration + 1 };
    }
}

// --- Node 4: Verifier (The Medical QA) ---
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

// --- Main Agent Loop (Simulated Graph) ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log("[Agent] Quick-Stream session for query:", input);
    let state: AgentState = {
        input,
        chatHistory,
        context: "",
        sources: [],
        draftAnswer: "",
        verdict: "RETRY",
        feedback: "",
        iteration: 0
    };

    try {
        // Step 1: Rapid Knowledge Retrieval (Consolidated)
        yield "__STATUS__:📖 Scanning Guidelines...\n";
        const docs = await searchPageIndex(input);
        // Cap context to ~4000 chars to stay within free-tier token limits
        let context = formatPageIndexContext(docs);
        if (context.length > 4000) {
            context = context.slice(0, 4000) + "\n...[truncated for brevity]";
        }
        const sources = docs.map(d => `${d.metadata.source}${d.metadata.title ? ` - ${d.metadata.title}` : ""}`);
        const uniqueSources = Array.from(new Set(sources));

        if (uniqueSources.length > 0) {
            yield `__SOURCES__:${JSON.stringify(uniqueSources)}\n`;
        }

        // Step 2: Streaming Answer Generation
        yield "__STATUS__:✍️ Drafting Answer...\n";
        yield "__CLEAR_STATUS__\n";

        const model = getChatModel();
        const prompt = `
            You are a Kidney Health Assistant. 
            Answer the user's question using ONLY the provided guidelines.
            If the answer is not in the guidelines, say: "Sorry, I don't know the answer for this question. Consult your nephrologist."
            Keep it professional and concise.

            QUESTION: ${input}
            GUIDELINES: ${context}
            
            Answer:
        `;

        const stream = await model.stream([new HumanMessage(prompt)]);
        let fullAnswer = "";

        for await (const chunk of stream) {
            const content = chunk.content as string;
            fullAnswer += content;
            yield content;
        }

        yield "\n\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        yield "__CLEAR_STATUS__\n";
        yield `I encountered a problem: ${globalError?.message || String(globalError)}`;
    }
}
