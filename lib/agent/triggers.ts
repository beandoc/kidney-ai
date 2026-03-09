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
    { id: "when is kidney transplant needed?", all: ["transplant"], any: ["when", "need"] },
    { id: "what is kidney transplant?", all: ["transplant"], any: ["what", "define", "is a"] },
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
    { id: "what is ckd?", any: ["ckd", "chronic kidney disease", "what is kidney disease"] },
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
            { id: "precautions for peritoneal dialysis", any: ["precaution", "safe", "care", "infection"] }
        ]
    },
    {
        id: "what is a kidney biopsy",
        any: ["biopsy"],
        subRules: [
            { id: "precautions after a kidney biopsy", any: ["precaution", "care", "after"] }
        ]
    },
    { id: "dialysis catheter care", all: ["catheter"], any: ["care", "precaution", "infection"] },
    {
        id: "post discharge care for aki",
        any: ["discharge", "after hospital"],
        subRules: [
            { id: "post discharge care for aki", any: ["aki"] },
            { id: "post discharge care for ckd", any: ["ckd"] },
            { id: "care after av fistula surgery", any: ["fistula"] }
        ]
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
