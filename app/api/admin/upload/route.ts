import { NextResponse } from "next/server";
import { getPineconeStore, processFileBuffer, processRawText } from "../../../../lib/langchain/pinecone";
import * as fs from "fs";
import * as path from "path";
import { pageIndexClient } from "../../../../lib/pageindex/client";
import { invalidateIndex } from "../../../../lib/pageindex/retrieval";

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
    let fileBuffer: Buffer | null = null;

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
            fileBuffer = Buffer.from(await file.arrayBuffer());
            label = file.name;
            docs = await processFileBuffer(fileBuffer, label);
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
                const isPdf = label.toLowerCase().endsWith('.pdf');

                if (isPdf && fileBuffer) {
                    send({ type: 'progress', status: 'Generating Deep Reasoning Tree...', percent: 10 });
                    const result = await pageIndexClient.indexPdf(fileBuffer, label);

                    // Save to knowledge_base/pageindex
                    const kbPath = path.join(process.cwd(), 'knowledge_base', 'pageindex');
                    if (!fs.existsSync(kbPath)) fs.mkdirSync(kbPath, { recursive: true });

                    const outputPath = path.join(kbPath, `${label}.json`);
                    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

                    // Invalidate search index so it rebuilds on next query
                    invalidateIndex();

                    send({
                        type: 'done',
                        message: `Successfully indexed ${label} using PageIndex Deep Architecture (Gemini).`
                    });
                } else {
                    // Simple Tree for non-PDFs or text
                    send({ type: 'progress', status: 'Creating Knowledge Node...', percent: 30 });

                    const fullText = docs.map(d => d.pageContent).join('\n\n');

                    const simpleResult = {
                        doc_name: label,
                        structure: [
                            {
                                title: "Document Overview",
                                node_id: "0000",
                                start_index: 1,
                                end_index: 1, // Text docs are treated as 1 page
                                summary: `Comprehensive content of ${label}`,
                                text: fullText
                            }
                        ]
                    };

                    const kbPath = path.join(process.cwd(), 'knowledge_base', 'pageindex');
                    if (!fs.existsSync(kbPath)) fs.mkdirSync(kbPath, { recursive: true });

                    const fileName = label.endsWith('.json') ? label : `${label}.json`;
                    const outputPath = path.join(kbPath, fileName);
                    fs.writeFileSync(outputPath, JSON.stringify(simpleResult, null, 2));

                    // Invalidate search index so it rebuilds on next query
                    invalidateIndex();

                    send({
                        type: 'done',
                        message: `Successfully added ${label} to Agentic Brain (Simple Tree Mode).`
                    });
                }
            } catch (error) {
                console.error("Worker process error:", error);
                send({ type: 'error', error: error instanceof Error ? error.message : "Internal processing error" });
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
