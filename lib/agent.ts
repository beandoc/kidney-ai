import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";
import { getCachedResponse, setCachedResponse } from "./cache";
import { MAIN_MENU, DISEASE_MENU, LABS_MENU, TRANSPLANT_MENU, VACCINE_MENU, getMenuPayload } from "./menu";
import { searchSemantic } from "./langchain/pinecone";

// Future-proofed modular imports
import { GOLD_ANSWERS } from "./knowledge/goldAnswers";
import { virtualLocalModel } from "./agent/classifier";
import { buildContextAwareQuery, prewarmAgent } from "./agent/utils";

export { prewarmAgent };

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[], image?: string) {
   console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length, hasImage: !!image }));

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
      yield "Namaste! I am your Kidney Health Assistant. Tap below to explore my services!" + getMenuPayload(MAIN_MENU);
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

   if (!isTranslationRequested) {
      if (GOLD_ANSWERS[normalizedInput]) {
         goldMatchKey = normalizedInput;
      } else if (normalizedInput.includes("diet") || /\beat\b/.test(normalizedInput) || normalizedInput.includes("food") || normalizedInput.includes("nutrition") || normalizedInput.includes("phosphorus") || normalizedInput.includes("potassium") || normalizedInput.includes("salt") || normalizedInput.includes("sodium") || (/\bmnt\b/.test(normalizedInput) && !normalizedInput.includes("treatment")) || normalizedInput.includes("medical nutrition")) {
         goldMatchKey = "best diet for kidney patients";
         if (normalizedInput.includes("mnt") || normalizedInput.includes("medical nutrition")) {
            goldMatchKey = "what is medical nutrition therapy?";
         }
      } else if (normalizedInput.includes("prevent") && normalizedInput.includes("kidney")) {
         goldMatchKey = "how to prevent kidney disease?";
      } else if (normalizedInput.includes("kidney") && (normalizedInput.includes("fail") || normalizedInput.includes("stop working"))) {
         goldMatchKey = "what if my kidneys fail?";
      } else if (normalizedInput.includes("diabetes") || normalizedInput.includes("blood sugar") || normalizedInput.includes("glucose")) {
         goldMatchKey = "what is diabetes?";
         if (normalizedInput.includes("symptom") || normalizedInput.includes("sign")) {
            goldMatchKey = "symptoms of diabetes";
         } else if (normalizedInput.includes("risk") || normalizedInput.includes("cause") || normalizedInput.includes("how do i get")) {
            goldMatchKey = "risk factors for diabetes";
         } else if (normalizedInput.includes("prevent") || normalizedInput.includes("delay") || normalizedInput.includes("lower risk")) {
            goldMatchKey = "preventing type 2 diabetes";
         } else if (normalizedInput.includes("test") || normalizedInput.includes("diagn") || normalizedInput.includes("a1c") || normalizedInput.includes("ogtt") || normalizedInput.includes("fpg")) {
            if (/\babc\b/.test(normalizedInput)) {
               goldMatchKey = "what are the diabetes abcs?";
            } else if (normalizedInput.includes("home") || normalizedInput.includes("meter") || normalizedInput.includes("cgm")) {
               goldMatchKey = "checking blood glucose at home";
            } else {
               goldMatchKey = "diabetes tests and diagnosis";
            }
         } else if (/\babc\b/.test(normalizedInput)) {
            goldMatchKey = "what are the diabetes abcs?";
         } else if (normalizedInput.includes("lifestyle") || normalizedInput.includes("meal") || normalizedInput.includes("exercise") || normalizedInput.includes("activity") || normalizedInput.includes("weight") || normalizedInput.includes("sleep")) {
            goldMatchKey = "how to manage diabetes with lifestyle?";
         } else if (normalizedInput.includes("medicine") || normalizedInput.includes("medication") || normalizedInput.includes("insulin") || normalizedInput.includes("metformin") || /\bpill\b/.test(normalizedInput) || /\bpump\b/.test(normalizedInput) || /\bpen\b/.test(normalizedInput) || /\bglp\b/.test(normalizedInput)) {
            goldMatchKey = "diabetes medications and insulin types";
         } else if (normalizedInput.includes("home") || normalizedInput.includes("meter") || normalizedInput.includes("cgm") || normalizedInput.includes("target") || normalizedInput.includes("low") || normalizedInput.includes("high") || normalizedInput.includes("ketone") || normalizedInput.includes("hypo") || normalizedInput.includes("hyper")) {
            goldMatchKey = "checking blood glucose at home";
         } else if (normalizedInput.includes("heart") || normalizedInput.includes("stroke") || normalizedInput.includes("attack") || normalizedInput.includes("chest pain") || normalizedInput.includes("statin") || normalizedInput.includes("aspirin") || normalizedInput.includes("angina")) {
            goldMatchKey = "diabetes and heart health";
         } else if (normalizedInput.includes("complication") || normalizedInput.includes("nerve") || normalizedInput.includes("eye") || normalizedInput.includes("foot") || normalizedInput.includes("gum") || normalizedInput.includes("mouth") || normalizedInput.includes("dentist") || normalizedInput.includes("bladder")) {
            goldMatchKey = "diabetes complications and prevention";
         } else if (normalizedInput.includes("kidney") || normalizedInput.includes("affect")) {
            goldMatchKey = "how do diabetes and high blood pressure affect kidneys?";
         }
      } else if (normalizedInput.includes("vaccin")) {
         goldMatchKey = "vaccinations for kidney patients";
      } else if (normalizedInput.includes("fistula") || normalizedInput.includes("dialysis care")) {
         goldMatchKey = "what is dialysis and fistula care?";
      } else if (normalizedInput.includes("transplant") && (normalizedInput.includes("when") || normalizedInput.includes("need"))) {
         goldMatchKey = "when is kidney transplant needed?";
      } else if (normalizedInput.includes("transplant") && (normalizedInput.includes("what") || normalizedInput.includes("define") || normalizedInput.includes("is a"))) {
         goldMatchKey = "what is kidney transplant?";
      } else if (normalizedInput.includes("high") && normalizedInput.includes("creatinine")) {
         goldMatchKey = "what does high creatinine mean?";
      } else if (normalizedInput.includes("can") && normalizedInput.includes("revers")) {
         goldMatchKey = "can kidney damage be reversed?";
      } else if (normalizedInput.includes("stone") && normalizedInput.includes("failure")) {
         goldMatchKey = "kidney stones vs kidney failure?";
      } else if (normalizedInput.includes("how much water") || normalizedInput.includes("water intake")) {
         goldMatchKey = "how much water do i really need?";
      } else if (normalizedInput.includes("symptom")) {
         goldMatchKey = "what are the symptoms of kidney disease?";
      } else if (normalizedInput.includes("stage") || normalizedInput.includes("floor")) {
         goldMatchKey = "what are kidney failure stages?";
      } else if (normalizedInput.includes("diabetes") || normalizedInput.includes("blood pressure") || normalizedInput.includes("sugar") || normalizedInput.includes("high bp")) {
         goldMatchKey = "how do diabetes and high blood pressure affect kidneys?";
      } else if ((normalizedInput.includes("lower") || normalizedInput.includes("reduce")) && normalizedInput.includes("creatinine")) {
         goldMatchKey = "how to lower creatinine?";
      } else if (normalizedInput.includes("painkiller") || normalizedInput.includes("pain killer") || normalizedInput.includes("brufen") || normalizedInput.includes("paracetamol")) {
         goldMatchKey = "are painkillers safe for kidneys?";
      } else if (normalizedInput.includes("habit") || normalizedInput.includes("killer") || normalizedInput.includes("harmful")) {
         goldMatchKey = "common kidney silent killers";
      } else if (normalizedInput.includes("anca") || (normalizedInput.includes("what is") && normalizedInput.includes("vasculitis"))) {
         goldMatchKey = "what is anca vasculitis?";
      } else if (normalizedInput.includes("ckd") || normalizedInput.includes("chronic kidney disease") || (normalizedInput.includes("what is") && normalizedInput.includes("kidney disease"))) {
         goldMatchKey = "what is ckd?";
      } else if (normalizedInput.includes("cause") && (normalizedInput.includes("ckd") || normalizedInput.includes("kidney disease"))) {
         if (normalizedInput.includes("other") || normalizedInput.includes("else")) {
            goldMatchKey = "other causes of ckd";
         } else {
            goldMatchKey = "common causes of ckd";
         }
      } else if (normalizedInput.includes("monitor") || normalizedInput.includes("getting worse") || (normalizedInput.includes("what") && normalizedInput.includes("test")) || normalizedInput.includes("diagnose")) {
         goldMatchKey = "monitoring kidney disease";
      } else if (normalizedInput.includes("gfr") || normalizedInput.includes("albumin") || normalizedInput.includes("uacr")) {
         goldMatchKey = "interpreting kidney tests";
      } else if (normalizedInput.includes("manage") || normalizedInput.includes("ways to help") || normalizedInput.includes("improve kidney") || normalizedInput.includes("sleep") || normalizedInput.includes("exercise") || normalizedInput.includes("activity") || normalizedInput.includes("smoking") || normalizedInput.includes("stress")) {
         goldMatchKey = "how to manage kidney disease?";
      } else if (normalizedInput.includes("doctor") || normalizedInput.includes("visit") || normalizedInput.includes("appointment") || normalizedInput.includes("ask")) {
         goldMatchKey = "preparing for doctor visit";
      } else if (normalizedInput.includes("team") || normalizedInput.includes("specialist") || normalizedInput.includes("dietitian") || normalizedInput.includes("nephrologist")) {
         goldMatchKey = "who is on my healthcare team?";
      } else if (normalizedInput.includes("medicine") || normalizedInput.includes("medication") || normalizedInput.includes("drug") || normalizedInput.includes("pill") || normalizedInput.includes("-pril") || normalizedInput.includes("-sartan")) {
         goldMatchKey = "kidney medications guide";
      }
   } // End of !isTranslationRequested block

   if (goldMatchKey && GOLD_ANSWERS[goldMatchKey]) {
      console.log(JSON.stringify({ event: "GoldAnswerTriggered", query: goldMatchKey }));
      yield GOLD_ANSWERS[goldMatchKey];
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

      // STEP 1: PARALLEL HYBRID RETRIEVAL
      const timeoutPromise = <T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T | null> =>
         Promise.race([
            promise,
            new Promise<null>((resolve) => setTimeout(() => {
               console.warn(`[Agent] ${name} timed out after ${timeoutMs}ms`);
               resolve(null);
            }, timeoutMs))
         ]);

      const [keywordDocs, semanticDocs, refinedInput] = await Promise.all([
         searchPageIndex(enrichedInput),
         timeoutPromise(searchSemantic(enrichedInput, 8), 10000, "Pinecone Search"),
         timeoutPromise(refineQuery(enrichedInput), 5000, "Query Refinement")
      ]);

      const safeSemanticDocs = semanticDocs || [];
      const safeRefinedInput = refinedInput || enrichedInput;
      const safeKeywordDocs = keywordDocs || [];

      // Handle translation
      let translatedDocs: any[] = [];
      const isTranslated = safeRefinedInput.toLowerCase() !== enrichedInput.toLowerCase();

      if (isTranslated) {
         const [tKeyword, tSemantic] = await Promise.all([
            searchPageIndex(safeRefinedInput),
            timeoutPromise(searchSemantic(safeRefinedInput, 4), 8000, "Translated Semantic Search")
         ]);
         translatedDocs = [...(tKeyword || []), ...(tSemantic || [])];
      }

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
      if (translatedDocs.length > 0) applyRRF(translatedDocs, 1.5);

      const uniqueDocs = Array.from(rrfScores.keys())
         .map(id => ({ id, score: rrfScores.get(id)! }))
         .sort((a, b) => b.score - a.score)
         .map(item => docMap.get(item.id)!);

      // STEP 1.2: CONDITIONAL RERANKING
      let finalDocs = uniqueDocs;
      if (uniqueDocs.length > 1) {
         const topCandidates = uniqueDocs.slice(0, 6);
         const remainingDocs = uniqueDocs.slice(6);
         const reranked = await timeoutPromise(rerankDocuments(safeRefinedInput, topCandidates), 8000, "Reranking");
         finalDocs = [...(reranked || topCandidates), ...remainingDocs];
      }

      // Context Truncation
      let context = formatPageIndexContext(finalDocs);
      if (context.length > 15000) context = context.slice(0, 15000) + "\n...[truncated]";

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

      const finalResponseWithDisclaimer = fullResponse + "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";
      setCachedResponse(input, finalResponseWithDisclaimer).catch(e => console.error("Cache store failure:", e));

   } catch (globalError: any) {
      console.error("[Agent] CRITICAL FAILURE:", globalError);
      yield `\n\n⚠️ **System Error:** ${globalError?.message || String(globalError)}\n\nPlease check your settings or contact the administrator.`;
   }
}
