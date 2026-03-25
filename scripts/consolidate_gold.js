const fs = require('fs');
const path = require('path');

const knowledgeDir = path.join(process.cwd(), 'lib', 'knowledge');
const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

const allAnswers = {};

files.forEach(file => {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Improved regex to capture keys and values, handling backticks and escaped characters
    // Matches "key": `value`, or "key": "value", or 'key': 'value'
    const pairRegex = /["']([^"']+)["']\s*:\s*([`"'])([\s\S]*?)\2\s*(?:,|$)/g;
    let match;
    while ((match = pairRegex.exec(content)) !== null) {
        const key = match[1];
        const value = match[3];
        allAnswers[key] = value.trim();
    }
});

const outputDir = path.join(process.cwd(), 'public', 'knowledge');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
    path.join(outputDir, 'gold_answers.json'),
    JSON.stringify(allAnswers, null, 2)
);

console.log(`Extracted ${Object.keys(allAnswers).length} answers to public/knowledge/gold_answers.json`);
