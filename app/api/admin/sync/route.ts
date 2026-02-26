import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { pageIndexClient } from "@/lib/pageindex/client";
import { invalidateIndex } from "@/lib/pageindex/retrieval";
import { processFileBuffer } from "@/lib/langchain/pinecone";

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
                        const isPdf = fileName.toLowerCase().endsWith('.pdf');

                        if (isPdf) {
                            const result = await pageIndexClient.indexPdf(buffer, fileName);
                            const outName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
                            fs.writeFileSync(path.join(pageIndexPath, outName), JSON.stringify(result, null, 2));
                        } else if (fileName.endsWith('.json')) {
                            // Already an index file, just copy it
                            fs.writeFileSync(path.join(pageIndexPath, fileName), buffer);
                        } else {
                            // Simple tree with CHUNKING for large files
                            const docs = await processFileBuffer(buffer, fileName);
                            const fullText = docs.map(d => d.pageContent).join('\n\n');

                            // Split into 5000 char chunks for better search granularity
                            const chunkSize = 5000;
                            const chunks: string[] = [];
                            for (let i = 0; i < fullText.length; i += chunkSize) {
                                chunks.push(fullText.slice(i, i + chunkSize + 500)); // 500 char overlap
                            }

                            const simpleResult = {
                                doc_name: fileName,
                                structure: chunks.map((chunk, idx) => ({
                                    title: `${fileName} - Part ${idx + 1}`,
                                    node_id: `chunk-${idx}`,
                                    start_index: 1,
                                    end_index: 1,
                                    summary: `Segment ${idx + 1} of ${fileName}`,
                                    text: chunk
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
