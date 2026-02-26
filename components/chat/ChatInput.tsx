"use client";

import { useEffect, useRef } from "react";
import { Plus, Paperclip, Send, Mic, X } from "lucide-react";

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    isLoading: boolean;
    handleSubmit: (e: React.FormEvent) => void;
    selectedImage: { file: File; preview: string } | null;
    setSelectedImage: (val: { file: File; preview: string } | null) => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ChatInput({
    input,
    setInput,
    isLoading,
    handleSubmit,
    selectedImage,
    setSelectedImage,
    handleFileSelect,
}: ChatInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <footer className="relative z-20 bg-[#f0f2f5] px-3 py-3 flex flex-col gap-2 border-t border-[#D1D7DB]">
            {selectedImage && (
                <div className="mx-4 mb-2 relative inline-block w-24 h-24 group">
                    <img src={selectedImage.preview} className="w-full h-full object-cover rounded-xl border-2 border-[#128C7E] shadow-lg" alt="Preview" />
                    <div
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-xl hover:bg-red-600 transition-all hover:scale-110"
                    >
                        <X className="w-4 h-4" />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 max-w-[1000px] mx-auto w-full">
                <div className="flex items-center gap-3 text-[#54656F] px-1">
                    <Plus className="w-6 h-6 cursor-pointer hover:text-[#128C7E] transition-colors" />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-[24px] px-5 py-2.5 flex items-center shadow-sm border border-transparent focus-within:border-[#128C7E]/20 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message"
                            className="flex-1 bg-transparent border-none outline-none text-[#111B21] text-[16px] placeholder-[#667781]"
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
                            className="w-5 h-5 text-[#54656F] cursor-pointer hover:text-[#128C7E] ml-2 transition-colors"
                        />
                    </div>

                    <button
                        type={input.trim() ? "submit" : "button"}
                        disabled={isLoading}
                        className="flex items-center justify-center w-[48px] h-[48px] min-w-[48px] rounded-full bg-[#128C7E] cursor-pointer hover:bg-[#075E54] transition-all duration-200 shadow-lg transform active:scale-95"
                    >
                        {input.trim() ? (
                            <Send className="w-5 h-5 text-white ml-0.5" />
                        ) : (
                            <Mic className="w-5 h-5 text-white" />
                        )}
                    </button>
                </form>
            </div>
        </footer>
    );
}
