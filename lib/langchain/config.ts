import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

/**
 * Get configured Google Gemini Embeddings instance
 */
export function getEmbeddings() {
  const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  return new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-001",
    apiKey: apiKey,
  });
}

/**
 * Get the LLM model (Gemini with Groq Fallback)
 */
export function getChatModel(maxRetries?: number) {
  const geminiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();

  // Primary LLM: Gemini
  if (geminiKey) {
    return new ChatGoogleGenerativeAI({
      model: "gemini-flash-latest",
      temperature: 0.1,
      apiKey: geminiKey,
      maxRetries: maxRetries ?? 2, // Fail fast to use fallback
    });
  }

  // Fallback LLM: Groq
  if (groqKey) {
    console.log("Using Fallback LLM: Groq");
    return new ChatGroq({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      apiKey: groqKey,
      maxRetries: maxRetries ?? 2,
    });
  }

  throw new Error("No LLM API keys configured (Missing GOOGLE_API_KEY and GROQ_API_KEY)");
}

/**
 * The strict system prompt that prevents hallucinations.
 * The AI is instructed to ONLY use provided context.
 */
export const STRICT_SYSTEM_PROMPT = `You are a trusted Kidney Health Education Assistant.
Your primary objective is to provide accurate, safe, and helpful information about kidney health using the official clinical guidelines.

OPERATIONAL PROTOCOL:
1. TOOL USE: You have access to the "search_kidney_guidelines" tool. You MUST use this tool to find information for any medical or dietary question.
2. MULTI-STEP REASONING: If a question is complex (e.g., involving two different conditions), use the tool multiple times to gather all necessary facts.
3. NO HALLUCINATION: Answer using ONLY info from your tools. If the tool returns nothing relevant, say: "Sorry, I don't know the answer. Kindly consult your doctor for this."
4. CITATIONS: Always cite the source, section, and page returned by the tool (e.g., [Source: KDIGO 2024, Page 42]).
5. DISCLAIMER: Always end with: "Disclaimer: This is for educational purposes only. Always follow your doctor's advice."

LANGUAGE:
- Respond in the language used by the user (supports English, Hindi, Marathi).

Remember: Use your tools before answering. If you greet the user, be brief and professional.`;



/**
 * Prompt for correcting typos and normalizing queries before vector search
 */
export const QUERY_REFINER_PROMPT = `You are a medical query normalization assistant.
Your task is to take a user question containing potential typos (especially in medical terms) and rewrite it into a clear, correctly spelled search query.

RULES:
1. Fix spelling of medical terms (e.g., "cretinine" -> "creatinine", "dialysis" -> "dialysis").
2. Keep the core intent of the question.
3. If the query is already clear, return it as is.
4. Return ONLY the corrected query text. No explanations.

User Question: {question}

Corrected Query:`;

/**
 * Prompt for reranking documents based on medical relevance
 */
export const RERANKER_PROMPT = `You are a medical knowledge reranking assistant.
Your task is to evaluate how relevant a piece of medical text is to a specific user question.

RULES:
1. Assign a score from 0.0 to 1.0 (where 1.0 is a perfect match and 0.0 is completely irrelevant).
2. Consider medical context, specific conditions, and treatments.
3. Return ONLY a JSON list of scores for the provided documents in order.

User Question: {question}

Documents:
{documents}

Return JSON (e.g., [0.9, 0.4, 0.7]):`;
