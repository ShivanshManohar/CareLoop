import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueNotificationJob } from "@/lib/notifications";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const doctorProfileId = (session.user as any).doctorProfileId;

    // Role-based data isolation
    if (role === "PATIENT" && appointment.patientId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (role === "DOCTOR" && appointment.doctorId !== doctorProfileId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, clinicalNotes, prescription, patientSummary, summaryStatus, summaryFailedReason } = body;

    const existing = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updated = await db.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(clinicalNotes !== undefined ? { clinicalNotes } : {}),
        ...(prescription !== undefined ? { prescription } : {}),
        ...(patientSummary !== undefined ? { patientSummary } : {}),
        ...(summaryStatus !== undefined ? { summaryStatus } : {}),
        ...(summaryFailedReason !== undefined ? { summaryFailedReason } : {}),
      },
    });

    // If completed with a patientSummary, enqueue post-visit summary email & medication reminder
    if (patientSummary && (status === "COMPLETED" || updated.status === "COMPLETED")) {
      await enqueueNotificationJob({
        type: "EMAIL_POST_VISIT_SUMMARY",
        recipient: existing.patient.email,
        appointmentId: existing.id,
        payload: {
          patientName: existing.patient.name,
          doctorName: existing.doctor.user.name,
          summaryText: patientSummary,
        },
      });

      if (prescription) {
        await enqueueNotificationJob({
          type: "EMAIL_MEDICATION_REMINDER",
          recipient: existing.patient.email,
          appointmentId: existing.id,
          payload: {
            patientName: existing.patient.name,
            doctorName: existing.doctor.user.name,
            prescription,
          },
        });
      }
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error("[API Appointment PATCH] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update appointment" }, { status: 500 });
  }
}
