import { NextResponse } from "next/server";
import { runEvaluation } from "../../../../lib/evaluation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
    const password = request.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const summary = await runEvaluation();
        return NextResponse.json(summary);
    } catch (error) {
        console.error("Evaluation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Evaluation failed" },
            { status: 500 }
        );
    }
}
