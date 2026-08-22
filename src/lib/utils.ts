import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, addMinutes, isBefore, isAfter, isWithinInterval, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE, MMM d, yyyy 'at' h:mm a");
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

export function formatTimeRange(start: Date | string, end: Date | string) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export interface TimeSlot {
  start: string; // ISO string
  end: string;   // ISO string
  timeLabel: string;
  isAvailable: boolean;
  heldByMe?: boolean;
  isHeld?: boolean;
}

export interface DoctorScheduleParams {
  date: Date;
  startHour: number;
  endHour: number;
  slotDurationMinutes: number;
  workingDays: number[]; // 1=Mon, 2=Tue... 0=Sun
  leaves: Array<{ startDate: Date | string; endDate: Date | string }>;
  existingAppointments: Array<{ slotStart: Date | string; slotEnd: Date | string; status: string }>;
  activeHolds: Array<{ slotStart: Date | string; slotEnd: Date | string; patientId: string; expiresAt: Date | string }>;
  currentUserId?: string;
}

/**
 * Computes available discrete slots for a doctor on a given day.
 */
export function generateDoctorSlots(params: DoctorScheduleParams): TimeSlot[] {
  const {
    date,
    startHour,
    endHour,
    slotDurationMinutes,
    workingDays,
    leaves,
    existingAppointments,
    activeHolds,
    currentUserId,
  } = params;

  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ...
  // Normalize Sunday if needed: if workingDays contains 0 or 7
  if (!workingDays.includes(dayOfWeek)) {
    return [];
  }

  // Check if date falls in any leave period
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const isOnLeave = leaves.some((l) => {
    const leaveStart = typeof l.startDate === "string" ? parseISO(l.startDate) : l.startDate;
    const leaveEnd = typeof l.endDate === "string" ? parseISO(l.endDate) : l.endDate;
    return (
      (isBefore(leaveStart, dayEnd) && isAfter(leaveEnd, dayStart)) ||
      isWithinInterval(date, { start: leaveStart, end: leaveEnd })
    );
  });

  if (isOnLeave) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const now = new Date();

  let currentSlotStart = setMinutes(setHours(dayStart, startHour), 0);
  const scheduleEnd = setMinutes(setHours(dayStart, endHour), 0);

  while (isBefore(currentSlotStart, scheduleEnd)) {
    const currentSlotEnd = addMinutes(currentSlotStart, slotDurationMinutes);
    if (isAfter(currentSlotEnd, scheduleEnd)) break;

    const isPast = isBefore(currentSlotStart, now);

    // Check if booked by an active appointment
    const isBooked = existingAppointments.some((appt) => {
      if (appt.status === "CANCELLED" || appt.status === "CANCELLED_LEAVE") return false;
      const apptStart = typeof appt.slotStart === "string" ? parseISO(appt.slotStart) : appt.slotStart;
      return apptStart.getTime() === currentSlotStart.getTime();
    });

    // Check if actively held
    const activeHold = activeHolds.find((hold) => {
      const holdStart = typeof hold.slotStart === "string" ? parseISO(hold.slotStart) : hold.slotStart;
      const expiresAt = typeof hold.expiresAt === "string" ? parseISO(hold.expiresAt) : hold.expiresAt;
      return holdStart.getTime() === currentSlotStart.getTime() && isAfter(expiresAt, now);
    });

    const isHeld = !!activeHold;
    const heldByMe = isHeld && activeHold?.patientId === currentUserId;

    // Slot is available if: not in past, not booked, and either (not held OR held by current user)
    const isAvailable = !isPast && !isBooked && (!isHeld || heldByMe);

    slots.push({
      start: currentSlotStart.toISOString(),
      end: currentSlotEnd.toISOString(),
      timeLabel: `${format(currentSlotStart, "h:mm a")} - ${format(currentSlotEnd, "h:mm a")}`,
      isAvailable,
      isHeld,
      heldByMe,
    });

    currentSlotStart = currentSlotEnd;
  }

  return slots;
}
