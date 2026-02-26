import { NextResponse } from "next/server";
import { loginUser } from "../../../../lib/users";

export async function POST(request: Request) {
    try {
        const { username } = await request.json();
        const user = await loginUser(username);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to login" }, { status: 500 });
    }
}
