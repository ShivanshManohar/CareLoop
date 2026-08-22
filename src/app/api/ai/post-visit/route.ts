import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePostVisitSummaryStream } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clinicalNotes, prescription } = body;

    if (!clinicalNotes || clinicalNotes.trim() === "") {
      return NextResponse.json({ error: "Clinical notes are required" }, { status: 400 });
    }

    const stream = await generatePostVisitSummaryStream(clinicalNotes, prescription);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("[API AI Post-visit Stream] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate AI summary stream" },
      { status: 500 }
    );
  }
}
