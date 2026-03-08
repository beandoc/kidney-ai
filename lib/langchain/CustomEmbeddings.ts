import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { LRUCache } from "lru-cache";

// Global cache for warm embeddings (Survives between requests in the same process)
const EMBEDDING_CACHE = new LRUCache<string, number[]>({
    max: 500, // Cache up to 500 queries
    ttl: 1000 * 60 * 60, // 1 hour TTL
});

export class CustomGoogleEmbeddings extends GoogleGenerativeAIEmbeddings {

    /**
     * Override embedQuery to implement Session-Level "Warm" Caching.
     * Reduces latency from ~2s to <1ms for repeat queries.
     */
    async embedQuery(text: string): Promise<number[]> {
        const normalized = text.trim().toLowerCase();

        // 1. Check local warm cache
        const cached = EMBEDDING_CACHE.get(normalized);
        if (cached) {
            console.log(`[CustomEmbeddings] Cache HIT for: "${normalized.slice(0, 30)}..."`);
            return cached;
        }

        // 2. Cache MISS: Perform actual API embedding
        console.log(`[CustomEmbeddings] Cache MISS, embedding: "${normalized.slice(0, 30)}..."`);
        const vector = await super.embedQuery(text);

        // 3. Store in cache
        if (vector && vector.length > 0) {
            EMBEDDING_CACHE.set(normalized, vector);
        }

        return vector;
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        console.log(`[CustomEmbeddings] embedding ${documents.length} chunks manually...`);
        const vectors: number[][] = [];
        for (const doc of documents) {
            // This will now use the cached embedQuery
            const vector = await this.embedQuery(doc);
            if (!vector || vector.length === 0) {
                console.warn("[CustomEmbeddings] Warning: 0-length vector for doc!");
                vectors.push(new Array(3072).fill(0));
            } else {
                vectors.push(vector);
            }
        }
        return vectors;
    }
}
