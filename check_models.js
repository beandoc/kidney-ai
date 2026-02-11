const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
        // Wait, the API for listing models is slightly different
        const { GoogleAuth } = require('google-auth-library');
        // Actually, let's keep it simple and just try a few model names via fetch
        console.log("Checking model names...");
    } catch (e) {
        console.error(e);
    }
}

// A simpler way using fetch to check v1 and v1beta
async function checkModels() {
    const key = process.env.GOOGLE_API_KEY;
    const versions = ["v1", "v1beta"];
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash-exp"];

    for (const v of versions) {
        for (const m of models) {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${m}?key=${key}`;
            try {
                const res = await fetch(url);
                if (res.ok) {
                    console.log(`FOUND: ${m} on ${v}`);
                } else {
                    // console.log(`NOT FOUND: ${m} on ${v} (${res.status})`);
                }
            } catch (e) {
                // ignore
            }
        }
    }
}

checkModels();
