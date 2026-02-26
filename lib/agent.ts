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

import { searchSemantic } from "./langchain/pinecone";

// --- Main Agent Loop (Simulated Graph) ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log("[Agent] Session starting for query:", input);
    try {
        // Step 1: Lightning Fast Hybrid Knowledge Retrieval
        const [keywordDocs, semanticDocs] = await Promise.all([
            searchPageIndex(input),
            searchSemantic(input, 5)
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

        // Extreme Context Truncation for Latency Optimization
        let context = formatPageIndexContext(uniqueDocs);
        if (context.length > 5000) {
            context = context.slice(0, 5000) + "\n...[truncated for speed]";
        }

        const sources = uniqueDocs.map(d => `${d.metadata.source}${d.metadata.title ? ` - ${d.metadata.title}` : ""}`);
        const uniqueSources = Array.from(new Set(sources));


        // Step 2: Direct Streaming Response
        const model = getChatModel();
        const prompt = `
            You are a Kidney Health Assistant. 
            
            TASK:
            1. Response Language: Answer strictly in the same language the user asked in.
            2. Content: Answer using ONLY the provided Guidelines.
            3. Citations: Use subtle inline citations [Source, Section].
            4. **EXTREME BREVITY**: 
               * For "What is..." or "Define..." questions: Provide ONLY 2-3 concise sentences.
               * NO HEADERS (###), NO SECTIONS, NO "According to...". 
               * Jump straight to the answer content.
            5. **SAFETY VERIFICATION**: You are medical AI. Rely solely on the provided context. Do NOT guess. If not in guidelines, say "Sorry, I don't know the answer for this question."
            
            USER QUESTION: ${input}
            GUIDELINES:
            ${context}
            
            Answer:
        `;


        const finalStream = await model.stream([new HumanMessage(prompt)]);
        for await (const chunk of finalStream) {
            if (chunk.content) {
                yield chunk.content as string;
            }
        }

        yield "\n\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        yield `I encountered a problem: ${globalError?.message || String(globalError)}`;
    }
}
