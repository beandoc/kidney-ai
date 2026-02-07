import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testEmbed() {
    console.log("Testing text-embedding-004 with LangChain...");
    try {
        const model = new GoogleGenerativeAIEmbeddings({
            modelName: "text-embedding-004",
            apiKey: process.env.GOOGLE_API_KEY,
        });
        const res = await model.embedQuery("hi");
        console.log("Success! Dimension: " + res.length);
    } catch (e: any) {
        console.log("Failed: " + e.message);
    }
}

testEmbed();
