import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzePreVisitSymptoms } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { duration, severity, notes, tags } = body;

    const result = await analyzePreVisitSymptoms({
      duration,
      severity: severity ? Number(severity) : undefined,
      notes,
      tags,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API AI Pre-visit] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to analyze symptoms",
      },
      { status: 500 }
    );
  }
}
