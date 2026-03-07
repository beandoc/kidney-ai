export interface MenuOption {
    label: string;
    text: string;
    icon?: string;
}

export const MAIN_MENU: MenuOption[] = [
    { label: "Disease Sections", text: "Show Disease Categories", icon: "🔍" },
    { label: "Diet & Nutrition", text: "Diet and lifestyle advice", icon: "🥗" },
    { label: "Treatment Options", text: "Available treatment options", icon: "💊" },
    { label: "Prevention Tips", text: "How to prevent kidney disease?", icon: "🛡️" },
    { label: "Lab Results Guide", text: "Understanding kidney lab results", icon: "🧪" },
    { label: "Kidney Transplant", text: "Show Transplant Menu", icon: "🔄" },
    { label: "Vaccination Guide", text: "Show Vaccine Menu", icon: "💉" },
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
    { label: "High Potassium", text: "What foods to avoid in high potassium?", icon: "🍌" },
    { label: "⬅️ Back to Main", text: "Show Main Menu", icon: "⬅️" },
];

export const TRANSPLANT_MENU: MenuOption[] = [
    { label: "When is it needed?", text: "When do i need a kidney transplant?", icon: "❓" },
    { label: "Donor Information", text: "Who can donate a kidney?", icon: "🤝" },
    { label: "Post-Transplant Care", text: "Precautions after kidney transplant", icon: "🏥" },
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
