export interface MenuOption {
    label: string;
    text: string;
    icon?: string;
}

export const MAIN_MENU: MenuOption[] = [
    { label: "🔍 Disease Sections", text: "Show Disease Categories", icon: "🔍" },
    { label: "🥗 Diet & Lifestyle", text: "Diet and lifestyle advice", icon: "🥗" },
    { label: "💊 Treatment Options", text: "Available treatment options", icon: "💊" },
    { label: "🛡️ Prevention", text: "How to prevent kidney disease?", icon: "🛡️" },
    { label: "🧪 Lab Results", text: "Understanding kidney lab results", icon: "🧪" },
];

export const DISEASE_MENU: MenuOption[] = [
    { label: "Chronic Kidney Disease", text: "What is chronic kidney disease?", icon: "📉" },
    { label: "Lupus Nephritis", text: "What is lupus nephritis?", icon: "🦋" },
    { label: "Kidney Stones", text: "Kidney stones vs kidney failure?", icon: "💎" },
    { label: "Dialysis", text: "What is dialysis and fistula care?", icon: "🏥" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const LABS_MENU: MenuOption[] = [
    { label: "Creatinine Levels", text: "What does high creatinine mean?", icon: "🧪" },
    { label: "eGFR Explained", text: "What are kidney failure stages?", icon: "📉" },
    { label: "Hemodialysis", text: "Explain Hemodialysis process", icon: "🔄" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export function getMenuPayload(options: MenuOption[]) {
    return `\n\n<options>${JSON.stringify(options)}</options>`;
}
