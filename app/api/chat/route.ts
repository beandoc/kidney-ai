import { NextRequest, NextResponse } from "next/server";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { runAgent } from "../../../lib/agent";

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

import { trackQuery } from "../../../lib/users";

export async function POST(request: NextRequest) {
    console.log(JSON.stringify({ event: "ChatAPIRequest", method: "POST", message: "Received request" }));
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const queryTracker = await trackQuery(userId);
        if (!queryTracker.success) {
            if (queryTracker.error === "USER_BLOCKED") {
                return NextResponse.json({ error: "Your access has been restricted by Admin." }, { status: 403 });
            }
            if (queryTracker.error === "QUOTA_EXCEEDED") {
                return NextResponse.json({ error: "Daily limit reached (50 queries). Please return tomorrow!" }, { status: 429 });
            }
            return NextResponse.json({ error: "Invalid user account" }, { status: 401 });
        }

        const { message, image, history } = await request.json();

        if ((!message || typeof message !== "string") && !image) {
            return NextResponse.json(
                { error: "Message or image is required" },
                { status: 400 }
            );
        }

        // Multi-step Agent Reasoning
        console.time("Agent Request");

        let historyMessages: (HumanMessage | AIMessage)[] = [];
        if (history && Array.isArray(history)) {
            historyMessages = history.map((msg: { role: string; content: string }) => {
                if (msg.role === "assistant") return new AIMessage(msg.content);
                return new HumanMessage(msg.content);
            });
        }

        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    const agentStream = runAgent(message, historyMessages);

                    for await (const chunk of agentStream) {
                        if (typeof chunk === 'string') {
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                    controller.close();
                } catch (streamError: any) {
                    console.error("Agent Stream Error:", streamError);
                    // Send error as a special chunk instead of aborting the stream
                    const errorMsg = streamError?.message || "Internal Brain Error";
                    controller.enqueue(encoder.encode(`\n__ERROR__:${errorMsg}`));
                    controller.close();
                }
            },
        });

        console.timeEnd("Agent Request");

        return new Response(customStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error(JSON.stringify({
            event: "ChatAPIError",
            errorMessage: err?.message,
            stack: err?.stack,
        }));
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "An error occurred",
                details: err?.message || String(error),
            },
            { status: 500 }
        );
    }
}
