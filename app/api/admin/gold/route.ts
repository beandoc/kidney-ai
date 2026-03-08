import { NextResponse } from 'next/server';
import { getDynamicGoldAnswers, saveDynamicGoldAnswers } from '@/lib/redis';

// GET all dynamic gold answers
export async function GET() {
    try {
        const data = await getDynamicGoldAnswers();
        return NextResponse.json(data);
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

        const existingData = await getDynamicGoldAnswers();

        // Add or update the answer
        existingData[key.toLowerCase().trim()] = content;

        await saveDynamicGoldAnswers(existingData);

        return NextResponse.json({ message: 'Gold Answer updated successfully', key: key.toLowerCase().trim() });
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

        const existingData = await getDynamicGoldAnswers();

        if (existingData[key.toLowerCase().trim()]) {
            delete existingData[key.toLowerCase().trim()];
            await saveDynamicGoldAnswers(existingData);
            return NextResponse.json({ message: 'Gold Answer deleted successfully' });
        }

        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
