import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import Fuse from "fuse.js";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";
import { getCachedResponse, setCachedResponse } from "./cache";
import { MAIN_MENU, DISEASE_MENU, LABS_MENU, TRANSPLANT_MENU, VACCINE_MENU, DISCHARGE_MENU, EXPLORE_MENU, BASICS_MENU, GN_MENU, DIALYSIS_MENU, PD_MENU, STONES_MENU, DIET_MENU, getMenuPayload } from "./menu";
import { searchSemantic } from "./langchain/pinecone";

// Future-proofed modular imports
import { GOLD_ANSWERS } from "./knowledge/index";
import { virtualLocalModel } from "./agent/classifier";
import { buildContextAwareQuery, prewarmAgent } from "./agent/utils";
import { getDynamicGoldAnswers, logFailedQuery } from "./redis";
import { findGoldMatch } from "./agent/triggers";

export { prewarmAgent };

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[], image?: string, isNavigationOnly: boolean = false) {
   console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length, hasImage: !!image, isNavigationOnly }));

   const normalizedInput = input.trim().toLowerCase();

   // TIER -2: Image Analysis (Multimodal OCR)
   if (image) {
      yield "Analyzing your medical report or image... <thought>Performing OCR and clinical pattern matching on the provided image.</thought>";

      try {
         const model = getChatModel();
         const message = new HumanMessage({
            content: [
               { type: "text", text: input || "Please analyze this medical image or report." },
               { type: "image_url", image_url: image }
            ]
         });

         const response = await model.invoke([message]);
         yield response.content as string;
         return;
      } catch (err: any) {
         console.error("Image analysis failed:", err);
         yield "⚠️ Failed to analyze image. Please ensure it is a clear medical report. Error: " + err.message;
         return;
      }
   }

   // TIER -1: Navigation & Menus (Zero Tokens)
   if (normalizedInput === "menu" || normalizedInput === "options" || normalizedInput === "show main menu" || normalizedInput === "hi" || normalizedInput === "hello") {
      yield "Hello! I'm **Nirogyam Kidney AI ChatBot** — I am here to assist you with all your questions about Kidney diseases, and guide you for better Kidney health." + getMenuPayload(MAIN_MENU);
      return;
   }

   if (normalizedInput === "show disease categories") {
      yield "Please select a disease category to learn more from our verified guidelines:" + getMenuPayload(DISEASE_MENU);
      return;
   }

   if (normalizedInput === "understanding kidney lab results") {
      yield "Select a lab parameter to understand its meaning and impact on kidney health:" + getMenuPayload(LABS_MENU);
      return;
   }

   if (normalizedInput === "show transplant menu") {
      yield "Kidney Transplant is a life-changing procedure. Explore these topics to understand the process:" + getMenuPayload(TRANSPLANT_MENU);
      return;
   }

   if (normalizedInput === "show vaccine menu") {
      yield "Vaccinations protect kidney patients from serious infections. Select a category below:" + getMenuPayload(VACCINE_MENU);
      return;
   }

   if (normalizedInput === "show discharge menu") {
      yield "Leaving the hospital is a critical time for kidney health. Select your condition or procedure for post-discharge instructions:" + getMenuPayload(DISCHARGE_MENU);
      return;
   }

   if (normalizedInput === "show explore menu") {
      yield "Explore our comprehensive library of clinician-verified kidney health topics:" + getMenuPayload(EXPLORE_MENU);
      return;
   }

   if (normalizedInput === "show basics menu") {
      yield "Foundational knowledge to help you understand and protect your kidneys:" + getMenuPayload(BASICS_MENU);
      return;
   }

   if (normalizedInput === "show gn menu") {
      yield "Detailed guidance on Glomerulonephritis (GN), its diagnosis, and modern treatments:" + getMenuPayload(GN_MENU);
      return;
   }

   if (normalizedInput === "show dialysis menu") {
      yield "Everything you need to know about starting and living well on dialysis:" + getMenuPayload(DIALYSIS_MENU);
      return;
   }

   if (normalizedInput === "show pd menu") {
      yield "Peritoneal Dialysis is a home-based treatment. Explore these topics to manage your care effectively:" + getMenuPayload(PD_MENU);
      return;
   }

   if (normalizedInput === "show stones menu") {
      yield "Managing kidney stones, preventing infections, and keeping your urinary system healthy:" + getMenuPayload(STONES_MENU);
      return;
   }

   if (normalizedInput === "diet and lifestyle advice" || normalizedInput === "show diet menu") {
      yield "What you eat plays a huge role in kidney health. Explore these clinical dietary guidelines:" + getMenuPayload(DIET_MENU);
      return;
   }

   if (normalizedInput === "stay connected on whatsapp") {
      yield "Stay Connected on WhatsApp! \n\nJoin our community to get the latest health tips, medical guidelines, and community support directly on your mobile device. \n\n🔗 **Follow Our Channel:** [WhatsApp Channel](https://www.whatsapp.com/channel/0029Vb5gVK6A2pLFXRiHT23R)";
      return;
   }

   // TIER 0: Virtual Local Model (Zero Token Cost - Handled in 1ms)
   const localResponse = virtualLocalModel(normalizedInput);
   if (localResponse) {
      console.log(JSON.stringify({ event: "LocalModelTriggered", category: "small_talk" }));
      yield localResponse;
      return;
   }

   // TIER 1: Gold Answer Matching (Zero Token Cost - Handled locally)
   let goldMatchKey: string | null = null;

   const isTranslationRequested = normalizedInput.includes("hindi") || normalizedInput.includes("marathi") || normalizedInput.includes("translate") || normalizedInput.includes("urdu");

   const isComparison = normalizedInput.includes("compare") || normalizedInput.includes(" vs ") || normalizedInput.includes("difference") || normalizedInput.includes("than") || (normalizedInput.includes("calculate") && normalizedInput.includes("stage"));

   const dynamicGold = await getDynamicGoldAnswers();
   const allGold = { ...GOLD_ANSWERS, ...dynamicGold };

   // Tier 1 logic
   if (!isComparison) {
      if (allGold[normalizedInput]) {
         goldMatchKey = normalizedInput;
      }
      // Step 2: Fuzzy Match for Typos (Handles spelling/grammar errors)
      else if (normalizedInput.length > 5) {
         const goldKeys = Object.keys(allGold).filter(k => !k.includes(":") && k.length > 5);
         const fuse = new Fuse(goldKeys, {
            threshold: 0.28,
            distance: 100,
            ignoreLocation: true
         });
         const fuzzyResults = fuse.search(normalizedInput);
         if (fuzzyResults.length > 0) {
            goldMatchKey = fuzzyResults[0].item;
            console.log(JSON.stringify({ event: "GoldMatch_Fuzzy", query: normalizedInput, match: goldMatchKey }));
         }
      }

      // Step 3: Keyword Search (Broad Fallback)
      if (!goldMatchKey) {
         goldMatchKey = findGoldMatch(normalizedInput);
      }
   }

   if (goldMatchKey && allGold[goldMatchKey]) {
      const content = allGold[goldMatchKey];
      console.log(JSON.stringify({ event: "GoldMatch", key: goldMatchKey, translated: isTranslationRequested }));

      if (isTranslationRequested) {
         const langCode = normalizedInput.includes("hindi") ? "hi" : normalizedInput.includes("marathi") ? "mr" : normalizedInput.includes("urdu") ? "ur" : null;
         const targetLang = langCode === "hi" ? "Hindi" : langCode === "mr" ? "Marathi" : langCode === "ur" ? "Urdu" : "the requested language";

         // 1. TIER 0: Pre-translated expert content (Blazing Fast + Free)
         if (langCode && allGold[`${goldMatchKey}:${langCode}`]) {
            console.log(JSON.stringify({ event: "GoldMatch_PreTranslated", key: goldMatchKey, lang: langCode }));
            yield allGold[`${goldMatchKey}:${langCode}`];
            return;
         }

         // Block new translations for navigationOnly users to save costs
         if (isNavigationOnly) {
            yield content + "\n\n*(Translation for this complex topic is limited to registered clinicians. Showing English version for accuracy)*" + getMenuPayload(MAIN_MENU);
            return;
         }

         // 2. TIER 1: On-the-fly machine translation (Fallback)
         yield `Retrieved verified clinical answer. Translating to ${targetLang}... <thought>Found Gold Match for "${goldMatchKey}". Using lightweight translation model as no pre-translated version was found in the registry.</thought>`;

         try {
            const model = getChatModel();
            const translatePrompt = `Translate the following medical guidance exactly into ${targetLang}. Keep any medical terms (like creatinine, GFR, PD) in English in brackets if needed for clarity. Output ONLY the translated text.\n\nContent: ${content}`;
            const response = await model.invoke([new HumanMessage(translatePrompt)]);
            yield response.content as string;
            return;
         } catch (e) {
            console.error("Translation of gold answer failed:", e);
            yield content + "\n\n*(Translation failed, showing English version for safety)*";
            return;
         }
      }

      yield content;
      return;
   }

   // RESTRICTION: Exit before expensive tiers if navigation-only mode is active
   if (isNavigationOnly) {
      yield "I'm sorry, I couldn't find a verified guide for that specific query in the explorer menu. Please use the menu buttons below to navigate clinical guidelines." + getMenuPayload(MAIN_MENU);
      return;
   }

   // TIER 2: Semantic Cache (High Cost Reduction)
   const cached = await getCachedResponse(input);
   if (cached) {
      console.log(JSON.stringify({ event: "ResponseServedFromCache", query: input }));
      const tokens = cached.split(" ");
      for (const token of tokens) {
         yield token + " ";
         await new Promise(r => setTimeout(r, 10));
      }
      return;
   }

   // IMMEDIATE PULSE
   yield " ";

   try {
      const enrichedInput = buildContextAwareQuery(input, chatHistory);
      console.log(`[Agent] Enriched input: "${enrichedInput}"`);

      // STEP 1: SINGLE-PASS HYBRID RETRIEVAL (Optimized for Latency)
      const timeoutPromise = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T | null> =>
         Promise.race([
            promise,
            new Promise<null>((resolve) => setTimeout(() => {
               console.warn(`[Agent] ${name} timed out after ${timeoutMs}ms`);
               resolve(null);
            }, timeoutMs))
         ]);

      // 1.1: Refine FIRST (2-3s) - Normalizes typos and translates to English
      const refinedInput = await timeoutPromise(refineQuery(enrichedInput), 4000, "Refinement");
      const finalSearchQuery = refinedInput || enrichedInput;

      // 1.2: Single Focused Search (Parallel)
      const [keywordDocs, semanticDocs] = await Promise.all([
         searchPageIndex(finalSearchQuery),
         timeoutPromise(searchSemantic(finalSearchQuery, 10), 8000, "Pinecone Search")
      ]);

      const safeSemanticDocs = semanticDocs || [];
      const safeKeywordDocs = keywordDocs || [];
      const allDocs = [...safeKeywordDocs, ...safeSemanticDocs];

      // HYBRID MERGE: Reciprocal Rank Fusion (RRF)
      const K = 60;
      const rrfScores = new Map<string, number>();
      const docMap = new Map<string, any>();

      const applyRRF = (docs: any[], weight = 1.0) => {
         docs.forEach((doc, rank) => {
            const id = `${doc.metadata.source}-${doc.metadata.title}-${doc.pageContent.slice(0, 50)}`;
            docMap.set(id, doc);
            const currentScore = rrfScores.get(id) || 0;
            rrfScores.set(id, currentScore + (weight / (K + rank + 1)));
         });
      };

      applyRRF(safeKeywordDocs, 1.0);
      applyRRF(safeSemanticDocs, 1.2);

      const uniqueDocs = Array.from(rrfScores.keys())
         .map(id => ({ id, score: rrfScores.get(id)! }))
         .sort((a, b) => b.score - a.score)
         .map(item => docMap.get(item.id)!);

      // STEP 1.2: CONDITIONAL RERANKING
      let finalDocs = uniqueDocs;
      if (uniqueDocs.length > 1) {
         // yield `<thought>High-level guidance says: ${uniqueDocs[0].metadata.summary?.slice(0, 100)}...</thought>`;
         const topCandidates = uniqueDocs.slice(0, 4);
         const remainingDocs = uniqueDocs.slice(4);
         const reranked = await timeoutPromise(rerankDocuments(finalSearchQuery, topCandidates), 8000, "Reranking");
         finalDocs = [...(reranked || topCandidates), ...remainingDocs];
      }

      // Context Truncation (Strict for TPM budgeting)
      let context = formatPageIndexContext(finalDocs);
      if (context.length > 8000) context = context.slice(0, 8000) + "\n...[truncated]";

      // SOURCE SHORTENING
      const cleanSourceName = (name: string) => {
         return name.replace(/\.(pdf|md|docx|txt)$/i, "").replace(/-Guideline-English|-English|-Guideline/i, "").replace(/-/g, " ").replace(/AKI|CKD|AKI Trial/gi, "").trim();
      };

      const sources = uniqueDocs.map(d => cleanSourceName(d.metadata.source));
      const uniqueSources = Array.from(new Set(sources));

      const model = getChatModel();
      const prompt = `
            You are a Kidney Health Assistant. 
            
            TASK:
            1. Language: Answer in the same language as the USER. (English/Hindi/Marathi).
            2. Content: Answer using ONLY the provided Guidelines.
            3. Citations: Use subtle inline citations like *[Source: KDIGO 2012]*. 
               * Sources: ${uniqueSources.join(", ")}
            4. **EXTREME BREVITY**: Max 2-3 concise sentences.
            5. **SAFETY**: If not in guidelines, say "Sorry, I don't know the answer for this."
            
            GUIDELINES:
            ${context}
            
            USER QUESTION: ${input}
            
            Answer:
        `;

      const finalStream = await model.stream([...chatHistory, new HumanMessage(prompt)]);
      let fullResponse = "";

      for await (const chunk of finalStream) {
         if (chunk.content) {
            const text = chunk.content as string;
            fullResponse += text;
            yield text;
         }
      }

      // Log if AI failed to answer from guidelines
      if (fullResponse.toLowerCase().includes("don't know") || fullResponse.toLowerCase().includes("sorry")) {
         logFailedQuery(input).catch(e => console.error("Failed to log query:", e));
      }

      // 6. SMART GUIDANCE (Guided Exploration)
      // Map retrieved clinical category to a specific follow-up menu
      const topCategory = uniqueDocs[0]?.metadata?.category?.toLowerCase();
      let suggestedMenu = MAIN_MENU;
      let guidanceLabel = "\n\nExplore further clinical details:";

      if (topCategory?.includes("transplant")) {
         suggestedMenu = TRANSPLANT_MENU;
         guidanceLabel = "\n\nExplore our special Transplant Guidelines:";
      } else if (topCategory?.includes("lab") || topCategory?.includes("creatinine") || topCategory?.includes("gfr")) {
         suggestedMenu = LABS_MENU;
         guidanceLabel = "\n\nNeed help interpreting lab results?";
      } else if (topCategory?.includes("vaccin")) {
         suggestedMenu = VACCINE_MENU;
         guidanceLabel = "\n\nRecommended vaccinations for kidney patients:";
      } else if (topCategory?.includes("discharge") || topCategory?.includes("care plan") || topCategory?.includes("follow up") || topCategory?.includes("fistula care") || topCategory?.includes("catheter") || topCategory?.includes("biopsy")) {
         suggestedMenu = DISCHARGE_MENU;
         guidanceLabel = "\n\nNeed post-discharge guidance for specific procedures?";
      } else if (topCategory?.includes("dialysis") || topCategory?.includes("disease") || topCategory?.includes("ckd") || topCategory?.includes("aki")) {
         suggestedMenu = DISEASE_MENU;
         guidanceLabel = "\n\nLearn more about this condition from verified guidelines:";
      }

      const finalResponseWithDisclaimer = fullResponse +
         "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*" +
         guidanceLabel + getMenuPayload(suggestedMenu);

      setCachedResponse(input, finalResponseWithDisclaimer).catch(e => console.error("Cache store failure:", e));

   } catch (globalError: any) {
      console.error("[Agent] CRITICAL FAILURE:", globalError);
      yield `\n\n⚠️ **System Error:** ${globalError?.message || String(globalError)}\n\nPlease check your settings or contact the administrator.`;
   }
}
