import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const password = request.headers.get("x-admin-password");

    if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const kbPath = path.join(process.cwd(), 'knowledge_base', 'pageindex');
        let files: string[] = [];
        let totalNodes = 0;

        if (fs.existsSync(kbPath)) {
            files = fs.readdirSync(kbPath).filter(f => f.endsWith('.json'));

            // Optional: Count total nodes across all trees
            for (const file of files) {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(kbPath, file), 'utf-8'));
                    if (content.structure) {
                        totalNodes += content.structure.length;
                    }
                } catch (e) {
                    console.error(`Error reading ${file} for stats:`, e);
                }
            }
        }

        return NextResponse.json({
            totalFiles: files.length,
            totalKnowledgeNodes: totalNodes,
            indexType: "PageIndex Hierarchical Tree",
            files: files.map(f => f.replace('.json', ''))
        });
    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
