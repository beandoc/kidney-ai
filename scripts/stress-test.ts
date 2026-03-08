
import { runAgent } from "../lib/agent";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function stressTest() {
    const questions = [
        "What is the specific 2024 guidance on using Avacopan for ANCA-associated vasculitis compared to traditional glucocorticoid-only therapy?",
        "My creatinine jumped from 1.2 to 2.5 mg/dL in 48 hours. Based on the 2012 AKI criteria, what staging does this fall into and why?",
        "What are the exact nursing and patient-level precautions I must follow for the first 24 hours after a kidney biopsy?",
        "Compare the post-discharge care required for a Tunneled Cuff Catheter versus a standard AV Fistula. What's the main difference in risk management?",
        "I am on Hemodialysis (CKD5D) and my potassium is 6.1. Provide a combined diet strategy based on both the HD and potassium guidelines."
    ];

    console.log(`\n🏥 KIDNEY-AI STRESS TEST: 5 COMPLEX CLINICAL QUERIES`);
    console.log(`=====================================================`);
    console.log(`Knowledge Base: ~950 / 3,326 Chunks Indexed`);
    console.log(`Targeting: KDIGO 2024, AKI 2012, Discharge Guides`);
    console.log(`=====================================================`);

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`\n🩺 Q${i + 1}: ${question}`);
        console.log(`-----------------------------------------------------`);

        let fullResponse = "";
        const startTime = Date.now();

        try {
            const agentStream = runAgent(question, []);
            for await (const chunk of agentStream) {
                if (typeof chunk === 'string') {
                    if (chunk.includes("<thought>")) {
                        const thought = chunk.match(/<thought>([\s\S]*?)<\/thought>/);
                        if (thought) console.log(`\x1b[34m[THINKING]: ${thought[1]}\x1b[0m`);
                    } else if (!chunk.startsWith("<options>")) {
                        process.stdout.write(chunk);
                        fullResponse += chunk;
                    }
                }
            }
        } catch (error) {
            console.error("\n❌ Bot Failed:", error);
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n\n\x1b[32m[Metrics]: Time: ${duration}s | Response Quality: ${fullResponse.length > 50 ? "✅ HIGH" : "⚠️ LOW"}\x1b[0m`);
        console.log(`=====================================================`);
    }
}

stressTest();
