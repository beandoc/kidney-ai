
import { searchSemantic } from "../lib/langchain/pinecone";
import { formatPageIndexContext } from "../lib/pageindex/retrieval";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function benchmark() {
    const query = "Kidney failure symptoms";
    console.log(`\n⏱️ BENCHMARKING RETRIEVAL PERFORMANCE`);
    console.log(`Query: "${query}"`);
    console.log(`--------------------------------------------------`);

    // 1. Measure Pinecone Latency
    const startVector = Date.now();
    const docs = await searchSemantic(query, 5);
    const endVector = Date.now();
    console.log(`[Pinecone] Time: ${endVector - startVector}ms`);

    // 2. Measure Memory Formatting Latency
    const startFormat = Date.now();
    const context = formatPageIndexContext(docs);
    const endFormat = Date.now();
    console.log(`[Formatting] Time: ${endFormat - startFormat}ms (including Active Memory strings)`);

    console.log(`--------------------------------------------------`);
    console.log(`Total Retrieval Overhead: ${endFormat - startVector}ms`);

    // Technical Observation
    const hasMemory = docs.some(d => d.metadata.summary);
    if (hasMemory) {
        console.log("✅ Active Memory Insights detected in results.");
    } else {
        console.log("ℹ️ No Memory Insights in these specific chunks yet (still indexing).");
    }
}

benchmark();
