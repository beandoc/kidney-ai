import { NextResponse } from "next/server";
import { getPineconeStore, processFileBuffer, processRawText } from "../../../../lib/langchain/pinecone";
import * as fs from "fs";
import * as path from "path";

import { invalidateIndex } from "../../../../lib/pageindex/retrieval";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "../../../../lib/langchain/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for large files

export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin");
    const allowedOrigins = [
        "http://localhost:3000",
        "https://kidney-ai.vercel.app"
    ];
    
    const responseOrigin = origin && (allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin.includes('localhost')))
        ? origin 
        : allowedOrigins[0];

    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": responseOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
            "Access-Control-Max-Age": "86400",
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
                // Use /tmp for writes — Vercel serverless filesystem is read-only except /tmp
                const kbPath = process.env.VERCEL
                    ? '/tmp/pageindex'
                    : path.join(process.cwd(), 'knowledge_base', 'pageindex');
                if (!fs.existsSync(kbPath)) fs.mkdirSync(kbPath, { recursive: true });

                const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".json"];
                const ext = path.extname(label).toLowerCase();
                if (!label.includes("manual_entry") && !ALLOWED_EXTENSIONS.includes(ext) && !label.endsWith('.json')) {
                    throw new Error(`File type ${ext} is not supported. Please upload PDF, DOCX, TXT, MD, or JSON.`);
                }

                const outName = label.endsWith('.json') ? label : `${label}.json`;

                // Use the SAME splitter as Pinecone for consistency
                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: CHUNK_SIZE,
                    chunkOverlap: CHUNK_OVERLAP,
                    separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
                });
                const splitDocs = await splitter.splitDocuments(docs);

                const simpleResult = {
                    doc_name: label,
                    structure: splitDocs.map((doc, idx) => {
                        // ROBUSTNESS: Better title extraction from the first line or sentence
                        const firstLine = doc.pageContent.split('\n')[0].trim();
                        let cleanTitle = firstLine.replace(/[#*\[\]]/g, '').slice(0, 60);
                        if (cleanTitle.length < 5) {
                            cleanTitle = doc.pageContent.slice(0, 60).replace(/\n/g, ' ').trim() + "...";
                        }
                        
                        return {
                            title: cleanTitle || `${label} - Part ${idx + 1}`,
                            node_id: `chunk-${idx}`,
                            start_index: 1,
                            end_index: 1,
                            summary: `Segment ${idx + 1} of ${label}`,
                            text: doc.pageContent
                        };
                    })
                };

                // Store dynamically uploaded file
                if (process.env.REDIS_URL) {
                    try {
                        const Redis = (await import('ioredis')).default;
                        const redis = new Redis(process.env.REDIS_URL);
                        // Save the PageIndex chunk array
                        await redis.set(`pageindex:${outName}`, JSON.stringify(simpleResult));
                        await redis.quit();
                    } catch (e) {
                        console.error("Redis upload error:", e);
                        throw e;
                    }
                } else {
                    const outputPath = path.join(kbPath, outName);
                    fs.writeFileSync(outputPath, JSON.stringify(simpleResult, null, 2));
                }

                invalidateIndex();

                send({
                    type: 'done',
                    message: `Successfully added ${label} to Agentic Brain (Split Chunk Mode).`,
                    chunks: simpleResult.structure.length
                });
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
