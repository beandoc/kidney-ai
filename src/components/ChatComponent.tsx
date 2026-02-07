"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send,
    Bot,
    User,
    Loader2,
    Heart,
    AlertCircle,
    Phone,
    Video,
    MoreVertical,
    Plus,
    Mic,
    CheckCheck,
    Paperclip,
    Sparkles,
} from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: string[];
    timestamp: string;
}

export default function ChatComponent() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm your Kidney Health Education Assistant. I provide accurate information about kidney diseases, treatments, diet recommendations, and preventive care—all based on verified medical resources.\n\nHow can I help you today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage.content }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to get response: ${response.status}`);
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.answer,
                sources: data.sources,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError("Sorry, I encountered an error. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#E5DDD5] overflow-hidden">
            {/* Sidebar (Desktop only) */}
            <aside className="hidden md:flex w-96 flex-col bg-white border-r border-[#D1D7DB]">
                <header className="h-[60px] bg-[#F0F2F5] px-4 flex items-center justify-between border-b border-[#D1D7DB]">
                    <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center">
                        <User className="text-white w-6 h-6" />
                    </div>
                    <div className="flex gap-4 text-[#54656F]">
                        <Heart className="w-5 h-5 cursor-pointer" />
                        <Sparkles className="w-5 h-5 cursor-pointer" />
                        <MoreVertical className="w-5 h-5 cursor-pointer" />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-4 bg-[#F0F2F5] flex items-center gap-4 cursor-pointer hover:bg-slate-100 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-[#128C7E] flex items-center justify-center shadow-sm">
                            <Bot className="text-white w-7 h-7" />
                        </div>
                        <div className="flex-1 border-b border-[#F0F2F5] pb-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-[#111B21]">Kidney Health AI</span>
                                <span className="text-xs text-[#667781]">Online</span>
                            </div>
                            <p className="text-sm text-[#667781] truncate">Professional Healthcare Assistant</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative h-full">
                {/* Background Wallpaper */}
                <div className="wa-wallpaper"></div>

                {/* Chat Header */}
                <header className="relative z-10 h-[60px] bg-[#F0F2F5] px-4 flex items-center justify-between shadow-sm border-b border-[#D1D7DB]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center">
                            <Bot className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-[#111B21] leading-tight text-[16px]">Kidney Health AI</h2>
                            <p className="text-[12px] text-[#667781]">Professional assistant • Online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-[#54656F]">
                        <Video className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                        <Phone className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                        <div className="w-[1px] h-6 bg-[#D1D7DB] mx-1"></div>
                        <MoreVertical className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                    </div>
                </header>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-[10%] py-4">
                    <div className="max-w-[800px] mx-auto space-y-3">
                        {/* System Message / Disclaimer */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-[#FFF9C4] text-[#54656F] text-[11px] py-1.5 px-4 rounded-lg shadow-sm border border-[#E9EDEF] text-center uppercase tracking-wider font-semibold max-w-[90%]">
                                🔒 This conversation provides medical information. Not a substitute for professional advice.
                            </div>
                        </div>

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-2 transition-all duration-300`}
                            >
                                <div
                                    className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-1.5 shadow-sm rounded-lg ${message.role === "user"
                                        ? "bg-[#DCF8C6] rounded-tr-none bubble-user"
                                        : "bg-white rounded-tl-none bubble-assistant"
                                        }`}
                                >
                                    <div className="text-[14.2px] text-[#111B21] leading-[1.45] whitespace-pre-wrap pr-10">
                                        {message.content}
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
                                            {message.timestamp}
                                        </span>
                                        {message.role === "user" && (
                                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start mb-2">
                                <div className="bg-white rounded-lg rounded-tl-none px-4 py-2.5 shadow-sm relative bubble-assistant">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-[#128C7E]" />
                                        <span className="text-[13px] text-[#667781] font-medium italic">AI is typing...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex justify-center my-6">
                                <div className="bg-[#ffebee] text-[#c62828] text-xs py-2 px-6 rounded-full shadow-sm flex items-center gap-2 border border-[#ffcdd2] font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Bar */}
                <footer className="relative z-10 bg-[#F0F2F5] px-3 py-3 flex items-center gap-2 border-t border-[#D1D7DB]">
                    <div className="flex items-center gap-3 text-[#54656F] px-1">
                        <Plus className="w-6 h-6 cursor-pointer hover:text-slate-800 transition-colors" />
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-white rounded-full px-5 py-2.5 flex items-center shadow-sm border border-[#F0F2F5]">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message"
                                className="flex-1 bg-transparent border-none outline-none text-[#111B21] text-[15.5px] placeholder-[#667781]"
                                disabled={isLoading}
                            />
                            <Paperclip className="w-5 h-5 text-[#54656F] cursor-pointer hover:text-slate-800 ml-2" />
                        </div>

                        <div className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-[#128C7E] cursor-pointer hover:bg-[#075E54] transition-all duration-200 shadow-md transform active:scale-90">
                            {input.trim() ? (
                                <button type="submit" disabled={isLoading} className="flex items-center justify-center w-full h-full">
                                    <Send className="w-5 h-5 text-white ml-0.5" />
                                </button>
                            ) : (
                                <div className="flex items-center justify-center w-full h-full">
                                    <Mic className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    </form>
                </footer>
            </div>
        </div>
    );
}
