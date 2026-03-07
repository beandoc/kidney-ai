import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export class CustomGoogleEmbeddings extends GoogleGenerativeAIEmbeddings {
    async embedDocuments(documents: string[]): Promise<number[][]> {
        console.log(`[CustomEmbeddings] embedding ${documents.length} chunks manually...`);
        const vectors: number[][] = [];
        for (const doc of documents) {
            const vector = await this.embedQuery(doc);
            if (!vector || vector.length === 0) {
                console.warn("[CustomEmbeddings] Warning: 0-length vector for doc!");
                vectors.push(new Array(3072).fill(0));
            } else {
                vectors.push(vector);
            }
        }
        return vectors;
    }
}
