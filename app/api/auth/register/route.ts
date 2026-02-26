import { NextResponse } from "next/server";
import { registerUser } from "../../../../lib/users";

export async function POST(request: Request) {
    try {
        const { username, mobile } = await request.json();
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }
        const user = registerUser(username, mobile);
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }
}
