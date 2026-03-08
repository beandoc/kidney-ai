import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncKnowledgeBase } from '../lib/langchain/pinecone';

async function main() {
    console.log("Starting full re-sync...");
    try {
        const result = await syncKnowledgeBase((progress) => {
            console.log(`Syncing: ${progress.percent}% - Batch ${progress.batch}/${progress.totalBatches}`);
        });
        console.log("Successfully synced!", result);
    } catch (e) {
        console.error("Sync failed:", e);
    }
}
main();
