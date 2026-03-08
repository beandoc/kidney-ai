
import { getEmbeddings } from "../lib/langchain/config";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function testEmbeddingCache() {
    const embeddings = getEmbeddings();
    const query = "Test query for Warm Caching";

    console.log(`\n⏱️ BENCHMARKING WARM EMBEDDING CACHE`);
    console.log(`Query: "${query}"`);
    console.log(`--------------------------------------------------`);

    // 1. First Attempt (Cache MISS)
    const start1 = Date.now();
    await embeddings.embedQuery(query);
    const end1 = Date.now();
    console.log(`[Attempt 1 - Miss] Time: ${end1 - start1}ms`);

    // 2. Second Attempt (Cache HIT)
    const start2 = Date.now();
    await embeddings.embedQuery(query);
    const end2 = Date.now();
    console.log(`[Attempt 2 - Hit] Time: ${end2 - start2}ms`);

    console.log(`--------------------------------------------------`);
    const gain = end1 - start1 - (end2 - start2);
    console.log(`Latency reduction: ${gain}ms`);
}

testEmbeddingCache();
