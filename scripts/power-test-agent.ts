
import { runAgent } from "../lib/agent";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function testFullAgentPower() {
    const queries = [
        "What are the 2024 updates for ANCA Vasculitis therapy?",
        "How do I manage high creatinine according to guidelines?"
    ];

    console.log(`\n🚀 TESTING CHATBOT POWER: ACTIVE MEMORY EDITION`);
    console.log(`===============================================`);

    for (const query of queries) {
        console.log(`\nQUESTION: "${query}"`);
        console.log(`-----------------------------------------------`);

        console.log("BOT RESPONSE:");
        let fullResponse = "";

        try {
            const agentStream = runAgent(query, []);

            for await (const chunk of agentStream) {
                if (typeof chunk === 'string') {
                    // Check for thought process tags
                    if (chunk.includes("<thought>")) {
                        const thought = chunk.match(/<thought>([\s\S]*?)<\/thought>/);
                        if (thought) console.log(`\x1b[34m[THOUGHT]: ${thought[1]}\x1b[0m`);
                    } else if (!chunk.startsWith("<options>")) {
                        process.stdout.write(chunk);
                        fullResponse += chunk;
                    } else if (chunk.startsWith("<options>")) {
                        console.log(`\n\x1b[32m[SMART NAV]: ${chunk}\x1b[0m`);
                    }
                }
            }
            console.log(`\n\n✅ Response Complete`);
        } catch (error) {
            console.error("\n❌ Agent Error:", error);
        }
        console.log(`===============================================`);
    }
}

testFullAgentPower();
