export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    image?: string;
    sources?: string[];
    timestamp: string;
    isStreaming?: boolean;
}
