import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { CustomGoogleEmbeddings } from "./CustomEmbeddings";
import { ChatGroq } from "@langchain/groq";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

// Unified Model Configuration (Centralized)
export const GROQ_MODEL = process.env.NEXT_PUBLIC_GROQ_MODEL || "llama-3.1-8b-instant";
export const MISTRAL_MODEL = process.env.NEXT_PUBLIC_MISTRAL_MODEL || "mistral-small-latest";
export const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Startup Health Check: Ensures all required API keys are present.
 * Logs warnings for missing optional keys and throws for critical ones.
 */
export function validateEnv() {
    const required = [
        { key: 'PINECONE_API_KEY', critical: true },
        { key: 'REDIS_URL', critical: true },
        { key: 'ADMIN_PASSWORD', critical: true },
        { key: 'GEMINI_API_KEY', alt: 'GOOGLE_API_KEY', critical: true },
    ];

    const optional = [
        { key: 'GROQ_API_KEY', label: 'Fast Inference (Groq)' },
        { key: 'MISTRAL_API_KEY', label: 'Secondary LLM (Mistral)' },
        { key: 'OPENAI_API_KEY', label: 'Vision/Primary LLM (OpenAI)' },
    ];

    console.log("🛡️ [HealthCheck] Validating Environment Variables...");
    
    for (const { key, alt, critical } of required) {
        const val = process.env[key] || (alt ? process.env[alt] : undefined);
        if (!val) {
            const msg = `CRITICAL: Missing ${key}${alt ? ' or ' + alt : ''}. Application will fail.`;
            if (process.env.NODE_ENV === 'production' && critical) {
                console.error(`❌ ${msg}`);
            } else {
                console.warn(`⚠️ ${msg}`);
            }
        }
    }

    for (const { key, label } of optional) {
        if (!process.env[key]) {
            console.log(`ℹ️ [Optional] No ${key} found. ${label} will be bypassed.`);
        }
    }
}

// Run validation once on module load
if (typeof window === 'undefined') {
    validateEnv();
}

/**
 * Get configured Google Gemini Embeddings instance
 */
export function getEmbeddings() {
  const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error("Missing Google/Gemini API key for embeddings");
  }

  return new CustomGoogleEmbeddings({
    modelName: EMBEDDING_MODEL,
    apiKey: apiKey,
  });
}

/**
 * Get the LLM model (4-Tier Free Strategy)
 * Strategy: Gemini -> Mistral -> Groq -> Together
 */
export function getChatModel(maxRetries?: number) {
  const geminiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  const mistralKey = process.env.MISTRAL_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const togetherKey = process.env.TOGETHER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const models: any[] = [];

  // TIER 0: OpenAI (Primary if available, usually best at vision)
  if (openaiKey) {
    models.push(new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
      openAIApiKey: openaiKey,
    }));
  }

  // TIER 1: Groq (Recommended Primary for speed)
  if (groqKey) {
    models.push(new ChatGroq({
      model: GROQ_MODEL,
      temperature: 0.1,
      apiKey: groqKey,
      maxRetries: 0,
    }));
  }

  // TIER 1.5: Gemini (Extremely robust and multi-modal)
  if (geminiKey) {
    models.push(new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0.1,
      apiKey: geminiKey,
      maxRetries: 1,
    }));
  }

  // TIER 2: Mistral (Secondary)
  if (mistralKey) {
    models.push(new ChatMistralAI({
      model: MISTRAL_MODEL,
      temperature: 0.1,
      apiKey: mistralKey,
    }));
  }


  if (models.length === 0) {
    throw new Error("No valid LLM API keys configured.");
  }

  // Chain fallbacks dynamically
  let chatModel = models[0];
  for (let i = 1; i < models.length; i++) {
    chatModel = chatModel.withFallbacks({
      fallbacks: [models[i]],
    });
  }

  return chatModel;
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
- You MUST answer in the EXACT SAME LANGUAGE as the user question. If the user asks in English, you MUST answer in English. Do not use Hindi or Marathi unless the user asked in that language.

Remember: Use your tools before answering. If you greet the user, be brief and professional.`;


/**
 * Prompt for translating verified clinical content
 */
export const TRANSLATE_PROMPT = (content: string, targetLang: string) => `Translate the following medical guidance exactly into ${targetLang}. Keep any medical terms (like creatinine, GFR, PD) in English in brackets if needed for clarity. Output ONLY the translated text.\n\nContent: ${content}`;

/**
 * Standard disclaimer appended to responses
 */
export const MEDICAL_DISCLAIMER = "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

/**
 * The core RAG generation prompt
 */
export const RAG_PROMPT = (input: string, context: string, targetLang: string, sources: string[]) => `
You are a Kidney Health Assistant. You must answer questions based strictly on the provided medical guidelines. 

IMPORTANT:
1. **CITATIONS**: Use subtle inline citations like *[Source: ${sources[0] || "Nirogyam Kidney Guide"}]* for every claim.
   * AVAILABLE SOURCES: ${sources.join(", ")}
   * CROSS-REFERENCE: Be extremely careful. Check the text snippet below. Every piece of advice MUST be attributed to its specific source.
2. **LANGUAGE**: You MUST answer in **${targetLang}**. (Note: If ${targetLang} is Marathi, do NOT use Hindi. Use Marathi words like 'आहे', 'कसा', 'सांगा ही' etc.)
3. **STRICT SOURCE**: Only attribute info to its actual source doc. Do NOT attribute info to "KDIGO" if it came from "Nirogyam Kidney Guide".
4. **STRUCTURE**: Use clear headings or bullet points.

GUIDELINES:
${context}

USER QUESTION: ${input}

Response:
`;


/**
 * Prompt for correcting typos and normalizing queries before vector search
 */
export const QUERY_REFINER_PROMPT = `You are a medical query normalization and translation assistant.
Your task is to take a user question and rewrite it into a high-quality clinical search query in ENGLISH.

RULES:
1. ARABIC/HINDI/MARATHI SUPPORT: If the user asks in Hindi, Marathi, or any other language, TRANSLATE the intent to professional medical English.
2. TYPO CORRECTION: Correct all medical typos (e.g., "cretinine" -> "creatinine").
3. CLINICAL EXPANSION: Convert common terms to clinical ones if appropriate (e.g., "sugar" -> "diabetes" or "blood glucose").
4. KAJAL CORE: Keep the core clinical intent.
5. NO EXPLANATIONS: Return ONLY the English query text.

Example 1:
User: ल्युपस नेफ्रायटिस क्या है?
Output: Lupus Nephritis definition and overview

Example 2:
User: cretinine levels high effect on kidney
Output: high creatinine levels impact on renal function

User Question: {question}

English Search Query:`;

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
