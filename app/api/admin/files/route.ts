import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");
const PAGEINDEX_PATH = path.join(KNOWLEDGE_BASE_PATH, "pageindex");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const files: any[] = [];

        // 1. List PageIndex processed documents
        if (fs.existsSync(PAGEINDEX_PATH)) {
            fs.readdirSync(PAGEINDEX_PATH)
                .filter(file => file.endsWith('.json'))
                .forEach(file => {
                    const stats = fs.statSync(path.join(PAGEINDEX_PATH, file));
                    // Store originalName so DELETE knows the real filename on disk
                    const displayName = file.replace(/\.json$/, '');
                    files.push({
                        name: displayName,          // shown in UI
                        originalName: file,         // actual file on disk
                        size: stats.size,
                        updatedAt: stats.mtime,
                        type: 'pageindex_tree',
                        isIndexed: true
                    });
                });
        }

        // 2. Add raw files that aren't indexed yet (if any)
        if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
            fs.readdirSync(KNOWLEDGE_BASE_PATH)
                .filter(file => !file.startsWith('.') && file !== 'pageindex' && !file.startsWith('profiles') && fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file)).isFile())
                .forEach(file => {
                    const existsInIndex = files.some(f => f.name === file || f.name === file.replace(/\.[^.]+$/, ''));
                    if (!existsInIndex) {
                        const stats = fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file));
                        files.push({
                            name: file,             // raw files keep full name
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

        // Delete from PageIndex folder — try name as-is AND with .json suffix
        const indexCandidates = [fileName, `${fileName}.json`];
        for (const candidate of indexCandidates) {
            const indexPath = path.join(PAGEINDEX_PATH, candidate);
            if (fs.existsSync(indexPath)) {
                fs.unlinkSync(indexPath);
                console.log(JSON.stringify({ event: "FileDeleted", path: "pageindex", file: candidate }));
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
