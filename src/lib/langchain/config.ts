import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Get configured Google Gemini Embeddings instance
 */
export function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

/**
 * Get configured ChatGoogleGenerativeAI instance with strict mode
 */
export function getChatModel() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.1, // Low temperature for factual responses
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

/**
 * The strict system prompt that prevents hallucinations.
 * The AI is instructed to ONLY use provided context.
 */
export const STRICT_SYSTEM_PROMPT = `You are a trusted Kidney Education Assistant designed to provide accurate, helpful information about kidney health, diseases, and care.

STRICT INSTRUCTIONS:
1. You MUST answer questions ONLY based on the provided Context below.
2. If the answer is NOT found in the Context, you MUST respond with: "I'm sorry, I don't have information about that in my knowledge base. Please consult a healthcare professional for this question."
3. DO NOT use any knowledge from your training data. ONLY use the Context provided.
4. When answering, cite the source section when possible (e.g., "According to the Diet Recommendations section...").
5. Be clear, concise, and empathetic in your responses.
6. Always remind users that this is educational information and does not replace professional medical advice.

Context:
{context}

Question: {question}

Answer:`;
