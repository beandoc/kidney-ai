export interface TriggerRule {
    id: string;
    /** Keywords to match (OR logic). Match if any keyword is present. */
    any?: string[];
    /** Keywords that MUST all be present (AND logic). */
    all?: string[];
    /** Regex patterns to match. */
    regex?: RegExp[];
    /** Nested rules to check if this rule matches. */
    subRules?: TriggerRule[];
}

export const KEYWORD_REGISTRY: TriggerRule[] = [
    {
        id: "what bone problems can be caused by kidney disease?",
        any: ["bone", "joint", "muscle pain", "osteodystrophy", "mbd", "phosphate", "calcium", "vitamin d", "pth"],
        subRules: [
            { id: "symptoms and tests for kidney bone disease", any: ["symptom", "test", "check", "lab", "x-ray", "density", "biopsy"] },
            { id: "how are kidney bone problems treated?", any: ["treat", "help", "cure", "binder", "calcimimetic"] }
        ]
    },
    {
        id: "understanding av vascular access",
        any: ["av access", "vascular access", "fistula", "graft", "arteriovenous"],
        subRules: [
            { id: "preparing for av access surgery", any: ["prepare", "prep", "before", "imaging", "ultrasound", "fast"] },
            { id: "what happens during av access surgery?", any: ["during", "procedure", "how", "anesthesia", "incision", "needle"] },
            { id: "recovery and follow-up after access surgery", any: ["after", "recovery", "home", "follow", "fever", "pain"] }
        ]
    },
    {
        id: "best diet for kidney patients",
        any: ["diet", "food", "nutrition", "phosphorus", "potassium", "salt", "sodium"],
        regex: [/\beat\b/],
        subRules: [
            {
                id: "what is medical nutrition therapy?",
                any: ["medical nutrition"],
                regex: [/\bmnt\b/]
            }
        ]
    },
    {
        id: "what is medical nutrition therapy?",
        any: ["medical nutrition"],
        regex: [/\bmnt\b/]
    },
    {
        id: "how to prevent kidney disease?",
        all: ["prevent", "kidney"]
    },
    {
        id: "what if my kidneys fail?",
        all: ["kidney"],
        any: ["fail", "stop working"]
    },
    {
        id: "what is diabetes?",
        any: ["diabetes", "blood sugar", "glucose"],
        subRules: [
            { id: "symptoms of diabetes", any: ["symptom", "sign"] },
            { id: "risk factors for diabetes", any: ["risk", "cause", "how do i get"] },
            { id: "preventing type 2 diabetes", any: ["prevent", "delay", "lower risk"] },
            {
                id: "diabetes tests and diagnosis",
                any: ["test", "diagn", "a1c", "ogtt", "fpg"],
                subRules: [
                    { id: "what are the diabetes abcs?", regex: [/\babc\b/] },
                    { id: "checking blood glucose at home", any: ["home", "meter", "cgm"] }
                ]
            },
            { id: "what are the diabetes abcs?", regex: [/\babc\b/] },
            { id: "how to manage diabetes with lifestyle?", any: ["lifestyle", "meal", "exercise", "activity", "weight", "sleep"] },
            { id: "diabetes medications and insulin types", any: ["medicine", "medication", "insulin", "metformin"], regex: [/\bpill\b/, /\bpump\b/, /\bpen\b/, /\bglp\b/] },
            { id: "checking blood glucose at home", any: ["home", "meter", "cgm", "target", "low", "high", "ketone", "hypo", "hyper"] },
            { id: "diabetes and heart health", any: ["heart", "stroke", "attack", "chest pain", "statin", "aspirin", "angina"] },
            { id: "diabetes complications and prevention", any: ["complication", "nerve", "eye", "foot", "gum", "mouth", "dentist", "bladder"] },
            { id: "how do diabetes and high blood pressure affect kidneys?", any: ["kidney", "affect"] }
        ]
    },
    { id: "vaccinations for kidney patients", any: ["vaccin"] },
    { id: "what is dialysis and fistula care?", any: ["fistula", "dialysis care"] },
    {
        id: "what is a kidney transplant?",
        any: ["transplant"],
        subRules: [
            { id: "when is kidney transplant needed?", any: ["when", "need", "benchmark", "egfr"] },
            { id: "when is a transplant not advised? (contraindications)", any: ["not advised", "not eligible", "contraindication", "risk", "danger"] },
            { id: "the transplant evaluation process", any: ["evaluation", "process", "test", "audit", "ready"] },
            { id: "how are kidney transplants matched?", any: ["match", "pairing", "hla", "crossmatch", "blood group", "science"] },
            { id: "what to expect on transplant surgery day", any: ["surgery day", "operation", "happen during", "incision", "npo"] },
            { id: "who can donate a kidney?", any: ["donor", "who can give", "living", "deceased", "cadaveric"] },
            { id: "recovery and life after transplant", any: ["recovery", "life after", "how long in hospital"] },
            { id: "precautions after kidney transplant", any: ["precaution", "care", "home care", "safeguard", "aftercare"] }
        ]
    },
    { id: "what does high creatinine mean?", all: ["high", "creatinine"] },
    { id: "can kidney damage be reversed?", all: ["can", "revers"] },
    { id: "kidney stones vs kidney failure?", all: ["stone", "failure"] },
    { id: "how much water do i really need?", any: ["how much water", "water intake"] },
    { id: "what are the symptoms of kidney disease?", any: ["symptom"] },
    { id: "what are kidney failure stages?", any: ["stage", "floor"] },
    { id: "how do diabetes and high blood pressure affect kidneys?", any: ["diabetes", "blood pressure", "sugar", "high bp"] },
    { id: "how to lower creatinine?", any: ["lower", "reduce"], all: ["creatinine"] },
    { id: "are painkillers safe for kidneys?", any: ["painkiller", "pain killer", "brufen", "paracetamol"] },
    { id: "common kidney silent killers", any: ["habit", "killer", "harmful", "silent", "pkd", "uncontrolled"] },
    {
        id: "what is anca vasculitis?",
        any: ["anca"],
        subRules: [
            { id: "what is anca vasculitis?", all: ["what is", "vasculitis"] }
        ]
    },
    {
        id: "what is anca vasculitis?",
        all: ["what is", "vasculitis"]
    },
    {
        id: "what is ckd?",
        any: ["ckd", "chronic kidney disease", "what is kidney disease"],
        subRules: [
            { id: "what are the symptoms of ckd?", any: ["symptom", "sign", "swelling", "tired"] },
            { id: "what can i do on my own to protect my kidneys?", any: ["protect", "care", "prevent", "lifestyle", "nsaid"] },
            { id: "how is ckd treated?", any: ["treat", "medicine", "pill", "ace", "arb"] },
            { id: "why do i need a special diet if i have ckd?", any: ["why diet", "need diet", "reason for diet"] },
            { id: "chronic kidney disease: diet for non-dialysis patients", any: ["what can i eat", "eat ckd", "drink ckd", "serving"] }
        ]
    },
    {
        id: "common causes of ckd",
        all: ["cause", "ckd"],
        subRules: [
            { id: "other causes of ckd", any: ["other", "else"] }
        ]
    },
    { id: "monitoring kidney disease", any: ["monitor", "getting worse", "what test", "diagnose"] },
    { id: "interpreting kidney tests", any: ["gfr", "albumin", "uacr"] },
    { id: "how to manage kidney disease?", any: ["manage", "ways to help", "improve kidney", "sleep", "exercise", "activity", "smoking", "stress"] },
    { id: "preparing for doctor visit", any: ["doctor", "visit", "appointment", "ask"] },
    { id: "who is on my healthcare team?", any: ["team", "specialist", "dietitian", "nephrologist"] },
    { id: "kidney medications guide", any: ["medicine", "medication", "drug", "pill", "-pril", "-sartan"] },
    {
        id: "what is peritoneal dialysis",
        any: ["peritoneal"],
        regex: [/\bpd\b/],
        subRules: [
            { id: "how is peritoneal dialysis performed", any: ["how", "perform", "process", "steps"] },
            { id: "living with peritoneal dialysis", any: ["daily", "precaution", "safe", "care", "infection", "activity"] },
            { id: "peritoneal dialysis (pd) catheter: care and safety", any: ["catheter", "tube", "cleaning", "exit site", "wash", "shower"] }
        ]
    },
    {
        id: "what is a kidney biopsy?",
        any: ["biopsy", "renal biopsy", "needle test"],
        subRules: [
            { id: "how to prepare for a kidney biopsy", any: ["prepare", "prep", "before", "medication", "fast"] },
            { id: "what happens during a kidney biopsy?", any: ["during", "procedure", "how", "percutaneous", "transjugular"] },
            { id: "recovery after a kidney biopsy", any: ["after", "recovery", "home", "activity", "meds"] },
            { id: "kidney biopsy: home care and aftercare", any: ["care", "site", "bandage", "wash", "activity", "discharge"] },
            { id: "risks of a kidney biopsy", any: ["risk", "complication", "danger", "bleed", "bad"] }
        ]
    },
    {
        id: "what is a urinary catheter?",
        any: ["catheter"],
        subRules: [
            { id: "how to care for a urinary catheter at home?", any: ["care", "home", "how", "wash", "clean", "bag"] },
            { id: "when to call a doctor for urinary catheter issues?", any: ["doctor", "call", "infection", "danger", "warning"] }
        ]
    },
    { id: "dialysis catheter care", all: ["catheter"], any: ["care", "precaution", "infection"] },
    {
        id: "what is frequent urination?",
        any: ["urina", "pee"],
        all: ["frequent"],
        subRules: [
            { id: "what causes frequent urination?", any: ["cause", "why"] },
            { id: "will i need tests for frequent urination?", any: ["test", "diagnos"] },
            { id: "how is frequent urination treated?", any: ["treat", "help", "cure"] },
            { id: "when to call a doctor for frequent urination?", any: ["doctor", "call", "urgent", "danger", "warning", "serious"] }
        ]
    },
    {
        id: "what is end-stage kidney disease?",
        any: ["esrd", "end stage", "kidney failure"],
        subRules: [
            { id: "what are the symptoms of end-stage kidney disease?", any: ["symptom", "sign", "swelling", "nausea"] },
            { id: "how is end-stage kidney disease treated?", any: ["treat", "how", "option", "choice"] },
            { id: "proactive steps for end-stage kidney disease", any: ["protect", "help", "care", "prevent", "protect my kidneys"] },
            { id: "when to call the doctor for kidney failure issues", any: ["emergency", "call", "urgent", "doctor"] }
        ]
    },
    {
        id: "what is kidney replacement therapy?",
        any: ["replacment therapy", "krt", "what are my choices", "treatment options"]
    },
    {
        id: "what is acute kidney injury?",
        any: ["aki", "acute kidney failure", "acute kidney injury"],
        subRules: [
            { id: "what causes acute kidney injury?", any: ["cause", "why"] },
            { id: "symptoms and tests for acute kidney injury", any: ["symptom", "sign", "test", "check", "lab", "ultrasound"] },
            { id: "how is acute kidney injury treated?", any: ["treat", "help", "cure", "heal", "steroid", "diet"] }
        ]
    },
    {
        id: "understanding haemodialysis",
        any: ["hemodialysis", "haemodialysis", "blood dialysis"],
        subRules: [
            { id: "preparing for hemodialysis", any: ["prepare", "prep", "before", "choice", "ready"] },
            { id: "hemodialysis: daily care and safety", any: ["care", "how to take care", "safety", "thrill", "vibration"] },
            { id: "side effects and problems with hemodialysis", any: ["side effect", "problem", "crimp", "nausea"] },
            { id: "what is a hemodialysis catheter?", any: ["catheter", "cvc", "lumens", "hubs"] },
            { id: "hemodialysis catheter placement: preparation and procedure", any: ["placement", "tunnel", "ultrasound", "fluoroscopy"] }
        ]
    },
    {
        id: "what is continuous kidney replacement therapy?",
        any: ["ckrt", "continuous dialysis", "continuous kidney replacement"],
        subRules: [
            { id: "where is ckrt performed and how is it accessed?", any: ["where", "access", "icu", "catheter", "cvc"] },
            { id: "what happens during and after ckrt?", any: ["during", "after", "happen", "recovery", "monitor"] }
        ]
    },
    {
        id: "post discharge care for aki",
        any: ["discharge", "after hospital"],
        subRules: [
            { id: "post discharge care for aki", any: ["aki"] },
            { id: "post discharge care for ckd", any: ["ckd"] },
            { id: "care after av fistula surgery", any: ["fistula"] }
        ]
    },
    {
        id: "what is glomerular disease?",
        any: ["glomerular", "glomeruli", "glomerulonep"],
        subRules: [
            { id: "what are the symptoms of glomerular disease?", any: ["symptom", "sign", "foamy"] },
            { id: "is there a test for glomerular disease?", any: ["test", "check", "biopsy", "ultrasound"] },
            { id: "how is glomerular disease treated?", any: ["treat", "steroid", "immuno", "plasmapheresis"] }
        ]
    },
    {
        id: "what is iga nephropathy?",
        any: ["iga", "berger"],
        subRules: [
            { id: "what are the symptoms of iga nephropathy?", any: ["symptom", "blood", "cola", "tea"] },
            { id: "medical treatments for iga nephropathy", any: ["treat", "medicine", "ace", "arb", "sglt2", "statin"] },
            { id: "iga nephropathy and pregnancy", any: ["pregnant", "pregnancy", "baby"] }
        ]
    },
    {
        id: "should i be worried about blood in my urine?",
        any: ["blood", "hematuria"],
        all: ["urine"],
        subRules: [
            { id: "what causes blood in the urine?", any: ["cause", "why"] },
            { id: "will i need tests for blood in the urine?", any: ["test", "diagnos"] },
            { id: "will i need treatment for blood in the urine?", any: ["treat", "cured", "recover"] },
            { id: "when to call a doctor for blood in the urine?", any: ["doctor", "call", "urgent", "danger", "warning"] }
        ]
    },
    {
        id: "can diabetes cause kidney problems?",
        any: ["diabetes", "sugar"],
        all: ["kidney"],
        subRules: [
            { id: "what are the symptoms of kidney disease caused by diabetes?", any: ["symptom", "sign", "swelling", "edema", "tired"] },
            { id: "is there a test for kidney disease if i have diabetes?", any: ["test", "check", "urine", "blood", "egfr", "uacr"] },
            { id: "is there anything i can do to protect my kidneys if i have diabetes?", any: ["protect", "care", "prevent", "slow", "lifestyle"] },
            { id: "medical treatments for diabetic kidney disease", any: ["treat", "medicine", "medication", "drug", "ace", "arb", "sglt2"] },
            { id: "diabetes, kidney disease, and pregnancy", any: ["pregnant", "pregnancy", "baby", "conceive"] },
            { id: "what happens if my kidneys stop working completely?", any: ["fail", "stop working", "end stage", "esrd", "transplant", "dialysis"] }
        ]
    },
    {
        id: "do people on dialysis need to watch their diet?",
        any: ["dialysis diet", "diet on dialysis"],
        subRules: [
            { id: "dialysis diet: practical tips for success", any: ["tip", "how", "thirst", "success"] }
        ]
    },
    {
        id: "what is hyperkalemia?",
        any: ["hyperkalemia", "high potassium", "too much potassium"],
        subRules: [
            { id: "what causes hyperkalemia?", any: ["cause", "why", "medicine", "drug"] },
            { id: "symptoms and tests for hyperkalemia", any: ["symptom", "sign", "test", "check", "egfr", "blood test", "ecg", "ekg"] },
            { id: "treatment and prevention of hyperkalemia", any: ["treat", "help", "cure", "prevent"] },
            { id: "hyperkalemia: when to call for emergency help", any: ["emergency", "call", "doctor", "heart attack", "danger", "warning"] }
        ]
    },
    {
        id: "what is hyponatremia?",
        any: ["hyponatremia", "low sodium", "too little sodium"],
        subRules: [
            { id: "what causes hyponatremia?", any: ["cause", "why", "medicine", "drug", "water", "drink"] },
            { id: "symptoms and tests for hyponatremia", any: ["symptom", "sign", "test", "check", "blood test", "urine", "confusion", "seizure"] },
            { id: "how is hyponatremia treated?", any: ["treat", "help", "cure", "salt", "tablet"] }
        ]
    },
    {
        id: "what is a low-potassium diet?",
        any: ["potassium diet", "low potassium"],
        subRules: [
            { id: "high vs. low potassium foods", any: ["food", "list", "avoid", "eat", "fruit", "veg"] },
            { id: "ways to cut down on potassium", any: ["cut down", "lowering", "reduce", "leaching", "soak"] }
        ]
    },
    {
        id: "should i eat less sodium?",
        any: ["sodium", "salt"],
        all: ["why", "less", "limit"],
        subRules: [
            { id: "which foods have the most sodium?", any: ["food", "high", "hidden", "label"] },
            { id: "how to reduce sodium in my diet?", any: ["how", "grocery", "restaurant", "flavor", "tip"] }
        ]
    },
    {
        id: "what is fluid restriction and how to manage it?",
        any: ["fluid", "liquid", "water", "thirst", "drink"],
        all: ["restrict", "limit"]
    },
    {
        id: "what is kidney cancer?",
        any: ["cancer", "tumor", "growth", "carcinoma"],
        all: ["kidney"],
        subRules: [
            { id: "what are the symptoms of kidney cancer?", any: ["symptom", "sign", "lump", "weight loss"] },
            { id: "how is kidney cancer diagnosed?", any: ["diagnos", "test", "scan", "staging", "mri", "ct"] },
            { id: "how is kidney cancer treated?", any: ["treat", "surgery", "targeted", "immuno", "nephrectomy"] },
            { id: "follow-up care for kidney cancer", any: ["follow", "check-up", "next", "return"] }
        ]
    },
    {
        id: "what is proteinuria?",
        any: ["proteinuria", "protein in urine", "foamy urine", "bubbly urine"],
        subRules: [
            { id: "types of proteinuria", any: ["type", "transient", "orthostatic", "persistent"] },
            { id: "proteinuria: diagnosis and tests", any: ["test", "diagnos", "dipstick", "urinalysis"] },
            { id: "symptoms and treatment of proteinuria", any: ["symptom", "treat", "help", "swelling", "edema"] }
        ]
    },
    {
        id: "edema overview",
        any: ["edema", "swelling", "fluid retention", "pitting"],
        subRules: [
            { id: "symptoms of edema", any: ["symptom", "sign", "dent", "dimple"] },
            { id: "what causes edema?", any: ["cause", "why"] },
            { id: "edema treatment and management", any: ["treat", "help", "salt", "sodium", "diuretic", "stocking"] }
        ]
    },
    {
        id: "what is lupus (sle)?",
        any: ["lupus", "sle", "systemic lupus"],
        subRules: [
            { id: "symptoms of lupus", any: ["symptom", "rash", "butterfly", "joint", "fatigue"] },
            { id: "lupus and kidney health", any: ["kidney", "nephritis", "glomerulonephritis"] },
            { id: "lupus treatment and lifestyle", any: ["treat", "lifestyle", "sun", "diet", "exercise", "medicine"] },
            { id: "when to call your doctor for lupus", any: ["doctor", "call", "fever", "emergency"] }
        ]
    },
    {
        id: "how to collect a 24-hour urine specimen",
        any: ["24-hour", "24 hour", "specimen"],
        all: ["urine"]
    },
    {
        id: "what is polycystic kidney disease (pkd)?",
        any: ["pkd", "polycystic", "cyst"],
        subRules: [
            { id: "symptoms of pkd and systemic effects", any: ["symptom", "pain", "blood", "aneurysm", "liver"] },
            { id: "how is pkd diagnosed and treated?", any: ["diagnos", "treat", "test", "tolevaptan", "jynarque"] }
        ]
    },
    {
        id: "what is flank pain?",
        any: ["flank pain", "side pain", "back pain"],
        subRules: [
            { id: "causes and triggers for flank pain", any: ["cause", "why", "trigger"] },
            { id: "treating flank pain and home care", any: ["treat", "help", "home", "care", "heat", "ice"] }
        ]
    },
    {
        id: "high blood pressure overview",
        any: ["hypertension", "high blood pressure", "high bp", "bp"],
        subRules: [
            { id: "causes and risks for high bp", any: ["cause", "risk", "white coat"] },
            { id: "treating and managing high bp", any: ["treat", "manage", "lifestyle", "medicine"] }
        ]
    },
    {
        id: "what is a urine culture?",
        any: ["culture", "clean catch", "germ", "bacteria"],
        all: ["urine"]
    },
    {
        id: "what is vesicoureteral reflux (vur)?",
        any: ["vur", "reflux", "backward", "backwards"],
        all: ["urine"]
    },
    {
        id: "diet for kidney stones",
        any: ["stone", "oxalate", "uric acid"],
        all: ["diet", "food"]
    },
    {
        id: "precautions after kidney transplant",
        all: ["precaution", "after", "transplant"]
    },
    {
        id: "prepare for clinic visit",
        any: ["clinic", "visit", "doctor meet", "appointment"],
        all: ["prepare"]
    }
];

export function findGoldMatch(input: string, rules: TriggerRule[] = KEYWORD_REGISTRY): string | null {
    for (const rule of rules) {
        const anyPass = !rule.any && !rule.regex ? true :
            (rule.any?.some(k => input.includes(k)) || rule.regex?.some(r => r.test(input)));

        const allPass = !rule.all ? true :
            rule.all.every(k => input.includes(k));

        if (anyPass && allPass && (rule.any || rule.all || rule.regex)) {
            // Check sub-rules for specialization
            if (rule.subRules) {
                const subMatch = findGoldMatch(input, rule.subRules);
                if (subMatch) return subMatch;
            }
            return rule.id;
        }
    }
    return null;
}
