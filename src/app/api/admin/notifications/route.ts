import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { processNotificationQueue } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const jobs = await db.notificationJob.findMany({
      include: {
        appointment: {
          select: {
            id: true,
            slotStart: true,
            status: true,
            doctor: { include: { user: { select: { name: true } } } },
            patient: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch notification jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { jobId } = body;

    if (jobId) {
      // Reset specific job for immediate retry
      await db.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "PENDING",
          nextRetryAt: new Date(),
          lastError: null,
        },
      });
    }

    // Trigger queue run
    const results = await processNotificationQueue();

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to retry jobs" }, { status: 500 });
  }
}
