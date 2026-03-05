"use client";

import { Message } from "./types";
import { CheckCheck, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
    message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isAssistant = message.role === "assistant";

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
