import { NextResponse } from "next/server";
import { getPineconeStore, processFileBuffer, processRawText } from "../../../../lib/langchain/pinecone";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
        },
    });
}

export async function POST(request: Request) {
    try {
        const password = request.headers.get("x-admin-password");
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized: Invalid admin password" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "";
        let docs = [];
        let label = "Unknown Source";

        if (contentType.includes("application/json")) {
            // Handle Raw Text
            const { text, sourceLabel } = await request.json();
            if (!text || !sourceLabel) {
                return NextResponse.json({ error: "Text and Source Label are required" }, { status: 400 });
            }
            label = sourceLabel;
            console.log(`Processing raw text from: ${label}`);
            docs = await processRawText(text, label);
        } else {
            // Handle File Upload
            const formData = await request.formData();
            const file = formData.get("file") as File;
            if (!file) {
                return NextResponse.json({ error: "No file provided" }, { status: 400 });
            }
            // Limit file size to 10MB
            if (file.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            label = file.name;
            console.log(`Processing uploaded file: ${label}`);
            docs = await processFileBuffer(buffer, label);
        }

        if (docs.length === 0) {
            return NextResponse.json({ error: "Unsupported content or empty submission" }, { status: 400 });
        }

        // Upload to Pinecone
        const vectorStore = await getPineconeStore();
        console.log(`Uploading ${docs.length} chunks from ${label} to Pinecone...`);
        await vectorStore.addDocuments(docs);

        return NextResponse.json({
            success: true,
            message: `Successfully indexed ${label}`,
            chunks: docs.length
        });

    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
