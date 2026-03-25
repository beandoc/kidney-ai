import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGEINDEX_DIR = path.join(__dirname, '../knowledge_base/pageindex');
const OUTPUT_FILE = path.join(__dirname, '../knowledge_base/pageindex_merged.json');

function main() {
    console.log('Building PageIndex merged asset...');
    if (!fs.existsSync(PAGEINDEX_DIR)) {
        console.error('PageIndex directory not found at', PAGEINDEX_DIR);
        return;
    }
    const files = fs.readdirSync(PAGEINDEX_DIR).filter(f => f.endsWith('.json') && !f.includes('merged'));
    const merged = {};
    for (const file of files) {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(PAGEINDEX_DIR, file), 'utf-8'));
            merged[file] = content;
        } catch (e) {
            console.error('Error reading', file, e.message);
        }
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged));
    console.log(`Successfully merged ${files.length} files into ${OUTPUT_FILE}`);
}

main();
