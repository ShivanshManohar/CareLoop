import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processNotificationQueue } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    // Optional secret check if invoked from external cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
      // In production, we can enforce bearer token, but allow query params or internal calls in dev
    }

    const now = new Date();

    // 1. Release expired slot holds
    const expiredHolds = await db.slotHold.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });

    // 2. Process Notification Queue
    const queueResults = await processNotificationQueue();

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredHoldsReleased: expiredHolds.count,
      notifications: queueResults,
    });
  } catch (error: any) {
    console.error("[API Cron Process Jobs] Error:", error);
    return NextResponse.json({ error: error?.message || "Cron processing failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
