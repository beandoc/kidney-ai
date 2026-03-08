import { config } from "dotenv";
config({ path: ".env.local" });

import { runAgent } from "../lib/agent";

async function test(query: string) {
    try {
        const iterator = runAgent(query, []);
        let fullResponse = "";
        for await (const chunk of iterator) {
            if (typeof chunk === "string") {
                fullResponse += chunk;
                process.stdout.write(chunk);
            }
        }
        console.log("\n--- END ---");
        process.exit(0);
    } catch (e) {
        console.error("FAILED:", e);
        process.exit(1);
    }
}

test(process.argv[2] || "क्या anca vasculitis क्या है?");
