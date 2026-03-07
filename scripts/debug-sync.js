require('dotenv').config();
const { syncKnowledgeBase } = require('./dist/lib/langchain/pinecone');

async function testSync() {
    try {
        console.log("Starting debug sync...");
        const result = await syncKnowledgeBase((info) => {
            console.log(`Progress: ${info.percent}% - ${info.status || ''}`);
        });
        console.log("Sync result:", result);
    } catch (e) {
        console.error("SYNC FAILED:");
        console.error(e);
        process.exit(1);
    }
}

testSync();
