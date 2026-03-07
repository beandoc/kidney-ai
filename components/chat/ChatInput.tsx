"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Send, Mic, MicOff } from "lucide-react";

// TypeScript fallback for SpeechRecognition
const SpeechRecognitionAPI = typeof window !== 'undefined' ?
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    isLoading: boolean;
    handleSubmit: (e: React.FormEvent) => void;
}

export default function ChatInput({
    input,
    setInput,
    isLoading,
    handleSubmit,
}: ChatInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (SpeechRecognitionAPI) {
            recognitionRef.current = new SpeechRecognitionAPI();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            // Native support for Hindi and English seamlessly via browser Engine
            recognitionRef.current.lang = 'en-IN'; // Works great for mixing English/Hindi

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentTranscript += transcript + " ";
                    }
                }

                if (currentTranscript.trim()) {
                    setInput(input + (input.endsWith(" ") ? "" : " ") + currentTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [setInput]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            // Start listening
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    return (
        <footer className="relative z-20 px-4 py-4 flex flex-col gap-2 wa-input-container">
            <div className="flex items-center gap-2.5 max-w-[1200px] mx-auto w-full">
                <div className="flex items-center text-[#54656F] bg-white rounded-full p-2.5 shadow-sm border border-slate-100 hover:text-[#128C7E] cursor-pointer transition-colors active:bg-slate-50">
                    <Plus className="w-6 h-6" />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full px-5 py-3 flex items-center shadow-md border border-slate-100/50 focus-within:ring-2 focus-within:ring-[#128C7E]/10 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening (Hindi or English)..." : "Type your query or tap mic to speak..."}
                            className={`flex-1 bg-transparent border-none outline-none text-[16px] placeholder-slate-400 ${isListening ? 'text-[#128C7E] animate-pulse' : 'text-[#111B21]'}`}
                            disabled={isLoading}
                        />
                    </div>

                    {!input.trim() ? (
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={isLoading}
                            className={`flex items-center justify-center w-[52px] h-[52px] min-w-[52px] rounded-full cursor-pointer transition-all duration-300 shadow-lg transform active:scale-95 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[#128C7E] opacity-90'}`}
                        >
                            {isListening ? (
                                <MicOff className="w-5 h-5 text-white" />
                            ) : (
                                <Mic className="w-5 h-5 text-white" />
                            )}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center w-[52px] h-[52px] min-w-[52px] rounded-full cursor-pointer transition-all duration-300 shadow-lg transform active:scale-95 bg-[#128C7E]"
                        >
                            <Send className="w-5 h-5 text-white ml-0.5" />
                        </button>
                    )}
                </form>
            </div>
        </footer>
    );
}
