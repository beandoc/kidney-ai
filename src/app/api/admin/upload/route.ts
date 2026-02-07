import { NextRequest, NextResponse } from "next/server";
import { processFileBuffer, getPineconeStore } from "@/lib/langchain/pinecone";
import { getEmbeddings } from "@/lib/langchain/config";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const password = request.headers.get("x-admin-password");

        if (password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized: Invalid admin password" }, { status: 401 });
        }

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;

        console.log(`Processing uploaded file: ${filename}`);

        // 1. Convert file to split documents
        const docs = await processFileBuffer(buffer, filename);

        if (docs.length === 0) {
            return NextResponse.json({ error: "Unsupported file type or empty file" }, { status: 400 });
        }

        // 2. Upload to Pinecone
        const vectorStore = await getPineconeStore();

        console.log(`Uploading ${docs.length} chunks from ${filename} to Pinecone...`);
        await vectorStore.addDocuments(docs);

        return NextResponse.json({
            success: true,
            message: `Successfully indexed ${filename}`,
            chunks: docs.length
        });

    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
