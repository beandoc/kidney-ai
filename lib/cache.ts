import Redis from "ioredis";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "./langchain/config";

const redis = new Redis(process.env.REDIS_URL || "");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";
const CACHE_NAMESPACE = "semantic-cache";

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .join(" ");
}

export async function getCachedResponse(question: string): Promise<string | null> {
    const normQ = normalizeText(question);

    // 1. EXACT Text Match Cache (Redis) - FASTEST
    const exactKey = `cache:response:${normQ}`;
    try {
        const cached = await redis.get(exactKey);
        if (cached) {
            console.log(JSON.stringify({ event: "CacheHit_Exact", query: question }));
            return cached;
        }
    } catch (e) {
        console.error("Redis Read Error:", e);
    }

    // 2. SEMANTIC Cache Match (Pinecone) - SMART
    try {
        if (PINECONE_API_KEY && normQ.length > 10) {
            const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
            const index = pc.Index(PINECONE_INDEX_NAME).namespace(CACHE_NAMESPACE);

            const embeddings = getEmbeddings();
            const vector = await embeddings.embedQuery(question);

            const results = await index.query({
                vector,
                topK: 1,
                includeMetadata: true
            });

            if (results.matches && results.matches.length > 0) {
                const bestMatch = results.matches[0];
                // 0.94 cosine similarity is a very strong match for similar intent
                if (bestMatch.score && bestMatch.score > 0.94) {
                    const matchedResponse = bestMatch.metadata?.response as string;
                    if (matchedResponse) {
                        console.log(JSON.stringify({ event: "CacheHit_Semantic", query: question, score: bestMatch.score }));
                        return matchedResponse;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Semantic Cache Read Error:", e);
    }

    return null;
}

export async function setCachedResponse(question: string, response: string): Promise<void> {
    const normQ = normalizeText(question);

    // 1. Save Exact Match (Redis)
    const exactKey = `cache:response:${normQ}`;
    try {
        await redis.set(exactKey, response, "EX", 604800); // 7 days
    } catch (e) {
        console.error("Redis Write Error:", e);
    }

    // 2. Save Semantic Match (Pinecone)
    try {
        if (PINECONE_API_KEY && normQ.length > 10) {
            const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
            const index = pc.Index(PINECONE_INDEX_NAME).namespace(CACHE_NAMESPACE);

            const embeddings = getEmbeddings();
            const vector = await embeddings.embedQuery(question);

            const safeResponse = response.length > 30000 ? response.substring(0, 30000) : response;
            const uniqueId = `cache-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            await index.upsert([{
                id: uniqueId,
                values: vector,
                metadata: { response: safeResponse, original_query: question }
            }]);
            console.log(JSON.stringify({ event: "CacheStored_Semantic", query: question }));
        }
    } catch (e) {
        console.error("Semantic Cache Write Error:", e);
    }
}
