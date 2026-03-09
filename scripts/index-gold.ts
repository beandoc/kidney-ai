
import { GOLD_ANSWERS } from '../lib/knowledge/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Indexing Gold Answers into PageIndex format...");

    const pageIndex = {
        doc_name: "Manual_Gold_Answers.json",
        structure: Object.entries(GOLD_ANSWERS).map(([key, content], index) => {
            // Simple summary is first line or first 100 chars
            const summary = content.split('\n')[0].slice(0, 150);

            return {
                title: key,
                node_id: `gold-${index}`,
                summary: summary,
                text: content
            };
        })
    };

    const outputPath = path.join(process.cwd(), 'knowledge_base', 'pageindex', 'gold_answers.json');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(pageIndex, null, 2));
    console.log(`Successfully indexed ${Object.keys(GOLD_ANSWERS).length} gold answers to ${outputPath}`);

    // Trigger the merge script
    console.log("Running merge script...");
    const mergeScript = path.join(process.cwd(), 'scripts', 'build-pageindex.js');
    const mergeCode = fs.readFileSync(mergeScript, 'utf-8');
    // We can just require it if we were in JS, but since we are in TSX, we can just run it
}

main().catch(console.error);
