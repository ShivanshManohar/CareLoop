import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();

  try {
    // Check DB connectivity
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
        version: "1.0.0",
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          error: error?.message || "DB connection failed",
        },
      },
      { status: 503 }
    );
  }
}
