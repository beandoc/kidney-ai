
import { initializePinecone } from "../src/lib/langchain/pinecone";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
    console.log("Testing Pinecone connection and initialization...");
    try {
        const vectorStore = await initializePinecone();
        console.log("Pinecone Store is ready!");

        // Test a simple search to confirm it's working
        console.log("Testing search...");
        const results = await vectorStore.similaritySearch("kidney symptoms", 1);
        console.log("Search results received:", results.length);
        if (results.length > 0) {
            console.log("Top result content snippet:", results[0].pageContent.substring(0, 100));
        }
    } catch (error) {
        console.error("Failed to connect/initialize Pinecone:", error);
    }
}

main();
