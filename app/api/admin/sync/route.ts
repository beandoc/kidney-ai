import { NextResponse } from "next/server";
import { syncKnowledgeBase } from "@/lib/langchain/pinecone";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/sync
 * Triggers a sync of all local files to Pinecone with streaming progress
 */
export async function POST(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting bulk sync of knowledge base...");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
            };

            try {
                const specificFile = request.headers.get("x-sync-file") || undefined;
                console.log(specificFile ? `Syncing specific file: ${specificFile}` : "Starting bulk sync...");

                const result = await syncKnowledgeBase((progress) => {
                    send({ type: 'progress', ...progress });
                }, specificFile);

                send({
                    type: 'done',
                    totalChunks: result.totalChunks,
                    fileCount: result.fileCount,
                    message: `Successfully synchronized ${result.fileCount} files (${result.totalChunks} chunks).`
                });
            } catch (error) {
                const err = error as Error;
                console.error("Sync API Error:", err);
                send({ type: 'error', error: err.message || "Failed to sync knowledge base" });
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
        }
    });
}
