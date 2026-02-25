import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import * as fs from "fs";
import * as path from "path";
import { getProfile } from "./memory";

import * as dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// --- Types & State ---

interface AgentState {
    input: string;
    chatHistory: BaseMessage[];
    context: string;
    sources: string[];
    draftAnswer: string;
    verdict: "PASS" | "FAIL" | "RETRY" | "TERMINATE";
    feedback: string;
    iteration: number;
    patientData?: any;
    memory?: string[];
    thoughts?: string;
}

// --- Constants ---
const MAX_ITERATIONS = 2;

// --- Node 0: Router (Triage) ---
// Determines if the question is within the medical scope of the assistant
async function routerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Router] Triaging query...");
    try {
        const model = getChatModel();
        const prompt = `
    You are a Kidney Health Triage Agent.
    
    USER QUERY: ${state.input}
    
    TASK: Decide if this query is related to kidney health, general medical advice, or diet.
    If it is about weather, sports, politics, or general non-medical chat, reply with "TERMINATE".
    Otherwise, reply with "PROCEED".
    
    REPLY ONLY THE WORD.
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);
        const result = (response.content as string).trim().toUpperCase();
        console.log("[Node: Router] Result:", result);

        return {
            verdict: result === "TERMINATE" ? "TERMINATE" : "RETRY"
        };
    } catch (error: any) {
        console.error("[Node: Router] Error:", error);
        if (error?.message?.includes("429") || error?.status === 429) {
            throw error; // Rethrow quota limits to main agent loop
        }
        return { verdict: "RETRY" }; // Default to proceed if triage fails
    }
}

// --- Node 1: Clinical Data (Mock SQL Agent) ---
// Fetches records from a structured source (Phase 2, Node B)
async function patientNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Patient Data] Querying clinical database...");
    try {
        const filePath = path.join(process.cwd(), "knowledge_base", "patients.json");
        if (!fs.existsSync(filePath)) return { patientData: null };
        const patients = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // For demo, we assume the session belongs to pt-001
        return { patientData: patients[0]?.vitals || null };
    } catch (e) {
        console.error("[Node: Patient Data] Error:", e);
        return { patientData: null };
    }
}

// --- Node 2: Memory Retrieval (Mem0 Logic) ---
// Fetches long-term facts/allergies (Phase 3)
async function memoryNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Memory] Accessing patient medical profile...");
    try {
        const profile = getProfile("user-test");
        return { memory: profile.medicalFacts };
    } catch (e) {
        console.error("[Node: Memory] Error:", e);
        return { memory: [] };
    }
}

// --- Node 3: Researcher ---
// Finds info and drafts an answer
async function researcherNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log(`[Node: Researcher] Researching: ${state.input}`);
    try {
        // Decide what to search for (use the feedback if this is a retry)
        const searchQuery = state.feedback ? `Specifically find: ${state.feedback}` : state.input;

        const docs = await searchPageIndex(searchQuery);
        const newContext = formatPageIndexContext(docs);

        // Extract unique sources for the UI
        const newSources = docs.map(d => `${d.metadata.source}${d.metadata.title ? ` - ${d.metadata.title}` : ""}`);
        const uniqueSources = Array.from(new Set([...state.sources, ...newSources]));

        // Combine with existing context to build a complete picture
        const combinedContext = state.context ? `${state.context}\n\n${newContext}` : newContext;

        const model = getChatModel();
        const prompt = `
    You are a Kidney Health Research Agent.
    
    USER QUESTION: ${state.input}
    
    RESOURCES: ${combinedContext}
    
    TASK: Answer the user's question USING ONLY the information provided in the RESOURCES block above.
    
    STRICT RULES:
    1. If the RESOURCES provided do not clearly contain the answer to the user's question, you MUST reply EXACTLY with: "Sorry, I don't know the answer for this question. Consult your nephrologist." Do not attempt to guess or use outside knowledge.
    2. Answer the question comprehensively based on the resources.
    3. Always cite sources from the text like this: [Source: Name].
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);

        return {
            context: combinedContext,
            sources: uniqueSources,
            draftAnswer: response.content as string,
            iteration: state.iteration + 1
        };
    } catch (error: any) {
        console.error("[Node: Researcher] Error:", error);
        if (error?.message?.includes("429") || error?.status === 429) {
            throw error; // Rethrow quota limits to main agent loop
        }
        return { draftAnswer: "I encountered an error while researching. Please try again.", iteration: state.iteration + 1 };
    }
}

// --- Node 4: Verifier (The Medical QA) ---
// Checks for correctness and hallucinations
async function verifierNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("[Node: Verifier] Checking for inaccuracies...");
    try {
        const model = getChatModel();
        const prompt = `
    You are a Senior Medical Verification Agent (Reasoning Mode).
    
    CONTEXT: ${state.context}
    VITAL STATS: ${JSON.stringify(state.patientData)}
    DRAFT ANSWER: ${state.draftAnswer}
    
    TASK: Verify the answer against medical guidelines and the patient's specific health data.
    
    CRITICAL COST-SAVING RULE:
    If the DRAFT ANSWER is EXACTLY "Sorry, I don't know the answer for this question. Consult your nephrologist.", you MUST output the verdict as "PASS". Do not fail it.
    
    OUTPUT FORMAT:
    <thought>
    Detail your clinical reasoning here. Check if the draft correctly applied the patient's vitals to the guidelines. 
    Point out any inconsistencies or missing citations.
    </thought>
    
    JSON:
    {
      "verdict": "PASS" or "FAIL",
      "reasoning": "Audit summary."
    }
  `;

        const response = await model.invoke([new HumanMessage(prompt)]);
        const text = response.content as string;

        // Extract Reasoning Block
        const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/);
        const thoughts = thoughtMatch ? thoughtMatch[1].trim() : "No reasoning provided.";

        let result = { verdict: "PASS", reasoning: "Validation skipped due to format error." };
        try {
            const jsonPart = text.includes("JSON:") ? text.split("JSON:")[1] : text;
            const stripped = jsonPart.replace(/```json|```/g, "").trim();
            result = JSON.parse(stripped);
        } catch (e) {
            console.warn("[Node: Verifier] JSON Parse fail, defaulting to PASS", e);
        }

        return {
            verdict: result.verdict === "PASS" ? "PASS" : "FAIL",
            feedback: result.reasoning,
            thoughts: thoughts
        };
    } catch (e: any) {
        console.error("[Node: Verifier] Global Error:", e);
        if (e?.message?.includes("429") || e?.status === 429) {
            throw e; // Rethrow quota limits to main agent loop
        }
        return { verdict: "PASS" };
    }
}

// --- Main Agent Loop (Simulated Graph) ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log("[Agent] Starting new session for query:", input);
    let state: AgentState = {
        input,
        chatHistory,
        context: "",
        sources: [],
        draftAnswer: "",
        verdict: "RETRY",
        feedback: "",
        iteration: 0
    };

    try {
        yield "__STATUS__:� Searching Knowledge Base...\n";

        // Simplified Routine: Only fetch from knowledge base and answer
        const researchUpdates = await researcherNode(state);
        state = { ...state, ...researchUpdates };

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        yield "__CLEAR_STATUS__\n";

        if (globalError?.message?.includes("429") || globalError?.status === 429) {
            yield "⚠️ **System Alert: API Rate Limit Exceeded**\nWe have temporarily hit our Google API quota limit because of too many requests. Please wait about a minute and try again. For production, upgrading to a pay-as-you-go tier is recommended.";
        } else {
            yield "I encountered a technical problem while processing your request. Please try again in a few moments.";
        }
        return;
    }

    // Final delivery
    if (state.sources.length > 0) {
        yield `__SOURCES__:${JSON.stringify(state.sources)}\n`;
    }

    yield "__CLEAR_STATUS__\n";

    let finalResponse = "";

    // Add Deep-Thought Block
    if (state.thoughts) {
        finalResponse += `<thought>\n${state.thoughts}\n</thought>\n\n`;
    }

    finalResponse += state.draftAnswer;

    // Add a formal Verification Report if requested by the protocol
    if (state.feedback) {
        finalResponse += `\n\n---\n**✓ Verification Report:** ${state.feedback}`;
    }

    finalResponse += "\n\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    yield finalResponse;
}
