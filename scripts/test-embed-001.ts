import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testEmbed001() {
    console.log("Testing gemini-embedding-001 with LangChain...");
    try {
        const model = new GoogleGenerativeAIEmbeddings({
            modelName: "gemini-embedding-001",
            apiKey: process.env.GOOGLE_API_KEY,
        });
        const res = await model.embedQuery("hi");
        console.log("Success! Dimension: " + res.length);
    } catch (e: any) {
        console.log("Failed: " + e.message);
    }
}

testEmbed001();
