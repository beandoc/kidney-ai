import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getPineconeStats } from "../../../../lib/langchain/pinecone";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const password = request.headers.get("x-admin-password");

    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const kbPath = path.join(process.cwd(), 'knowledge_base', 'pageindex');
        let files: string[] = [];
        let totalNodes = 0;

        const pineconeStats = await getPineconeStats();

        if (fs.existsSync(kbPath)) {
            files = fs.readdirSync(kbPath).filter(f => f.endsWith('.json') && !f.includes('merged'));

            // 1. Count disk nodes
            for (const file of files) {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(kbPath, file), 'utf-8'));
                    if (content.structure) {
                        totalNodes += content.structure.length;
                    } else if (Array.isArray(content)) {
                        totalNodes += content.length;
                    }
                } catch (e) {
                    console.error(`Error reading ${file} for stats:`, e);
                }
            }
        }

        // 2. Count Redis nodes (Crucial for Vercel uploads)
        if (process.env.REDIS_URL) {
            try {
                const { createClient } = await import('redis');
                const client = await createClient({ url: process.env.REDIS_URL });
                client.on("error", (err) => {
                    // Silence connection errors to prevent unhandled process crashes
                    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
                        // Silently fail, as the connection might be retried or handled upstream
                    } else {
                        console.error("Redis Client Error:", err);
                    }
                });
                await client.connect();
                const keys = await client.keys('pageindex:*');

                for (const key of keys) {
                    const fileName = key.replace('pageindex:', '');
                    // Only add if not already counted on disk
                    if (!files.includes(fileName)) {
                        const contentStr = await client.get(key);
                        if (contentStr) {
                            const content = JSON.parse(contentStr);
                            const count = Array.isArray(content) ? content.length : (content.structure ? content.structure.length : 0);
                            totalNodes += count;
                            files.push(fileName.replace('.json', ' (Cloud)'));
                        }
                    }
                }
                await client.quit();
            } catch (e) {
                console.error("Stats: Error fetching Redis nodes:", e);
            }
        }

        return NextResponse.json({
            totalFiles: files.length,
            totalKnowledgeNodes: totalNodes,
            indexType: "PageIndex Hierarchical Tree",
            activeMemory: {
                status: pineconeStats.totalChunks > 0 ? "Active" : "Initializing",
                totalChunks: pineconeStats.totalChunks,
                indexName: pineconeStats.indexName
            },
            files: files.map(f => f.replace('.json', ''))
        });
    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
