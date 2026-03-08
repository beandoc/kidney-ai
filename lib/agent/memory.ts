
import { getChatModel } from "../langchain/config";
import { HumanMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

export interface FileInsight {
    summary: string;
    keyTakeaways: string[];
    priority: number; // 1-10
    clinicalCategory: string;
}

/**
 * The MemoryAgent is responsible for "active reflection" on knowledge.
 * It processes raw documents to extract structured insights.
 */
export class MemoryAgent {
    /**
     * Generate clinical insights for a document
     */
    static async generateInsight(content: string, filename: string): Promise<FileInsight> {
        const model = getChatModel();

        // Use a small portion of the content if it's too long for a quick summary
        const sampleContent = content.slice(0, 5000);

        const prompt = `
            You are a Clinical Memory Agent for a Kidney Health AI.
            Your task is to analyze the following medical document and extract structured insights.
            
            DOCUMENT FILENAME: ${filename}
            CONTENT SAMPLE:
            ${sampleContent}
            
            EXTRACT:
            1. **Summary**: A one-sentence high-level summary.
            2. **Key Takeaways**: 3-5 bullet points of clinical facts.
            3. **Clinical Priority**: Score 1-10 (10 = Life-saving guideline/emergency, 1 = General trivia).
            4. **Clinical Category**: (e.g., Dialysis, Transplant, Nutrition, AKI, CKD).
            
            Return ONLY a JSON object:
            {
                "summary": "...",
                "keyTakeaways": ["...", "..."],
                "priority": 8,
                "clinicalCategory": "..."
            }
        `;

        try {
            const response = await model.invoke([new HumanMessage(prompt)]);
            const text = response.content as string;

            // Advanced JSON extraction: find the first '{' and the last '}'
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON block found in response");

            const jsonStr = jsonMatch[0].trim();
            return JSON.parse(jsonStr) as FileInsight;
        } catch (error) {
            console.error(`MemoryAgent failed for ${filename}:`, error);
            return {
                summary: "Summary unavailable",
                keyTakeaways: [],
                priority: 5,
                clinicalCategory: "General"
            };
        }
    }
}
