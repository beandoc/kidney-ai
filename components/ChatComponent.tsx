"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import ChatHeader from "./chat/ChatHeader";
import ChatSidebar from "./chat/ChatSidebar";
import ChatMessage from "./chat/ChatMessage";
import ChatStatus from "./chat/ChatStatus";
import ChatInput from "./chat/ChatInput";
import { Message } from "./chat/types";

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
    const [agentStatus, setAgentStatus] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setMounted(true);
        const savedMessages = localStorage.getItem("kidney_chat_messages");
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (e) {
                console.error("Failed to parse saved messages", e);
            }
        } else {
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
            if (file.size > 4 * 1024 * 1024) {
                setError("Image size must be less than 4MB");
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
        setAgentStatus(null);
        setError(null);

        try {
            const chatHistory = messages
                .filter(m => m.id !== "welcome")
                .slice(-6)
                .map(m => ({ role: m.role, content: m.content }));

            let response;
            let retries = 0;
            const maxRetries = 1;

            while (retries <= maxRetries) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: currentInput,
                            image: currentImage?.split(',')[1],
                            history: chatHistory
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (response.ok) break;

                    if (retries < maxRetries) {
                        retries++;
                        await new Promise(r => setTimeout(r, 1000 * retries));
                        continue;
                    }
                    break;
                } catch (err) {
                    clearTimeout(timeoutId);
                    if (retries < maxRetries) {
                        retries++;
                        await new Promise(r => setTimeout(r, 1000 * retries));
                        continue;
                    }
                    throw err;
                }
            }

            if (!response || !response.ok) {
                if (response?.status === 429) {
                    throw new Error("QUOTA_EXCEEDED");
                }
                const errorData = await response?.json().catch(() => ({}));
                throw new Error(errorData?.error || `Failed to get response: ${response?.status}`);
            }

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
            let streamBuffer = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        if (streamBuffer.trim()) {
                            processLine(streamBuffer, assistantId);
                        }
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    streamBuffer += chunk;

                    const lines = streamBuffer.split("\n");
                    streamBuffer = lines.pop() || "";

                    for (const line of lines) {
                        processLine(line, assistantId);
                    }
                }
            }

            function processLine(line: string, assistantId: string) {
                if (!line.trim()) return;

                if (line.startsWith("__SOURCES__:")) {
                    try {
                        const jsonPart = line.substring(12);
                        const sources = JSON.parse(jsonPart);
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, sources } : m
                            )
                        );
                    } catch (e) {
                        console.error("Failed to parse sources", e);
                    }
                }
                else if (line.startsWith("__STATUS__:")) {
                    const status = line.substring(11).trim();
                    setAgentStatus(status);
                }
                else if (line.startsWith("__CLEAR_STATUS__")) {
                    setAgentStatus(null);
                    if (fullContent.length < 10) fullContent = "";
                }
                else if (line.startsWith("__ERROR__:")) {
                    const errorMsg = line.substring(10).trim();
                    setError(`Medical Brain Error: ${errorMsg}`);
                    setAgentStatus(null);
                }
                else {
                    fullContent += line + "\n";
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, content: fullContent.trim() } : m
                        )
                    );
                    setIsLoading(false);
                }
            }
        } catch (error: unknown) {
            const err = error as Error;
            if (err.message === "QUOTA_EXCEEDED") {
                setError("The Medical Brain is currently very busy (API Quota Exceeded). Please wait a few minutes.");
            } else {
                setError("Sorry, I encountered an error. Please try again.");
            }
            console.error(err);
        } finally {
            setIsLoading(false);
            setAgentStatus(null);
        }
    };

    return (
        <div className="flex h-screen bg-[#E5DDD5] overflow-hidden">
            <ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col relative h-full">
                <div className="wa-wallpaper"></div>

                <ChatHeader onMenuClick={() => setIsSidebarOpen(true)} onResetClick={clearChat} />

                <div className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-[10%] py-4 chat-scroll-area">
                    <div className="max-w-[800px] mx-auto space-y-3">
                        <div className="flex justify-center mb-6">
                            <div className="bg-[#FFF9C4] text-[#54656F] text-[11px] py-1.5 px-4 rounded-lg shadow-sm border border-[#E9EDEF] text-center uppercase tracking-wider font-semibold max-w-[90%]">
                                🔒 This conversation provides medical information. Not a substitute for professional advice.
                            </div>
                        </div>

                        {messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                        ))}

                        <ChatStatus isLoading={isLoading} agentStatus={agentStatus} />

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

                <ChatInput
                    input={input}
                    setInput={setInput}
                    isLoading={isLoading}
                    handleSubmit={handleSubmit}
                    selectedImage={selectedImage}
                    setSelectedImage={setSelectedImage}
                    handleFileSelect={handleFileSelect}
                />
            </div>
        </div>
    );
}
