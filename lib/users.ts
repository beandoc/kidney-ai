import redis from "./redis-client";

export const QUOTA_PER_USER = 200; 
const KV_USERS_KEY = "kidney_ai_users_v2"; // Migrating to a newer key structure

export interface UserRecord {
    id: string;
    username: string;
    passwordHash?: string;
    createdAt: string;
    lastActive: string;
    totalQueries: number;
    dailyQueries: number;
    lastQueryDate: string; 
    isBlocked: boolean;
    mobile?: string;
    navigationOnly?: boolean;
}

/**
 * Fetch all users (O(N) - use sparingly)
 */
export async function getUsers(): Promise<UserRecord[]> {
    try {
        const allUsers = await redis.hgetall(KV_USERS_KEY);
        if (!allUsers) return [];
        return Object.values(allUsers).map(u => JSON.parse(u));
    } catch (e) {
        console.error("Redis Read Error:", e);
        return [];
    }
}

/**
 * Legacy sync (kept for compatibility in some parts, but discouraged)
 */
export async function saveUsers(users: UserRecord[]): Promise<void> {
    try {
        const pipeline = redis.pipeline();
        for (const user of users) {
             pipeline.hset(KV_USERS_KEY, user.id, JSON.stringify(user));
        }
        await pipeline.exec();
    } catch (e) {
        console.error("Redis Write Error:", e);
    }
}

export async function registerUser(username: string, mobile?: string, passwordHash?: string): Promise<UserRecord> {
    const users = await getUsers();
    const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (existing) {
        if (mobile) existing.mobile = mobile.trim();
        if (passwordHash) existing.passwordHash = passwordHash;
        await redis.hset(KV_USERS_KEY, existing.id, JSON.stringify(existing));
        return existing;
    }

    const newUser: UserRecord = {
        id: crypto.randomUUID(),
        username: username.trim(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalQueries: 0,
        dailyQueries: 0,
        lastQueryDate: new Date().toISOString().split('T')[0],
        isBlocked: false,
        mobile: mobile?.trim(),
        passwordHash
    };

    await redis.hset(KV_USERS_KEY, newUser.id, JSON.stringify(newUser));
    return newUser;
}

export async function loginUser(username: string): Promise<UserRecord | null> {
    const users = await getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

/**
 * SCALABLE TRACKING: O(1) Lookup
 */
export async function trackQuery(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userStr = await redis.hget(KV_USERS_KEY, userId);
        
        if (!userStr) {
            console.warn(`User ${userId} not found in field, bypass for fallback`);
            return { success: true };
        }

        const user: UserRecord = JSON.parse(userStr);

        if (user.isBlocked) return { success: false, error: "USER_BLOCKED" };
        if (user.navigationOnly) return { success: true };

        const today = new Date().toISOString().split('T')[0];

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

        // Atomic-like update for just this user
        await redis.hset(KV_USERS_KEY, user.id, JSON.stringify(user));
        return { success: true };
    } catch (err) {
        console.error("Track Query Failure:", err);
        return { success: true }; // Fail-safe
    }
}

export async function updateUserInfo(userId: string, data: Partial<UserRecord>): Promise<void> {
    const userStr = await redis.hget(KV_USERS_KEY, userId);
    if (userStr) {
        const user = { ...JSON.parse(userStr), ...data };
        await redis.hset(KV_USERS_KEY, userId, JSON.stringify(user));
    }
}

export async function deleteUser(userId: string): Promise<void> {
    await redis.hdel(KV_USERS_KEY, userId);
}
