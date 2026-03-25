
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testGeminiChat() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY not found in .env.local");
        return;
    }

    try {
        console.log("Testing Gemini Chat...");
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-pro",
        });

        const res = await model.invoke("Say 'Kidney AI is online!'");
        console.log("🤖 Response:", res.content);
    } catch (e: any) {
        console.error("❌ Gemini Chat Failed:", e.message);
    }
}

testGeminiChat();
