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
    Menu,
    X,
} from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    image?: string; // Base64 image
    sources?: string[];
    timestamp: string;
}

export default function ChatComponent() {
    const [mounted, setMounted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm your Kidney Health Education Assistant. I provide accurate information about kidney diseases, treatments, diet recommendations, and preventive care—all based on verified medical resources.\n\nHow can I help you today?",
            timestamp: "", // Will be set on mount
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setMounted(true);
        // Load messages from localStorage
        const savedMessages = localStorage.getItem("kidney_chat_messages");
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (e) {
                console.error("Failed to parse saved messages", e);
            }
        } else {
            // Set initial welcome timestamp if no history
            setMessages(prev => prev.map(m => m.id === "welcome" ? { ...m, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : m));
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("kidney_chat_messages", JSON.stringify(messages));
        }
    }, [messages, mounted]);

    const clearChat = () => {
        const welcomeMessage: Message = {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm your Kidney Health Education Assistant. I provide accurate information about kidney diseases, treatments, diet recommendations, and preventive care—all based on verified medical resources.\n\nHow can I help you today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([welcomeMessage]);
        localStorage.removeItem("kidney_chat_messages");
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, selectedImage]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError("Image size must be less than 10MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage({ file, preview: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const currentInput = input.trim();
        const currentImage = selectedImage?.preview;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: currentInput || (currentImage ? "[Image]" : ""),
            image: currentImage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setSelectedImage(null);
        setIsLoading(true);
        setError(null);

        try {
            // Get last 6 messages for context (excluding images for text-search and current message)
            const chatHistory = messages
                .filter(m => m.id !== "welcome")
                .slice(-6)
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: currentInput,
                    image: currentImage?.split(',')[1], // Send only base64 data
                    history: chatHistory
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to get response: ${response.status}`);
            }

            // Create placeholder assistant message
            const assistantId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
                id: assistantId,
                role: "assistant",
                content: "",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, assistantMessage]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);

                    // Check for sources metadata
                    if (chunk.startsWith("__SOURCES__:")) {
                        const lineEnd = chunk.indexOf("\n");
                        const sourcesJson = chunk.substring(12, lineEnd);
                        const sources = JSON.parse(sourcesJson);

                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, sources } : m
                            )
                        );

                        const remaining = chunk.substring(lineEnd + 1);
                        if (remaining) {
                            fullContent += remaining;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, content: fullContent } : m
                                )
                            );
                        }
                    } else {
                        fullContent += chunk;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, content: fullContent } : m
                            )
                        );
                    }
                    setIsLoading(false); // Stop "typing" animation as soon as first content arrives
                }
            }

        } catch (err) {
            setError("Sorry, I encountered an error. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#E5DDD5] overflow-hidden">
            {/* Sidebar */}
            <aside className={`
                ${isSidebarOpen ? "flex" : "hidden"} 
                md:flex w-full md:w-96 flex-col bg-white border-r border-[#D1D7DB] 
                absolute md:relative z-50 h-full transition-all duration-300
            `}>
                <header className="h-[60px] bg-[#F0F2F5] px-4 flex items-center justify-between border-b border-[#D1D7DB]">
                    <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center">
                        <User className="text-white w-6 h-6" />
                    </div>
                    <div className="flex gap-4 text-[#54656F] items-center">
                        <Heart className="w-5 h-5 cursor-pointer" />
                        <Sparkles className="w-5 h-5 cursor-pointer" />
                        <X
                            className="w-6 h-6 md:hidden cursor-pointer"
                            onClick={() => setIsSidebarOpen(false)}
                        />
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
                        <Menu
                            className="w-6 h-6 md:hidden text-[#54656F] cursor-pointer"
                            onClick={() => setIsSidebarOpen(true)}
                        />
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
                        <Plus
                            onClick={clearChat}
                            className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors rotate-45"
                        />
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
                                    {message.image && (
                                        <div className="mb-2 rounded-md overflow-hidden border border-[#E9EDEF]">
                                            <img src={message.image} alt="User upload" className="max-w-full h-auto object-cover" />
                                        </div>
                                    )}
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
                                            {message.timestamp || "..."}
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
                                <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm relative bubble-assistant">
                                    <div className="typing-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
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
                <footer className="relative z-10 bg-[#F0F2F5] px-3 py-3 flex flex-col gap-2 border-t border-[#D1D7DB]">
                    {selectedImage && (
                        <div className="mx-4 mb-2 relative inline-block w-20 h-20 group">
                            <img src={selectedImage.preview} className="w-full h-full object-cover rounded-lg border-2 border-[#128C7E]" alt="Preview" />
                            <div
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer shadow-md hover:bg-red-600 transition-colors"
                            >
                                <Plus className="w-3 h-3 rotate-45" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
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
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                                <Paperclip
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-5 h-5 text-[#54656F] cursor-pointer hover:text-slate-800 ml-2"
                                />
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
                    </div>
                </footer>
            </div>
        </div>
    );
}
