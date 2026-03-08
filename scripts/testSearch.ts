import { config } from "dotenv";
config({ path: ".env.local" });

import { searchPageIndex } from "../lib/pageindex/retrieval";

async function test() {
    const query = process.argv[2] || "what is the treatmnet of IgA Nephropathy";
    console.log(`Searching for: ${query}`);
    const results = await searchPageIndex(query);
    console.log(`Found ${results.length} results.`);
    for (let i = 0; i < results.length; i++) {
        console.log(`\nResult ${i + 1}:`);
        console.log(`Source: ${results[i].metadata.source}`);
        console.log(`Title: ${results[i].metadata.title}`);
        console.log(`Score: ${results[i].metadata.score}`);
        console.log(`Snippet: ${results[i].pageContent.substring(0, 200)}...`);
    }
    process.exit(0);
}

test().catch(console.error);
