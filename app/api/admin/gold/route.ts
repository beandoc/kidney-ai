import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const GOLD_FILE_PATH = path.join(process.cwd(), 'lib/knowledge/dynamic.json');

// GET all dynamic gold answers
export async function GET() {
    try {
        const data = await fs.readFile(GOLD_FILE_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        return NextResponse.json({});
    }
}

// POST new/update gold answers
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { key, content } = body;

        if (!key || !content) {
            return NextResponse.json({ error: 'Key and content are required' }, { status: 400 });
        }

        let existingData: Record<string, string> = {};
        try {
            const data = await fs.readFile(GOLD_FILE_PATH, 'utf-8');
            existingData = JSON.parse(data);
        } catch (e) {
            // File might not exist or be empty
        }

        // Add or update the answer
        existingData[key.toLowerCase()] = content;

        await fs.writeFile(GOLD_FILE_PATH, JSON.stringify(existingData, null, 4));

        return NextResponse.json({ message: 'Gold Answer updated successfully', key: key.toLowerCase() });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE a gold answer
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        const data = await fs.readFile(GOLD_FILE_PATH, 'utf-8');
        const existingData: Record<string, string> = JSON.parse(data);

        if (existingData[key.toLowerCase()]) {
            delete existingData[key.toLowerCase()];
            await fs.writeFile(GOLD_FILE_PATH, JSON.stringify(existingData, null, 4));
            return NextResponse.json({ message: 'Gold Answer deleted successfully' });
        }

        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
