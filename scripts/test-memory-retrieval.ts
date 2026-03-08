
import { searchSemantic } from "../lib/langchain/pinecone";
import { formatPageIndexContext } from "../lib/pageindex/retrieval";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function testRetrieval() {
    const query = "What is the new therapy for ANCA Vasculitis?";
    console.log(`\n🔍 TESTING MEMORY-ENRICHED RETRIEVAL`);
    console.log(`Query: "${query}"`);
    console.log(`--------------------------------------------------`);

    try {
        // 1. Perform semantic search (Pinecone)
        // Note: Chunks are being uploaded right now, so we hope some are already there!
        const docs = await searchSemantic(query, 2);

        if (docs.length === 0) {
            console.log("⚠️ No documents retrieved yet. Indexing might still be in early stages.");
            return;
        }

        // 2. Format context (this should use our new format with [MEMORY INSIGHT])
        const context = formatPageIndexContext(docs);

        console.log("Retrieved Context with Active Memory Insights:");
        console.log(context);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testRetrieval();
