"use client";

import { useState } from "react";
import { Bot, Video, Phone, Plus, MoreVertical, Menu } from "lucide-react";

interface ChatHeaderProps {
    onMenuClick: () => void;
    onResetClick: () => void;
    user: { id: string; username: string } | null;
    onSignOut: () => void;
}

export default function ChatHeader({ onMenuClick, onResetClick, user, onSignOut }: ChatHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="relative z-20 h-[60px] wa-header-glass px-4 flex items-center justify-between shadow-sm border-b border-[#D1D7DB]">
            <div className="flex items-center gap-3">
                {user?.username?.toLowerCase().includes('sachin') && (
                    <Menu
                        className="w-6 h-6 md:hidden text-[#54656F] cursor-pointer"
                        onClick={onMenuClick}
                    />
                )}
                <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center">
                    <Bot className="text-white w-6 h-6" />
                </div>
                <div>
                    <h2 className="font-bold text-[#111B21] leading-tight text-[15px]">Nirogyam ChatBot</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-[#25D366] medical-pulse"></div>
                        <p className="text-[12px] text-[#25D366] font-medium">Online</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6 text-[#54656F]">
                <Video className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                <Phone className="w-5 h-5 cursor-pointer hover:text-slate-800" />
                <div className="w-[1px] h-6 bg-[#D1D7DB] mx-1"></div>
                <Plus
                    onClick={onResetClick}
                    className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors rotate-45"
                />
                <div className="relative">
                    <MoreVertical
                        className="w-5 h-5 cursor-pointer hover:text-slate-800"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    />

                    {isMenuOpen && (
                        <>
                            {/* Backdrop to close menu */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in slide-in-from-top-2">
                                {user?.username?.toLowerCase().includes('sachin') && (
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            const pass = prompt("Enter Admin Password:");
                                            if (pass === "zotobsidian27") {
                                                window.location.href = "/admin";
                                            } else if (pass !== null) {
                                                alert("Incorrect password");
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#128C7E] flex items-center gap-2 active:bg-slate-100 transition-colors border-b border-slate-100"
                                    >
                                        <Menu className="w-4 h-4" />
                                        Admin Dashboard
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onSignOut();
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-500 flex items-center gap-2 active:bg-slate-100 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
