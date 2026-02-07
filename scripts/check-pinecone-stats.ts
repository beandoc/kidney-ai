
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkIndex() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    console.log("Index Stats:", JSON.stringify(stats, null, 2));
}

checkIndex().catch(console.error);
