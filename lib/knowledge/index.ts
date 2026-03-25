import fs from 'fs';
import path from 'path';

/**
 * Loads all gold answers from the consolidated JSON file.
 * This avoids bundling 750KB+ of text into the application JS bundle.
 */
export function getGoldAnswers(): Record<string, string> {
    try {
        const filePath = path.join(process.cwd(), 'data', 'knowledge', 'gold_answers.json');
        
        if (!fs.existsSync(filePath)) {
            console.warn("Gold answers file not found at " + filePath);
            return {};
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to load gold answers from JSON:", error);
        return {};
    }
}
