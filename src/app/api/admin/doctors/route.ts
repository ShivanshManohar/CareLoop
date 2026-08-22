import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const doctors = await db.doctorProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        leaves: true,
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ doctors });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch doctors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, specialization, bio, slotDuration, startHour, endHour, workingDays } = body;

    if (!name || !email || !password || !specialization) {
      return NextResponse.json({ error: "Name, email, password, and specialization are required" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: "DOCTOR",
        },
      });

      const doctorProfile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialization,
          bio: bio || null,
          slotDuration: slotDuration ? Number(slotDuration) : 30,
          startHour: startHour ? Number(startHour) : 9,
          endHour: endHour ? Number(endHour) : 17,
          workingDays: workingDays || "1,2,3,4,5",
        },
        include: { user: true },
      });

      return doctorProfile;
    });

    return NextResponse.json({ success: true, doctor: result }, { status: 201 });
  } catch (error: any) {
    console.error("[API Admin Doctor POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create doctor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { doctorId, specialization, bio, slotDuration, startHour, endHour, workingDays } = body;

    if (!doctorId) {
      return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
    }

    const updated = await db.doctorProfile.update({
      where: { id: doctorId },
      data: {
        ...(specialization ? { specialization } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(slotDuration ? { slotDuration: Number(slotDuration) } : {}),
        ...(startHour ? { startHour: Number(startHour) } : {}),
        ...(endHour ? { endHour: Number(endHour) } : {}),
        ...(workingDays ? { workingDays } : {}),
      },
      include: { user: true },
    });

    return NextResponse.json({ success: true, doctor: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update doctor" }, { status: 500 });
  }
}
