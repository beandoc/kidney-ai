/**
 * RAG Evaluation Framework for Kidney-AI
 * 
 * Measures:
 * 1. Retrieval Accuracy (Are the right docs being fetched?)
 * 2. Answer Faithfulness (Is the answer grounded in context?)
 * 3. Hallucination Detection (Did the LLM make stuff up?)
 * 4. Latency Metrics (How fast is the pipeline?)
 */

import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { searchSemantic } from "./langchain/pinecone";
import { getChatModel } from "./langchain/config";
import { HumanMessage } from "@langchain/core/messages";

// --- Test Cases (Ground Truth) ---
export interface EvalTestCase {
    query: string;
    expectedTopics: string[];   // Keywords that MUST appear in retrieved docs
    expectedAnswer: string;     // Substring that should appear in LLM answer
    forbiddenPhrases: string[]; // Phrases that indicate hallucination
}

export const EVAL_TEST_SUITE: EvalTestCase[] = [
    {
        query: "What is creatinine?",
        expectedTopics: ["creatinine", "kidney", "waste"],
        expectedAnswer: "creatinine",
        forbiddenPhrases: ["I think", "probably", "might be"]
    },
    {
        query: "What are the stages of CKD?",
        expectedTopics: ["stage", "gfr", "ckd"],
        expectedAnswer: "stage",
        forbiddenPhrases: ["I believe", "in my opinion"]
    },
    {
        query: "Diet for dialysis patients",
        expectedTopics: ["dialysis", "diet", "potassium"],
        expectedAnswer: "diet",
        forbiddenPhrases: ["you should definitely", "I recommend"]
    },
    {
        query: "What is eGFR?",
        expectedTopics: ["egfr", "filtration", "kidney"],
        expectedAnswer: "filtration",
        forbiddenPhrases: ["probably"]
    },
    {
        query: "How to manage hypertension in CKD?",
        expectedTopics: ["hypertension", "blood pressure", "ckd"],
        expectedAnswer: "blood pressure",
        forbiddenPhrases: ["take aspirin daily", "guaranteed cure"]
    },
];

// --- Metrics ---
export interface EvalResult {
    query: string;
    retrievalScore: number;      // 0-1: fraction of expectedTopics found in docs
    faithfulnessScore: number;   // 0-1: is answer grounded in context?
    hallucinationDetected: boolean;
    retrievalLatencyMs: number;
    totalLatencyMs: number;
    docsRetrieved: number;
    contextLength: number;
}

export interface EvalSummary {
    totalTests: number;
    avgRetrievalScore: number;
    avgFaithfulnessScore: number;
    hallucinationRate: number;
    avgRetrievalLatencyMs: number;
    avgTotalLatencyMs: number;
    ragQualityScore: number;      // Final composite score out of 10
    results: EvalResult[];
}

/**
 * Run a single evaluation test case
 */
async function evaluateTestCase(tc: EvalTestCase): Promise<EvalResult> {
    const totalStart = Date.now();

    // Step 1: Measure retrieval
    const retrievalStart = Date.now();
    const [keywordDocs, semanticDocs] = await Promise.all([
        searchPageIndex(tc.query),
        searchSemantic(tc.query, 5)
    ]);

    const allDocs = [...keywordDocs, ...semanticDocs];
    const seen = new Set<string>();
    const uniqueDocs = allDocs.filter(doc => {
        const id = `${doc.metadata.source}-${doc.metadata.title}-${doc.pageContent.slice(0, 100)}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
    const retrievalLatencyMs = Date.now() - retrievalStart;

    // Retrieval accuracy: how many expected topics appear in retrieved docs
    const allContent = uniqueDocs.map(d => d.pageContent).join(" ").toLowerCase();
    const topicsFound = tc.expectedTopics.filter(t => allContent.includes(t.toLowerCase()));
    const retrievalScore = tc.expectedTopics.length > 0
        ? topicsFound.length / tc.expectedTopics.length
        : 0;

    // Step 2: Generate answer
    const context = formatPageIndexContext(uniqueDocs);
    const model = getChatModel();

    const prompt = `You are a Kidney Health Assistant. Answer ONLY using the provided guidelines.
        
GUIDELINES:
${context.slice(0, 15000)}

QUESTION: ${tc.query}

Answer:`;

    let answer = "";
    try {
        const response = await model.invoke([new HumanMessage(prompt)]);
        answer = response.content?.toString() || "";
    } catch {
        answer = "[LLM_ERROR]";
    }

    const totalLatencyMs = Date.now() - totalStart;

    // Step 3: Faithfulness — does the answer contain expected content?
    const answerLower = answer.toLowerCase();
    const faithfulnessScore = tc.expectedAnswer
        ? (answerLower.includes(tc.expectedAnswer.toLowerCase()) ? 1.0 : 0.0)
        : 1.0;

    // Step 4: Hallucination detection
    const hallucinationDetected = tc.forbiddenPhrases.some(fp =>
        answerLower.includes(fp.toLowerCase())
    );

    return {
        query: tc.query,
        retrievalScore,
        faithfulnessScore,
        hallucinationDetected,
        retrievalLatencyMs,
        totalLatencyMs,
        docsRetrieved: uniqueDocs.length,
        contextLength: context.length,
    };
}

/**
 * Run the full evaluation suite and return a summary
 */
export async function runEvaluation(testCases?: EvalTestCase[]): Promise<EvalSummary> {
    const suite = testCases || EVAL_TEST_SUITE;
    const results: EvalResult[] = [];

    console.log(`\n========== RAG EVALUATION START (${suite.length} test cases) ==========\n`);

    for (const tc of suite) {
        console.log(`  Evaluating: "${tc.query}"...`);
        try {
            const result = await evaluateTestCase(tc);
            results.push(result);
            console.log(`    ✓ Retrieval: ${(result.retrievalScore * 100).toFixed(0)}% | Faithful: ${(result.faithfulnessScore * 100).toFixed(0)}% | Hallucination: ${result.hallucinationDetected ? "⚠️ YES" : "✅ NO"} | ${result.retrievalLatencyMs}ms`);
        } catch (err) {
            console.error(`    ✗ FAILED: ${err}`);
            results.push({
                query: tc.query,
                retrievalScore: 0,
                faithfulnessScore: 0,
                hallucinationDetected: true,
                retrievalLatencyMs: 0,
                totalLatencyMs: 0,
                docsRetrieved: 0,
                contextLength: 0,
            });
        }
    }

    const avgRetrievalScore = results.reduce((s, r) => s + r.retrievalScore, 0) / results.length;
    const avgFaithfulnessScore = results.reduce((s, r) => s + r.faithfulnessScore, 0) / results.length;
    const hallucinationRate = results.filter(r => r.hallucinationDetected).length / results.length;
    const avgRetrievalLatencyMs = results.reduce((s, r) => s + r.retrievalLatencyMs, 0) / results.length;
    const avgTotalLatencyMs = results.reduce((s, r) => s + r.totalLatencyMs, 0) / results.length;

    // Composite RAG Quality Score (out of 10)
    // Weights: Retrieval 30%, Faithfulness 30%, No-Hallucination 25%, Speed 15%
    const speedScore = avgRetrievalLatencyMs < 50 ? 1.0 : avgRetrievalLatencyMs < 200 ? 0.8 : 0.5;
    const ragQualityScore = (
        (avgRetrievalScore * 3.0) +
        (avgFaithfulnessScore * 3.0) +
        ((1 - hallucinationRate) * 2.5) +
        (speedScore * 1.5)
    );

    const summary: EvalSummary = {
        totalTests: results.length,
        avgRetrievalScore,
        avgFaithfulnessScore,
        hallucinationRate,
        avgRetrievalLatencyMs,
        avgTotalLatencyMs,
        ragQualityScore,
        results,
    };

    console.log(`\n========== RAG EVALUATION RESULTS ==========`);
    console.log(`  Tests Run:           ${summary.totalTests}`);
    console.log(`  Avg Retrieval:       ${(summary.avgRetrievalScore * 100).toFixed(1)}%`);
    console.log(`  Avg Faithfulness:    ${(summary.avgFaithfulnessScore * 100).toFixed(1)}%`);
    console.log(`  Hallucination Rate:  ${(summary.hallucinationRate * 100).toFixed(1)}%`);
    console.log(`  Avg Retrieval Time:  ${summary.avgRetrievalLatencyMs.toFixed(0)}ms`);
    console.log(`  Avg Total Time:      ${summary.avgTotalLatencyMs.toFixed(0)}ms`);
    console.log(`  ★ RAG Quality Score: ${summary.ragQualityScore.toFixed(1)}/10`);
    console.log(`=============================================\n`);

    return summary;
}
