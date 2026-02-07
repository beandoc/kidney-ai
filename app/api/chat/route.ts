import { NextRequest, NextResponse } from "next/server";
import { getChatModel, STRICT_SYSTEM_PROMPT } from "@/lib/langchain/config";
import { searchDocuments, formatContext } from "@/lib/langchain/vectorStore";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function GET() {
    return NextResponse.json({ status: "Chat API is active and ready for POST requests." });
}

export async function POST(request: NextRequest) {
    console.log("POST /api/chat received");
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

        // Step 4: Stream response from LLM
        const chatModel = getChatModel();
        const stream = await chatModel.stream([
            new SystemMessage(filledPrompt),
            new HumanMessage(message),
        ]);

        // Step 5: Setup streaming response
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                // First event: unique sources
                const sources = relevantDocs.map((doc) => doc.metadata.source).filter(Boolean);
                const uniqueSources = [...new Set(sources)];
                controller.enqueue(encoder.encode(`__SOURCES__:${JSON.stringify(uniqueSources)}\n`));

                for await (const chunk of stream) {
                    if (chunk.content) {
                        controller.enqueue(encoder.encode(chunk.content as string));
                    }
                }
                controller.close();
            },
        });

        return new Response(customStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
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
