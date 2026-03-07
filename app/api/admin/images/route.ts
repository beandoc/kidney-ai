import { NextResponse } from "next/server";
import { put, del } from '@vercel/blob';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No image file provided" }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({ error: "Vercel Blob Storage is not configured. Please add BLOB_READ_WRITE_TOKEN." }, { status: 500 });
        }

        // Upload to Vercel Blob
        const blob = await put(`knowledge_images/${file.name}`, file, {
            access: 'public',
        });

        return NextResponse.json({
            success: true,
            url: blob.url,
            message: `Image uploaded successfully. You can use it in Gold Answers with markdown: ![${file.name}](${blob.url})`
        });

    } catch (error: any) {
        console.error("Image upload error:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
