
import { searchDocuments } from "../src/lib/langchain/vectorStore";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
    console.log("Testing RAG search...");
    try {
        const results = await searchDocuments("kidney", 10);
        console.log(`Found ${results.length} documents.`);
        results.forEach((doc, i) => {
            console.log(`\nDoc ${i + 1} [Source: ${doc.metadata.source}]:`);
            console.log(doc.pageContent.substring(0, 50) + "...");
        });
    } catch (error) {
        console.error("Error during search:", error);
    }
}

main();
