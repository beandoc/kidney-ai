import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

import { invalidateIndex } from "@/lib/pageindex/retrieval";
import { processFileBuffer } from "@/lib/langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@/lib/langchain/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const specificFile = request.headers.get("x-sync-file") || undefined;
    console.log(specificFile ? `Indexing specific file: ${specificFile}` : "Starting full PageIndex re-index...");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
            };

            try {
                const kbPath = path.join(process.cwd(), 'knowledge_base');
                const pageIndexPath = path.join(kbPath, 'pageindex');
                if (!fs.existsSync(pageIndexPath)) fs.mkdirSync(pageIndexPath, { recursive: true });

                const files = specificFile
                    ? [specificFile]
                    : fs.readdirSync(kbPath).filter(f => fs.statSync(path.join(kbPath, f)).isFile() && !f.startsWith('.'));

                let successCount = 0;

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const filePath = path.join(kbPath, fileName);
                    const percent = Math.round(((i) / files.length) * 100);

                    send({
                        type: 'progress',
                        status: `Indexing ${fileName}...`,
                        percent,
                        batch: i + 1,
                        totalBatches: files.length
                    });

                    try {
                        const buffer = fs.readFileSync(filePath);
                        if (fileName.endsWith('.json')) {
                            // Already an index file, just copy it
                            fs.writeFileSync(path.join(pageIndexPath, fileName), buffer);
                        } else {
                            // Use the SAME splitter as Pinecone for consistency
                            const docs = await processFileBuffer(buffer, fileName);
                            const splitter = new RecursiveCharacterTextSplitter({
                                chunkSize: CHUNK_SIZE,
                                chunkOverlap: CHUNK_OVERLAP,
                                separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
                            });

                            const splitDocs = await splitter.splitDocuments(docs);

                            const simpleResult = {
                                doc_name: fileName,
                                structure: splitDocs.map((doc, idx) => ({
                                    title: `${fileName} - Part ${idx + 1}`,
                                    node_id: `chunk-${idx}`,
                                    start_index: 1,
                                    end_index: 1,
                                    summary: `Segment ${idx + 1} of ${fileName}`,
                                    text: doc.pageContent
                                }))
                            };
                            const outName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
                            fs.writeFileSync(path.join(pageIndexPath, outName), JSON.stringify(simpleResult, null, 2));
                        }
                        successCount++;
                    } catch (fileErr) {
                        console.error(`Failed to index ${fileName}:`, fileErr);
                        send({ type: 'progress', status: `⚠️ Failed: ${fileName}` });
                    }
                }

                // Refresh the search index
                invalidateIndex();

                send({
                    type: 'done',
                    message: `Successfully indexed ${successCount} files using PageIndex Architecture.`,
                    fileCount: successCount
                });
            } catch (error) {
                console.error("Sync API Error:", error);
                send({ type: 'error', error: error instanceof Error ? error.message : "Failed to index knowledge base" });
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
