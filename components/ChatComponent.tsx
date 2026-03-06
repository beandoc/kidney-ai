"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import ChatHeader from "./chat/ChatHeader";
import ChatSidebar from "./chat/ChatSidebar";
import ChatMessage from "./chat/ChatMessage";
import ChatStatus from "./chat/ChatStatus";
import ChatInput from "./chat/ChatInput";
import SuggestedQuestions from "./chat/SuggestedQuestions";
import { Message } from "./chat/types";
import LoginWall from "./chat/LoginWall";

const WELCOME_MESSAGE = `Hello! I'm **Nirogyam ChatBot** — I am here to assist you with all your questions about Kidney Health, and consultation with **Dr Sachin**.

Learn more about our services, or get more information. I'm here to help you every step of the way. Let's ensure you have a wonderful experience!

**For everything on Kidneys —**
- Prevention and Care
- Lifestyle or Diet
- Vaccinations
- Dialysis and Fistula Care
- Kidney Transplant
- and much more . . . just type below . . .

*(Chat with Nirogyam ChatBot in: मराठी, English, हिंदी)*

---
⚠️ *This is an automated chatbot response. The responses are for information purpose only, and should not be construed as medical advice! In case of an emergency or urgent care please come to **MI Room/ Emergency***`;

export default function ChatComponent() {
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ id: string; username: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "", // Starts empty for typewriter
            timestamp: "",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [welcomeTrigger, setWelcomeTrigger] = useState(0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // TYPEWRITER EFFECT FOR WELCOME MESSAGE
    useEffect(() => {
        if (!mounted) return;

        let i = 0;
        const timer = setInterval(() => {
            setMessages(prev => {
                if (prev.length === 0 || prev[0].id !== "welcome") {
                    clearInterval(timer);
                    return prev;
                }
                const newMessages = [...prev];
                const nextContent = WELCOME_MESSAGE.slice(0, i);
                newMessages[0] = {
                    ...newMessages[0],
                    content: nextContent,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isStreaming: i < WELCOME_MESSAGE.length
                };
                return newMessages;
            });
            i += 5; // Speed adjustment: typing 5 chars at a time for better flow
            if (i > WELCOME_MESSAGE.length + 5) {
                clearInterval(timer);
            }
        }, 20);
        return () => clearInterval(timer);
    }, [mounted, welcomeTrigger]);

    useEffect(() => {
        setMounted(true);
        // Check for existing user session
        const storedId = localStorage.getItem("kidney_ai_user_id");
        const storedUsername = localStorage.getItem("kidney_ai_username");
        if (storedId && storedUsername) {
            setUser({ id: storedId, username: storedUsername });
        }
    }, []);

    // CORKED & LOADED: Pre-warm the backend while the user reads the welcome message
    useEffect(() => {
        const prewarm = async () => {
            try {
                await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "ping" }),
                });
            } catch (e) {
                console.warn("Pre-warm ping failed, likely ignorable", e);
            }
        };
        // Small delay to let critical UI mount first
        const timer = setTimeout(prewarm, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Removed the Effect that saved messages to localStorage

    const clearChat = () => {
        const welcomeMessage: Message = {
            id: "welcome",
            role: "assistant",
            content: "", // Set to empty to re-trigger typewriter
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([welcomeMessage]);
        setWelcomeTrigger(v => v + 1);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSignOut = () => {
        localStorage.removeItem("kidney_ai_user_id");
        localStorage.removeItem("kidney_ai_username");
        setUser(null);
        clearChat();
    };

    const handleSuggestedQuestion = (question: string) => {
        executeSubmit(question);
    };

    const showSuggestions = messages.length <= 1 && !isLoading && messages[0]?.content === WELCOME_MESSAGE;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        executeSubmit();
    };

    const executeSubmit = async (forcedInput?: string) => {
        const textToSubmit = (forcedInput || input).trim();
        if (!textToSubmit || isLoading) return;
        if (!user) return;

        const currentInput = textToSubmit;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: currentInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setAgentStatus(null);
        setError(null);

        try {
            const chatHistory = messages
                .filter(m => m.id !== "welcome")
                .slice(-6)
                .map(m => ({ role: m.role, content: m.content }));

            let response;
            try {
                // Removed the aggressive 30s timeout and automatic retry loop 
                // which was causing extreme API quota exhaustion by duplicating requests.
                response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-id": user.id
                    },
                    body: JSON.stringify({
                        message: currentInput,
                        history: chatHistory
                    })
                });
            } catch (err) {
                throw err;
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
                isStreaming: true, // Start streaming
            };
            setMessages((prev) => [...prev, assistantMessage]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunkStr = decoder.decode(value, { stream: true });

                    // Fixed Stream Parser: Previously, this was split by '\n' and buffered,
                    // causing the UI to freeze unconditionally because LLMs output tokens, not lines.
                    // Now, every decoded chunk is appended directly to the UI for instant feedback.

                    if (chunkStr) {
                        fullContent += chunkStr;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, content: fullContent } : m
                            )
                        );
                        // Hide loading indicator the moment the first token arrives
                        if (isLoading) {
                            setIsLoading(false);
                            setAgentStatus(null);
                        }
                    }
                }
            }

            // Mark streaming as finished
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                )
            );
        } catch (error: unknown) {
            const err = error as Error;
            if (err.message === "QUOTA_EXCEEDED") {
                setError("The Medical Brain is currently very busy (API Quota Exceeded). Please try again in 1 minute.");
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
        <div className="flex h-screen bg-[#E5DDD5] overflow-hidden relative">
            {!user && <LoginWall onLogin={(id, username) => {
                setUser({ id, username });
                clearChat(); // Immediate clean slate on every login
            }} />}
            {user?.username?.toLowerCase().includes('sachin') && (
                <ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} />
            )}

            <div className="flex-1 flex flex-col relative h-full">
                <div className="wa-wallpaper"></div>

                <ChatHeader
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onResetClick={clearChat}
                    user={user}
                    onSignOut={handleSignOut}
                />

                <div className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-[10%] py-4 chat-scroll-area">
                    <div className="max-w-[800px] mx-auto space-y-3">
                        <div className="flex justify-center mb-6">
                            <div className="system-disclaimer flex items-center gap-2">
                                <span className="opacity-70">🔒</span>
                                MEDICAL EDUCATION PROTOCOL ACTIVE: Verified Resources Only
                            </div>
                        </div>

                        {messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                        ))}

                        <SuggestedQuestions
                            onSelect={handleSuggestedQuestion}
                            visible={showSuggestions}
                        />

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
                />
            </div>
        </div>
    );
}
