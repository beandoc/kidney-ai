import { NextResponse } from "next/server";
import { registerUser, loginUser } from "../../../../lib/users";

export async function POST(request: Request) {
    try {
        const { username, mobile, password } = await request.json();
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }

        // Admin hardcoded credentials (added safe check for trim)
        // Leaving this intact for now but should be migrated to DB
        const isAdmin = username?.trim().toLowerCase() === "sachin" && mobile?.trim() === "0987654321";

        // Check if user exists
        const existingUser = await loginUser(username);

        if (existingUser) {
            // Existing user handling: verify password
            if (existingUser.passwordHash && password) {
                const bcrypt = await import("bcryptjs");
                const isMatch = await bcrypt.compare(password, existingUser.passwordHash);
                if (!isMatch) {
                    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
                }
            }
            return NextResponse.json(existingUser);
        }

        if (!existingUser && !isAdmin) {
            return NextResponse.json({
                error: "Account not found. Access is limited to registered clinicians. Please contact the administrator to create your account."
            }, { status: 403 });
        }

        // New user registration
        let passwordHash;
        if (password) {
            const bcrypt = await import("bcryptjs");
            passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await registerUser(username, mobile, passwordHash);
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }
}
