import { google } from "googleapis";
import { parseISO } from "date-fns";
import { db } from "./db";
import { generateGoogleCalendarWebUrl, generateIcsContent } from "./calendar-utils";

export { generateGoogleCalendarWebUrl, generateIcsContent };

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";

export function getOAuth2Client() {
  if (!clientId || !clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(userId: string, returnUrl?: string) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  const state = JSON.stringify({ userId, returnUrl: returnUrl || "/patient" });

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

export interface CalendarEventParams {
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  attendeeEmail?: string;
  doctorId?: string;
  patientId?: string;
  appointmentId?: string;
}

/**
 * Syncs event directly with user's Google Calendar via Google Calendar API (OAuth).
 */
export async function syncGoogleCalendarEvent(params: CalendarEventParams): Promise<{
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  isSimulated?: boolean;
  error?: string;
}> {
  const oauth2Client = getOAuth2Client();

  let userToken: string | null = null;
  if (params.patientId) {
    const user = await db.user.findUnique({
      where: { id: params.patientId },
      select: { googleRefreshToken: true },
    });
    userToken = user?.googleRefreshToken || null;
  }

  if (!oauth2Client || !userToken) {
    const webUrl = generateGoogleCalendarWebUrl({
      title: params.title,
      description: params.description,
      startTime: params.startTime,
      endTime: params.endTime,
      location: params.location,
    });

    console.log(`[CareLoop Google Calendar] Direct Sync Url Generated for ${params.title}:\n${webUrl}`);

    return {
      success: true,
      htmlLink: webUrl,
      isSimulated: true,
    };
  }

  try {
    oauth2Client.setCredentials({ refresh_token: userToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = typeof params.startTime === "string" ? parseISO(params.startTime) : params.startTime;
    const end = typeof params.endTime === "string" ? parseISO(params.endTime) : params.endTime;

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: params.title,
        description: params.description,
        location: params.location || "CareLoop Medical Center",
        start: {
          dateTime: start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
        ...(params.attendeeEmail ? { attendees: [{ email: params.attendeeEmail }] } : {}),
      },
    });

    if (params.appointmentId && response.data.id) {
      await db.appointment.update({
        where: { id: params.appointmentId },
        data: { googleCalendarEventId: response.data.id },
      });
    }

    return {
      success: true,
      eventId: response.data.id || undefined,
      htmlLink: response.data.htmlLink || undefined,
      isSimulated: false,
    };
  } catch (err: any) {
    console.error("[CareLoop Google Calendar] API Insert Error:", err);
    return {
      success: false,
      error: err?.message || "Failed to insert Google Calendar event",
    };
  }
}

/**
 * Deletes an event from Google Calendar on appointment cancellation.
 */
export async function deleteGoogleCalendarEvent(params: {
  eventId: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client || !params.userId) {
    console.log(`[CareLoop Google Calendar] Mock delete event ${params.eventId}`);
    return { success: true };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: params.userId },
      select: { googleRefreshToken: true },
    });

    if (!user?.googleRefreshToken) {
      return { success: true };
    }

    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: params.eventId,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[CareLoop Google Calendar] Delete error:", err);
    return { success: false, error: err?.message || "Failed to delete calendar event" };
  }
}
