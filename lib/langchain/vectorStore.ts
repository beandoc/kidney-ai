import { Document } from "@langchain/core/documents";
import { getChatModel, QUERY_REFINER_PROMPT, RERANKER_PROMPT } from "./config";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Refine the user query to fix typos and normalize medical terms
 */
export async function refineQuery(query: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second fail-fast

    try {
        const chatModel = getChatModel(0); // 0 retries for refinement to fail fast

        const response = await chatModel.invoke([
            new HumanMessage(QUERY_REFINER_PROMPT.replace("{question}", query))
        ], { signal: controller.signal });

        const refined = response.content.toString().trim();
        console.log(`Query refined: "${query}" -> "${refined}"`);
        return refined;
    } catch (error: unknown) {
        console.error("Query refinement failed, using original query:", error);
        return query;
    }
    finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Cross-Encoder Reranker using LLM
 * Takes top candidates and re-scores them for semantic relevance
 */
export async function rerankDocuments(query: string, documents: Document[]): Promise<Document[]> {
    if (documents.length === 0) return [];

    try {
        const model = getChatModel();
        const docSummaries = documents.map((doc, idx) => `[Doc ${idx}]: ${doc.pageContent.slice(0, 500)}...`).join('\n\n');

        const prompt = RERANKER_PROMPT
            .replace("{question}", query)
            .replace("{documents}", docSummaries);

        const response = await model.invoke([new HumanMessage(prompt)]);
        const content = response.content.toString();

        // Extract JSON array from LLM response
        const jsonMatch = content.match(/\[.*\]/s);
        if (!jsonMatch) return documents;

        const scores: number[] = JSON.parse(jsonMatch[0]);

        // Attach scores and sort
        const scoredDocs = documents.map((doc, idx) => {
            doc.metadata.rerankScore = scores[idx] || 0;
            return doc;
        });

        return scoredDocs.sort((a, b) => (b.metadata.rerankScore || 0) - (a.metadata.rerankScore || 0));
    } catch (error) {
        console.error("Reranking failed, returning original order:", error);
        return documents;
    }
}
