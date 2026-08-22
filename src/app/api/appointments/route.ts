import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISO, format } from "date-fns";
import { analyzePreVisitSymptoms } from "@/lib/ai";
import { enqueueNotificationJob } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const doctorProfileId = (session.user as any).doctorProfileId;

    let appointments;
    if (role === "PATIENT") {
      appointments = await db.appointment.findMany({
        where: { patientId: userId },
        include: {
          doctor: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { slotStart: "desc" },
      });
    } else if (role === "DOCTOR") {
      if (!doctorProfileId) {
        return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });
      }
      appointments = await db.appointment.findMany({
        where: { doctorId: doctorProfileId },
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { slotStart: "asc" },
      });
    } else if (role === "ADMIN") {
      appointments = await db.appointment.findMany({
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { slotStart: "desc" },
      });
    }

    return NextResponse.json({ appointments });
  } catch (error: any) {
    console.error("[API Appointments GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to book." }, { status: 401 });
    }

    const patientId = (session.user as any).id;
    const patientName = session.user.name || "Patient";
    const patientEmail = session.user.email || "";

    const body = await req.json();
    const {
      doctorId,
      slotStart,
      slotEnd,
      symptomsDuration,
      symptomsSeverity,
      symptomsNotes,
      symptomsTags,
      rebookedFromId,
    } = body;

    if (!doctorId || !slotStart || !slotEnd) {
      return NextResponse.json({ error: "Missing required booking details (doctorId, slotStart, slotEnd)" }, { status: 400 });
    }

    const start = parseISO(slotStart);
    const end = parseISO(slotEnd);
    const now = new Date();

    // 1. Run Pre-Visit AI Triage (non-blocking failure guarantee)
    const triageResult = await analyzePreVisitSymptoms({
      duration: symptomsDuration,
      severity: typeof symptomsSeverity === "number" ? symptomsSeverity : parseInt(symptomsSeverity || "4", 10),
      notes: symptomsNotes,
      tags: symptomsTags,
    });

    const urgencyLevel = triageResult.data.urgencyLevel || "Low";
    const chiefComplaint = triageResult.data.chiefComplaint;
    const suggestedQuestions = JSON.stringify(triageResult.data.suggestedQuestions);

    // 2. Transactional atomic booking to strictly prevent double-booking
    const newAppointment = await db.$transaction(async (tx) => {
      // Check if slot is already occupied
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          slotStart: start,
          status: { notIn: ["CANCELLED", "CANCELLED_LEAVE"] },
        },
      });

      if (existing) {
        throw new Error("SLOT_DOUBLE_BOOKED");
      }

      // Check doctor exists
      const doctor = await tx.doctorProfile.findUnique({
        where: { id: doctorId },
        include: { user: { select: { name: true, email: true } } },
      });

      if (!doctor) {
        throw new Error("DOCTOR_NOT_FOUND");
      }

      // Create appointment
      const appt = await tx.appointment.create({
        data: {
          doctorId,
          patientId,
          slotStart: start,
          slotEnd: end,
          status: "CONFIRMED",
          symptomsDuration: symptomsDuration || null,
          symptomsSeverity: symptomsSeverity ? Number(symptomsSeverity) : null,
          symptomsNotes: symptomsNotes || null,
          symptomsTags: symptomsTags || null,
          urgencyLevel,
          chiefComplaint,
          suggestedQuestions,
          summaryStatus: "pending",
          rebookedFromId: rebookedFromId || null,
        },
        include: {
          doctor: { include: { user: true } },
          patient: true,
        },
      });

      // Clear any hold for this slot
      await tx.slotHold.deleteMany({
        where: {
          doctorId,
          slotStart: start,
        },
      });

      return { appt, doctor };
    });

    // 3. Enqueue Notification Jobs (Booking Confirmation Email + Google Calendar Sync)
    const formattedSlot = format(start, "EEEE, MMMM d, yyyy 'at' h:mm a");
    await enqueueNotificationJob({
      type: "EMAIL_BOOKING_CONFIRMATION",
      recipient: patientEmail,
      appointmentId: newAppointment.appt.id,
      payload: {
        patientName,
        doctorName: newAppointment.doctor.user.name,
        specialization: newAppointment.doctor.specialization,
        slotTime: formattedSlot,
        symptoms: symptomsNotes || "None specified",
      },
    });

    await enqueueNotificationJob({
      type: "CALENDAR_SYNC",
      recipient: patientEmail,
      appointmentId: newAppointment.appt.id,
      payload: {
        summary: `CareLoop: Dr. ${newAppointment.doctor.user.name} (${newAppointment.doctor.specialization})`,
        start: start.toISOString(),
        end: end.toISOString(),
        description: `Symptoms: ${symptomsNotes || "General consultation"}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        appointment: newAppointment.appt,
        message: "Appointment successfully confirmed.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "SLOT_DOUBLE_BOOKED" || error.code === "P2002") {
      return NextResponse.json(
        {
          error: "This slot was just booked by another user. Please select another convenient time slot.",
          code: "SLOT_TAKEN",
        },
        { status: 409 }
      );
    }
    if (error.message === "DOCTOR_NOT_FOUND") {
      return NextResponse.json({ error: "Doctor profile not found." }, { status: 404 });
    }
    console.error("[API Appointment Create] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create appointment" }, { status: 500 });
  }
}
