import { kv } from "@vercel/kv";

const QUOTA_PER_USER = 50;
const KV_USERS_KEY = "kidney_ai_users";

export interface UserRecord {
    id: string;
    username: string;
    createdAt: string;
    lastActive: string;
    totalQueries: number;
    dailyQueries: number;
    lastQueryDate: string; // YYYY-MM-DD
    isBlocked: boolean;
    mobile?: string;
}

export async function getUsers(): Promise<UserRecord[]> {
    try {
        const users = await kv.get<UserRecord[]>(KV_USERS_KEY);
        return users || [];
    } catch (e) {
        console.error("KV Read Error:", e);
        return [];
    }
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
    try {
        await kv.set(KV_USERS_KEY, users);
    } catch (e) {
        console.error("KV Write Error:", e);
    }
}

export async function registerUser(username: string, mobile?: string): Promise<UserRecord> {
    const users = await getUsers();
    const existingIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (existingIndex !== -1) {
        // If they already exist, we update their mobile if provided
        if (mobile) {
            users[existingIndex].mobile = mobile.trim();
            await saveUsers(users);
        }
        return users[existingIndex];
    }

    const newUser: UserRecord = {
        id: Math.random().toString(36).substring(2, 15),
        username: username.trim(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalQueries: 0,
        dailyQueries: 0,
        lastQueryDate: new Date().toISOString().split('T')[0],
        isBlocked: false,
        mobile: mobile?.trim()
    };

    users.push(newUser);
    await saveUsers(users);
    return newUser;
}

export async function loginUser(username: string): Promise<UserRecord | null> {
    const users = await getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function trackQuery(userId: string): Promise<{ success: boolean; error?: string }> {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);

    // Graceful bypass if user not in KV (e.g. KV not configured yet)
    // This allows the Admin/Hardcoded credentials to work even if DB is down
    if (!user) {
        console.warn(`User ${userId} not found in KV, performing graceful bypass`);
        return { success: true };
    }

    if (user.isBlocked) return { success: false, error: "USER_BLOCKED" };

    const today = new Date().toISOString().split('T')[0];

    // Reset daily counter if it's a new day
    if (user.lastQueryDate !== today) {
        user.dailyQueries = 0;
        user.lastQueryDate = today;
    }

    if (user.dailyQueries >= QUOTA_PER_USER) {
        return { success: false, error: "QUOTA_EXCEEDED" };
    }

    user.dailyQueries += 1;
    user.totalQueries += 1;
    user.lastActive = new Date().toISOString();

    await saveUsers(users);
    return { success: true };
}

export async function updateUserInfo(userId: string, data: Partial<UserRecord>): Promise<void> {
    const users = await getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index] = { ...users[index], ...data };
        await saveUsers(users);
    }
}

export async function deleteUser(userId: string): Promise<void> {
    const users = await getUsers();
    const filtered = users.filter(u => u.id !== userId);
    await saveUsers(filtered);
}
