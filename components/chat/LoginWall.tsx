"use client";

import { useState } from "react";
import { User, Loader2, ArrowRight } from "lucide-react";

interface LoginWallProps {
    onLogin: (userId: string, username: string) => void;
}

export default function LoginWall({ onLogin }: LoginWallProps) {
    const [username, setUsername] = useState("");
    const [mobile, setMobile] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setIsLoading(true);
        setError("");

        try {
            // Try to register/login (automatic for simplicity)
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username.trim(),
                    mobile: mobile.trim()
                })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("kidney_ai_user_id", data.id);
                localStorage.setItem("kidney_ai_username", data.username);
                onLogin(data.id, data.username);
            } else {
                setError(data.error || "Failed to enter chat");
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F0F2F5] p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-[#128C7E] p-8 text-white text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Kidney-AI Portal</h1>
                    <p className="text-teal-50/80 mt-2">Please enter your details to continue</p>
                </div>

                <form onSubmit={handleAuth} className="p-8 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. Dr. Sachin"
                                className="w-full px-5 py-4 rounded-2xl border border-[#D1D7DB] focus:ring-2 focus:ring-[#128C7E] focus:outline-none transition-all placeholder:text-slate-300"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Mobile Number</label>
                        <div className="relative">
                            <input
                                type="tel"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="e.g. +91 9876543210"
                                className="w-full px-5 py-4 rounded-2xl border border-[#D1D7DB] focus:ring-2 focus:ring-[#128C7E] focus:outline-none transition-all placeholder:text-slate-300"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100 animate-shake">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !username.trim() || !mobile.trim()}
                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isLoading || !username.trim() || !mobile.trim()
                            ? "bg-slate-300 cursor-not-allowed shadow-none"
                            : "bg-[#128C7E] hover:bg-[#0b6e63] active:scale-[0.98]"
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                Begin Consultation
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                        By continuing, you agree to our educational terms.
                        Your medical data stays private.
                    </p>
                </form>
            </div>
        </div>
    );
}
