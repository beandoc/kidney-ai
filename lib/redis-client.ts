import Redis from "ioredis";

// Centralized Redis client to ensure connection pooling
const REDIS_URL = process.env.REDIS_URL || "";

if (!REDIS_URL) {
    console.warn("REDIS_URL is not defined. Redis features will be disabled.");
}

const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    // Ensure we don't spam connections in serverless environments
    connectTimeout: 10000,
});

redis.on("error", (err: any) => {
    // Silence common connection errors in serverless to prevent crashes
    if (err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        // Log occasionally or just ignore
    } else {
        console.error("Redis Client Error:", err);
    }
});

export default redis;
