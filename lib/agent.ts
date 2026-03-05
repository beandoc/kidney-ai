import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";


import { searchSemantic } from "./langchain/pinecone";

/**
 * Extract medical context from recent chat history for follow-up queries.
 * Detects if the current query is a follow-up (short/vague) and prepends
 * the last known medical topic to improve retrieval.
 */
function buildContextAwareQuery(input: string, chatHistory: BaseMessage[]): string {
    const FOLLOWUP_INDICATORS = [
        "what about", "and the", "how about", "tell me more",
        "treatment", "symptoms", "causes", "diet", "medication",
        "what is the", "can you explain", "aur", "batao", "iske baare"
    ];
    const isFollowUp = input.split(/\s+/).length <= 6 ||
        FOLLOWUP_INDICATORS.some(f => input.toLowerCase().includes(f));

    if (!isFollowUp || chatHistory.length === 0) return input;

    // Scan the last 4 messages for medical keywords
    const MEDICAL_TOPICS = [
        "creatinine", "egfr", "gfr", "dialysis", "hemodialysis", "peritoneal",
        "ckd", "akd", "aki", "esrd", "kidney", "renal", "transplant",
        "potassium", "phosphorus", "sodium", "albumin", "proteinuria",
        "hypertension", "diabetes", "nephropathy", "glomerulonephritis",
        "nephrotic", "nephritic", "biopsy", "ultrasound", "anemia", "erythropoietin"
    ];

    const recentText = chatHistory
        .slice(-4)
        .map(m => (typeof m.content === "string" ? m.content : ""))
        .join(" ")
        .toLowerCase();

    const detectedTopics = MEDICAL_TOPICS.filter(t => recentText.includes(t));

    if (detectedTopics.length > 0) {
        const topicContext = detectedTopics.slice(0, 3).join(" ");
        console.log(JSON.stringify({ event: "ContextAwareQuery", originalQuery: input, injectedTopics: topicContext }));
        return `${topicContext} ${input}`;
    }
    return input;
}

/**
 * Pre-warms the agent's backend resources (LLM connections, Vector DB, Page Index).
 * This is called during the welcome message phase to eliminate cold starts.
 */
export async function prewarmAgent() {
    console.log(JSON.stringify({ event: "PrewarmStarted", status: "initializing_resources" }));
    try {
        await Promise.allSettled([
            getChatModel(), // Warm LLM provider connection
            searchSemantic("kidney", 1), // Warm Pinecone connection
            searchPageIndex("introduction") // Pre-load indexing metadata
        ]);
        console.log(JSON.stringify({ event: "PrewarmComplete", status: "ready" }));
    } catch (err) {
        console.error("Prewarm failed", err);
    }
}

const GOLD_ANSWERS: Record<string, string> = {
    "how to prevent kidney disease?": `To prevent kidney disease, it's essential to adopt a healthy lifestyle and monitor your health regularly. Here are some effective strategies:

1. **Stay Active**
   - **Regular Exercise:** Engage in aerobic activities and physical exercises to maintain a healthy weight, control blood pressure, and manage blood sugar levels.

2. **Maintain a Balanced Diet**
   - **Healthy Foods:** Include plenty of fresh fruits, vegetables, whole grains, and low-fat dairy products.
   - **Limit Salt and Sugar:** Reduce your intake of refined foods, sugars, and saturated fats.

3. **Hydrate**
   - **Drink Plenty of Water:** Aim for about 3 liters per day to help dilute urine and prevent kidney stones.

4. **Monitor Health Conditions**
   - **Regular Check-ups:** Get annual kidney check-ups, especially if you have risk factors like diabetes, high blood pressure, or a family history of kidney disease.
   - **Control Blood Pressure and Blood Sugar:** Keep your blood pressure below 130/80 mmHg and manage your diabetes effectively.

5. **Quit Smoking**
   - **Avoid Tobacco Products:** Smoking can harm blood circulation to the kidneys, leading to decreased kidney function.

6. **Be Cautious with Medications**
   - **Avoid Over-the-Counter Painkillers:** Regular use of NSAIDs like ibuprofen can damage your kidneys. Consult a doctor for safer alternatives.

7. **Manage Weight**
   - **Healthy Weight Management:** Aim for a healthy weight through diet and exercise to reduce the risk of diabetes and heart disease.

8. **Get Enough Sleep**
   - **Prioritize Sleep:** Aim for 7-8 hours of quality sleep each night to support overall health.

9. **Reduce Alcohol Intake**
   - **Limit Alcohol Consumption:** Stick to moderate drinking guidelines.

10. **Regular Health Monitoring**
    - **Track Your Health:** Regularly check your blood pressure and maintain a record to discuss with your healthcare provider.

Incorporating these practices into your daily life can significantly lower your risk of developing kidney disease. For more detailed guidance, consider discussing your individual health needs with your healthcare provider or nephrologist.

For patients with CKD, you can also check your risk of progression to end-stage renal disease (ESRD) using this calculator: **[Kidney Failure Risk Calculator](https://kidneyfailurerisk.com/)** and consult your treating nephrologist.`,

    "best diet for kidney patients": `For kidney patients, a well-structured diet is essential to manage kidney health and prevent further complications. Here are the key dietary guidelines:

1. **Protein Intake**
   - **Limit Protein:** Recommended intake is generally less than 0.8 grams/kg of body weight per day for those not on dialysis.
   - **Increase if on Dialysis:** Those undergoing dialysis may need 1.0 to 1.2 grams/kg of body weight per day to replace lost protein.

2. **Carbohydrates**
   - **Complex Carbs:** Focus on whole grains and complex carbohydrates, such as whole wheat and unpolished rice, which provide fiber and energy.
   - **Limit Simple Sugars:** Minimize intake of simple sugars found in sweets and sugary drinks.

3. **Fats**
   - **Choose Healthy Fats:** Unsaturated fats from sources like olive oil, canola oil, and avocados are preferable.
   - **Avoid Saturated and Trans Fats:** Limit intake of red meat, butter, and processed foods high in trans fats.

4. **Sodium**
   - **Low Sodium Diet:** Aim for a "no added salt" diet, avoiding processed foods high in sodium.
   - **Check Labels:** Look for low-sodium options and avoid salt substitutes that may contain high potassium.

5. **Potassium and Phosphorus**
   - **Limit High Potassium Foods:** Avoid foods like bananas, oranges, and potatoes if potassium levels are a concern.
   - **Reduce High Phosphorus Foods:** Limit dairy products, nuts, and certain meats as they are high in phosphorus.

6. **Fluids**
   - **Monitor Fluid Intake:** Depending on kidney function, you may need to restrict fluid intake to prevent swelling and fluid retention.

7. **Fruits and Vegetables**
   - **Low Potassium Options:** Choose fruits like apples, berries, and papayas. 
   - **Processing:** High-potassium vegetables should be cooked or processed to reduce potassium levels.

8. **Vitamins and Minerals**
   - **Supplementation:** Consider Vitamin B, C, and Folic Acid supplementation under the guidance of a healthcare provider.

9. **General Guidelines**
   - **Consult a Dietitian:** Work with a registered dietitian specializing in kidney disease for personalized dietary advice.
   - **Balanced Nutrition:** Aim for a high-fiber diet with adequate vitamins while managing caloric intake.

**Important Note for Indian Patients:**
For those following the usual Indian diet, protein restriction is generally not recommended, as the diet is already naturally low in protein.

*Always consult your treating nephrologist for tailored dietary advice specific to your health condition.*`,

    "vaccinations for kidney patients": `Vaccinations are crucial for kidney patients, especially those undergoing dialysis or who have had a kidney transplant. Here are the key vaccinations recommended:

1. **Hepatitis B Vaccine**
   - **Importance:** Reduces the risk of Hepatitis B infection during dialysis or after kidney transplantation.
   - **Schedule:** Four double doses of the recombinant Hepatitis B vaccine are given at 0, 1, 2, and 6 months, intramuscularly in the deltoid region.

2. **Influenza Vaccine**
   - **Importance:** Protects against seasonal flu, which can lead to serious complications.
   - **Schedule:** Recommended annually, especially before flu season.

3. **Pneumococcal Vaccine**
   - **Importance:** Provides protection against pneumonia and other infections caused by Streptococcus pneumoniae.
   - **Schedule:** Administered at least once, with a booster recommended for high-risk patients.

4. **Tetanus-Diphtheria-Pertussis (Tdap) Vaccine**
   - **Importance:** Protects against tetanus, diphtheria, and pertussis (whooping cough).
   - **Schedule:** A booster is recommended every 10 years.

5. **COVID-19 Vaccine**
   - **Importance:** Essential for protecting against severe illness from COVID-19.
   - **Schedule:** Follow current guidance from health authorities regarding initial doses and boosters.

6. **Varicella (Chickenpox) Vaccine**
   - **Importance:** Recommended for patients who have not had chickenpox or the vaccine in the past.
   - **Schedule:** Generally given in two doses.

7. **Meningococcal Vaccine**
   - **Importance:** Protects against meningitis, especially in patients with weakened immune systems.
   - **Schedule:** Administered as per current health guidelines.

**General Precautions:**
- **Consult Your Healthcare Provider:** Always discuss vaccinations with your nephrologist to tailor the schedule based on your specific health needs.
- **Stay Updated:** Keep track of vaccination records and ensure you are up-to-date with all recommended vaccines.

*These vaccinations are crucial to protect kidney patients from infections that could complicate their health. Always consult your treating nephrologist for personalized advice.*`,

    "what is dialysis and fistula care?": `Dialysis and fistula care are essential components of treatment for individuals with kidney failure. Here’s a breakdown of both:

### Dialysis
Dialysis is a medical procedure that replicates some functions of healthy kidneys when they can no longer filter waste products from the blood effectively. There are two main types of dialysis:

1. **Hemodialysis**
   - **Process:** Blood is drawn from the body, filtered through a dialysis machine to remove waste and excess fluid, and then returned to the body.
   - **Frequency:** Typically performed 3 times a week for about 3-5 hours per session.
   - **Access Points:** Requires an access point, usually created through a fistula or graft.

2. **Peritoneal Dialysis**
   - **Process:** A special fluid is introduced into the abdomen through a catheter, allowing waste and excess fluids to be filtered through the abdominal lining (peritoneum).
   - **Frequency:** Can be done manually several times a day or automatically using a machine at night.

### Fistula Care
A fistula is a surgically created connection between an artery and a vein, usually in the arm, that provides access for hemodialysis. Proper care is crucial to ensure its functionality and prevent complications.

**Care Guidelines:**
- **Keep It Clean:** Regularly wash the area with soap and water before and after dialysis.
- **Inspect for Changes:** Check for swelling, redness, or unusual warmth, which may indicate infection.
- **Avoid Pressure:** Do not carry heavy objects or put pressure on the arm with the fistula.
- **No Blood Pressure Measurements:** Avoid taking blood pressure or drawing blood from the arm with the fistula.
- **Palpate for Thrill:** Gently feel the fistula to ensure it is functioning properly; it should have a buzzing sensation (thrill).

**Signs of Complications:**
- **Infection:** Fever, chills, or increased redness and swelling around the fistula.
- **Clots:** Sudden loss of blood flow or thrill in the fistula.
- **Pain:** Unusual pain at the site of the fistula.

### Conclusion
Both dialysis and fistula care are vital for kidney patients, particularly those with end-stage renal disease. Regular monitoring and proper care can significantly enhance the effectiveness of dialysis and improve the patient's quality of life.

*Always consult your treating nephrologist for personalized advice and management strategies.*`,

    "when is kidney transplant needed?": `A kidney transplant may be needed in the following situations:

1. **End-Stage Renal Disease (ESRD)**
   - **Definition:** This is the final stage of chronic kidney disease (CKD) where the kidneys can no longer maintain normal function.
   - **Indication:** Typically, a transplant is considered when kidney function falls below **15% of normal**.

2. **Severe Symptoms of Kidney Failure**
   - **Symptoms:** Persistent issues such as fatigue, nausea, vomiting, and loss of appetite that severely impact quality of life.

3. **Dialysis Dependency**
   - **Long-Term Dialysis:** If a patient is on dialysis for an extended period without improvement, a transplant may be the best option for long-term survival and quality of life.

4. **Poor Prognosis with Other Treatments**
   - **Ineffective Management:** If conservative treatments or medications are no longer effective in managing kidney disease or associated symptoms.

5. **Genetic or Congenital Issues**
   - **Inherited Conditions:** Certain hereditary kidney diseases that lead to progressive renal failure may require a transplant earlier in life.

6. **Diabetes-Related Kidney Damage**
   - **Diabetic Nephropathy:** Advanced kidney damage due to diabetes that significantly impairs kidney function.

7. **Urgent Situations**
   - **Acute Kidney Injury:** In some cases, severe acute kidney injury that progresses to chronic kidney disease requiring maintenance dialysis may necessitate a transplant.

8. **Recurrent Kidney Disease**
   - **Recurrence of Disease:** Conditions like focal segmental glomerulosclerosis (FSGS) may recur in a transplanted kidney, necessitating careful evaluation.

### Conclusion
A kidney transplant can significantly improve the quality of life and longevity for patients with severe kidney disease. It is essential to consult with a nephrologist to evaluate individual circumstances and determine the best course of action tailored to your health needs.

*Always discuss with your treating nephrologist for personalized advice regarding kidney transplant eligibility and the process involved.*`
};

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
    console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length }));

    const normalizedInput = input.trim().toLowerCase();
    if (GOLD_ANSWERS[normalizedInput]) {
        console.log(JSON.stringify({ event: "GoldAnswerTriggered", query: normalizedInput }));
        const tokens = GOLD_ANSWERS[normalizedInput].split(" ");
        for (const token of tokens) {
            yield token + " ";
            await new Promise(r => setTimeout(r, 20)); // Simulate typing speed
        }
        return;
    }

    // IMMEDIATE PULSE: Yield a space so the UI knows the server is alive
    yield " ";

    try {
        // CONVERSATION-AWARE QUERY ENRICHMENT
        const enrichedInput = buildContextAwareQuery(input, chatHistory);

        // STEP 1: PARALLEL RETRIEVAL & REFINEMENT
        // We start searching with the enriched input immediately.
        // For Hindi/Marathi, this might miss keyword hits, so we wait for Refinement to translate.
        const [keywordDocs, semanticDocs, refinedInput] = await Promise.all([
            searchPageIndex(enrichedInput),
            searchSemantic(enrichedInput, 8),
            refineQuery(enrichedInput)
        ]);

        let finalUniqueDocs = [];
        const isTranslated = refinedInput.toLowerCase() !== enrichedInput.toLowerCase();

        // If translated (Hindi -> English), we run a second quick targeted search
        let translatedDocs: any[] = [];
        if (isTranslated) {
            console.log(`[Agent] Cross-lingual search triggered: ${refinedInput}`);
            const [tKeyword, tSemantic] = await Promise.all([
                searchPageIndex(refinedInput),
                searchSemantic(refinedInput, 4)
            ]);
            translatedDocs = [...tKeyword, ...tSemantic];
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

        applyRRF(keywordDocs, 1.0);
        applyRRF(semanticDocs, 1.2);
        if (translatedDocs.length > 0) {
            applyRRF(translatedDocs, 1.5); // Boost translated hits as they are likely high quality
        }

        // Sort unique docs by RRF score
        const uniqueDocs = Array.from(rrfScores.keys())
            .map(id => ({ id, score: rrfScores.get(id)! }))
            .sort((a, b) => b.score - a.score)
            .map(item => docMap.get(item.id)!);

        // STEP 1.2: CONDITIONAL RERANKING
        let finalDocs = uniqueDocs;
        if (uniqueDocs.length > 1) {
            const topCandidates = uniqueDocs.slice(0, 6);
            const remainingDocs = uniqueDocs.slice(6);
            finalDocs = [...await rerankDocuments(refinedInput, topCandidates), ...remainingDocs];
        }

        console.log(JSON.stringify({
            event: "AgentRetrievalComplete",
            query: refinedInput,
            totalUniqueDocs: uniqueDocs.length,
            usedReranking: uniqueDocs.length > 1
        }));

        // Context Truncation for Latency Optimization
        let context = formatPageIndexContext(finalDocs);
        if (context.length > 15000) {
            context = context.slice(0, 15000) + "\n...[truncated]";
        }

        // SMART SOURCE SHORTENING: Clean filenames for better readability
        // e.g., "KDIGO-2012-AKI-Guideline.pdf" -> "KDIGO 2012"
        const cleanSourceName = (name: string) => {
            return name
                .replace(/\.(pdf|md|docx|txt)$/i, "")
                .replace(/-Guideline-English|-English|-Guideline/i, "")
                .replace(/-/g, " ")
                .replace(/AKI|CKD|AKI Trial/gi, "") // Remove redundant acronyms if present in filename
                .trim();
        };

        const sources = uniqueDocs.map(d => cleanSourceName(d.metadata.source));
        const uniqueSources = Array.from(new Set(sources));

        // Step 2: Direct Streaming Response
        const model = getChatModel();
        const prompt = `
            You are a Kidney Health Assistant. 
            
            TASK:
            1. Language: Answer strictly in the same language as the USER QUESTION (Hindi, Marathi, or English).
            2. Content: Answer using ONLY the provided Guidelines.
            3. Citations: Use subtle inline citations like *[Source: KDIGO 2012]*. 
               * ONLY use sources from this list: ${uniqueSources.join(", ")}
            4. **EXTREME BREVITY**: 
               * Maximum 2-3 concise sentences.
            5. **SAFETY**: If not in guidelines, say "Sorry, I don't know the answer for this."
            
            GUIDELINES:
            ${context}
            
            USER QUESTION: ${input}
            
            Answer:
        `;

        const messages = [
            ...chatHistory,
            new HumanMessage(prompt)
        ];

        const finalStream = await model.stream(messages);
        let fullResponse = "";

        for await (const chunk of finalStream) {
            if (chunk.content) {
                const text = chunk.content as string;
                fullResponse += text;
                yield text;
            }
        }

        // CITATION VERIFICATION (Post-process)
        // Detects if the LLM hallucinated a source that wasn't provided
        const citationRegex = /\[Source:\s*([^,\]]+)(?:,\s*([^\]]+))?\]/g;
        const citedSources = new Set<string>();
        let match;
        while ((match = citationRegex.exec(fullResponse)) !== null) {
            citedSources.add(match[1].trim().toLowerCase());
        }

        const validSourceNames = new Set(uniqueDocs.map(d => d.metadata.source.toLowerCase()));
        const invalidCitations = Array.from(citedSources).filter(s => !validSourceNames.has(s));

        if (invalidCitations.length > 0) {
            console.warn(`[Agent] Hallucinated citations detected: ${invalidCitations.join(", ")}`);
            // We've already yielded the text, but we log the safety violation for the admin
        }

        yield "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

    } catch (globalError: any) {
        console.error("[Agent] CRITICAL FAILURE:", globalError);
        const errorMessage = globalError?.message || String(globalError);
        yield `\n\n⚠️ **System Error:** ${errorMessage}\n\nPlease check your API keys in the settings or contact the administrator.`;
    }
}
