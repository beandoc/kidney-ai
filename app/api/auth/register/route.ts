import { NextResponse } from "next/server";
import { registerUser, loginUser } from "../../../../lib/users";

export async function POST(request: Request) {
    try {
        const { username, mobile } = await request.json();
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }

        // Admin hardcoded credentials
        const isAdmin = username.toLowerCase() === "sachin" && mobile === "0987654321";

        // Check if user exists
        const existingUser = loginUser(username);

        if (!existingUser && !isAdmin) {
            return NextResponse.json({
                error: "Account not found. Access is limited to registered clinicians. Please contact the administrator to create your account."
            }, { status: 403 });
        }

        // If admin or existing, proceed with registration system (which handles login/update)
        const user = registerUser(username, mobile);
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }
}
