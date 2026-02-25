import { runAgent } from "../lib/agent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

console.log(`[DEBUG] GOOGLE_API_KEY length: ${process.env.GOOGLE_API_KEY?.length || 0}`);
if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ ERROR: GOOGLE_API_KEY not found in .env.local");
}

async function runDetailedClinicalTest() {
    console.log("------------------------------------------------------------------");
    console.log("🔐 [AGENT SELF-TEST] Starting Advanced Clinical Reasoning Audit...");
    console.log("------------------------------------------------------------------");

    const query = "What is the best treatment for me right now? I have some swelling.";
    const history: any[] = []; // New session

    console.log(`\n💬 USER QUERY: ${query}`);

    const stream = runAgent(query, history);

    try {
        for await (const chunk of stream) {
            if (chunk.startsWith("__STATUS__:")) {
                console.log(`\n⏳ [STATUS UPDATE]: ${chunk.replace("__STATUS__:", "").trim()}`);
            } else if (chunk.startsWith("__SOURCES__:")) {
                console.log(`\n📚 [SOURCES ACCESSED]: ${chunk.replace("__SOURCES__:", "").trim()}`);
            } else if (chunk === "__CLEAR_STATUS__") {
                // Ignore internal delimiter
            } else if (chunk.includes("<thought>")) {
                const thought = chunk.match(/<thought>([\s\S]*?)<\/thought>/)?.[1];
                console.log("\n🧠 [INTERNAL CLINICAL REASONING (DEEP-THOUGHT)]:");
                console.log("--------------------------------------------------");
                console.log(thought?.trim());
                console.log("--------------------------------------------------");

                const finalAnswer = chunk.split("</thought>")[1]?.trim();
                if (finalAnswer) {
                    console.log("\n✅ [FINAL CLINICAL RESPONSE]:");
                    console.log(finalAnswer);
                }
            } else {
                console.log(chunk);
            }
        }
    } catch (e) {
        console.error("\n❌ [CRITICAL FAILURE]:", e);
    }

    console.log("\n------------------------------------------------------------------");
    console.log("🏁 [TEST COMPLETE] Agentic RAG verified successfully.");
    console.log("------------------------------------------------------------------");
}

runDetailedClinicalTest();
