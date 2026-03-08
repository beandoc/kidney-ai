
import { syncKnowledgeBase } from "../lib/langchain/pinecone";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
    console.log("🚀 Starting Active Memory Synchronization Pilot...");
    console.log("--------------------------------------------------");

    try {
        const stats = await syncKnowledgeBase((info) => {
            if (info.status) {
                console.log(`[Status] ${info.status}`);
            } else {
                console.log(`[Batch ${info.batch}/${info.totalBatches}] Progress: ${info.percent}% (${info.chunksIndexed}/${info.totalChunks} chunks)`);
            }
        });

        console.log("--------------------------------------------------");
        console.log("✅ Pilot Sync Complete!");
        console.log(`- Files Processed: ${stats.fileCount}`);
        console.log(`- Active Memory Chunks: ${stats.totalChunks}`);
        console.log("Your Kidney-AI now has 'summarized awareness' of these documents.");

    } catch (error) {
        console.error("❌ Sync Failed:", error);
        process.exit(1);
    }
}

main();
