import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test25() {
    console.log("Testing gemini-2.5-flash with LangChain...");
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY,
        });
        const res = await model.invoke("hi");
        console.log("Success! Response: " + res.content);
    } catch (e: any) {
        console.log("Failed: " + e.message);
    }
}

test25();
