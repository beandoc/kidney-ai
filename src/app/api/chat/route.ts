import { NextRequest, NextResponse } from "next/server";
import { getChatModel, STRICT_SYSTEM_PROMPT } from "@/lib/langchain/config";
import { searchDocuments, formatContext } from "@/lib/langchain/vectorStore";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json();

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json(
                { error: "Google API key not configured" },
                { status: 500 }
            );
        }

        // Step 1: Search for relevant documents
        const relevantDocs = await searchDocuments(message, 4);

        // Step 2: Format context from retrieved documents
        const context = formatContext(relevantDocs);

        // Step 3: Build the prompt with strict instructions
        const filledPrompt = STRICT_SYSTEM_PROMPT.replace("{context}", context).replace(
            "{question}",
            message
        );

        // Step 4: Get response from LLM
        const chatModel = getChatModel();
        const response = await chatModel.invoke([
            new SystemMessage(filledPrompt),
            new HumanMessage(message),
        ]);

        // Step 5: Extract sources for citation
        const sources = relevantDocs.map((doc) => doc.metadata.source).filter(Boolean);
        const uniqueSources = [...new Set(sources)];

        return NextResponse.json({
            answer: response.content,
            sources: uniqueSources,
            documentsFound: relevantDocs.length,
        });
    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "An error occurred",
                details: error,
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
