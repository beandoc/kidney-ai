import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testEmbeddingDimension() {
    const embeddings = new GoogleGenerativeAIEmbeddings({
        modelName: "text-embedding-004",
        apiKey: process.env.GOOGLE_API_KEY,
    });

    const res = await embeddings.embedQuery("Hello world");
    console.log(`Embedding dimension: ${res.length}`);
}

testEmbeddingDimension();
