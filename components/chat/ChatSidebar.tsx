"use client";

import { User, Heart, Sparkles, X, MoreVertical, Bot, Plus } from "lucide-react";
import Link from "next/link";

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
    return (
        <aside className={`
            ${isOpen ? "flex" : "hidden"} 
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
                        onClick={onClose}
                    />
                    <MoreVertical className="w-5 h-5 cursor-pointer" />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-4 bg-[#F0F2F5] flex items-center gap-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={onClose}>
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

                {/* Admin Link - AI Training Center */}
                <div className="px-4 mt-6 mb-2">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-3">Clinician Control Panel</p>
                    <Link href="/admin" className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-[#128C7E]/30 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#128C7E] flex items-center justify-center shadow-sm text-white transition-transform group-hover:scale-105">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-[#111B21] text-sm">Train Medical Brain</span>
                                <Sparkles className="w-3.5 h-3.5 text-[#128C7E] animate-pulse" />
                            </div>
                            <p className="text-[11px] text-[#128C7E] font-semibold leading-tight opacity-80">Upload PDFs & Guidelines</p>
                        </div>
                    </Link>
                </div>
            </div>
        </aside>
    );
}
