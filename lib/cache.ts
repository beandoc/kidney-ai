import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

/**
 * Normalizes a string to improve cache hit rates.
 * Removes punctuation, extra whitespace, and converts to lowercase.
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .split(/\s+/)            // Split by whitespace
        .filter(Boolean)         // Remove empty strings
        .join(" ");              // Join back with single spaces
}

/**
 * Checks if a response for the given question exists in Redis.
 */
export async function getCachedResponse(question: string): Promise<string | null> {
    const key = `cache:response:${normalizeText(question)}`;
    try {
        const cached = await redis.get(key);
        if (cached) {
            console.log(JSON.stringify({ event: "CacheHit", query: question }));
            return cached;
        }
    } catch (e) {
        console.error("Cache Read Error:", e);
    }
    return null;
}

/**
 * Stores a response in Redis with a TTL (e.g., 7 days).
 */
export async function setCachedResponse(question: string, response: string): Promise<void> {
    const key = `cache:response:${normalizeText(question)}`;
    try {
        // Cache for 7 days (604800 seconds)
        await redis.set(key, response, "EX", 604800);
        console.log(JSON.stringify({ event: "CacheStored", query: question }));
    } catch (e) {
        console.error("Cache Write Error:", e);
    }
}
