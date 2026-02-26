"use client";

import { Message } from "./types";
import { CheckCheck, Sparkles } from "lucide-react";

interface ChatMessageProps {
    message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isAssistant = message.role === "assistant";

    return (
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-2 transition-all duration-300`}>
            <div
                className={`relative max-w-[88%] sm:max-w-[75%] px-3 py-1.5 shadow-sm rounded-lg ${message.role === "user"
                    ? "bg-[#e7fce3] rounded-tr-none bubble-user"
                    : "bg-white rounded-tl-none bubble-assistant"
                    }`}
            >
                {message.image && (
                    <div className="mb-2 rounded-md overflow-hidden border border-[#E9EDEF]">
                        <img src={message.image} alt="User upload" className="max-w-full h-auto object-cover" />
                    </div>
                )}
                <div className="text-[14.2px] text-[#111B21] leading-[1.45] whitespace-pre-wrap pr-10">
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
                                return <div key={i}>{part}</div>;
                            })}
                        </div>
                    ) : (
                        message.content
                    )}
                </div>

                {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#E9EDEF] flex flex-wrap gap-1.5">
                        {message.sources.map((src, i) => (
                            <span key={i} className="text-[10px] bg-[#F0F2F5] px-2 py-0.5 rounded text-[#667781] font-medium border border-[#D1D7DB]">
                                {src}
                            </span>
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
