import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [
      totalAppointments,
      bookingsToday,
      cancelledAppointments,
      noShowAppointments,
      completedAppointments,
      failedNotifications,
      totalDoctors,
      totalPatients,
      pendingNotifications,
    ] = await Promise.all([
      db.appointment.count(),
      db.appointment.count({
        where: {
          slotStart: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.appointment.count({
        where: {
          status: { in: ["CANCELLED", "CANCELLED_LEAVE"] },
        },
      }),
      db.appointment.count({
        where: { status: "NO_SHOW" },
      }),
      db.appointment.count({
        where: { status: "COMPLETED" },
      }),
      db.notificationJob.count({
        where: { status: "FAILED" },
      }),
      db.doctorProfile.count(),
      db.user.count({ where: { role: "PATIENT" } }),
      db.notificationJob.count({ where: { status: "PENDING" } }),
    ]);

    const cancellationRate = totalAppointments > 0 ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1) : "0.0";
    const noShowRate = totalAppointments > 0 ? ((noShowAppointments / totalAppointments) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      metrics: {
        bookingsToday,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        cancellationRate: `${cancellationRate}%`,
        noShowAppointments,
        noShowRate: `${noShowRate}%`,
        failedNotifications,
        pendingNotifications,
        totalDoctors,
        totalPatients,
      },
    });
  } catch (error: any) {
    console.error("[API Admin Metrics] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch admin metrics" }, { status: 500 });
  }
}
