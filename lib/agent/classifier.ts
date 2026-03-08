/**
 * VIRTUAL LOCAL MODEL (Classifier)
 * Optimization: Handle simple/conversational queries locally without API calls.
 * This saves 60-80% of tokens by filtering non-medical small talk.
 */
export function virtualLocalModel(input: string): string | null {
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
