import { NextResponse } from "next/server";
import { getPineconeStore, processFileBuffer, processRawText } from "../../../../lib/langchain/pinecone";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for large files

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
        },
    });
}

export async function POST(request: Request) {
    // Auth
    const password = request.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized: Invalid admin password" }, { status: 401 });
    }

    // Parse the file/text before starting the stream
    let docs: Awaited<ReturnType<typeof processFileBuffer>>;
    let label = "Unknown Source";

    try {
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const { text, sourceLabel } = await request.json();
            if (!text || !sourceLabel) {
                return NextResponse.json({ error: "Text and Source Label are required" }, { status: 400 });
            }
            label = sourceLabel;
            docs = await processRawText(text, label);
        } else {
            const formData = await request.formData();
            const file = formData.get("file") as File;
            if (!file) {
                return NextResponse.json({ error: "No file provided" }, { status: 400 });
            }
            if (file.size > 4 * 1024 * 1024) {
                return NextResponse.json({ error: "File size exceeds 4MB limit" }, { status: 400 });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            label = file.name;
            docs = await processFileBuffer(buffer, label);
        }

        if (!docs || docs.length === 0) {
            return NextResponse.json({ error: "Unsupported content or empty submission" }, { status: 400 });
        }
    } catch (error) {
        console.error("Upload parse error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to process file"
        }, { status: 500 });
    }

    // Stream progress as newline-delimited JSON
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
            };

            try {
                const vectorStore = await getPineconeStore();
                const BATCH_SIZE = 5;
                const DELAY_MS = 2000;
                const MAX_RETRIES = 3;
                const totalBatches = Math.ceil(docs.length / BATCH_SIZE);

                send({ type: 'start', totalChunks: docs.length, totalBatches, label });

                for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                    const batch = docs.slice(i, i + BATCH_SIZE);
                    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

                    let retries = 0;
                    while (retries <= MAX_RETRIES) {
                        try {
                            await vectorStore.addDocuments(batch);
                            send({
                                type: 'progress',
                                batch: batchNum,
                                totalBatches,
                                chunksIndexed: i + batch.length,
                                totalChunks: docs.length,
                                percent: Math.round(((i + batch.length) / docs.length) * 100)
                            });
                            break;
                        } catch (batchError) {
                            retries++;
                            if (retries > MAX_RETRIES) {
                                send({ type: 'error', error: `Batch ${batchNum} failed after ${MAX_RETRIES} retries` });
                                controller.close();
                                return;
                            }
                            const backoff = DELAY_MS * Math.pow(2, retries - 1);
                            send({ type: 'retry', batch: batchNum, retry: retries, backoffMs: backoff });
                            await new Promise(r => setTimeout(r, backoff));
                        }
                    }

                    if (i + BATCH_SIZE < docs.length) {
                        await new Promise(r => setTimeout(r, DELAY_MS));
                    }
                }

                send({
                    type: 'done',
                    chunks: docs.length,
                    message: `Successfully indexed ${label} (${docs.length} chunks)`
                });
            } catch (error) {
                send({ type: 'error', error: error instanceof Error ? error.message : "Internal error" });
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
