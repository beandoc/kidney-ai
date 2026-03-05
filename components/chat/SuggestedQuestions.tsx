"use client";

interface SuggestedQuestionsProps {
    onSelect: (question: string) => void;
    visible: boolean;
}

const SUGGESTED_QUESTIONS = [
    { emoji: "🫘", text: "What is Chronic Kidney Disease?" },
    { emoji: "🧪", text: "What does high creatinine mean?" },
    { emoji: "🥗", text: "Foods to avoid in kidney disease" },
    { emoji: "💊", text: "What is dialysis and when is it needed?" },
    { emoji: "🩺", text: "What is Lupus Nephritis?" },
    { emoji: "📊", text: "What is eGFR and its normal range?" },
];

export default function SuggestedQuestions({ onSelect, visible }: SuggestedQuestionsProps) {
    if (!visible) return null;

    return (
        <div className="flex flex-wrap gap-2 justify-center px-4 py-3 animate-fadeIn">
            {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(q.text)}
                    className="suggested-chip"
                >
                    <span className="text-base">{q.emoji}</span>
                    <span>{q.text}</span>
                </button>
            ))}
        </div>
    );
}
