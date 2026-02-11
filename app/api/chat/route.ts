import { NextRequest, NextResponse } from "next/server";
import { getChatModel, STRICT_SYSTEM_PROMPT, VISION_SYSTEM_PROMPT } from "../../../lib/langchain/config";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { searchDocuments, formatContext } from "../../../lib/langchain/vectorStore";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({ message: "Chat API is active" });
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

export async function POST(request: NextRequest) {
    console.log("POST /api/chat received");
    try {
        const { message, image, history } = await request.json();

        if ((!message || typeof message !== "string") && !image) {
            return NextResponse.json(
                { error: "Message or image is required" },
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
        console.time("Vector Search");
        const searchQuery = message || "kidney health and diet";
        const relevantDocs = await searchDocuments(searchQuery, 6);
        console.timeEnd("Vector Search");

        // Step 2: Format context from retrieved documents
        const context = formatContext(relevantDocs);

        // Step 3: Build the prompt
        const systemPromptBase = image ? VISION_SYSTEM_PROMPT : STRICT_SYSTEM_PROMPT;
        const filledPrompt = systemPromptBase.replace("{context}", context).replace(
            "{question}",
            message || "Analyze this image."
        );

        // Step 4: Stream response from LLM
        const chatModel = getChatModel(1); // Limit retries to 1 to avoid hanging on 429 errors

        let historyMessages: (HumanMessage | AIMessage)[] = [];
        if (history && Array.isArray(history)) {
            historyMessages = history.map((msg: { role: string; content: string }) => {
                if (msg.role === "assistant") return new AIMessage(msg.content);
                return new HumanMessage(msg.content);
            });
        }

        let messages;
        if (image) {
            // Multimodal message format
            messages = [
                new SystemMessage(filledPrompt),
                ...historyMessages,
                new HumanMessage({
                    content: [
                        { type: "text", text: message || "Please analyze this image." },
                        {
                            type: "image_url",
                            image_url: `data:image/jpeg;base64,${image}`,
                        },
                    ],
                }),
            ];
        } else {
            messages = [
                new SystemMessage(filledPrompt),
                ...historyMessages,
                new HumanMessage(message),
            ];
        }

        console.time("LLM Stream Start");
        const stream = await chatModel.stream(messages);
        console.timeEnd("LLM Stream Start");

        // Step 5: Setup streaming response
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                // First event: unique sources
                const sources = relevantDocs.map((doc) => doc.metadata.source).filter(Boolean);
                const uniqueSources = [...new Set(sources)];
                controller.enqueue(encoder.encode(`__SOURCES__:${JSON.stringify(uniqueSources)}\n`));

                console.time("LLM First Token");
                let isFirst = true;

                for await (const chunk of stream) {
                    if (isFirst) {
                        console.timeEnd("LLM First Token");
                        isFirst = false;
                    }
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
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Chat API Error Detailed:", {
            message: err?.message,
            stack: err?.stack,
            error: error
        });
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "An error occurred",
                details: err?.message || String(error),
            },
            { status: 500 }
        );
    }
}
