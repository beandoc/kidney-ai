import { searchPageIndex, formatPageIndexContext } from "./pageindex/retrieval";
import { searchSemantic } from "./langchain/pinecone";
import { getChatModel } from "./langchain/config";
import { HumanMessage } from "@langchain/core/messages";
import { findGoldMatch } from "./agent/triggers";

export interface EvalTestCase {
    query: string;
    expectedTopics: string[];
    expectedAnswer: string;
    forbiddenPhrases: string[];
}

export const EVAL_TEST_SUITE: EvalTestCase[] = [
    // --- English Core (40 cases) ---
    { query: "What is creatinine?", expectedTopics: ["creatinine", "waste"], expectedAnswer: "creatinine", forbiddenPhrases: ["probably"] },
    { query: "What are the stages of CKD?", expectedTopics: ["stage", "gfr", "ckd"], expectedAnswer: "stage", forbiddenPhrases: ["opinion"] },
    { query: "Diet for dialysis patients", expectedTopics: ["dialysis", "diet", "potassium"], expectedAnswer: "diet", forbiddenPhrases: ["unlimited"] },
    { query: "What is eGFR?", expectedTopics: ["egfr", "filtration"], expectedAnswer: "filtration", forbiddenPhrases: ["probably"] },
    { query: "How to manage hypertension in CKD?", expectedTopics: ["hypertension", "blood pressure"], expectedAnswer: "blood pressure", forbiddenPhrases: ["guaranteed"] },
    { query: "What is ANCA-associated vasculitis?", expectedTopics: ["anca", "vasculitis"], expectedAnswer: "vessel", forbiddenPhrases: ["minor"] },
    { query: "Treatment for ANCA vasculitis", expectedTopics: ["steroid", "rituximab"], expectedAnswer: "rituximab", forbiddenPhrases: ["no cure"] },
    { query: "What is Lupus Nephritis?", expectedTopics: ["lupus", "nephritis"], expectedAnswer: "kidney", forbiddenPhrases: ["minor"] },
    { query: "How to prepare for a kidney biopsy?", expectedTopics: ["biopsy", "fasting"], expectedAnswer: "fasting", forbiddenPhrases: ["eat normally"] },
    { query: "Signs of peritonitis in PD patients", expectedTopics: ["peritonitis", "cloudy"], expectedAnswer: "cloudy", forbiddenPhrases: ["standard"] },
    { query: "Sodium restriction for kidney patients", expectedTopics: ["sodium", "salt"], expectedAnswer: "salt", forbiddenPhrases: ["unlimited"] },
    { query: "What is AKI?", expectedTopics: ["acute", "injury", "sudden"], expectedAnswer: "sudden", forbiddenPhrases: ["chronic"] },
    { query: "Post-discharge care after AKI", expectedTopics: ["follow-up", "blood test"], expectedAnswer: "follow-up", forbiddenPhrases: ["no need"] },
    { query: "How to clean PD catheter exit site?", expectedTopics: ["catheter", "cleaning"], expectedAnswer: "cleaning", forbiddenPhrases: ["open"] },
    { query: "What is PKD?", expectedTopics: ["polycystic", "cyst"], expectedAnswer: "cyst", forbiddenPhrases: ["contagious"] },
    { query: "High potassium foods to avoid", expectedTopics: ["banana", "potato"], expectedAnswer: "banana", forbiddenPhrases: ["all fine"] },
    { query: "Vaccinations for transplant patients", expectedTopics: ["influenza", "vaccination"], expectedAnswer: "vaccination", forbiddenPhrases: ["unsafe"] },
    { query: "Symptoms of kidney stones", expectedTopics: ["stone", "pain"], expectedAnswer: "pain", forbiddenPhrases: ["painless"] },
    { query: "What is IgA Nephropathy?", expectedTopics: ["iga", "berger"], expectedAnswer: "protein", forbiddenPhrases: ["contagious"] },
    { query: "Fluid limit for dialysis patients", expectedTopics: ["fluid", "limit"], expectedAnswer: "limit", forbiddenPhrases: ["freely"] },
    { query: "Bone problems in CKD", expectedTopics: ["bone", "mbd", "phosphate"], expectedAnswer: "bone", forbiddenPhrases: ["not serious"] },
    { query: "Vascular access for hemodialysis", expectedTopics: ["fistula", "graft"], expectedAnswer: "fistula", forbiddenPhrases: ["no risk"] },
    { query: "AV fistula hand exercises", expectedTopics: ["exercise", "ball", "squeeze"], expectedAnswer: "vibration", forbiddenPhrases: ["stop"] },
    { query: "What is a PD exchange?", expectedTopics: ["drain", "fill", "dwell"], expectedAnswer: "steps", forbiddenPhrases: ["simple"] },
    { query: "CAPD vs APD", expectedTopics: ["manual", "machine", "automated"], expectedAnswer: "cycler", forbiddenPhrases: ["machine is bad"] },
    { query: "Preparing for transplant surgery", expectedTopics: ["fast", "npo", "test"], expectedAnswer: "ready", forbiddenPhrases: ["eat"] },
    { query: "Transplant rejection symptoms", expectedTopics: ["rejection", "fever", "pain"], expectedAnswer: "doctor", forbiddenPhrases: ["ignore"] },
    { query: "Importance of immunosuppressants", expectedTopics: ["adherence", "pill", "rejection"], expectedAnswer: "timing", forbiddenPhrases: ["skip"] },
    { query: "Can I travel on PD?", expectedTopics: ["travel", "bag", "delivery"], expectedAnswer: "planning", forbiddenPhrases: ["cannot"] },
    { query: "Peritoneal dialysis catheter damage", expectedTopics: ["damage", "leak", "clamp"], expectedAnswer: "clamp", forbiddenPhrases: ["ignore"] },
    { query: "Intimacy after transplant", expectedTopics: ["sex", "intimacy", "pregnancy"], expectedAnswer: "doctor", forbiddenPhrases: ["avoid"] },
    { query: "What is medical nutrition therapy?", expectedTopics: ["mnt", "dietitian"], expectedAnswer: "nutrition", forbiddenPhrases: ["not needed"] },
    { query: "Gout and kidney disease", expectedTopics: ["gout", "uric acid", "joint"], expectedAnswer: "crystal", forbiddenPhrases: ["aspirin is best"] },
    { query: "Anemia in kidney patients", expectedTopics: ["anemia", "epo", "iron"], expectedAnswer: "fatigue", forbiddenPhrases: ["normal"] },
    { query: "Mental health on dialysis", expectedTopics: ["depression", "anxiety", "stress"], expectedAnswer: "support", forbiddenPhrases: ["ignore"] },
    { query: "Managing itching in CKD", expectedTopics: ["itch", "pruritus", "lotion"], expectedAnswer: "phosphate", forbiddenPhrases: ["soap"] },
    { query: "How to read GFR result?", expectedTopics: ["gfr", "stage", "filtration"], expectedAnswer: "kidney", forbiddenPhrases: ["perfect"] },
    { query: "Protein in urine foamy", expectedTopics: ["protein proteinuria", "foamy"], expectedAnswer: "urine", forbiddenPhrases: ["good"] },
    { query: "Low salt swaps", expectedTopics: ["herb", "spice", "amchur"], expectedAnswer: "salt", forbiddenPhrases: ["soy sauce"] },
    { query: "Why is vitamin D important?", expectedTopics: ["vitamin d", "bone", "calcium"], expectedAnswer: "absorption", forbiddenPhrases: ["useless"] },

    // --- Hindi Clinical (30 cases) ---
    { query: "क्रिएटिनिन क्या है?", expectedTopics: ["creatinine", "waste", "क्रिएटिनिन"], expectedAnswer: "अपशिष्ट", forbiddenPhrases: ["पता नहीं"] },
    { query: "किडनी फेलियर के लक्षण क्या हैं?", expectedTopics: ["symptom", "लक्षण", "failure"], expectedAnswer: "लक्षण", forbiddenPhrases: ["कोई बात नहीं"] },
    { query: "डायलिसिस डाइट प्लान", expectedTopics: ["dialysis", "diet", "आहार"], expectedAnswer: "आहार", forbiddenPhrases: ["नमक"] },
    { query: "किडनी प्रत्यारोपण क्या है?", expectedTopics: ["transplant", "प्रत्यारोपण"], expectedAnswer: "किडनी", forbiddenPhrases: ["खतरा"] },
    { query: "हाई क्रिएटिनिन को कैसे कम करें?", expectedTopics: ["lower", "reduce", "कम", "creatinine"], expectedAnswer: "उपाय", forbiddenPhrases: ["बढ़ाएं"] },
    { query: "डायलिसिस के फायदे", expectedTopics: ["benefit", "फायदे", "dialysis"], expectedAnswer: "खून", forbiddenPhrases: ["नुकसान"] },
    { query: "पेरिटोनियल डायलिसिस क्या है?", expectedTopics: ["peritoneal", "पेरिटोनियल"], expectedAnswer: "पेट", forbiddenPhrases: ["मशीन"] },
    { query: "किडनी में पथरी के लक्षण", expectedTopics: ["stone", "पथरी", "सिटम"], expectedAnswer: "दर्द", forbiddenPhrases: ["खुजली"] },
    { query: "मधुमेह और किडनी", expectedTopics: ["diabetes", "sugar", "मधुमेह"], expectedAnswer: "शुगर", forbiddenPhrases: ["मिठाई"] },
    { query: "हाथ धोने की तकनीक", expectedTopics: ["handwash", "हाथ", "धोना"], expectedAnswer: "स्टेप", forbiddenPhrases: ["गंदा"] },
    { query: "कैथेटर की देखभाल", expectedTopics: ["catheter", "कैथेटर", "care"], expectedAnswer: "सफाई", forbiddenPhrases: ["खुला"] },
    { query: "किडनी बायोप्सी की तैयारी", expectedTopics: ["biopsy", "बायोप्सी", "prep"], expectedAnswer: "खाली पेट", forbiddenPhrases: ["खाना"] },
    { query: "क्या दर्द निवारक सुरक्षित हैं?", expectedTopics: ["painkiller", "पेनकिलर", "safe"], expectedAnswer: "खतरनाक", forbiddenPhrases: ["रोज ले"] },
    { query: "कितना पानी पीना चाहिए?", expectedTopics: ["water", "पानी", "limit"], expectedAnswer: "लिमिट", forbiddenPhrases: ["ढेर सारा"] },
    { query: "किडनी के लिए योग", expectedTopics: ["yoga", "exercise", "गतिविधि"], expectedAnswer: "व्यायाम", forbiddenPhrases: ["दौड़ें"] },
    { query: "एनीमिया के लक्षण", expectedTopics: ["anemia", "एनीमिया", "iron"], expectedAnswer: "थकान", forbiddenPhrases: ["ताकत"] },
    { query: "ब्लड प्रेशर कंट्रोल", expectedTopics: ["blood pressure", "बीपी", "control"], expectedAnswer: "नमक", forbiddenPhrases: ["अचार"] },
    { query: "स्वस्थ किडनी के उपाय", expectedTopics: ["healthy", "protect", "बचाव"], expectedAnswer: "जीवनशैली", forbiddenPhrases: ["धूम्रपान"] },
    { query: "किडनी फेल होने पर क्या करें?", expectedTopics: ["fail", "stop", "विकल्प"], expectedAnswer: "डायलिसिस", forbiddenPhrases: ["घर बैठें"] },
    { query: "ट्रांसप्लांट के बाद परहेज", expectedTopics: ["after", "transplant", "परहेज"], expectedAnswer: "हाइजीन", forbiddenPhrases: ["बाहर खाएं"] },
    { query: "क्रोनिक किडनी डिजीज क्या है?", expectedTopics: ["ckd", "chronic", "क्रोनिक"], expectedAnswer: "बीमारी", forbiddenPhrases: ["बुखार"] },
    { query: "क्या केला खा सकते हैं?", expectedTopics: ["potassium", "banana", "केला"], expectedAnswer: "पोटेशियम", forbiddenPhrases: ["हां"] },
    { query: "किडनी पेशेंट के लिए फल", expectedTopics: ["fruit", "फल", "apple"], expectedAnswer: "सेब", forbiddenPhrases: ["आम"] },
    { query: "आहार में नमक कम कैसे करें?", expectedTopics: ["salt", "sodium", "नमक"], expectedAnswer: "मसाले", forbiddenPhrases: ["पापड़"] },
    { query: "किडनी की सूजन", expectedTopics: ["edema", "swelling", "सूजन"], expectedAnswer: "पैर", forbiddenPhrases: ["हंसी"] },
    { query: "प्रोटीन यूरिया क्या है?", expectedTopics: ["proteinuria", "protein", "पेशाब"], expectedAnswer: "झाग", forbiddenPhrases: ["साफ"] },
    { query: "पेशाब में खून आना", expectedTopics: ["blood", "urine", "खून"], expectedAnswer: "डॉक्टर", forbiddenPhrases: ["नॉर्मल"] },
    { query: "किडनी का अल्ट्रासाउंड", expectedTopics: ["ultrasound", "test", "जांच"], expectedAnswer: "स्कैन", forbiddenPhrases: ["खून"] },
    { query: "नेफ्रोलॉजिस्ट कौन होता है?", expectedTopics: ["nephrologist", "doctor", "डॉक्टर"], expectedAnswer: "किडनी", forbiddenPhrases: ["सर्जन"] },
    { query: "बोन हेल्थ और किडनी", expectedTopics: ["bone", "calcium", "हड्डी"], expectedAnswer: "फास्फोरस", forbiddenPhrases: ["मजबूत"] },

    // --- Marathi Clinical (30 cases) ---
    { query: "किडनी म्हणजे काय?", expectedTopics: ["kidney", "वृक्क", "किडनी"], expectedAnswer: "अवयव", forbiddenPhrases: ["माहीत नाही"] },
    { query: "किडनी निकामी होण्याची लक्षणे", expectedTopics: ["symptom", "लक्षणे", "failure"], expectedAnswer: "चिन्हे", forbiddenPhrases: ["काही नाही"] },
    { query: "डायलिसिस पेशंटचा आहार", expectedTopics: ["dialysis", "diet", "आहार"], expectedAnswer: "जेवण", forbiddenPhrases: ["मीठ"] },
    { query: "किडनी प्रत्यारोपण माहिती", expectedTopics: ["transplant", "प्रत्यारोपण", "माहिती"], expectedAnswer: "ऑपरेशन", forbiddenPhrases: ["सोपे"] },
    { query: "क्रिएटिनिन कमी करण्याचे उपाय", expectedTopics: ["lower", "reduce", "कमी", "creatinine"], expectedAnswer: "कमी", forbiddenPhrases: ["वाढवा"] },
    { query: "पाणी किती प्यावे?", expectedTopics: ["water", "पानी", "limit"], expectedAnswer: "मर्यादा", forbiddenPhrases: ["भरपूर"] },
    { query: "किडनी स्टोन लक्षणे", expectedTopics: ["stone", "खडा", "स्टोन"], expectedAnswer: "कंबर दुखणे", forbiddenPhrases: ["दमा"] },
    { query: "मधुमेह आणि किडनीचा त्रास", expectedTopics: ["diabetes", "sugar", "मधुमेह"], expectedAnswer: "साखर", forbiddenPhrases: ["गोड"] },
    { query: "बीपी आणि किडनी", expectedTopics: ["blood pressure", "बीपी", "रक्तदाब"], expectedAnswer: "नियंत्रण", forbiddenPhrases: ["लोणचे"] },
    { query: "पेरिटोनियल डायलिसिस म्हणजे काय?", expectedTopics: ["peritoneal", "पीडी", "पेरिटोनियल"], expectedAnswer: "पोट", forbiddenPhrases: ["मेंदू"] },
    { query: "फिस्टुला काळजी", expectedTopics: ["fistula", "फिस्टुला", "care"], expectedAnswer: "हाताची", forbiddenPhrases: ["जड"] },
    { query: "किडनी बायोप्सी कशासाठी?", expectedTopics: ["biopsy", "बायोप्सी", "test"], expectedAnswer: "तपासणी", forbiddenPhrases: ["रक्तदान"] },
    { query: "पेनकिलर किडनीसाठी घातक का?", expectedTopics: ["painkiller", "पेनकिलर", "harmful"], expectedAnswer: "नुकसान", forbiddenPhrases: ["चांगले"] },
    { query: "एनीमिया आणि थकवा", expectedTopics: ["anemia", "थकवा", "iron"], expectedAnswer: "रक्त", forbiddenPhrases: ["उत्साह"] },
    { query: "किडनी पेशंटसाठी व्यायाम", expectedTopics: ["exercise", "व्यायाम", "walk"], expectedAnswer: "चालणे", forbiddenPhrases: ["जिम"] },
    { query: "पोटॅशियम कमी असलेले अन्न", expectedTopics: ["potassium", "कमी", "अन्न"], expectedAnswer: "भाज्या", forbiddenPhrases: ["नारळ"] },
    { query: "हाथ धुण्याची योग्य पद्धत", expectedTopics: ["handwash", "हाथ", "धुणे"], expectedAnswer: "पद्धत", forbiddenPhrases: ["साबण नाही"] },
    { query: "लघवीतून रक्त येणे", expectedTopics: ["blood", "urine", "रक्त"], expectedAnswer: "गंभीर", forbiddenPhrases: ["साधे"] },
    { query: "सूज येण्याची कारणे", expectedTopics: ["edema", "सूज", "swelling"], expectedAnswer: "पाणी", forbiddenPhrases: ["हवा"] },
    { query: "किडनीचे कार्य", expectedTopics: ["function", "कार्य", "work"], expectedAnswer: "शुद्धीकरण", forbiddenPhrases: ["पाचन"] },
    { query: "फॉस्फरस आणि हाडे", expectedTopics: ["phosphorus", "हाडे", "bone"], expectedAnswer: "कॅल्शिअम", forbiddenPhrases: ["मऊ"] },
    { query: "डायलिसिस कधी सुरू करतात?", expectedTopics: ["when", "start", "कधी"], expectedAnswer: "जीएफआर", forbiddenPhrases: ["लगेच"] },
    { query: "सीकेडी म्हणजे काय?", expectedTopics: ["ckd", "सीकेडी", "chronic"], expectedAnswer: "दीर्घकालीन", forbiddenPhrases: ["खोकला"] },
    { query: "किडनी वाचवण्यासाठी टिप्स", expectedTopics: ["protect", "वाचवणे", "tips"], expectedAnswer: "काळजी", forbiddenPhrases: ["दारू"] },
    { query: "झोप आणि किडनी", expectedTopics: ["sleep", "झोप", "rest"], expectedAnswer: "आरोग्य", forbiddenPhrases: ["जागरण"] },
    { query: "नेफ्रोटिक सिंड्रोम लक्षणे", expectedTopics: ["nephrotic", "protein", "सूज"], expectedAnswer: "लक्षणे", forbiddenPhrases: ["ताप"] },
    { query: "लघवीला फेस येणे", expectedTopics: ["foamy", "फेस", "protein"], expectedAnswer: "प्रथिने", forbiddenPhrases: ["चांगले"] },
    { query: "किडनी प्रत्यारोपण खर्च", expectedTopics: ["transplant", "cost", "खर्च"], expectedAnswer: "माहिती", forbiddenPhrases: ["स्वस्त"] },
    { query: "दाता कोण होऊ शकतो?", expectedTopics: ["donor", "दाता", "who"], expectedAnswer: "नातेवाईक", forbiddenPhrases: ["कोणीही"] },
    { query: "किडनी आणि मानसिक स्वास्थ्य", expectedTopics: ["mental", "मानसिक", "stress"], expectedAnswer: "आरोग्य", forbiddenPhrases: ["वेडे"] },

    // --- Urdu Clinical (20 cases) ---
    { query: "کریٹینین کیا ہے؟", expectedTopics: ["creatinine", "waste", "کریٹینین"], expectedAnswer: "فاضل مادے", forbiddenPhrases: ["پتہ نہیں"] },
    { query: "گردے فیل ہونے کی علامات کیا ہیں؟", expectedTopics: ["symptom", "علامات", "failure"], expectedAnswer: "علامات", forbiddenPhrases: ["کوئی مسئلہ نہیں"] },
    { query: "ڈائلیسس میں خوراک کیا ہونی چاہیے؟", expectedTopics: ["dialysis", "diet", "خوراک"], expectedAnswer: "غذا", forbiddenPhrases: ["نمک"] },
    { query: "گردے کی پتھری کی علامات کیا ہیں؟", expectedTopics: ["stone", "پتھری", "درد"], expectedAnswer: "درد", forbiddenPhrases: ["خارش"] },
    { query: "کتنا پانی پینا چاہیے؟", expectedTopics: ["water", "पानी", "limit"], expectedAnswer: "محدود", forbiddenPhrases: ["بہت زیادہ"] },
    { query: "پیشاب میں جھاگ کیوں آتی ہے؟", expectedTopics: ["foamy", "protein", "جھاگ"], expectedAnswer: "پروٹین", forbiddenPhrases: ["بہت اچھا"] },
    { query: " گردے کا ٹرانسپلانٹ کیا ہے؟", expectedTopics: ["transplant", "ٹرانسپلانٹ", "پیوند کاری"], expectedAnswer: "پیوند کاری", forbiddenPhrases: ["خطرے کا کوئی اندیشہ نہیں"] },
    { query: "ہائی بلڈ پریشر اور گردے", expectedTopics: ["bp", "blood pressure", "بلڈ پریشر"], expectedAnswer: "نمک", forbiddenPhrases: ["اچار"] },
    { query: "ذیابیطس اور گردے کی صحت", expectedTopics: ["diabetes", "sugar", "شوگر"], expectedAnswer: "شوگر", forbiddenPhrases: ["مٹھائی"] },
    { query: "پیشاب کا ٹیسٹ کیوں ضروری ہے؟", expectedTopics: ["urine test", "ٹیسٹ", "پیشاب"], expectedAnswer: "جانچ", forbiddenPhrases: ["خون کا نمونہ"] },
    { query: "گردے کی سوجن", expectedTopics: ["edema", "swelling", "سوجن"], expectedAnswer: "پاؤں", forbiddenPhrases: ["ہنسنا"] },
    { query: "فیسٹولا کی دیکھ بھال کیسے کریں؟", expectedTopics: ["fistula", "فیسٹولا", "care"], expectedAnswer: "دیکھ بھال", forbiddenPhrases: ["بھاری کام کریں"] },
    { query: " گردے کی صفائی (ڈائلیسس) کے کیا فائدے ہیں؟", expectedTopics: ["dialysis", "benefit", "ڈائلیسس"], expectedAnswer: "خون کی صفائی", forbiddenPhrases: ["نقصان دہ ہے"] },
    { query: "کیا پین کلرز گردوں کے لیے نقصان دہ ہیں؟", expectedTopics: ["painkiller", "نقصان", "پین کلر"], expectedAnswer: "خطرناک", forbiddenPhrases: ["محفوظ ہیں"] },
    { query: "گردے کی صحت کے لیے ورزش کیا ہے؟", expectedTopics: ["exercise", "ورزش", "activity"], expectedAnswer: "چہل قدمی", forbiddenPhrases: ["جم جائیں"] },
    { query: "انیمیا کے کیا علامات ہیں؟", expectedTopics: ["anemia", "انیمیا", "tired"], expectedAnswer: "تھکن", forbiddenPhrases: ["طاقت"] },
    { query: "گردے کا ڈائٹ چارٹ", expectedTopics: ["diet", "chart", "غذا"], expectedAnswer: "پلان", forbiddenPhrases: ["باہر کا کھانا"] },
    { query: "گردے کی رپورٹ کیسے پڑھیں؟", expectedTopics: ["report", "gfr", "کریٹینین"], expectedAnswer: "ڈاکٹر", forbiddenPhrases: ["آسان ہے"] },
    { query: " ٹرانسپلانٹ کے بعد احتیاط", expectedTopics: ["after", "transplant", "احتیاط"], expectedAnswer: "صفائی", forbiddenPhrases: ["باہر کا کھانا"] },
    { query: "نیفرولوجسٹ کون ہوتا ہے؟", expectedTopics: ["nephrologist", "ڈاکٹر", "گردوں کے ماہر"], expectedAnswer: "ماہر", forbiddenPhrases: ["سرجن"] },
];

export async function runFullEvaluation() {
    console.log(`Starting Full Evaluation on ${EVAL_TEST_SUITE.length} cases...`);
    const results: EvalResult[] = [];
    for (const tc of EVAL_TEST_SUITE) {
        const res = await evaluateTestCase(tc);
        results.push(res);
        console.log(`[EVAL] Q: "${tc.query}" | Retrieval: ${res.retrievalScore.toFixed(2)} | Faith: ${res.faithfulnessScore} | Gold: ${res.goldMatch || "None"}`);
    }
    const avgRetrieval = results.reduce((acc, r) => acc + r.retrievalScore, 0) / results.length;
    const avgFaith = results.reduce((acc, r) => acc + r.faithfulnessScore, 0) / results.length;
    const totalHallucinations = results.filter(r => r.hallucinationDetected).length;
    const goldHits = results.filter(r => r.goldMatch).length;
    console.log("\n--- EVALUATION SUMMARY ---");
    console.log(`Total Cases: ${results.length}`);
    console.log(`Gold Hits: ${goldHits} (${((goldHits / results.length) * 100).toFixed(1)}%)`);
    console.log(`Average Retrieval Precision: ${(avgRetrieval * 100).toFixed(1)}%`);
    console.log(`Average Faithfulness: ${(avgFaith * 100).toFixed(1)}%`);
    console.log(`Hallucinations Detected: ${totalHallucinations}`);
    console.log("---------------------------\n");
    return { results, summary: { avgRetrieval, avgFaith, totalHallucinations, goldHits } };
}

export interface EvalResult {
    query: string;
    retrievalScore: number;
    faithfulnessScore: number;
    goldMatch: string | null;
    hallucinationDetected: boolean;
    retrievalLatencyMs: number;
    totalLatencyMs: number;
    docsRetrieved: number;
    contextLength: number;
}

export async function evaluateTestCase(tc: EvalTestCase): Promise<EvalResult> {
    const start = Date.now();
    const goldMatch = findGoldMatch(tc.query.toLowerCase());
    const pageIndexStart = Date.now();
    const pageIndexDocs = await searchPageIndex(tc.query);
    const retrievalLatencyMs = Date.now() - pageIndexStart;
    const semanticDocs = await searchSemantic(tc.query, 6);
    const allDocs = [...pageIndexDocs, ...semanticDocs];
    const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.pageContent, d])).values());
    const allContent = uniqueDocs.map(d => d.pageContent).join(" ").toLowerCase();
    const topicsFound = tc.expectedTopics.filter(t => allContent.includes(t.toLowerCase()));
    const retrievalScore = tc.expectedTopics.length > 0 ? topicsFound.length / tc.expectedTopics.length : 1;
    const context = formatPageIndexContext(uniqueDocs);
    const model = getChatModel();
    let answer = "";
    try {
        const response = await model.invoke([
            new HumanMessage(`Context:\n${context}\n\nQuestion: ${tc.query}\nAnswer based ONLY on context:`)
        ]);
        answer = response.content.toString();
    } catch (e) { console.error(e); }
    const faithfulnessScore = answer.toLowerCase().includes(tc.expectedAnswer.toLowerCase()) ? 1 : 0;
    const hallucinationDetected = tc.forbiddenPhrases.some(fp => answer.toLowerCase().includes(fp.toLowerCase()));
    return {
        query: tc.query,
        retrievalScore,
        faithfulnessScore,
        goldMatch,
        hallucinationDetected,
        retrievalLatencyMs,
        totalLatencyMs: Date.now() - start,
        docsRetrieved: uniqueDocs.length,
        contextLength: context.length
    };
}
