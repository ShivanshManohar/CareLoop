import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISO, startOfDay, endOfDay, format } from "date-fns";
import { enqueueNotificationJob } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorProfileId = (session.user as any).doctorProfileId;
    const role = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const requestedDoctorId = searchParams.get("doctorId") || doctorProfileId;

    if (!requestedDoctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const leaves = await db.doctorLeave.findMany({
      where: { doctorId: requestedDoctorId },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ leaves });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const doctorProfileId = (session.user as any).doctorProfileId;
    const body = await req.json();
    const { doctorId: targetDoctorId, startDate, endDate, reason } = body;

    const doctorId = role === "ADMIN" && targetDoctorId ? targetDoctorId : doctorProfileId;

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor profile not found" }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    // Execute atomic leave registration and appointment cancellation
    const result = await db.$transaction(async (tx) => {
      // 1. Create DoctorLeave record
      const leave = await tx.doctorLeave.create({
        data: {
          doctorId,
          startDate: start,
          endDate: end,
          reason: reason || "Scheduled Leave",
        },
        include: {
          doctor: { include: { user: true } },
        },
      });

      // 2. Find all confirmed appointments in this leave window
      const affectedAppointments = await tx.appointment.findMany({
        where: {
          doctorId,
          slotStart: { gte: start, lte: end },
          status: "CONFIRMED",
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
        },
      });

      // 3. Mark affected appointments as CANCELLED_LEAVE
      if (affectedAppointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: affectedAppointments.map((a) => a.id) },
          },
          data: {
            status: "CANCELLED_LEAVE",
          },
        });
      }

      // 4. Delete any active slot holds in this window
      await tx.slotHold.deleteMany({
        where: {
          doctorId,
          slotStart: { gte: start, lte: end },
        },
      });

      return { leave, affectedAppointments };
    });

    // 5. Enqueue Notifications and Calendar Deletes for all affected patients
    for (const appt of result.affectedAppointments) {
      const formattedSlot = format(appt.slotStart, "EEEE, MMMM d, yyyy 'at' h:mm a");

      // Email with 1-click rebook link
      await enqueueNotificationJob({
        type: "EMAIL_LEAVE_CANCELLATION",
        recipient: appt.patient.email,
        appointmentId: appt.id,
        payload: {
          patientName: appt.patient.name,
          doctorName: result.leave.doctor.user.name,
          slotTime: formattedSlot,
          appointmentId: appt.id,
          rebookUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/patient/rebook/${appt.id}`,
        },
      });

      // Calendar Delete
      await enqueueNotificationJob({
        type: "CALENDAR_DELETE",
        recipient: appt.patient.email,
        appointmentId: appt.id,
        payload: {
          summary: `CareLoop: Cancelled appointment with Dr. ${result.leave.doctor.user.name}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      leave: result.leave,
      affectedCount: result.affectedAppointments.length,
      message: `Leave recorded successfully. ${result.affectedAppointments.length} overlapping appointment(s) updated to CANCELLED_LEAVE and notified.`,
    });
  } catch (error: any) {
    console.error("[API Doctor Leave] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to record doctor leave" }, { status: 500 });
  }
}
