import { Document } from "@langchain/core/documents";
import { getChatModel, QUERY_REFINER_PROMPT, RERANKER_PROMPT } from "./config";
import { HumanMessage } from "@langchain/core/messages";

import { getCachedResponse, setCachedResponse } from "../cache";
import redis from "../redis-client";

/**
 * Refine the user query to fix typos and normalize medical terms
 */
export async function refineQuery(query: string): Promise<string> {
    const normalizedQuery = query.trim().toLowerCase();

    // QUICK WIN 3: Skip refinement for very short/simple queries
    if (normalizedQuery.split(/\s+/).length <= 3) {
        return query;
    }

    // QUICK WIN 2: Check Redis Cache first
    const cacheKey = `cache:refined_query:${normalizedQuery}`;
    try {
        const cachedRefined = await redis.get(cacheKey);
        if (cachedRefined) {
            console.log(`[Refiner] Cache HIT: "${query}" -> "${cachedRefined}"`);
            return cachedRefined;
        }
    } catch (e) {
        console.warn("[Refiner] Cache read failed:", e);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second fail-fast

    try {
        const chatModel = getChatModel(0); // 0 retries for refinement to fail fast

        const response = await chatModel.invoke([
            new HumanMessage(QUERY_REFINER_PROMPT.replace("{question}", query))
        ], { signal: controller.signal });

        const refined = response.content.toString().trim();
        console.log(`Query refined: "${query}" -> "${refined}"`);

        // Cache the successful refinement for 7 days
        redis.set(cacheKey, refined, "EX", 604800).catch(err => console.error("Refinement Cache Write Error:", err));

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
 * Optimized: Uses Memory Insights (Summaries) instead of raw text for SPEED.
 */
export async function rerankDocuments(query: string, documents: Document[]): Promise<Document[]> {
    if (documents.length <= 1) return documents;

    // QUICK WIN 1: Skip reranking for very short, standard queries
    const queryWords = query.trim().split(/\s+/).length;
    if (queryWords <= 3) {
        console.log(`[Reranker] Skipping for simple query: "${query}"`);
        return documents;
    }

    // QUICK WIN 2: Redis Cache for Reranking
    const docIds = documents.map(d => `${d.metadata.source}-${d.metadata.title}-${d.pageContent.slice(0, 30)}`).join('|');
    const cacheKey = `cache:rerank:${query.toLowerCase().trim()}:${docIds.slice(0, 100)}`;

    try {
        const cachedRerank = await redis.get(cacheKey);
        if (cachedRerank) {
            console.log(`[Reranker] Cache HIT for: "${query}"`);
            const rerankedIndices: number[] = JSON.parse(cachedRerank);
            return rerankedIndices.map(idx => documents[idx]).filter(Boolean);
        }
    } catch (e) {
        console.warn("[Reranker] Cache read failed:", e);
    }

    console.log(`[Reranker] Starting rerank of ${documents.length} docs for: "${query}"`);

    try {
        const model = getChatModel(0); // Use 0 retries to fail fast to primary model

        // Optimize: Use summaries if they exist, else back off to slice of raw text.
        // This makes the prompt much smaller and faster for the LLM to process.
        const docSummaries = documents.map((doc, idx) => {
            const insight = doc.metadata.summary ? `Summary: ${doc.metadata.summary}` : doc.pageContent.slice(0, 400);
            return `[Doc ${idx}]: ${insight}`;
        }).join('\n\n');

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
            return { doc, originalIdx: idx };
        });

        const sorted = scoredDocs.sort((a, b) => (b.doc.metadata.rerankScore || 0) - (a.doc.metadata.rerankScore || 0));
        
        // Cache the result (save the order of original indices)
        const resultIndices = sorted.map(item => item.originalIdx);
        redis.set(cacheKey, JSON.stringify(resultIndices), "EX", 86400).catch(err => console.error("Rerank Cache Write Error:", err));

        return sorted.map(item => item.doc);
    } catch (error) {
        console.error("Reranking failed, returning original order:", error);
        return documents;
    }
}
