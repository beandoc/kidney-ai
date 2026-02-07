import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function diagnose() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    console.log("Using API Key: " + apiKey.substring(0, 5) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);

    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-pro",
        "text-embedding-004",
        "embedding-001"
    ];

    for (const modelName of models) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            if (modelName.includes("embedding")) {
                const res = await model.embedContent("test");
                console.log(`✅ ${modelName} works! (Embed)`);
            } else {
                const res = await model.generateContent("hi");
                console.log(`✅ ${modelName} works! (Generate)`);
            }
        } catch (e: any) {
            console.log(`❌ ${modelName} failed: ${e.message}`);
        }
    }
}

diagnose();
