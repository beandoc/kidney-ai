
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testGemini() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY not found in .env.local");
        return;
    }

    console.log("Testing Gemini Embeddings with key:", apiKey.slice(0, 5) + "...");

    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: apiKey,
            modelName: "gemini-embedding-001",
        });

        const res = await embeddings.embedQuery("Hello, how are you?");
        if (res && res.length > 0) {
            console.log("✅ Gemini Embeddings successful! Dimension:", res.length);
        } else {
            console.error("❌ Gemini returned empty response.");
        }
    } catch (error: any) {
        console.error("❌ Gemini Test Failed:", error.message);
        if (error.message.includes("API_KEY_INVALID")) {
            console.error("👉 Your API key seems to be invalid.");
        }
    }
}

testGemini();
