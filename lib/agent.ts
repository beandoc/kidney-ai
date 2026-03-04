import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery } from "./langchain/vectorStore";


import { searchSemantic } from "./langchain/pinecone";

/**
 * Extract medical context from recent chat history for follow-up queries.
 * Detects if the current query is a follow-up (short/vague) and prepends
 * the last known medical topic to improve retrieval.
 */
function buildContextAwareQuery(input: string, chatHistory: BaseMessage[]): string {
    const FOLLOWUP_INDICATORS = [
        "what about", "and the", "how about", "tell me more",
        "treatment", "symptoms", "causes", "diet", "medication",
        "what is the", "can you explain", "aur", "batao", "iske baare"
    ];
    const isFollowUp = input.split(/\s+/).length <= 6 ||
        FOLLOWUP_INDICATORS.some(f => input.toLowerCase().includes(f));

    if (!isFollowUp || chatHistory.length === 0) return input;

    // Scan the last 4 messages for medical keywords
    const MEDICAL_TOPICS = [
        "creatinine", "egfr", "gfr", "dialysis", "hemodialysis", "peritoneal",
        "ckd", "akd", "aki", "esrd", "kidney", "renal", "transplant",
        "potassium", "phosphorus", "sodium", "albumin", "proteinuria",
        "hypertension", "diabetes", "nephropathy", "glomerulonephritis",
        "nephrotic", "nephritic", "biopsy", "ultrasound", "anemia", "erythropoietin"
    ];

    const recentText = chatHistory
        .slice(-4)
        .map(m => (typeof m.content === "string" ? m.content : ""))
        .join(" ")
        .toLowerCase();

    const detectedTopics = MEDICAL_TOPICS.filter(t => recentText.includes(t));

    if (detectedTopics.length > 0) {
        const topicContext = detectedTopics.slice(0, 3).join(" ");
        console.log(JSON.stringify({ event: "ContextAwareQuery", originalQuery: input, injectedTopics: topicContext }));
        return `${topicContext} ${input}`;
    }
    return input;
}

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length }));
    try {
        // CONVERSATION-AWARE QUERY ENRICHMENT
        let enrichedInput = buildContextAwareQuery(input, chatHistory);

        // QUERY REFINEMENT (typo correction / normalization)
        let refinedInput = enrichedInput;
        if (enrichedInput.length > 5) {
            refinedInput = await refineQuery(enrichedInput);
        }

        // Step 1: Lightning Fast Hybrid Knowledge Retrieval
        const [keywordDocs, semanticDocs] = await Promise.all([
            searchPageIndex(refinedInput),
            searchSemantic(refinedInput, 5)
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

        // RERANKING STEP: Simple keyword overlap scoring 
        const queryTerms = refinedInput.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        uniqueDocs.forEach(doc => {
            const content = doc.pageContent.toLowerCase();
            let score = doc.metadata.score || 0; // Baseline from Pinecone if semantic
            queryTerms.forEach(term => {
                if (content.includes(term)) {
                    score += 0.5; // Bump score for direct keyword matches (cross-store reranking)
                }
            });
            doc.metadata.rerankScore = score;
        });

        // Sort effectively by our custom rerank scoring
        uniqueDocs.sort((a, b) => (b.metadata.rerankScore || 0) - (a.metadata.rerankScore || 0));

        console.log(JSON.stringify({
            event: "AgentRetrieval",
            query: refinedInput,
            keywordDocsCount: keywordDocs.length,
            semanticDocsCount: semanticDocs.length,
            totalUniqueDocs: uniqueDocs.length
        }));

        // Context Truncation for Latency Optimization
        let context = formatPageIndexContext(uniqueDocs);
        if (context.length > 15000) {
            context = context.slice(0, 15000) + "\n...[truncated]";
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
            
            GUIDELINES:
            ${context}
            
            USER QUESTION: ${refinedInput}
            
            Answer:
        `;

        const messages = [
            ...chatHistory,
            new HumanMessage(prompt)
        ];

        const finalStream = await model.stream(messages);
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
