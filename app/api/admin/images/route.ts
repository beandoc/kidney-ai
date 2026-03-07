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

        let imageUrl: string;

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            // Upload to Vercel Blob
            const blob = await put(`knowledge_images/${file.name}`, file, {
                access: 'public',
            });
            imageUrl = blob.url;
        } else {
            // Fallback to local file system
            const fs = await import('fs/promises');
            const path = await import('path');

            const uploadDir = path.join(process.cwd(), 'public', 'knowledge_images');
            await fs.mkdir(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, file.name);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            await fs.writeFile(filePath, buffer);
            imageUrl = `/knowledge_images/${file.name}`;
        }

        return NextResponse.json({
            success: true,
            url: imageUrl,
            message: `Image uploaded successfully! Use this in Gold Answers: ![${file.name}](${imageUrl})`
        });

    } catch (error: any) {
        console.error("Image upload error:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
