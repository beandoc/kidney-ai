const fs = require('fs');
const path = require('path');

const knowledgeDir = path.join(__dirname, 'lib', 'knowledge');
const files = fs.readdirSync(knowledgeDir);

const allAnswers = {};

files.forEach(file => {
    if (file.endsWith('.ts') && file !== 'index.ts') {
        const filePath = path.join(knowledgeDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Find the export const XXX_ANSWERS = { ... }
        const match = content.match(/export const \w+ = ({[\s\S]*?});/);
        if (match) {
            try {
                // I'll use a hacky evaluator since it's just a simple JS object literal
                // but better yet, let's use a regex to extract keys and values 
                // because the content might have backticks and multi-line strings
                const objStr = match[1];
                
                // This is risky if there's complex JS, but these files seem simple
                // Let's use a more robust way to extract key-value pairs
                // Actually, I'll just evaluate it in a sandbox if possible
                const evalContent = content.replace(/export const \w+ = /, 'module.exports = ');
                const tempFile = path.join(__dirname, 'temp_extract.js');
                fs.writeFileSync(tempFile, evalContent);
                const exported = require(tempFile);
                Object.assign(allAnswers, exported);
                fs.unlinkSync(tempFile);
            } catch (e) {
                console.error(`Failed to parse ${file}:`, e);
            }
        }
    }
});

fs.writeFileSync(
    path.join(__dirname, 'lib', 'knowledge', 'gold_answers.json'),
    JSON.stringify(allAnswers, null, 2)
);
console.log('Successfully extracted all gold answers to gold_answers.json');
