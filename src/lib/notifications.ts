import { Resend } from "resend";
import { db } from "./db";
import { addMinutes } from "date-fns";
import { syncGoogleCalendarEvent, deleteGoogleCalendarEvent } from "./google-calendar";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "CareLoop <onboarding@resend.dev>";
const resend = resendApiKey && resendApiKey.trim() !== "" ? new Resend(resendApiKey) : null;

export type NotificationType =
  | "EMAIL_BOOKING_CONFIRMATION"
  | "EMAIL_POST_VISIT_SUMMARY"
  | "EMAIL_LEAVE_CANCELLATION"
  | "EMAIL_MEDICATION_REMINDER"
  | "CALENDAR_SYNC"
  | "CALENDAR_DELETE";

export interface EnqueueJobParams {
  type: NotificationType;
  recipient: string;
  payload: Record<string, any>;
  appointmentId?: string;
}

/**
 * Creates a pending job in the NotificationJob table.
 */
export async function enqueueNotificationJob(params: EnqueueJobParams) {
  try {
    const job = await db.notificationJob.create({
      data: {
        type: params.type,
        recipient: params.recipient,
        payload: JSON.stringify(params.payload),
        appointmentId: params.appointmentId,
        status: "PENDING",
        attempts: 0,
        maxAttempts: 3,
        nextRetryAt: new Date(),
      },
    });
    console.log(`[CareLoop Notification] Enqueued job ${job.id} of type ${params.type} for ${params.recipient}`);
    return job;
  } catch (error) {
    console.error("[CareLoop Notification] Failed to enqueue notification job:", error);
    throw error;
  }
}

/**
 * Dispatches an individual notification job.
 */
async function dispatchJob(job: any): Promise<{ success: boolean; error?: string }> {
  const payload = JSON.parse(job.payload || "{}");

  try {
    switch (job.type) {
      case "EMAIL_BOOKING_CONFIRMATION": {
        const subject = `Appointment Confirmed with Dr. ${payload.doctorName || "CareLoop"}`;
        const gcalUrl = payload.googleCalendarUrl;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #0284c7;">CareLoop Appointment Confirmation</h2>
            <p>Hello <strong>${payload.patientName}</strong>,</p>
            <p>Your appointment has been confirmed:</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${payload.doctorName} (${payload.specialization})</p>
              <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${payload.slotTime}</p>
              <p style="margin: 4px 0;"><strong>Symptoms Reported:</strong> ${payload.symptoms || "None"}</p>
            </div>
            ${
              gcalUrl
                ? `<div style="margin: 20px 0;">
                    <a href="${gcalUrl}" style="background-color: #0284c7; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      📅 Add to Google Calendar
                    </a>
                  </div>`
                : ""
            }
            <p>Please arrive 5 minutes prior to your scheduled time.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">CareLoop Clinic System</p>
          </div>
        `;

        if (resend) {
          await resend.emails.send({
            from: emailFrom,
            to: job.recipient,
            subject,
            html,
          });
        } else {
          console.log(`[CareLoop Mock Email] Sent BOOKING_CONFIRMATION to ${job.recipient}`);
        }
        return { success: true };
      }

      case "EMAIL_POST_VISIT_SUMMARY": {
        const subject = `Your CareLoop Post-Visit Summary & Care Plan`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #0284c7;">Your Clinical Visit Summary</h2>
            <p>Hello <strong>${payload.patientName}</strong>,</p>
            <p>Dr. ${payload.doctorName} has finalized your visit summary and treatment instructions:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
              ${payload.summaryHtml || `<pre style="white-space: pre-wrap;">${payload.summaryText}</pre>`}
            </div>
            <p>You can also access your complete health history at any time on your patient portal.</p>
          </div>
        `;

        if (resend) {
          await resend.emails.send({
            from: emailFrom,
            to: job.recipient,
            subject,
            html,
          });
        } else {
          console.log(`[CareLoop Mock Email] Sent POST_VISIT_SUMMARY to ${job.recipient}`);
        }
        return { success: true };
      }

      case "EMAIL_LEAVE_CANCELLATION": {
        const subject = `Action Required: Appointment Rescheduling - Dr. ${payload.doctorName}`;
        const rebookUrl = payload.rebookUrl || `http://localhost:3000/patient/rebook/${payload.appointmentId}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #dc2626;">Appointment Rescheduling Required</h2>
            <p>Hello <strong>${payload.patientName}</strong>,</p>
            <p>Due to an unexpected schedule adjustment/leave for <strong>Dr. ${payload.doctorName}</strong>, your appointment scheduled on <strong>${payload.slotTime}</strong> has been cancelled.</p>
            <p>We apologize for the inconvenience. To ensure your continuous care, priority slots are reserved for you:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${rebookUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Click Here to Rebook in 1-Click
              </a>
            </div>
          </div>
        `;

        if (resend) {
          await resend.emails.send({
            from: emailFrom,
            to: job.recipient,
            subject,
            html,
          });
        } else {
          console.log(`[CareLoop Mock Email] Sent LEAVE_CANCELLATION to ${job.recipient}`);
        }
        return { success: true };
      }

      case "EMAIL_MEDICATION_REMINDER": {
        const subject = `Medication Reminder: CareLoop Prescription Follow-up`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #059669;">CareLoop Medication Reminder</h2>
            <p>Hello <strong>${payload.patientName}</strong>,</p>
            <p>This is a friendly reminder regarding your active prescription from Dr. ${payload.doctorName}:</p>
            <blockquote style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 16px 0;">
              <strong>Prescription Schedule:</strong><br/>
              ${payload.prescription || "Take your prescribed medications as directed with meals."}
            </blockquote>
          </div>
        `;

        if (resend) {
          await resend.emails.send({
            from: emailFrom,
            to: job.recipient,
            subject,
            html,
          });
        } else {
          console.log(`[CareLoop Mock Email] Sent MEDICATION_REMINDER to ${job.recipient}`);
        }
        return { success: true };
      }

      case "CALENDAR_SYNC": {
        const syncResult = await syncGoogleCalendarEvent({
          title: payload.summary || "CareLoop Medical Consultation",
          description: payload.description || "Medical Consultation",
          startTime: payload.start,
          endTime: payload.end,
          location: payload.location,
          attendeeEmail: job.recipient,
          appointmentId: job.appointmentId,
          patientId: payload.patientId,
          doctorId: payload.doctorId,
        });

        if (!syncResult.success) {
          return { success: false, error: syncResult.error || "Calendar sync failed" };
        }
        return { success: true };
      }

      case "CALENDAR_DELETE": {
        if (payload.eventId) {
          const delResult = await deleteGoogleCalendarEvent({
            eventId: payload.eventId,
            userId: payload.userId,
          });
          if (!delResult.success) {
            return { success: false, error: delResult.error || "Calendar delete failed" };
          }
        }
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown notification type: ${job.type}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sweeps and processes all pending or retryable failed notification jobs.
 */
export async function processNotificationQueue() {
  const now = new Date();

  const jobsToProcess = await db.notificationJob.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        {
          status: "FAILED",
          attempts: { lt: 3 },
          nextRetryAt: { lte: now },
        },
      ],
    },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  const results = {
    processed: jobsToProcess.length,
    succeeded: 0,
    failed: 0,
  };

  for (const job of jobsToProcess) {
    const outcome = await dispatchJob(job);

    if (outcome.success) {
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          updatedAt: new Date(),
        },
      });
      results.succeeded++;
    } else {
      const nextAttempt = job.attempts + 1;
      const isFinalFailure = nextAttempt >= job.maxAttempts;
      const nextRetryMinutes = Math.pow(2, nextAttempt);
      const nextRetryAt = isFinalFailure ? null : addMinutes(now, nextRetryMinutes);

      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          attempts: nextAttempt,
          lastError: outcome.error || "Unknown dispatch failure",
          nextRetryAt,
          updatedAt: new Date(),
        },
      });
      results.failed++;
    }
  }

  return results;
}
