"use client";

interface SuggestedQuestionsProps {
    onSelect: (question: string) => void;
    visible: boolean;
}

const SUGGESTED_QUESTIONS = [
    { emoji: "🛡️", text: "How to prevent kidney disease?" },
    { emoji: "🥗", text: "Best diet for kidney patients" },
    { emoji: "💉", text: "Vaccinations for kidney patients" },
    { emoji: "💊", text: "What is dialysis and fistula care?" },
    { emoji: "🔄", text: "What is kidney Transplant?" },
    { emoji: "🏥", text: "When is kidney transplant needed?" },
    { emoji: "🧪", text: "What does high creatinine mean?" },
    { emoji: "⚠️", text: "What are the common kidney silent killers?" },
    { emoji: "🔍", text: "What are the symptoms of kidney disease?" },
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
