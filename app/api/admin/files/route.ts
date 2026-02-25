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
                    files.push({
                        name: file.replace('.json', ''),
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
                .filter(file => !file.startsWith('.') && file !== 'pageindex' && fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file)).isFile())
                .forEach(file => {
                    const existsInIndex = files.some(f => f.name === file);
                    if (!existsInIndex) {
                        const stats = fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file));
                        files.push({
                            name: file,
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

        // Delete from raw folder
        const rawPath = path.join(KNOWLEDGE_BASE_PATH, fileName);
        if (fs.existsSync(rawPath)) {
            fs.unlinkSync(rawPath);
        }

        // Delete from PageIndex folder
        const potentialJsonNames = [fileName, `${fileName}.json`];
        potentialJsonNames.forEach(n => {
            const jsonPath = path.join(PAGEINDEX_PATH, n);
            if (fs.existsSync(jsonPath)) {
                fs.unlinkSync(jsonPath);
            }
        });

        return NextResponse.json({ success: true, message: `Deleted ${fileName} and associated index.` });
    } catch (error: unknown) {
        console.error("Delete File API Error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
