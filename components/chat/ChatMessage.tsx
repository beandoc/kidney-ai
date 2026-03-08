"use client";

import { Message } from "./types";
import { CheckCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
    message: Message;
    onOptionClick?: (optionText: string) => void;
}

export default function ChatMessage({ message, onOptionClick }: ChatMessageProps) {
    const isAssistant = message.role === "assistant";
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Stop speaking if the component unmounts
    useEffect(() => {
        return () => {
            if (typeof window !== "undefined") {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const toggleSpeech = () => {
        if (typeof window === "undefined") return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Cancel previous speech
        window.speechSynthesis.cancel();

        // Remove thought traces and special markdown for cleaner speech
        const cleanContent = message.content
            .replace(/<thought>.*?<\/thought>/gs, "")
            .replace(/[#*`_]/g, "")
            .trim();

        if (!cleanContent) return;

        const utterance = new SpeechSynthesisUtterance(cleanContent);

        // Language detection - Simple check for Devanagari script (Hindi/Marathi)
        if (/[\u0900-\u097F]/.test(cleanContent)) {
            // Check for Marathi-specific patterns or default to Hindi
            // (Most TTS engines handle Hindi/Marathi with hi-IN if mr-IN is missing)
            utterance.lang = "hi-IN";
        } else {
            utterance.lang = "en-IN";
        }

        utterance.rate = 0.95; // Slightly slower for clinical clarity
        utterance.pitch = 1.0;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    const renderText = (text: string) => {
        // Split by the custom divider we added in agent.ts
        const parts = text.split("\n---\n");
        const mainContent = parts[0];
        const disclaimer = parts.length > 1 ? parts[1] : null;

        return (
            <div className="flex flex-col gap-1">
                <div className={`markdown-content ${message.isStreaming ? 'streaming' : ''}`}>
                    <ReactMarkdown
                        components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-[#111B21]">{children}</strong>,
                            h1: ({ children }) => <h1 className="text-[15px] font-bold mb-2 mt-1 text-[#075e54]">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[14.5px] font-bold mb-1.5 mt-1 text-[#075e54]">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[14.2px] font-semibold mb-1 mt-0.5 text-[#128c7e]">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="text-[13.8px] leading-[1.5]">{children}</li>,
                            img: ({ src, alt }) => (
                                <div className="my-3 rounded-lg overflow-hidden shadow-sm border border-slate-200 bg-white inline-block">
                                    <img src={src} alt={alt || "Medical Reference"} className="w-full h-auto object-contain max-h-[300px]" loading="lazy" />
                                    {alt && <div className="text-[11px] text-center text-slate-500 p-1.5 bg-slate-50 border-t border-slate-100">{alt}</div>}
                                </div>
                            ),
                        }}
                    >
                        {mainContent}
                    </ReactMarkdown>
                    {message.isStreaming && !disclaimer && (
                        <span className="typewriter-cursor"></span>
                    )}
                </div>

                {disclaimer && (
                    <>
                        <hr className="message-divider" />
                        <div className="disclaimer-text">
                            <ReactMarkdown>{disclaimer}</ReactMarkdown>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-2 transition-all duration-300`}>
            <div
                className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-2 shadow-sm rounded-xl ${message.role === "user"
                    ? "bg-[#dcf8c6] rounded-tr-none bubble-user"
                    : "bg-white rounded-tl-none bubble-assistant"
                    }`}
            >
                {isAssistant && !message.isStreaming && message.content && (
                    <button
                        onClick={toggleSpeech}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-20 ${isSpeaking ? 'bg-red-50 text-red-500 animate-pulse' : 'text-[#667781] hover:bg-[#F0F2F5] hover:text-[#075e54]'}`}
                        title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                    >
                        {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                )}
                {message.image && (
                    <div className="mb-2 rounded-md overflow-hidden border border-[#E9EDEF]">
                        <img src={message.image} alt="User upload" className="max-w-full h-auto object-cover" />
                    </div>
                )}
                <div className="text-[14.2px] text-[#111B21] leading-[1.45] pr-10">
                    {message.content.includes("<thought>") ? (
                        <div className="space-y-3">
                            {message.content.split(/<\/?thought>/).map((part, i) => {
                                if (i % 2 === 1) { // Inside <thought>
                                    return (
                                        <div key={i} className="text-xs bg-[#F7F9FA] p-3 rounded-lg border-l-4 border-[#128C7E]/30 italic text-slate-500 font-serif leading-relaxed my-2">
                                            <div className="font-bold uppercase tracking-wider text-[9px] mb-1 opacity-60 flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3" />
                                                Clinical Reasoning Trace
                                            </div>
                                            {part.trim()}
                                        </div>
                                    );
                                }
                                if (!part.trim()) return null;
                                return <div key={i}>{renderText(part)}</div>;
                            })}
                        </div>
                    ) : (
                        renderText(message.content)
                    )}
                </div>

                {isAssistant && message.options && message.options.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-[#f0f2f5] pt-3 animate-fadeIn">
                        {message.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => onOptionClick?.(option.text)}
                                className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] hover:bg-[#e7e9ed] text-[#075e54] text-[13px] font-medium rounded-lg transition-colors border border-transparent hover:border-[#075e54]/20 active:scale-[0.98]"
                            >
                                {option.icon && <span>{option.icon}</span>}
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-end gap-1 mt-1 h-3">
                    <span className="text-[11px] text-[#667781] uppercase font-medium mr-1 tracking-tighter">
                        {message.timestamp || "..."}
                    </span>
                    {message.role === "user" && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    )}
                </div>
            </div>
        </div>
    );
}
