import { NextResponse } from "next/server";
import { syncKnowledgeBase } from "@/lib/langchain/pinecone";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync
 * Triggers a sync of all local files to Pinecone
 */
export async function POST(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("Starting bulk sync of knowledge base...");
        const result = await syncKnowledgeBase();

        return NextResponse.json({
            success: true,
            message: `Successfully synchronized ${result.fileCount} files (${result.totalChunks} chunks).`,
            ...result
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Sync API Error:", err);
        return NextResponse.json({
            error: "Failed to sync knowledge base",
            details: err.message
        }, { status: 500 });
    }
}
