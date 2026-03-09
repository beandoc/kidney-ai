import { NextResponse } from "next/server";
import { registerUser, loginUser } from "../../../../lib/users";

export async function POST(request: Request) {
    try {
        const { username, mobile, password } = await request.json();
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
        }

        const cleanUsername = username.trim().toLowerCase();
        const cleanMobile = mobile?.trim().replace(/^0+/, ""); // strip leading zeros

        // Admin credentials from env vars (fallback to hardcoded for legacy)
        const adminUsername = (process.env.ADMIN_USERNAME || "sachin").toLowerCase();
        const adminMobile = (process.env.ADMIN_MOBILE || "0987654321").replace(/^0+/, "");

        const isAdmin = cleanUsername === adminUsername && cleanMobile === adminMobile;

        // Check if user already exists in KV
        const existingUser = await loginUser(username);

        if (existingUser) {
            // Existing user: verify password if they've set one
            if (existingUser.passwordHash && password) {
                const bcrypt = await import("bcryptjs");
                const isMatch = await bcrypt.compare(password, existingUser.passwordHash);
                if (!isMatch) {
                    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
                }
            }
            return NextResponse.json(existingUser);
        }

        // New user — only admin can self-register, others are blocked
        if (!isAdmin && cleanUsername !== 'opduser') {
            return NextResponse.json({
                error: "Account not found. Access is limited to registered clinicians. Please contact the administrator to create your account."
            }, { status: 403 });
        }

        // Check if opduser is trying to register with the correct password
        if (cleanUsername === 'opduser') {
            if (password !== '0987654321') {
                return NextResponse.json({ error: "Invalid password for OPD user." }, { status: 401 });
            }
        }

        // Register new user (admin or opduser)
        let passwordHash;
        if (password) {
            const bcrypt = await import("bcryptjs");
            passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await registerUser(username, mobile, passwordHash);

        // If it was opduser, we need to make sure the record reflects navigationOnly
        if (cleanUsername === 'opduser') {
            const { updateUserInfo } = await import("../../../../lib/users");
            await updateUserInfo(user.id, { navigationOnly: true });
            user.navigationOnly = true;
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json({ error: "Failed to register" }, { status: 500 });
    }
}
