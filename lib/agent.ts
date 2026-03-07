import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { getChatModel } from "./langchain/config";
import { refineQuery, rerankDocuments } from "./langchain/vectorStore";
import { getCachedResponse, setCachedResponse } from "./cache";


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

   "what is kidney transplant?": `A kidney transplant is a surgical procedure to place a healthy kidney from a living or deceased donor into a person whose kidneys no longer function properly.

When kidneys lose about 90% of their ability to filter waste and fluid from the blood, a person reaches end-stage renal disease (ESRD). At this point, the main treatment options are dialysis (using a machine to clean the blood) or a kidney transplant. For many patients, a successful transplant is the preferred treatment as it can offer a better quality of life, fewer dietary restrictions, and a lower risk of death compared to long-term dialysis.

Here is a breakdown of how it works:

**Types of Donors**
- **Living Donors:** Because a person only needs one healthy kidney to live a normal life, a living person can donate one of theirs. Living donors can be family members, friends, or sometimes altruistic strangers. Kidneys from living donors tend to last longer and work immediately.
- **Deceased Donors:** These are kidneys retrieved from individuals who have recently died and whose families have consented to organ donation.

**The Procedure**
- **Placement:** The surgeon typically places the new kidney in the lower abdomen, rather than the usual kidney position in the back.
- **Connections:** The blood vessels of the new kidney are surgically connected to the blood vessels in the lower part of the abdomen. The ureter (the tube that carries urine) of the donor kidney is connected to the recipient's bladder.
- **Original Kidneys:** The patient's native kidneys are usually left in place unless they are causing severe complications like uncontrollable high blood pressure, frequent infections, or are greatly enlarged.

**Life After a Transplant**
- **Immunosuppression:** The body's immune system will naturally view the new kidney as a foreign object and try to attack it. To prevent this, transplant recipients must take anti-rejection medications (immunosuppressants) for the rest of their lives.
- **Monitoring:** Frequent check-ups and blood tests are required, especially in the first few months, to ensure the new kidney is functioning well and the medication dosages are correct.`,

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

*Always discuss with your treating nephrologist for personalized advice regarding kidney transplant eligibility and the process involved.*`,

   "what does high creatinine mean?": `High creatinine levels in the blood can indicate potential issues with kidney function. Here’s a breakdown of what high creatinine means and its implications:

### What is Creatinine?
- **Definition:** Creatinine is a waste product produced from muscle metabolism and is typically filtered out of the blood by the kidneys.
- **Normal Range:** Normal levels typically range from **0.6 to 1.2 mg/dL** (milligrams per deciliter), but this can vary based on factors like age, gender, and muscle mass.

### Causes of High Creatinine Levels
1. **Kidney Dysfunction:**
   - **Chronic Kidney Disease (CKD):** Progressive loss of kidney function over time.
   - **Acute Kidney Injury (AKI):** Sudden decline in kidney function due to various causes such as dehydration, medications, or infections.

2. **Dehydration:**
   - **Reduced Blood Flow:** Dehydration can lead to reduced blood flow to the kidneys, causing elevated creatinine levels.

3. **High Protein Diet:**
   - **Increased Muscle Breakdown:** Consuming excessive protein can lead to more creatinine being produced.

4. **Medications:**
   - **Nephrotoxic Drugs:** Certain medications can impair kidney function, leading to elevated creatinine levels.

5. **Muscle Mass:**
   - **Muscle Disorders:** Conditions that increase muscle mass or breakdown can result in higher creatinine production.

### Implications
- **Kidney Function Assessment:** High creatinine typically indicates that the kidneys are not functioning optimally and may require further evaluation.
- **Potential Symptoms:** If kidney function declines, symptoms may include fatigue, swelling, changes in urine output, and more.

### Next Steps
- **Consult a Healthcare Provider:** If you have high creatinine levels, it’s essential to work with your healthcare provider to determine the underlying cause and appropriate treatment.
- **Monitor Kidney Health:** Regular blood tests and kidney function assessments are crucial for managing kidney health.

*Always consult your treating nephrologist for personalized advice and management strategies regarding high creatinine levels.*`,

   "can kidney damage be reversed?": `The answer depends on whether the damage is acute or chronic:

1. **Acute Kidney Injury (AKI):**
   - **Reversibility:** AKI is a sudden decline in kidney function often caused by dehydration, severe infection, or certain medications.
   - **Outcome:** If caught early and the underlying cause is treated, kidneys can often return to their normal function.

2. **Chronic Kidney Disease (CKD):**
   - **Reversibility:** CKD is generally permanent and progressive. However, its progression can be significantly slowed or even "braked" with modern medical treatments and lifestyle changes.
   - **Goal:** The focus is on protecting the remaining kidney function to avoid long-term complications or dialysis.

*Always consult your treating nephrologist for a personalized assessment of your kidney health.*`,

   "kidney stones vs kidney failure?": `Kidney stones and kidney failure are very different conditions, although both involve the kidneys:

![Kidney Diagram](https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Kidneys_location_in_body.png/300px-Kidneys_location_in_body.png)

- **Kidney Stones:** Think of a stone as a **pebble stuck in a pipe**. It causes intense pain as it moves through the urinary tract, but it is typically a mechanical blockage. Once the stone is passed or removed, the kidney function usually remains normal.
- **Kidney Failure:** This is when the **entire plumbing system (filters)** breaks down. The kidneys can no longer filter waste products from the blood. This is a much more serious, systemic condition that requires long-term management or dialysis.

*While stones are painful, kidney failure is a silent condition that requires regular check-ups to detect early.*`,
   "how much water do i really need?": `Hydration needs are not the same for everyone, especially for kidney patients:

1. **For Kidney Stone Prevention:**
   - **Recommendation:** Drinking plenty of water (about **2.5 to 3 liters** per day) is essential to dilute urine and prevent stones.

2. **For Advanced CKD or Dialysis Patients:**
   - **Recommendation:** You may actually need **fluid restriction**. If the kidneys cannot flush enough water, excess fluid builds up, causing swelling (edema), high blood pressure, and heart strain.
   - **Goal:** Follow the specific fluid chart provided by your nephrologist.

*The "drink 8 glasses" rule doesn't apply to everyone. Always follow the personalized fluid allowance set by your treating nephrologist.*`,

   "what are the symptoms of kidney disease?": `Kidney disease is often called a "Silent Killer" because symptoms may not appear until 90% of kidney function is lost. However, common warning signs include:

1. **Changes in Urination:** Urinating more or less often, foamy or bubbly urine (suggesting protein leak), and blood in urine.
2. **Swelling (Edema):** Puffiness around the eyes, and swelling in the hands, feet, or ankles due to fluid retention.
3. **Fatigue and Weakness:** Constant tiredness because kidneys aren't producing the hormone (EPO) that tells the body to make red blood cells, leading to anemia.
4. **Shortness of Breath:** Caused by fluid buildup in the lungs or anemia.
5. **Skin Issues:** Persistent itching or rashes when waste products build up in the blood (uremia).
6. **Metallic Taste or Bad Breath:** Ammonia-like breath or a metallic taste in food.
7. **Nausea and Vomiting:** A build-up of waste in the blood can also cause these symptoms.

*If you notice any of these signs, please consult your doctor immediately for a Kidney Function Test (KFT).*`,

   "how do diabetes and high blood pressure affect kidneys?": `Diabetes and Hypertension (High BP) are the "Dangerous Trio" responsible for 70% of kidney failures in India.

**1. Diabetes (The "Sticky" Filter):**
High blood sugar makes your blood thick and sticky. This clogs the tiny "holes" in the kidney's filters (nephrons). Over time, this leads to **Diabetic Nephropathy**, where the kidneys leak protein (albumin) and eventually stop filtering waste.

**2. High Blood Pressure (The "Pressure Blast"):**
High BP forces blood through the kidney's delicate filters with extreme force, like a high-pressure hose through a screen mesh. This scars the filters and narrows the blood vessels, leading to **Hypertensive Nephrosclerosis**.

**The Vicious Cycle:** 
High BP damages kidneys $\rightarrow$ Damaged kidneys can't regulate salt/water $\rightarrow$ Fluid builds up $\rightarrow$ BP rises even further $\rightarrow$ More damage.

*Action:* Annual KFT/RFT and urine tests are mandatory for anyone with these conditions.`,

   "what are kidney failure stages?": `Think of kidney function (eGFR) as a **five-story building**. The stage depends on how much filtering capacity is left:

*   **Stages 1 & 2 (90%+ function):** You are on the "Top Floors." Usually no symptoms, but "leaks" (protein in urine) may be the first sign. This is the **Golden Window** for prevention.
*   **Stage 3 (30-59% function):** The "Middle Floor." Moderate damage. Symptoms like fatigue, swelling, or back pain may begin. Goal: **Halt the damage** (Hit the brakes).
*   **Stages 4 & 5 (<30% function):** The "Ground Floors." Severe damage. Body can no longer clean itself. Stage 5 is **Kidney Failure (ESRD)**. Goal: **Medical Help** (Dialysis/Transplant).

*Knowing your eGFR number is the best way to determine your "floor" and plan management.*`,

   "how to lower creatinine?": `It is important to understand the **Creatinine Truth**: 
Creatinine is a waste product from muscle metabolism—it is the "Report Card" of the kidneys, not the "Cause" of the disease.

1. **The Myth:** There is no "magic pill" or herb to bring down creatinine directly. 
2. **The Reality:** To lower creatinine, you must treat the **underlying cause** (like controlling Diabetes or High BP) to prevent further kidney damage.
3. **Wait & See:** If creatinine is high due to Acute Kidney Injury (dehydration, infection, or blockages), it may come down once those are treated. 
4. **Chronic CKD:** In chronic stages, the goal is often to **stabilize** the creatinine level rather than lowering it to normal.

*Beware of products claiming to "instantly reduce creatinine" as they may actually harm the kidneys further.*`,

   "are painkillers safe for kidneys?": `**Painkiller Abuse** is one of the top "Silent Killers" of kidneys.
Common over-the-counter NSAIDs (Non-Steroidal Anti-Inflammatory Drugs) can be directly toxic to the kidneys (Nephrotoxic).

*   **Avoid:** Ibuprofen (type of Advil/Motrin), Diclofenac, and high doses of Naproxen.
*   **Safer Alternative:** Acetaminophen (Tylenol/Paracetamol) is generally safer for kidneys when taken as directed, but always consult your nephrologist first.
*   **The Risk:** Chronic use can reduce blood flow to the kidneys, leading to permanent scarring (Analgesic Nephropathy).`,

   "common kidney silent killers": `Here are the top habits that destroy kidney health over time:
1. **Namak (Salt) Overload:** Hidden salt in pickles (*achar*), papad, and bhujia causes fluid retention and BP spikes.
2. **Ignoring Thirst:** Dehydration allows minerals to clump into stones.
3. **Sweet Tooth:** Sugar leads to obesity and Type 2 Diabetes (#1 kidney killer).
4. **"Wait and Hold":** Holding urine allows bacteria to multiply, causing UTIs that scar kidneys.
5. **Painkiller Abuse:** Regular use of NSAIDs like Diclofenac.
6. **Sit-Down Lifestyle:** Physical inactivity fuels obesity and hypertension.
7. **Processed Foods:** High in phosphorus additives that damage blood vessels.
8. **Sleep Deprivation:** The body repairs kidney tissue and regulates BP during 7-8 hours of deep sleep.`
};

/**
 * VIRTUAL LOCAL MODEL (Classifier)
 * Optimization: Handle simple/conversational queries locally without API calls.
 * This saves 60-80% of tokens by filtering non-medical small talk.
 */
function virtualLocalModel(input: string): string | null {
   const normalized = input.toLowerCase().trim();

   // 1. Greetings
   const GREETINGS = ["hi", "hello", "hey", "good morning", "good evening", "namaste", "salam"];
   if (GREETINGS.some(g => normalized === g)) {
      return "Hello! I am your Nirogyam Kidney Health Assistant. How can I help you with your kidney health today?";
   }

   // 2. Bot Identity
   const IDENTITY = ["who are you", "what is your name", "what do you do", "are you a doctor"];
   if (IDENTITY.some(i => normalized.includes(i))) {
      return "I am the Nirogyam ChatBot, a specialized medical education assistant for kidney health. I provide information based on clinical guidelines like KDIGO. While I am not a human doctor, I can help you understand your reports and kidney care.";
   }

   // 3. Politeness
   const THANKS = ["thank you", "thanks", "ok", "got it", "shukriya", "dhanyavad"];
   if (THANKS.some(t => normalized === t)) {
      return "You're very welcome! If you have more questions about your diet, medications, or lab reports, feel free to ask.";
   }

   // 4. Common Local Medical Queries (Zero-Token Templates)
   if (normalized.includes("banana") && normalized.includes("dialysis")) {
      return "For dialysis patients, bananas are generally restricted because they are very high in potassium. High potassium can be dangerous for your heart when your kidneys aren't filtering it. Please check with your dietician for safer low-potassium alternatives like apples or papaya.";
   }
   if (normalized.includes("water") && normalized.includes("dialysis")) {
      return "Dialysis patients usually have a fluid restriction (often around 1 liter or what your nephrologist prescribes) because the body cannot remove excess water. Drinking too much can cause swelling, high BP, and heart strain.";
   }

   return null;
}

// --- Main Agent Loop ---
export async function* runAgent(input: string, chatHistory: BaseMessage[]) {
   console.log(JSON.stringify({ event: "AgentStart", query: input, historyLength: chatHistory.length }));

   const normalizedInput = input.trim().toLowerCase();

   // TIER 0: Virtual Local Model (Zero Token Cost - Handled in 1ms)
   const localResponse = virtualLocalModel(normalizedInput);
   if (localResponse) {
      console.log(JSON.stringify({ event: "LocalModelTriggered", category: "small_talk" }));
      // Yield entire string at once to prevent jittering, the UI will handle smooth appearance
      yield localResponse;
      return;
   }

   // TIER 1: Gold Answer Matching (Zero Token Cost - Handled locally)
   let goldMatchKey: string | null = null;

   if (GOLD_ANSWERS[normalizedInput]) {
      goldMatchKey = normalizedInput;
   } else if (normalizedInput.includes("diet") && normalizedInput.includes("kidney")) {
      goldMatchKey = "best diet for kidney patients";
   } else if (normalizedInput.includes("prevent") && normalizedInput.includes("kidney")) {
      goldMatchKey = "how to prevent kidney disease?";
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
   }

   if (goldMatchKey && GOLD_ANSWERS[goldMatchKey]) {
      console.log(JSON.stringify({ event: "GoldAnswerTriggered", query: goldMatchKey }));
      // Yield the entire pre-compiled answer to avoid UI jittering from fake streaming delays
      yield GOLD_ANSWERS[goldMatchKey];
      return;
   }

   // TIER 2: Semantic Cache (High Cost Reduction)
   // Check if this specific question has been answered recently
   const cached = await getCachedResponse(input);
   if (cached) {
      console.log(JSON.stringify({ event: "ResponseServedFromCache", query: input }));
      const tokens = cached.split(" ");
      for (const token of tokens) {
         yield token + " ";
         await new Promise(r => setTimeout(r, 10)); // Faster for cached
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
            1. Language: You MUST answer in the EXACT SAME LANGUAGE as the USER QUESTION. If the user asks in English, answer in English. If the user asks in Hindi, you MUST TRANSLATE the guidelines and answer entirely in Hindi. If the user asks in Marathi, you MUST TRANSLATE the guidelines and answer entirely in Marathi.
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

      const finalResponse = fullResponse + "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

      // Store in Cache for future users (Async - don't block)
      setCachedResponse(input, finalResponse).catch(e => console.error("Cache store failure:", e));

      yield "\n\n---\n**Disclaimer:** *This is for educational purposes only. Always follow your doctor's advice.*";

   } catch (globalError: any) {
      console.error("[Agent] CRITICAL FAILURE:", globalError);
      const errorMessage = globalError?.message || String(globalError);
      yield `\n\n⚠️ **System Error:** ${errorMessage}\n\nPlease check your API keys in the settings or contact the administrator.`;
   }
}
