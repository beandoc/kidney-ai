export interface MenuOption {
    label: string;
    text: string;
    icon?: string;
}

export const MAIN_MENU: MenuOption[] = [
    { label: "Discharge Guidance", text: "Show Discharge Menu", icon: "🏥" },
    { label: "Clinical Library", text: "Show Explore Menu", icon: "📚" },
    { label: "Prevention Tips", text: "how to prevent kidney disease?", icon: "🛡️" },
    { label: "Diet & Nutrition", text: "show diet menu", icon: "🥗" },
    { label: "Dialysis Guide", text: "Show Dialysis Menu", icon: "🏥" },
    { label: "Treatment Info", text: "Available treatment options", icon: "💊" },
    { label: "Lab Guide", text: "understanding kidney lab results", icon: "🧪" },
    { label: "Transplant", text: "Show Transplant Menu", icon: "🔄" },
    { label: "Clinic Prep", text: "prepare for clinic visit", icon: "📅" },
    { label: "Join WhatsApp", text: "Stay Connected on WhatsApp", icon: "📱" },
];

export const EXPLORE_MENU: MenuOption[] = [
    { label: "Kidney Basics", text: "Show Basics Menu", icon: "📖" },
    { label: "Glomerulonephritis (GN)", text: "Show GN Menu", icon: "🔬" },
    { label: "Dialysis & Access", text: "Show Dialysis Menu", icon: "🏥" },
    { label: "Kidney Transplant", text: "Show Transplant Menu", icon: "🔄" },
    { label: "Diet & Nutrition", text: "Diet and lifestyle advice", icon: "🥗" },
    { label: "Stones & Infections", text: "Show Stones Menu", icon: "💎" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const BASICS_MENU: MenuOption[] = [
    { label: "AKI vs CKD", text: "your kidneys explained: guide to health and failure", icon: "🆚" },
    { label: "10 Harmful Habits", text: "are you unknowingly harming your kidneys? 10 habits", icon: "🚫" },
    { label: "Diabetes & BP Trio", text: "the dangerous trio: diabetes, high bp, and kidneys", icon: "👿" },
    { label: "Yearly Check-Up", text: "the silent worker: yearly kidney check-up", icon: "📅" },
    { label: "Is it Reversible?", text: "kidney damage: is it possible to reverse?", icon: "⏳" },
    { label: "Hitting the Brakes", text: "hitting the brakes on ckd", icon: "🛑" },
    { label: "Polycystic (PKD)", text: "what is polycystic kidney disease (pkd)?", icon: "🧬" },
    { label: "Silent High BP", text: "high blood pressure overview", icon: "📈" },
    { label: "Kidney Cancer", text: "What is kidney cancer?", icon: "🎗️" },
    { label: "⬅️ Back to Explore", text: "Show Explore Menu", icon: "⬅️" },
];

export const GN_MENU: MenuOption[] = [
    { label: "Nephrotic Syndrome", text: "what is nephrotic syndrome?", icon: "💧" },
    { label: "Nephritic Syndrome", text: "what is nephritic syndrome?", icon: "🩸" },
    { label: "IgA Nephropathy", text: "What is iga nephropathy?", icon: "🔬" },
    { label: "Diagnosis & Biopsy", text: "diagnostic process for glomerular disease", icon: "🔬" },
    { label: "Management/Rituximab", text: "management approach for glomerular disease", icon: "💊" },
    { label: "What is RPGN?", text: "what is rpgn?", icon: "⚠️" },
    { label: "⬅️ Back to Explore", text: "Show Explore Menu", icon: "⬅️" },
];

export const DIALYSIS_MENU: MenuOption[] = [
    { label: "Dialysis vs Transplant", text: "dialysis vs transplant: two paths", icon: "🆚" },
    { label: "Haemodialysis", text: "understanding haemodialysis", icon: "🏥" },
    { label: "Peritoneal Dialysis", text: "Show PD Menu", icon: "🏠" },
    { label: "AV Fistula Care", text: "caring for your av fistula", icon: "🧵" },
    { label: "Side Effects", text: "side effects of haemodialysis", icon: "🤕" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const PD_MENU: MenuOption[] = [
    { label: "Basics & Choice", text: "Show PD Basics Menu", icon: "🔄" },
    { label: "Procedure & Daily Care", text: "Show PD Care Menu", icon: "🏥" },
    { label: "Safety & Troubleshooting", text: "Show PD Safety Menu", icon: "⚠️" },
    { label: "Diet & Lifestyle", text: "Show PD Lifestyle Menu", icon: "🥗" },
    { label: "Home Logistics", text: "Show PD Logistics Menu", icon: "📦" },
    { label: "⬅️ Back to Dialysis", text: "Show Dialysis Menu", icon: "⬅️" },
];

export const PD_BASICS_MENU: MenuOption[] = [
    { label: "How PD Works", text: "understanding peritoneal dialysis", icon: "🔄" },
    { label: "CAPD vs APD (Options)", text: "pd options: choosing what fits your life", icon: "🆚" },
    { label: "Manual (CAPD) Schedule", text: "manual exchanges (capd): how it works and schedules", icon: "🗓️" },
    { label: "The Cycler (APD)", text: "automated dialysis (apd): how the cycler works", icon: "🤖" },
    { label: "⬅️ Back to PD Menu", text: "Show PD Menu", icon: "⬅️" },
];

export const PD_CARE_MENU: MenuOption[] = [
    { label: "Catheter Surgery", text: "pd catheter placement: preparation and procedure", icon: "🏥" },
    { label: "Daily Catheter Care", text: "peritoneal dialysis (pd) catheter: care and safety", icon: "🩹" },
    { label: "Bathing Instructions", text: "daily exit-site care and bathing safely", icon: "🚿" },
    { label: "Exchange Step-by-Step", text: "what is a pd exchange: drain, fill, dwell", icon: "💧" },
    { label: "⬅️ Back to PD Menu", text: "Show PD Menu", icon: "⬅️" },
];

export const PD_SAFETY_MENU: MenuOption[] = [
    { label: "Peritonitis Safety", text: "peritonitis: preventing and recognizing a serious infection", icon: "⚠️" },
    { label: "Exit-Site Infections", text: "exit-site infections: signs and prevention", icon: "🔍" },
    { label: "Troubleshoot Flow", text: "troubleshooting slow flow and fibrin", icon: "🔧" },
    { label: "Emergency: Damaged Tube", text: "responding to pd catheter damage: emergency steps", icon: "🚨" },
    { label: "⬅️ Back to PD Menu", text: "Show PD Menu", icon: "⬅️" },
];

export const PD_LIFESTYLE_MENU: MenuOption[] = [
    { label: "PD Diet Overview", text: "your guide to a kidney-friendly diet on pd", icon: "🥗" },
    { label: "Meds on PD", text: "medications on peritoneal dialysis", icon: "💊" },
    { label: "Exercise & Travel", text: "exercise and swimming on peritoneal dialysis", icon: "🏃" },
    { label: "Intimacy & Pregnancy", text: "intimacy and family planning on pd", icon: "❤️" },
    { label: "⬅️ Back to PD Menu", text: "Show PD Menu", icon: "⬅️" },
];

export const PD_LOGISTICS_MENU: MenuOption[] = [
    { label: "Exchange Materials", text: "essential materials for pd exchange at home", icon: "📦" },
    { label: "Storage & Disposal", text: "storing and disposing of pd supplies", icon: "🗑️" },
    { label: "Sterilizing (Autoclave)", text: "sterilizing supplies: autoclaving with a pressure cooker", icon: "🔥" },
    { label: "⬅️ Back to PD Menu", text: "Show PD Menu", icon: "⬅️" },
];

export const STONES_MENU: MenuOption[] = [
    { label: "Kidney Stones Guide", text: "management of kidney stones", icon: "💎" },
    { label: "Stone Procedures", text: "lithotripsy, surgery and treatments", icon: "🏥" },
    { label: "UTI Symptoms", text: "symptoms of urinary tract infection", icon: "⚠️" },
    { label: "Urinary System Foods", text: "foods for a healthy urinary system", icon: "🥗" },
    { label: "Stones vs Failure", text: "kidney stones vs kidney failure?", icon: "🆚" },
    { label: "⬅️ Back to Explore", text: "Show Explore Menu", icon: "⬅️" },
];

export const DIET_MENU: MenuOption[] = [
    { label: "Kidney Friendly Diet", text: "best diet for kidney patients", icon: "🥗" },
    { label: "Managing Sodium", text: "managing sodium in ckd", icon: "🧂" },
    { label: "Potassium Guide", text: "potassium management and food choices", icon: "🍌" },
    { label: "Is High Protein Safe?", text: "is a high-protein diet safe for kidneys?", icon: "💪" },
    { label: "Phosphorus in CKD", text: "managing phosphorus in ckd", icon: "🦴" },
    { label: "DASH (BP Plan)", text: "hypertension and kidney diet", icon: "📉" },
    { label: "⬅️ Back to Explore", text: "Show Explore Menu", icon: "⬅️" },
];

export const DISCHARGE_MENU: MenuOption[] = [
    { label: "Acute Kidney Injury (AKI)", text: "post discharge care for aki", icon: "🏥" },
    { label: "Chronic Kidney Disease (CKD)", text: "post discharge care for ckd", icon: "📉" },
    { label: "AV Fistula Care", text: "care after av fistula surgery", icon: "🧵" },
    { label: "CAPD Catheter Care", text: "precautions for peritoneal dialysis", icon: "🧬" },
    { label: "Tunneled Catheter Care", text: "dialysis catheter care", icon: "🩸" },
    { label: "Urinary Catheter Care", text: "how to care for a urinary catheter at home?", icon: "🚽" },
    { label: "Kidney Biopsy Care", text: "precautions after a kidney biopsy", icon: "🔬" },
    { label: "Flank Pain Relief", text: "treating flank pain and home care", icon: "🩹" },
    { label: "CKD5D (Hemodialysis)", text: "what is dialysis and fistula care?", icon: "🏥" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const DISEASE_MENU: MenuOption[] = [
    { label: "Chronic Disease (CKD)", text: "What is chronic kidney disease?", icon: "📉" },
    { label: "Lupus Nephritis", text: "What is lupus nephritis?", icon: "🦋" },
    { label: "Stones & Failure", text: "Kidney stones vs kidney failure?", icon: "💎" },
    { label: "Dialysis & Fistula", text: "What is dialysis and fistula care?", icon: "🏥" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const LABS_MENU: MenuOption[] = [
    { label: "Creatinine Levels", text: "What does high creatinine mean?", icon: "🧪" },
    { label: "eGFR Explained", text: "What are kidney failure stages?", icon: "📉" },
    { label: "Urinalysis Guide", text: "what is a urinalysis?", icon: "🧫" },
    { label: "Urine Cultures", text: "what is a urine culture?", icon: "🔬" },
    { label: "24-hr Urine Test", text: "how to collect a 24-hour urine specimen", icon: "🕒" },
    { label: "High Potassium", text: "What foods to avoid in high potassium?", icon: "🍌" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const TRANSPLANT_MENU: MenuOption[] = [
    { label: "Prep & Evaluation", text: "Show Transplant Prep Menu", icon: "📋" },
    { label: "Surgery & Hospital", text: "Show Transplant Surgery Menu", icon: "🏥" },
    { label: "Life After Transplant", text: "Show Transplant Life Menu", icon: "🌟" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const TRANSPLANT_PREP_MENU: MenuOption[] = [
    { label: "When is it needed?", text: "When is kidney transplant needed?", icon: "❓" },
    { label: "Evaluation Process", text: "the transplant evaluation process", icon: "📋" },
    { label: "Who can donate?", text: "who can donate a kidney?", icon: "🤝" },
    { label: "Matching Science", text: "how are kidney transplants matched?", icon: "🧬" },
    { label: "⬅️ Back to Transplant", text: "Show Transplant Menu", icon: "⬅️" },
];

export const TRANSPLANT_SURGERY_MENU: MenuOption[] = [
    { label: "Surgery Day", text: "what to expect on transplant surgery day", icon: "🏥" },
    { label: "Anesthesia Risks", text: "risks of anesthesia for transplant", icon: "😴" },
    { label: "Recovery in Hospital", text: "recovery and life after transplant", icon: "📈" },
    { label: "⬅️ Back to Transplant", text: "Show Transplant Menu", icon: "⬅️" },
];

export const TRANSPLANT_LIFE_MENU: MenuOption[] = [
    { label: "Anti-rejection Meds", text: "the importance of medication adherence", icon: "💊" },
    { label: "Rejection Signs", text: "understanding transplant rejection", icon: "⚠️" },
    { label: "Long-term Health", text: "long-term care and wellness", icon: "🌟" },
    { label: "Diet & Exercise", text: "diet and exercise after transplant", icon: "🏃" },
    { label: "Lifelong Precautions", text: "precautions after kidney transplant", icon: "🏠" },
    { label: "⬅️ Back to Transplant", text: "Show Transplant Menu", icon: "⬅️" },
];

export const VACCINE_MENU: MenuOption[] = [
    { label: "Required Vaccines", text: "vaccinations for kidney patients", icon: "💉" },
    { label: "Hepatitis B", text: "Hepatitis B vaccine for dialysis", icon: "🧬" },
    { label: "Flu & Pneumonia", text: "Flu vaccine for kidney patients", icon: "🤒" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export function getMenuPayload(options: MenuOption[]) {
    return `\n\n<options>${JSON.stringify(options)}</options>`;
}
