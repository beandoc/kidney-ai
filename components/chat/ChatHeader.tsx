"use client";

import { Bot, Video, Phone, Plus, MoreVertical, Menu } from "lucide-react";

interface ChatHeaderProps {
    onMenuClick: () => void;
    onResetClick: () => void;
}

export default function ChatHeader({ onMenuClick, onResetClick }: ChatHeaderProps) {
    return (
        <header className="relative z-20 h-[60px] wa-header-glass px-4 flex items-center justify-between shadow-sm border-b border-[#D1D7DB]">
            <div className="flex items-center gap-3">
                <Menu
                    className="w-6 h-6 md:hidden text-[#54656F] cursor-pointer"
                    onClick={onMenuClick}
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
                    onClick={onResetClick}
                    className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors rotate-45"
                />
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-slate-800" />
            </div>
        </header>
    );
}
