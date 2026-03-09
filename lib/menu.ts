export interface MenuOption {
    label: string;
    text: string;
    icon?: string;
}

export const MAIN_MENU: MenuOption[] = [
    { label: "Explore Topics", text: "Show Explore Menu", icon: "🌐" },
    { label: "Diet & Nutrition", text: "show diet menu", icon: "🥗" },
    { label: "Dialysis", text: "Show Dialysis Menu", icon: "🏥" },
    { label: "Treatment Options", text: "Available treatment options", icon: "💊" },
    { label: "Prevention Tips", text: "how to prevent kidney disease?", icon: "🛡️" },
    { label: "Lab Results Guide", text: "understanding kidney lab results", icon: "🧪" },
    { label: "Kidney Transplant", text: "Show Transplant Menu", icon: "🔄" },
    { label: "Post Discharge Advice", text: "Show Discharge Menu", icon: "🏠" },
    { label: "Prepare for Clinic Visit", text: "prepare for clinic visit", icon: "📅" },
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
    { label: "Peritoneal Dialysis", text: "understanding peritoneal dialysis", icon: "🏠" },
    { label: "AV Fistula Care", text: "caring for your av fistula", icon: "🧵" },
    { label: "Side Effects", text: "side effects of haemodialysis", icon: "🤕" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
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
    { label: "Chronic Kidney Disease", text: "What is chronic kidney disease?", icon: "📉" },
    { label: "Lupus Nephritis", text: "What is lupus nephritis?", icon: "🦋" },
    { label: "Kidney Stones", text: "Kidney stones vs kidney failure?", icon: "💎" },
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
    { label: "When is it needed?", text: "When is kidney transplant needed?", icon: "❓" },
    { label: "Surgery & Anesthesia", text: "what to expect on transplant surgery day", icon: "🏥" },
    { label: "Rejection Info", text: "understanding transplant rejection", icon: "⚠️" },
    { label: "Medication Strategy", text: "the importance of medication adherence", icon: "💊" },
    { label: "Long-term Health", text: "long-term care and wellness", icon: "🌟" },
    { label: "Diet & Exercise", text: "diet and exercise after transplant", icon: "🍎" },
    { label: "Post-Transplant Care", text: "Precautions after kidney transplant", icon: "🏠" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
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
