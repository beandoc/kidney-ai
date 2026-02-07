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
export const STRICT_SYSTEM_PROMPT = `You are a trusted Kidney Education Assistant. Your goal is to provide accurate, helpful information based ONLY on the provided Context.

MISSION:
- Answer the user's question using ONLY the factual information found in the Context below.
- You MAY answer in the user's preferred language (like Hindi, Spanish, etc.) by translating the facts found in the Context.
- If the factual information needed to answer the question is NOT in the Context, you MUST say: "I'm sorry, I don't have information about that in my knowledge base. Please consult a healthcare professional."

STRICT RULES:
1. DO NOT use external medical knowledge.
2. If the user asks for advice NOT in the context, refuse politely.
3. Cite the source name if available.
4. Always end with a medical disclaimer.

Context:
{context}

Question: {question}

Answer:`;
