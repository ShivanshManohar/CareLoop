import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMinutes, parseISO, isAfter } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const patientId = (session.user as any).id;
    const body = await req.json();
    const { doctorId, slotStart, slotEnd } = body;

    if (!doctorId || !slotStart || !slotEnd) {
      return NextResponse.json({ error: "doctorId, slotStart, and slotEnd are required" }, { status: 400 });
    }

    const start = parseISO(slotStart);
    const end = parseISO(slotEnd);
    const now = new Date();
    const expiresAt = addMinutes(now, 5); // 5-minute hold lock

    // Execute atomic hold acquisition
    const holdResult = await db.$transaction(async (tx) => {
      // 1. Clean expired holds
      await tx.slotHold.deleteMany({
        where: {
          expiresAt: { lte: now },
        },
      });

      // 2. Check if slot already booked by an active appointment
      const existingAppointment = await tx.appointment.findFirst({
        where: {
          doctorId,
          slotStart: start,
          status: { notIn: ["CANCELLED", "CANCELLED_LEAVE"] },
        },
      });

      if (existingAppointment) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }

      // 3. Check if slot is held by another patient
      const existingHold = await tx.slotHold.findUnique({
        where: {
          doctorId_slotStart: {
            doctorId,
            slotStart: start,
          },
        },
      });

      if (existingHold && existingHold.patientId !== patientId && isAfter(existingHold.expiresAt, now)) {
        throw new Error("SLOT_HELD_BY_ANOTHER");
      }

      // 4. Upsert the hold for this user
      const hold = await tx.slotHold.upsert({
        where: {
          doctorId_slotStart: {
            doctorId,
            slotStart: start,
          },
        },
        create: {
          doctorId,
          patientId,
          slotStart: start,
          slotEnd: end,
          expiresAt,
        },
        update: {
          patientId,
          slotEnd: end,
          expiresAt,
        },
      });

      return hold;
    });

    return NextResponse.json({
      success: true,
      holdId: holdResult.id,
      expiresAt: holdResult.expiresAt.toISOString(),
      expiresInSeconds: 300,
    });
  } catch (error: any) {
    if (error.message === "SLOT_ALREADY_BOOKED") {
      return NextResponse.json(
        { error: "This slot has already been confirmed by another patient." },
        { status: 409 }
      );
    }
    if (error.message === "SLOT_HELD_BY_ANOTHER") {
      return NextResponse.json(
        { error: "This slot is temporarily locked by another patient filling out their intake form. Please try another slot or check back shortly." },
        { status: 409 }
      );
    }
    console.error("[API Slot Hold] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to acquire slot hold" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const slotStart = searchParams.get("slotStart");

    if (doctorId && slotStart) {
      await db.slotHold.deleteMany({
        where: {
          doctorId,
          slotStart: parseISO(slotStart),
          patientId,
        },
      });
    } else {
      // Release all holds for current user
      await db.slotHold.deleteMany({
        where: { patientId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to release hold" }, { status: 500 });
  }
}
