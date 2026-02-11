import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/files
 * Lists all files in the knowledge base
 */
export async function GET(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
            return NextResponse.json({ files: [] });
        }

        const files = fs.readdirSync(KNOWLEDGE_BASE_PATH)
            .filter(file => !file.startsWith('.'))
            .map(file => {
                const stats = fs.statSync(path.join(KNOWLEDGE_BASE_PATH, file));
                return {
                    name: file,
                    size: stats.size,
                    updatedAt: stats.mtime,
                    type: path.extname(file).replace('.', '')
                };
            });

        return NextResponse.json({ files });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("List Files Error:", err);
        return NextResponse.json({ error: "Failed to list files", details: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/files?name=filename
 * Deletes a specific file from the knowledge base
 */
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

        const filePath = path.join(KNOWLEDGE_BASE_PATH, fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${fileName}`);

        return NextResponse.json({ success: true, message: `Deleted ${fileName}` });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Delete File API Error:", err);
        return NextResponse.json({ error: "Failed to delete file", details: err.message }, { status: 500 });
    }
}
