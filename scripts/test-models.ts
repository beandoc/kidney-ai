import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    // The SDK doesn't have a direct listModels, but we can try to use the model
    console.log("Testing text-embedding-004...");
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const res = await model.embedContent("Hello");
        console.log(`Success! Dimension: ${res.embedding.values.length}`);
    } catch (e) {
        console.log("text-embedding-004 failed");
    }

    console.log("Testing embedding-001...");
    try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const res = await model.embedContent("Hello");
        console.log(`Success! Dimension: ${res.embedding.values.length}`);
    } catch (e) {
        console.log("embedding-001 failed");
    }
}

listModels();
