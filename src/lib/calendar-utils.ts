import { parseISO } from "date-fns";

/**
 * Generates an instant, zero-setup 1-click Google Calendar web link.
 * Works immediately for any patient or doctor in any browser without OAuth!
 */
export function generateGoogleCalendarWebUrl(params: {
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
}): string {
  const start = typeof params.startTime === "string" ? parseISO(params.startTime) : params.startTime;
  const end = typeof params.endTime === "string" ? parseISO(params.endTime) : params.endTime;

  // Format as YYYYMMDDTHHmmssZ (UTC)
  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const startFormatted = formatGCalDate(start);
  const endFormatted = formatGCalDate(end);

  const baseUrl = "https://calendar.google.com/calendar/render";
  const queryParams = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${startFormatted}/${endFormatted}`,
    details: params.description,
    location: params.location || "CareLoop Medical Clinic",
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Generates a standard RFC 5545 iCalendar (.ics) string.
 * Supports Apple Calendar, Google Calendar, Outlook, and mobile calendar apps.
 */
export function generateIcsContent(params: {
  uid: string;
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
}): string {
  const start = typeof params.startTime === "string" ? parseISO(params.startTime) : params.startTime;
  const end = typeof params.endTime === "string" ? parseISO(params.endTime) : params.endTime;

  const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareLoop//Healthcare Appointment Manager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@careloop.health`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location || "CareLoop Medical Clinic"}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:CareLoop Consultation in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
