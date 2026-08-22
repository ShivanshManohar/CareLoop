import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateIcsContent } from "@/lib/calendar-utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const appt = await db.appointment.findUnique({
      where: { id },
      include: {
        doctor: { include: { user: true } },
        patient: true,
      },
    });

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const title = `CareLoop: Dr. ${appt.doctor.user.name} (${appt.doctor.specialization})`;
    const description = `Consultation with Dr. ${appt.doctor.user.name}\nPatient: ${appt.patient.name}\nSymptoms/Notes: ${appt.symptomsNotes || "General Checkup"}\nUrgency: ${appt.urgencyLevel || "Routine"}`;

    const icsString = generateIcsContent({
      uid: appt.id,
      title,
      description,
      startTime: appt.slotStart,
      endTime: appt.slotEnd,
      location: "CareLoop Medical Clinic",
    });

    return new Response(icsString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="careloop-appointment-${appt.id.slice(-6)}.ics"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate calendar invite" }, { status: 500 });
  }
}
