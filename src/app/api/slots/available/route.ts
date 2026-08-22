import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDoctorSlots } from "@/lib/utils";
import { parseISO, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD or ISO

    if (!doctorId || !dateStr) {
      return NextResponse.json({ error: "doctorId and date query params are required" }, { status: 400 });
    }

    const date = parseISO(dateStr);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Fetch doctor profile
    const doctor = await db.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { name: true, email: true } },
        leaves: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Clean up expired slot holds first
    await db.slotHold.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });

    // Fetch existing appointments for the doctor on this day
    const existingAppointments = await db.appointment.findMany({
      where: {
        doctorId,
        slotStart: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED", "CANCELLED_LEAVE"] },
      },
      select: { slotStart: true, slotEnd: true, status: true },
    });

    // Fetch active slot holds
    const activeHolds = await db.slotHold.findMany({
      where: {
        doctorId,
        slotStart: { gte: dayStart, lte: dayEnd },
        expiresAt: { gt: new Date() },
      },
      select: { slotStart: true, slotEnd: true, patientId: true, expiresAt: true },
    });

    const workingDaysArray = doctor.workingDays.split(",").map((d) => parseInt(d.trim(), 10));

    const slots = generateDoctorSlots({
      date,
      startHour: doctor.startHour,
      endHour: doctor.endHour,
      slotDurationMinutes: doctor.slotDuration,
      workingDays: workingDaysArray,
      leaves: doctor.leaves,
      existingAppointments,
      activeHolds,
      currentUserId: (session?.user as any)?.id,
    });

    return NextResponse.json({
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      specialization: doctor.specialization,
      date: dateStr,
      slots,
    });
  } catch (error: any) {
    console.error("[API Available Slots] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
