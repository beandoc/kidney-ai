import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api/chat';
const TEST_CASES_PATH = path.join(__dirname, 'test_cases.json');
const RESULTS_PATH = path.join(__dirname, 'smartness_report.md');

interface TestCase {
    category: string;
    base_question: string;
    variations: string[];
}

interface TestResult {
    category: string;
    question: string;
    response: string;
    sources: string[];
    timeTaken: number;
}

async function runTest(question: string): Promise<Omit<TestResult, 'category' | 'question'>> {
    const startTime = Date.now();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sources: string[] = [];

        if (reader) {
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                console.log(`  [DEBUG] Received ${chunk.length} chars`);
                buffer += chunk;

                // Pre-emptive check: if we see SOURCES but no newline, wait a bit
                if (buffer.includes('__SOURCES__:') && !buffer.includes('\n')) {
                    continue;
                }

                if (buffer.includes('__SOURCES__:') && buffer.includes('\n')) {
                    const lines = buffer.split('\n');
                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i];
                        if (line.startsWith('__SOURCES__:')) {
                            try {
                                const sourceStr = line.replace('__SOURCES__:', '');
                                sources = JSON.parse(sourceStr);
                                console.log(`  [DEBUG] Parsed ${sources.length} sources`);
                            } catch (e) {
                                console.error('  [DEBUG] Source parse error:', e);
                            }
                        } else {
                            fullText += line;
                        }
                    }
                    buffer = lines[lines.length - 1];
                } else if (!buffer.includes('__SOURCES__:')) {
                    fullText += buffer;
                    buffer = '';
                }
            }
            fullText += buffer;
        }

        return {
            response: fullText.trim(),
            sources,
            timeTaken: Date.now() - startTime
        };
    } catch (error) {
        console.error(`Error testing question "${question}":`, error);
        return {
            response: "ERROR: Failed to get response",
            sources: [],
            timeTaken: Date.now() - startTime
        };
    }
}

const DELAY_BETWEEN_QUESTIONS = 3000; // 3 seconds to stay under rate limits

async function runWithRetry(question: string, retries = 3): Promise<Omit<TestResult, 'category' | 'question'>> {
    for (let i = 0; i < retries; i++) {
        const result = await runTest(question);

        // Check if the response indicates a rate limit error
        if (result.response.includes('429') && result.response.includes('quota')) {
            console.warn(`  [RATE LIMIT] Hit quota limit. Waiting ${25}s before retry ${i + 1}/${retries}...`);
            await new Promise(r => setTimeout(r, 25000)); // Wait 25s as suggested by error
            continue;
        }

        if (result.response !== "ERROR: Failed to get response") {
            return result;
        }

        await new Promise(r => setTimeout(r, 2000));
    }
    return {
        response: "ERROR: Final retry failed",
        sources: [],
        timeTaken: 0
    };
}

async function main() {
    console.log('🚀 Starting Smartness Evaluation...');

    if (!fs.existsSync(TEST_CASES_PATH)) {
        console.error('Test cases file not found!');
        return;
    }

    const testCases: TestCase[] = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf8'));
    let reportMd = `# Chatbot Smartness Evaluation Report\n\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    reportMd += `## Summary Table\n\n| Category | Question Variation | Response Length | Sources Count | Time (ms) |\n| :--- | :--- | :--- | :--- | :--- |\n`;

    const allResults: TestResult[] = [];

    for (const testCase of testCases) {
        console.log(`\nTesting Category: ${testCase.category}`);

        const questions = [testCase.base_question, ...testCase.variations];

        for (const question of questions) {
            console.log(`  - Question: "${question}"`);

            // Add a small delay between questions even if there's no error
            await new Promise(r => setTimeout(r, DELAY_BETWEEN_QUESTIONS));

            const result = await runWithRetry(question);

            allResults.push({
                category: testCase.category,
                question,
                ...result
            });

            reportMd += `| ${testCase.category} | ${question} | ${result.response.length} | ${result.sources.length} | ${result.timeTaken} |\n`;
        }
    }
    // ... rest of report generation remains same

    reportMd += `\n\n## Detailed Comparisons\n\n`;

    // Group by category for detailed comparison
    for (const testCase of testCases) {
        reportMd += `### Category: ${testCase.category}\n\n`;

        const categoryResults = allResults.filter(r => r.category === testCase.category);

        categoryResults.forEach((res, idx) => {
            reportMd += `#### ${idx === 0 ? 'Base Question' : 'Variation ' + idx}: "${res.question}"\n\n`;
            reportMd += `**Sources cited:** ${res.sources.length > 0 ? res.sources.join(', ') : 'None'}\n\n`;
            reportMd += `> ${res.response.replace(/\n/g, '\n> ')}\n\n`;
            reportMd += `---\n\n`;
        });
    }

    fs.writeFileSync(RESULTS_PATH, reportMd);
    console.log(`\n✅ Evaluation Complete! Report saved to: ${RESULTS_PATH}`);
}

main().catch(console.error);
