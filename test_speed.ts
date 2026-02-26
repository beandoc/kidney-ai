import { runAgent } from "./lib/agent";

async function testAgent(query: string, type: string) {
    console.log(`\n======================================================`);
    console.log(`[TEST: ${type}]`);
    console.log(`Query: "${query}"`);
    console.log(`======================================================`);

    const start = Date.now();
    let firstTokenTime = -1;
    let fullResponse = "";

    try {
        const stream = runAgent(query, []);
        for await (const chunk of stream) {
            if (firstTokenTime === -1 && chunk.trim()) {
                firstTokenTime = Date.now() - start;
                console.log(`\n\n>>> RESPONSE START (Time to First Token: ${firstTokenTime}ms) <<<`);
            }
            if (chunk) {
                fullResponse += chunk;
                process.stdout.write(chunk.toString());
            }
        }
        const totalDuration = Date.now() - start;
        console.log(`\n>>> EOF <<<`);
        console.log(`[Total Latency: ${totalDuration}ms]\n`);
    } catch (e) {
        console.error("Error during test:", e);
    }
}

async function main() {
    console.log("Starting Automated Quality & Performance Audit...");

    // Test 1: Standard In-KB question (English)
    await testAgent("what is hemodialysis?", "In Knowledge Base (Standard)");

    // Test 2: In-KB question with translation (Hindi)
    await testAgent("what is acute kidney injury explain in hindi", "In Knowledge Base (Language Translation)");

    // Test 3: Out-of-KB question (Hallucination/Safety check)
    await testAgent("who won the super bowl in 2024?", "Out of Knowledge Base (Safety Boundary Test)");

    console.log("\nAudit Complete.");
}

main();
