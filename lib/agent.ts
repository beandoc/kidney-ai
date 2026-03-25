import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import Fuse from "fuse.js";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel, MEDICAL_DISCLAIMER, RAG_PROMPT, TRANSLATE_PROMPT } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";
import { getCachedResponse, setCachedResponse } from "./cache";
import {
   MAIN_MENU, DISEASE_MENU, LABS_MENU, TRANSPLANT_MENU, VACCINE_MENU, DISCHARGE_MENU, EXPLORE_MENU,
   BASICS_MENU, GN_MENU, DIALYSIS_MENU, PD_MENU, STONES_MENU, DIET_MENU,
   PD_BASICS_MENU, PD_CARE_MENU, PD_SAFETY_MENU, PD_LIFESTYLE_MENU, PD_LOGISTICS_MENU,
   TRANSPLANT_PREP_MENU, TRANSPLANT_SURGERY_MENU, TRANSPLANT_LIFE_MENU,
   getMenuPayload, MenuOption
} from "./menu";
import { searchSemantic } from "./langchain/pinecone";

// Future-proofed modular imports
import { getGoldAnswers } from "./knowledge/index";
import { virtualLocalModel } from "./agent/classifier";
import { buildContextAwareQuery, prewarmAgent, levenshteinDistance } from "./agent/utils";
import { getDynamicGoldAnswers, logFailedQuery, logFeedback } from "./redis";
import { findGoldMatch } from "./agent/triggers";

export { prewarmAgent };

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[], image?: string, isNavigationOnly: boolean = false): AsyncGenerator<string, void, unknown> {
   console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length, hasImage: !!image, isNavigationOnly }));

   const normalizedInput = input.trim().toLowerCase();

   // TIER -2: Instant Language Toggle Logic
   const supportedLanguageFlipCommands: Record<string, string> = {
      "hindi": "hi", "हिंदी": "hi", "marathi": "mr", "मराठी": "mr", "english": "en", "angrezi": "en",
      "tell in hindi": "hi", "hindi mein batao": "hi", "marathi madhe sanga": "mr", "tell in marathi": "mr"
   };

   if (supportedLanguageFlipCommands[normalizedInput] && chatHistory.length > 0) {
      const lastUserMsg = [...chatHistory].reverse().find(m => m instanceof HumanMessage && m.content.toString().length > 10);
      if (lastUserMsg) {
         const previousQuery = lastUserMsg.content.toString();
         const targetLang = normalizedInput;
         console.log(JSON.stringify({ event: "InstantLanguageFlip", from: previousQuery, to: targetLang }));
         yield* runAgent(`${previousQuery} in ${targetLang}`, chatHistory.slice(0, -1), undefined, isNavigationOnly);
         return;
      }
   }

   // Handle Feedback/Rating Commands
   if (normalizedInput.startsWith("rating:")) {
      try {
         const parts = input.split(":");
         const rating = parseInt(parts[1]);
         const previousQuery = parts[2] || "unknown";
         const previousResponse = parts.slice(3).join(":") || "unknown";

         await logFeedback(previousQuery, previousResponse, rating);
         yield "Thank you for your feedback! It helps me provide better kidney care guidelines. Is there anything else you'd like to learn today?";
         return;
      } catch (e) {
         console.error("Failed to parse rating:", e);
      }
   }

   // TIER -2: Image Analysis (Multimodal OCR)
   if (image) {
      yield "Analyzing your medical report or image...";
      try {
         const model = getChatModel();
         const message = new HumanMessage({
            content: [
               { type: "text", text: input || "Please analyze this medical image or report." },
               { type: "image_url", image_url: image }
            ]
         });

         const response = await model.invoke([message]);
         yield (response.content as string);
         return;
      } catch (err: any) {
         console.error("Image analysis failed:", err);
         yield "⚠️ Failed to analyze image. Please ensure it is a clear medical report. Error: " + err.message;
         return;
      }
   }

   // TIER -1: Navigation & Menus (Zero Tokens)
   if (normalizedInput === "menu" || normalizedInput === "options" || normalizedInput === "show main menu" || normalizedInput === "hi" || normalizedInput === "hello") {
      yield "Hello! I'm **Nirogyam Kidney AI ChatBot**. I am here to assist with your **Post Hospital Discharge Pathway**, 🔍 **Explore Options**, and 🛡️ **Prevention Tips**." + getMenuPayload(MAIN_MENU);
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
      yield "Kidney Transplant is a life-changing procedure. Explore these categories to understand the process:" + getMenuPayload(TRANSPLANT_MENU);
      return;
   }

   if (normalizedInput === "show transplant prep menu") {
      yield "Preparation and evaluation are the first steps toward a successful transplant:" + getMenuPayload(TRANSPLANT_PREP_MENU);
      return;
   }

   if (normalizedInput === "show transplant surgery menu") {
      yield "What to expect during the operation and the immediate recovery phase:" + getMenuPayload(TRANSPLANT_SURGERY_MENU);
      return;
   }

   if (normalizedInput === "show transplant life menu") {
      yield "Life after transplant requires commitment to medication and proactive health checks:" + getMenuPayload(TRANSPLANT_LIFE_MENU);
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
      yield "Peritoneal Dialysis is a home-based treatment. Explore these categories to manage your care effectively:" + getMenuPayload(PD_MENU);
      return;
   }

   if (normalizedInput === "show pd basics menu") {
      yield "Foundational knowledge about how Peritoneal Dialysis works and choosing your schedule:" + getMenuPayload(PD_BASICS_MENU);
      return;
   }

   if (normalizedInput === "show pd care menu") {
      yield "Detailed guidance on catheter surgery and daily maintenance of your PD access:" + getMenuPayload(PD_CARE_MENU);
      return;
   }

   if (normalizedInput === "show pd safety menu") {
      yield "Critical steps for preventing infections and troubleshooting flow issues at home:" + getMenuPayload(PD_SAFETY_MENU);
      return;
   }

   if (normalizedInput === "show pd lifestyle menu") {
      yield "Managing your diet, medications, and physical activity while on PD:" + getMenuPayload(PD_LIFESTYLE_MENU);
      return;
   }

   if (normalizedInput === "show pd logistics menu") {
      yield "Everything you need to know about supplies, storage, and home sterilization:" + getMenuPayload(PD_LOGISTICS_MENU);
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

   // Enhanced Language Detection (Devanagari Script Check)
   const isHindiScript = /[\u0900-\u094F\u0966-\u097F]/.test(normalizedInput);
   const isMarathiRequested = normalizedInput.includes("marathi") || normalizedInput.includes("मराठी") || /\b(आहे|काय|कसा|हो|नको|बघ|सांगा|सांग)\b/.test(normalizedInput);
   const isHindiRequested = (normalizedInput.includes("hindi") || normalizedInput.includes("हिंदी") || isHindiScript) && !isMarathiRequested;
   const isUrduRequested = normalizedInput.includes("urdu") || normalizedInput.includes("उर्दू");

   const isTranslationRequested = isHindiRequested || isMarathiRequested || isUrduRequested || normalizedInput.includes("translate") || normalizedInput.includes("tell in") || normalizedInput.includes("bolava");

   const isComparison = normalizedInput.includes("compare") || normalizedInput.includes(" vs ") || normalizedInput.includes("difference") || normalizedInput.includes("than") || (normalizedInput.includes("calculate") && normalizedInput.includes("stage"));

   const clinicalKeywords = [
      "treatment", "management", "medicine", "medication", "dosage", "dose",
      "protocol", "therapy", "clinical", "research", "mechanism", "surgery", "procedure", "cure", "heal",
      "guideline", "scientific", "pathology", "diagnosis", "managing"
   ];

   const clinicalWords = normalizedInput.split(/\s+/);
   const isClinicalDeepDive = clinicalKeywords.some((k: string) => {
      if (clinicalWords.some(w => w === k)) return true;
      const regex = new RegExp(`\\b${k}\\b`, "i");
      if (regex.test(normalizedInput)) return true;
      if (k.length > 5) {
         return clinicalWords.some(w => {
            if (w.length < 5) return false;
            const distance = levenshteinDistance(w, k);
            return distance <= 2;
         });
      }
      return false;
   });

   const curatedTopics = [
      "transplant", "biopsy", "anca", "creatinine", "proteinuria", "fistula", "catheter", "dialysis"
   ];
   const isCuratedTopic = curatedTopics.some(t => normalizedInput.includes(t));

   // --- GOLD MATCHING LAYER ---
   let cleanMatchQuery = normalizedInput
      .replace(/[?.,!:-]$/, "")
      .trim();
   
   if (isTranslationRequested) {
      cleanMatchQuery = cleanMatchQuery
         .replace(/\b(in|into|madhe|madhe sanga|mein|mein batao|bolava|sanga|tell in|translate to)\b/g, "")
         .replace(/\b(hindi|marathi|urdu|english|angrezi|हिंदी|मराठी)\b/g, "")
         .replace(/\s+/g, " ")
         .trim();
   }

   const goldAnswers = getGoldAnswers();
   const dynamicGold = await getDynamicGoldAnswers();
   const allGold = { ...goldAnswers, ...dynamicGold };
   const langCode = isMarathiRequested ? "mr" : isHindiRequested ? "hi" : isUrduRequested ? "ur" : null;

   // 1. Exact Match
   if (allGold[cleanMatchQuery] || allGold[normalizedInput]) {
      if (langCode && allGold[`${cleanMatchQuery}:${langCode}`]) goldMatchKey = `${cleanMatchQuery}:${langCode}`;
      else if (allGold[cleanMatchQuery]) goldMatchKey = cleanMatchQuery;
      else if (langCode && allGold[`${normalizedInput}:${langCode}`]) goldMatchKey = `${normalizedInput}:${langCode}`;
      else if (allGold[normalizedInput]) goldMatchKey = normalizedInput;
   } 
   
   // 2. Single-word Match (Meds/Topics)
   if (!goldMatchKey && normalizedInput.length > 3) {
      const keys = Object.keys(allGold);
      const partialMatch = keys.find(k => k.toLowerCase().includes(normalizedInput.toLowerCase()) && !k.includes(":"));
      if (partialMatch) {
         goldMatchKey = partialMatch;
         console.log(JSON.stringify({ event: "GoldMatch_Partial", query: normalizedInput, match: goldMatchKey }));
      }
   }

   // 3. Keyword Logic Match
   if (!goldMatchKey) {
      goldMatchKey = findGoldMatch(cleanMatchQuery) || findGoldMatch(normalizedInput);
   }

   // 4. Fuzzy Match (Fallback)
   if (!goldMatchKey && normalizedInput.length > 5) {
      const goldKeys = Object.keys(allGold).filter(k => !k.includes(":") && k.length > 5);
      const fuse = new Fuse(goldKeys, { threshold: 0.28, distance: 100, ignoreLocation: true });
      const fuzzyResults = fuse.search(normalizedInput);
      if (fuzzyResults.length > 0) {
         goldMatchKey = fuzzyResults[0].item;
      }
   }

   // --- PREPARE METADATA DECORATOR ---
   let suggestedMenu = MAIN_MENU;
   let guidanceLabel = "\n\nExplore further clinical details:";
   const combinedTopicStr = (goldMatchKey || normalizedInput + " " + (isCuratedTopic ? "curated" : "")).toLowerCase();

   if (combinedTopicStr.includes("transplant")) {
      suggestedMenu = TRANSPLANT_MENU;
      guidanceLabel = "\n\nExplore our special Transplant Guidelines:";
   } else if (combinedTopicStr.includes("lab") || combinedTopicStr.includes("creatinine") || combinedTopicStr.includes("gfr")) {
      suggestedMenu = LABS_MENU;
      guidanceLabel = "\n\nNeed help interpreting lab results?";
   } else if (combinedTopicStr.includes("vaccin")) {
      suggestedMenu = VACCINE_MENU;
      guidanceLabel = "\n\nRecommended vaccinations for kidney patients:";
   } else if (combinedTopicStr.includes("discharge") || combinedTopicStr.includes("care plan") || combinedTopicStr.includes("follow up") || combinedTopicStr.includes("fistula care") || combinedTopicStr.includes("catheter") || combinedTopicStr.includes("biopsy") || combinedTopicStr.includes("aki")) {
      suggestedMenu = DISCHARGE_MENU;
      guidanceLabel = "\n\nNeed post-discharge guidance for specific procedures?";
   } else if (combinedTopicStr.includes("dialysis") || combinedTopicStr.includes("disease") || combinedTopicStr.includes("ckd")) {
      suggestedMenu = DISEASE_MENU;
      guidanceLabel = "\n\nLearn more about this condition from verified guidelines:";
   }

   const footerLanguageOptions: MenuOption[] = [];
   const currentIsHindi = isHindiRequested;
   const currentIsMarathi = isMarathiRequested;
   if (!currentIsHindi) footerLanguageOptions.push({ label: "🌐 Read in Hindi", text: "Hindi", icon: "🇮🇳" });
   if (!currentIsMarathi) footerLanguageOptions.push({ label: "🌐 Marathi (मराठी)", text: "Marathi", icon: "🚩" });
   if (currentIsHindi || currentIsMarathi) footerLanguageOptions.push({ label: "🌐 Read in English", text: "English", icon: "🇬🇧" });

   const finalMenuPayload = getMenuPayload([...footerLanguageOptions, ...suggestedMenu.slice(0, 3), { label: "⬅️ Main Menu", text: "Show Main Menu", icon: "🏠" }]);
   const responseDecorator = MEDICAL_DISCLAIMER + guidanceLabel + finalMenuPayload;

   if (goldMatchKey && allGold[goldMatchKey]) {
      const content = allGold[goldMatchKey];
      
      // "Fluff-Buster" logic: Skip short navigation lists in favor of Deep clinical RAG
      const isGoldFluff = content.length < 200 && (content.includes("?") || content.includes("\n-"));

      if (!isGoldFluff) {
         console.log(JSON.stringify({ event: "GoldMatch", key: goldMatchKey, translated: isTranslationRequested }));
         if (isTranslationRequested) {
            const lCode = langCode || "hi";
            const targetLang = lCode === "hi" ? "Hindi" : lCode === "mr" ? "Marathi" : lCode === "ur" ? "Urdu" : "Hindi";

            if (lCode && allGold[`${goldMatchKey}:${lCode}`]) {
               yield allGold[`${goldMatchKey}:${lCode}`] + responseDecorator;
               return;
            }

            if (isNavigationOnly) {
               yield content + "\n\n*(Translation for this complex topic is limited...)*" + finalMenuPayload;
               return;
            }

            yield `Retrieved clinical answer. Translating to ${targetLang}...`;
            try {
               const model = getChatModel();
               const response = await model.invoke([new HumanMessage(TRANSLATE_PROMPT(content, targetLang))]);
               yield (response.content as string) + responseDecorator;
               return;
            } catch (e) {
               yield content + "\n\n*(Translation failed)*" + responseDecorator;
               return;
            }
         }
         yield content + responseDecorator;
         return;
      }
   }

   if (isNavigationOnly) {
      yield "I'm sorry, I couldn't find a verified guide for that specific query. Please use the menu below." + getMenuPayload(MAIN_MENU);
      return;
   }

   const cached = await getCachedResponse(input);
   if (cached) {
      const tokens = cached.split(" ");
      for (const token of tokens) {
         yield token + " ";
         await new Promise(r => setTimeout(r, 10));
      }
      return;
   }

   yield " ";

   try {
      const enrichedInput = buildContextAwareQuery(input, chatHistory);
      const timeoutPromise = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T | null> =>
         Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);

      const refinedInput = await timeoutPromise(refineQuery(enrichedInput), 4000, "Refinement");
      const finalSearchQuery = refinedInput || enrichedInput;

      const [keywordDocs, semanticDocs] = await Promise.all([
         searchPageIndex(finalSearchQuery),
         timeoutPromise(searchSemantic(finalSearchQuery, 10), 8000, "Pinecone Search")
      ]);

      const allDocs = [...(keywordDocs || []), ...(semanticDocs || [])];
      const K = 60;
      const rrfScores = new Map<string, number>();
      const docMap = new Map<string, any>();
      const queryWords = finalSearchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);

      const applyRRF = (docs: any[], weight = 1.0) => {
         docs.forEach((doc, rank) => {
            const id = `${doc.metadata.source}-${doc.metadata.title}-${doc.pageContent.slice(0, 50)}`;
            docMap.set(id, doc);
            let score = weight / (K + rank + 1);
            const sourceInfo = ((doc.metadata.source || "") + " " + (doc.metadata.title || "")).toLowerCase();
            const sourceMatches = queryWords.filter(word => sourceInfo.includes(word)).length;
            if (sourceMatches > 0) score *= (1 + (sourceMatches * 2.0));
            rrfScores.set(id, (rrfScores.get(id) || 0) + score);
         });
      };

      applyRRF(keywordDocs || [], 1.0);
      applyRRF(semanticDocs || [], 1.2);

      const uniqueDocs = Array.from(rrfScores.keys()).map(id => ({ id, score: rrfScores.get(id)! })).sort((a, b) => b.score - a.score).map(item => docMap.get(item.id)!);

      let finalDocs = uniqueDocs;
      if (uniqueDocs.length > 1) {
         const topCandidates = uniqueDocs.slice(0, 4);
         const reranked = await timeoutPromise(rerankDocuments(finalSearchQuery, topCandidates), 8000, "Reranking");
         finalDocs = [...(reranked || topCandidates), ...uniqueDocs.slice(4)];
      }

      let context = formatPageIndexContext(finalDocs);
      if (context.length > 8000) context = context.slice(0, 8000) + "\n...[truncated]";

      const cleanSourceName = (name: string | undefined | null) => {
         if (!name) return "Clinical Guidelines";
         let cl = name.replace(/\.(pdf|md|docx|txt|ts|json)$/i, "").replace(/-Guideline-English|-English|-Guideline/i, "").replace(/-Merged$/i, "").replace(/_/g, " ").replace(/-/g, " ").replace(/Manual Gold Answers/gi, "Nirogyam Clinical Reference").replace(/KDIGO/gi, "International Kidney Guidelines (KDIGO)").trim();
         return cl || "Clinical Guidelines";
      };

      const sources = Array.from(new Set(uniqueDocs.map(d => cleanSourceName(d.metadata?.source))));
      const tLang = isMarathiRequested ? "Marathi" : isHindiRequested ? "Hindi" : isUrduRequested ? "Urdu" : "English";
      const model = getChatModel();
      const finalStream = await model.stream([...chatHistory, new HumanMessage(RAG_PROMPT(input, context, tLang, sources))]);
      
      let fullResponse = "";
      for await (const chunk of finalStream) {
         if (chunk.content) {
            let text = (chunk.content as string).replace(/\[\s*\d+\s*\]/g, "").replace(/\[\s*,\s*\]/g, "").replace(/\[\s*\d+\s*-\s*\d+\s*\]/g, "").replace(/\s+\[/g, " [");
            fullResponse += text;
            yield text;
         }
      }

      if (fullResponse.toLowerCase().includes("don't know") || fullResponse.toLowerCase().includes("sorry")) {
         logFailedQuery(input).catch(e => console.error(e));
      }

      yield responseDecorator;
      setCachedResponse(input, fullResponse + responseDecorator).catch(e => console.error(e));

   } catch (globalError: any) {
      console.error("[Agent] CRITICAL FAILURE:", globalError);
      yield `\n\n⚠️ **System Error:** ${globalError?.message || String(globalError)}`;
   }
}
