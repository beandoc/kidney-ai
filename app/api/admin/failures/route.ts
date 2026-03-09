import { NextResponse } from 'next/server';
import { getFailedQueries, removeFailedQuery } from '@/lib/redis';

// GET all failed queries
export async function GET(req: Request) {
    const password = req.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await getFailedQueries();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json([]);
    }
}

// DELETE a failed query (cleanup after addressing it)
export async function DELETE(req: Request) {
    const password = req.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        await removeFailedQuery(query);
        return NextResponse.json({ message: 'Failed query removed successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
