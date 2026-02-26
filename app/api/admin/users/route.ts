import { NextResponse } from "next/server";
import { getUsers, saveUsers, deleteUser, registerUser } from "../../../../lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const users = getUsers();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { username, mobile } = await request.json();
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }

        const user = registerUser(username, mobile);
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, isBlocked } = await request.json();
        const users = getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index].isBlocked = isBlocked;
            saveUsers(users);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    try {
        deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
