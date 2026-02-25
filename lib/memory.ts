import * as fs from "fs";
import * as path from "path";

const PROFILES_PATH = path.join(process.cwd(), "knowledge_base", "profiles");

export interface UserProfile {
    userId: string;
    medicalFacts: string[];
}

export function getProfile(userId: string): UserProfile {
    if (!fs.existsSync(PROFILES_PATH)) {
        fs.mkdirSync(PROFILES_PATH, { recursive: true });
    }

    const filePath = path.join(PROFILES_PATH, `${userId}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    return { userId, medicalFacts: [] };
}

export function saveProfile(profile: UserProfile) {
    if (!fs.existsSync(PROFILES_PATH)) {
        fs.mkdirSync(PROFILES_PATH, { recursive: true });
    }

    const filePath = path.join(PROFILES_PATH, `${profile.userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
}

/**
 * Extract medical facts from a conversation and save to profile
 */
export async function updateMemory(userId: string, conversation: string) {
    // This would ideally be an LLM call to extract facts
    // For now, we'll keep it simple but the agent will use this
}
