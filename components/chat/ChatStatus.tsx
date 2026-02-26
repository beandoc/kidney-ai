"use client";

interface ChatStatusProps {
    isLoading: boolean;
    agentStatus: string | null;
}

export default function ChatStatus({ isLoading, agentStatus }: ChatStatusProps) {
    if (!isLoading && !agentStatus) return null;

    return (
        <div className="flex justify-start mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm relative bubble-assistant flex flex-col gap-2 min-w-[200px]">
                {agentStatus ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 text-[13px] text-[#128C7E] font-medium flex items-center gap-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#128C7E]"></span>
                            </div>
                            {agentStatus}
                        </div>
                    </div>
                ) : (
                    <div className="typing-dots">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
