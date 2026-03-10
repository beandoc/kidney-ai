import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

export default redis;

// Cache key for dynamic gold answers
export const DYNAMIC_GOLD_KEY = "kidney-ai:dynamic-gold";
export const FAILED_QUERIES_KEY = "kidney-ai:failed-queries";

/**
 * Fetches all dynamic gold answers from Redis.
 */
export async function getDynamicGoldAnswers(): Promise<Record<string, string>> {
    try {
        const data = await redis.get(DYNAMIC_GOLD_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error("Failed to fetch dynamic gold from Redis:", error);
        return {};
    }
}

/**
 * Saves all dynamic gold answers to Redis.
 */
export async function saveDynamicGoldAnswers(answers: Record<string, string>): Promise<void> {
    try {
        await redis.set(DYNAMIC_GOLD_KEY, JSON.stringify(answers));
    } catch (error) {
        console.error("Failed to save dynamic gold to Redis:", error);
        throw error;
    }
}
/**
 * Log a failed query to Redis
 */
export async function logFailedQuery(query: string): Promise<void> {
    try {
        const timestamp = new Date().toISOString();
        const entry = JSON.stringify({ query, timestamp });
        // Add to a list of failed queries, keep only last 1000
        await redis.lpush(FAILED_QUERIES_KEY, entry);
        await redis.ltrim(FAILED_QUERIES_KEY, 0, 999);
    } catch (error) {
        console.error("Failed to log failed query to Redis:", error);
    }
}

/**
 * Get all failed queries from Redis
 */
export async function getFailedQueries(): Promise<any[]> {
    try {
        const data = await redis.lrange(FAILED_QUERIES_KEY, 0, -1);
        return data.map(d => JSON.parse(d));
    } catch (error) {
        console.error("Failed to fetch failed queries from Redis:", error);
        return [];
    }
}

/**
 * Remove a failed query from Redis
 */
export async function removeFailedQuery(query: string): Promise<void> {
    try {
        const all = await redis.lrange(FAILED_QUERIES_KEY, 0, -1);
        for (const item of all) {
            const parsed = JSON.parse(item);
            if (parsed.query === query) {
                await redis.lrem(FAILED_QUERIES_KEY, 1, item);
            }
        }
    } catch (error) {
        console.error("Failed to remove failed query:", error);
    }
}

export const FEEDBACK_KEY = "kidney-ai:feedback";

/**
 * Log user feedback rating to Redis
 */
export async function logFeedback(query: string, response: string, rating: number, comment?: string): Promise<void> {
    try {
        const timestamp = new Date().toISOString();
        const entry = JSON.stringify({ query, response, rating, comment, timestamp });
        await redis.lpush(FEEDBACK_KEY, entry);
        await redis.ltrim(FEEDBACK_KEY, 0, 4999); // Keep last 5000 feedbacks
    } catch (error) {
        console.error("Failed to log feedback to Redis:", error);
    }
}

/**
 * Get all feedback from Redis
 */
export async function getFeedback(): Promise<any[]> {
    try {
        const data = await redis.lrange(FEEDBACK_KEY, 0, -1);
        return data.map(d => JSON.parse(d));
    } catch (error) {
        console.error("Failed to fetch feedback from Redis:", error);
        return [];
    }
}
