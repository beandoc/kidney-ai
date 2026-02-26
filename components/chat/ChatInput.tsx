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
        <footer className="relative z-20 px-4 py-4 flex flex-col gap-2 wa-input-container">
            {selectedImage && (
                <div className="mx-2 mb-3 relative inline-block w-28 h-28 group animate-in zoom-in-50 duration-200">
                    <img src={selectedImage.preview} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-xl" alt="Preview" />
                    <div
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-3 -right-3 bg-[#f15c5c] text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 transition-all border-2 border-white"
                    >
                        <X className="w-4 h-4" />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2.5 max-w-[1200px] mx-auto w-full">
                <div className="flex items-center text-[#54656F] bg-white rounded-full p-2.5 shadow-sm border border-slate-100 hover:text-[#128C7E] cursor-pointer transition-colors active:bg-slate-50">
                    <Plus className="w-6 h-6" />
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full px-5 py-3 flex items-center shadow-md border border-slate-100/50 focus-within:ring-2 focus-within:ring-[#128C7E]/10 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a clinical query..."
                            className="flex-1 bg-transparent border-none outline-none text-[#111B21] text-[16px] placeholder-slate-400"
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
                            className="w-5.5 h-5.5 text-[#54656F] cursor-pointer hover:text-[#128C7E] ml-2 transition-colors active:scale-90"
                        />
                    </div>

                    <button
                        type={input.trim() ? "submit" : "button"}
                        disabled={isLoading}
                        className={`flex items-center justify-center w-[52px] h-[52px] min-w-[52px] rounded-full cursor-pointer transition-all duration-300 shadow-lg transform active:scale-95 ${input.trim() ? 'bg-[#128C7E] rotate-0' : 'bg-[#128C7E] opacity-90'}`}
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
