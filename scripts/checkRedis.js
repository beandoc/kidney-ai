const Redis = require("ioredis");
require("dotenv").config({ path: ".env.local" });

async function searchRedis() {
    const redis = new Redis(process.env.REDIS_URL);
    const keys = await redis.keys("pageindex:*");
    console.log(`Found ${keys.length} pageindex keys in Redis.`);
    let found = false;

    for (const key of keys) {
        console.log(`Checking key: ${key}`);
        const data = await redis.get(key);
        if (data.includes("IgA") || key.includes("IgA") || data.includes("NEJM") || data.includes("Nephropathy")) {
            console.log(`\n\n--- MATCH FOUND IN ${key} ---`);
            console.log(data.substring(0, 1000));
            found = true;
        }
    }

    if (!found) {
        console.log("No Match found in Redis 'pageindex:*' keys.");
    }

    process.exit(0);
}

searchRedis().catch(console.error);
