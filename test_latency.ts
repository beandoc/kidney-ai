
import { runAgent } from './lib/agent';

async function testLatency() {
    console.log('--- Latency Test Start ---');
    const query = 'what is chronic kidney disease?';
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullResponse = '';

    const agent = runAgent(query, []);

    try {
        for await (const chunk of agent) {
            if (firstTokenTime === null) {
                firstTokenTime = Date.now();
                const latency = firstTokenTime - startTime;
                console.log(`Time to First Token (TTFT): ${latency}ms`);
            }
            fullResponse += chunk;
        }
        const totalTime = Date.now() - startTime;
        console.log(`Total Response Time: ${totalTime}ms`);
        console.log('--- Final Response ---');
        console.log(fullResponse.trim());
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testLatency();
