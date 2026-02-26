import { runAgent } from "./lib/agent";

async function main() {
    const stream = runAgent("what is hemodialysis?", []);
    console.log("--- START STREAM ---");
    for await (const chunk of stream) {
        console.log(`CHUNK: [${chunk}]`);
    }
    console.log("--- END STREAM ---");
}

main();
