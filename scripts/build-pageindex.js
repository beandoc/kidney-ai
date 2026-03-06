const fs = require('fs');
const path = require('path');

const kbPath = path.join(process.cwd(), 'knowledge_base', 'pageindex');
if (!fs.existsSync(kbPath)) {
    console.error(`Knowledge base path not found: ${kbPath}`);
    process.exit(0);
}

const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.json') && !f.includes('merged'));

const merged = {};
let totalNodes = 0;

for (const file of files) {
    const filePath = path.join(kbPath, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        merged[file] = content;

        const nodeCount = Array.isArray(content) ? content.length : (content.structure ? content.structure.length : 0);
        totalNodes += nodeCount;
    } catch (e) {
        console.error(`Failed to parse ${file}:`, e);
    }
}

const outputPath = path.join(process.cwd(), 'knowledge_base', 'pageindex_merged.json');
fs.writeFileSync(outputPath, JSON.stringify(merged));
console.log(`[Build] Successfully merged ${files.length} PageIndex files (${totalNodes} total nodes) into pageindex_merged.json`);
