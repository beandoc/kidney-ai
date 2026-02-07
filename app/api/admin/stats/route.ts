import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const password = request.headers.get("x-admin-password");

    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });

        const indexName = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";
        const index = pinecone.Index(indexName);
        const stats = await index.describeIndexStats();

        // Note: Pinecone doesn't easily let you list all unique metadata values (like filenames) 
        // without a full scan or external database. For now, we return the record count.
        // We can improve this later by keeping a small JSON registry of indexed files.

        return NextResponse.json({
            totalRecords: stats.totalRecordCount,
            indexName: indexName,
            namespaces: stats.namespaces
        });
    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
