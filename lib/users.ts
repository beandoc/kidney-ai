import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const QUOTA_PER_USER = 50;

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

function ensureUsersFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
}

export function getUsers(): UserRecord[] {
    ensureUsersFile();
    try {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export function saveUsers(users: UserRecord[]) {
    ensureUsersFile();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function registerUser(username: string, mobile?: string): UserRecord {
    const users = getUsers();
    const existingIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (existingIndex !== -1) {
        // If they already exist, we update their mobile if provided
        if (mobile) {
            users[existingIndex].mobile = mobile.trim();
            saveUsers(users);
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
    saveUsers(users);
    return newUser;
}

export function loginUser(username: string): UserRecord | null {
    const users = getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function trackQuery(userId: string): { success: boolean; error?: string } {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: "USER_NOT_FOUND" };
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

    saveUsers(users);
    return { success: true };
}

export function updateUserInfo(userId: string, data: Partial<UserRecord>) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index] = { ...users[index], ...data };
        saveUsers(users);
    }
}

export function deleteUser(userId: string) {
    const users = getUsers();
    const filtered = users.filter(u => u.id !== userId);
    saveUsers(filtered);
}
