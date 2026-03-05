import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";


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

/**
 * Pre-warms the agent's backend resources (LLM connections, Vector DB, Page Index).
 * This is called during the welcome message phase to eliminate cold starts.
 */
export async function prewarmAgent() {
    console.log(JSON.stringify({ event: "PrewarmStarted", status: "initializing_resources" }));
    try {
        await Promise.allSettled([
            getChatModel(), // Warm LLM provider connection
            searchSemantic("kidney", 1), // Warm Pinecone connection
            searchPageIndex("introduction") // Pre-load indexing metadata
        ]);
        console.log(JSON.stringify({ event: "PrewarmComplete", status: "ready" }));
    } catch (err) {
        console.error("Prewarm failed", err);
    }
}

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length }));

    // IMMEDIATE PULSE: Yield a space so the UI knows the server is alive
    yield " ";

    try {
        // CONVERSATION-AWARE QUERY ENRICHMENT
        const enrichedInput = buildContextAwareQuery(input, chatHistory);

        // STEP 1: PARALLEL RETRIEVAL & REFINEMENT
        // We start searching with the enriched input immediately.
        // For Hindi/Marathi, this might miss keyword hits, so we wait for Refinement to translate.
        const [keywordDocs, semanticDocs, refinedInput] = await Promise.all([
            searchPageIndex(enrichedInput),
            searchSemantic(enrichedInput, 8),
            refineQuery(enrichedInput)
        ]);

        let finalUniqueDocs = [];
        const isTranslated = refinedInput.toLowerCase() !== enrichedInput.toLowerCase();

        // If translated (Hindi -> English), we run a second quick targeted search
        let translatedDocs: any[] = [];
        if (isTranslated) {
            console.log(`[Agent] Cross-lingual search triggered: ${refinedInput}`);
            const [tKeyword, tSemantic] = await Promise.all([
                searchPageIndex(refinedInput),
                searchSemantic(refinedInput, 4)
            ]);
            translatedDocs = [...tKeyword, ...tSemantic];
        }

        // HYBRID MERGE: Reciprocal Rank Fusion (RRF)
        const K = 60;
        const rrfScores = new Map<string, number>();
        const docMap = new Map<string, any>();

        const applyRRF = (docs: any[], weight = 1.0) => {
            docs.forEach((doc, rank) => {
                const id = `${doc.metadata.source}-${doc.metadata.title}-${doc.pageContent.slice(0, 50)}`;
                docMap.set(id, doc);
                const currentScore = rrfScores.get(id) || 0;
                rrfScores.set(id, currentScore + (weight / (K + rank + 1)));
            });
        };

        applyRRF(keywordDocs, 1.0);
        applyRRF(semanticDocs, 1.2);
        if (translatedDocs.length > 0) {
            applyRRF(translatedDocs, 1.5); // Boost translated hits as they are likely high quality
        }

        // Sort unique docs by RRF score
        const uniqueDocs = Array.from(rrfScores.keys())
            .map(id => ({ id, score: rrfScores.get(id)! }))
            .sort((a, b) => b.score - a.score)
            .map(item => docMap.get(item.id)!);

        // STEP 1.2: CONDITIONAL RERANKING
        let finalDocs = uniqueDocs;
        if (uniqueDocs.length > 1) {
            const topCandidates = uniqueDocs.slice(0, 6);
            const remainingDocs = uniqueDocs.slice(6);
            finalDocs = [...await rerankDocuments(refinedInput, topCandidates), ...remainingDocs];
        }

        console.log(JSON.stringify({
            event: "AgentRetrievalComplete",
            query: refinedInput,
            totalUniqueDocs: uniqueDocs.length,
            usedReranking: uniqueDocs.length > 1
        }));

        // Context Truncation for Latency Optimization
        let context = formatPageIndexContext(finalDocs);
        if (context.length > 15000) {
            context = context.slice(0, 15000) + "\n...[truncated]";
        }

        // SMART SOURCE SHORTENING: Clean filenames for better readability
        // e.g., "KDIGO-2012-AKI-Guideline.pdf" -> "KDIGO 2012"
        const cleanSourceName = (name: string) => {
            return name
                .replace(/\.(pdf|md|docx|txt)$/i, "")
                .replace(/-Guideline-English|-English|-Guideline/i, "")
                .replace(/-/g, " ")
                .replace(/AKI|CKD|AKI Trial/gi, "") // Remove redundant acronyms if present in filename
                .trim();
        };

        const sources = uniqueDocs.map(d => cleanSourceName(d.metadata.source));
        const uniqueSources = Array.from(new Set(sources));

        // Step 2: Direct Streaming Response
        const model = getChatModel();
        const prompt = `
            You are a Kidney Health Assistant. 
            
            TASK:
            1. Language: Answer strictly in the same language as the USER QUESTION (Hindi, Marathi, or English).
            2. Content: Answer using ONLY the provided Guidelines.
            3. Citations: Use subtle inline citations like *[Source: KDIGO 2012]*. 
               * ONLY use sources from this list: ${uniqueSources.join(", ")}
            4. **EXTREME BREVITY**: 
               * Maximum 2-3 concise sentences.
            5. **SAFETY**: If not in guidelines, say "Sorry, I don't know the answer for this."
            
            GUIDELINES:
            ${context}
            
            USER QUESTION: ${input}
            
            Answer:
        `;

        const messages = [
            ...chatHistory,
            new HumanMessage(prompt)
        ];

        const finalStream = await model.stream(messages);
        let fullResponse = "";

        for await (const chunk of finalStream) {
            if (chunk.content) {
                const text = chunk.content as string;
                fullResponse += text;
                yield text;
            }
        }

        // CITATION VERIFICATION (Post-process)
        // Detects if the LLM hallucinated a source that wasn't provided
        const citationRegex = /\[Source:\s*([^,\]]+)(?:,\s*([^\]]+))?\]/g;
        const citedSources = new Set<string>();
        let match;
        while ((match = citationRegex.exec(fullResponse)) !== null) {
            citedSources.add(match[1].trim().toLowerCase());
        }

        const validSourceNames = new Set(uniqueDocs.map(d => d.metadata.source.toLowerCase()));
        const invalidCitations = Array.from(citedSources).filter(s => !validSourceNames.has(s));

        if (invalidCitations.length > 0) {
            console.warn(`[Agent] Hallucinated citations detected: ${invalidCitations.join(", ")}`);
            // We've already yielded the text, but we log the safety violation for the admin
        }

        yield "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        const errorMessage = globalError?.message || String(globalError);
        yield `\n\n⚠️ **System Error:** ${errorMessage}\n\nPlease check your API keys in the settings or contact the administrator.`;
    }
}
