require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function recreateIndex() {
    console.log("Connecting to Pinecone...");
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";

    try {
        console.log(`Deleting index: ${indexName}`);
        await pc.deleteIndex(indexName);
        console.log("Index deleted. The sync script will automatically recreate it!");
    } catch (e) {
        console.log("Error deleting index (maybe it doesn't exist):", e.message);
    }
}
recreateIndex();
