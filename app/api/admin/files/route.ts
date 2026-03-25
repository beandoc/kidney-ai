import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");
const PAGEINDEX_PATH = path.join(KNOWLEDGE_BASE_PATH, "pageindex");
// On Vercel, newly uploaded files go to /tmp/pageindex (read-only fs workaround)
const TMP_PAGEINDEX_PATH = process.env.VERCEL ? '/tmp/pageindex' : PAGEINDEX_PATH;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const files: any[] = [];
        const seenNames = new Set<string>();

        // Helper to add files from a pageindex directory
        const addFromPageindex = (dirPath: string, source: string) => {
            if (!fs.existsSync(dirPath)) return;
            fs.readdirSync(dirPath)
                .filter(file => file.endsWith('.json'))
                .forEach(file => {
                    if (seenNames.has(file)) return; // avoid duplicates
                    seenNames.add(file);
                    const stats = fs.statSync(path.join(dirPath, file));
                    const displayName = file.replace(/\.json$/, '');
                    files.push({
                        name: displayName,
                        originalName: file,
                        size: stats.size,
                        updatedAt: stats.mtime,
                        type: 'pageindex_tree',
                        isIndexed: true,
                        source
                    });
                });
        };

        // 1. List bundled (static) PageIndex documents
        addFromPageindex(PAGEINDEX_PATH, 'bundled');

        // 2. Fetch runtime-uploaded documents (from Redis on Vercel or local)
        if (process.env.REDIS_URL) {
            try {
                const Redis = (await import('ioredis')).default;
                const redis = new Redis(process.env.REDIS_URL);
                const keys = await redis.keys('pageindex:*');
                for (const key of keys) {
                    const fileName = key.replace('pageindex:', '');
                    const displayName = fileName.replace(/\.json$/, '');
                    if (!seenNames.has(displayName + '.json')) {
                        seenNames.add(displayName + '.json');
                        // Get actual byte content length for accurate UI display
                        const content = await redis.get(key);
                        const size = content ? Buffer.byteLength(content) : 0;
                        files.push({
                            name: displayName,
                            originalName: fileName,
                            size: size,
                            updatedAt: new Date(),
                            type: 'pageindex_tree',
                            isIndexed: true,
                            source: 'redis_store'
                        });
                    }
                }
                await redis.quit();
            } catch (e) {
                console.error("Redis list error:", e);
            }
        } else if (TMP_PAGEINDEX_PATH !== PAGEINDEX_PATH) {
            addFromPageindex(TMP_PAGEINDEX_PATH, 'uploaded');
        }

        // 3. Add raw files that aren't indexed yet (if any)
        if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
            fs.readdirSync(KNOWLEDGE_BASE_PATH)
                .filter(file => !file.startsWith('.') && file !== 'pageindex' && !file.startsWith('profiles') && fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file)).isFile())
                .forEach(file => {
                    const existsInIndex = files.some(f => f.name === file || f.name === file.replace(/\.[^.]+$/, ''));
                    if (!existsInIndex) {
                        const stats = fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file));
                        files.push({
                            name: file,
                            originalName: file,
                            size: stats.size,
                            updatedAt: stats.mtime,
                            type: path.extname(file).replace('.', ''),
                            isIndexed: false
                        });
                    }
                });
        }

        return NextResponse.json({ files });
    } catch (error: unknown) {
        console.error("List Files Error:", error);
        return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get("name");

        if (!fileName) {
            return NextResponse.json({ error: "File name is required" }, { status: 400 });
        }

        // Delete from raw knowledge_base folder — try the name as-is AND with common extensions
        const rawCandidates = [
            fileName,
            `${fileName}.json`,
            `${fileName}.pdf`,
            `${fileName}.md`,
            `${fileName}.txt`,
            `${fileName}.docx`,
        ];
        for (const candidate of rawCandidates) {
            const rawPath = path.join(KNOWLEDGE_BASE_PATH, candidate);
            if (fs.existsSync(rawPath) && fs.statSync(rawPath).isFile()) {
                fs.unlinkSync(rawPath);
                console.log(JSON.stringify({ event: "FileDeleted", path: "knowledge_base", file: candidate }));
            }
        }

        // Delete from PageIndex folder(s) — try name as-is AND with .json suffix
        const indexCandidates = [fileName, `${fileName}.json`];
        const indexDirs = TMP_PAGEINDEX_PATH !== PAGEINDEX_PATH
            ? [PAGEINDEX_PATH, TMP_PAGEINDEX_PATH]
            : [PAGEINDEX_PATH];
        for (const dir of indexDirs) {
            for (const candidate of indexCandidates) {
                const indexPath = path.join(dir, candidate);
                if (fs.existsSync(indexPath)) {
                    fs.unlinkSync(indexPath);
                    console.log(JSON.stringify({ event: "FileDeleted", path: dir, file: candidate }));
                }
            }
        }

        // Delete from Redis
        if (process.env.REDIS_URL) {
            try {
                const Redis = (await import('ioredis')).default;
                const redis = new Redis(process.env.REDIS_URL);
                const targets = [
                    `pageindex:${fileName}`,
                    `pageindex:${fileName}.json`,
                    `raw:${fileName}`
                ];
                let deletedCount = 0;
                for (const t of targets) {
                    deletedCount += await redis.del(t);
                }
                if (deletedCount > 0) {
                    console.log(`Deleted ${deletedCount} keys from Redis for ${fileName}`);
                }
                await redis.quit();
            } catch (e) {
                console.error("Redis delete error:", e);
            }
        }

        // Invalidate the search index so it rebuilds without the deleted file
        const { invalidateIndex } = await import("../../../../lib/pageindex/retrieval");
        invalidateIndex();

        return NextResponse.json({ success: true, message: `Deleted ${fileName} and associated index.` });
    } catch (error: unknown) {
        console.error("Delete File API Error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
