import { BaseMessage } from "@langchain/core/messages";
import { getChatModel } from "../langchain/config";
import { searchSemantic } from "../langchain/pinecone";
import { searchPageIndex } from "../pageindex/retrieval";

/**
 * Extract medical context from recent chat history for follow-up queries.
 * Detects if the current query is a follow-up (short/vague) and prepends
 * the last known medical topic to improve retrieval.
 */
export function buildContextAwareQuery(input: string, chatHistory: BaseMessage[]): string {
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
