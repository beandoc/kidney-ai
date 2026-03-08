import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

export default redis;

// Cache key for dynamic gold answers
export const DYNAMIC_GOLD_KEY = "kidney-ai:dynamic-gold";

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
