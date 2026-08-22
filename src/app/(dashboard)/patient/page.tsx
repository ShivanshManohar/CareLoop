"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  FileText,
  Pill,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Stethoscope,
  ExternalLink,
  Download,
  CalendarDays,
} from "lucide-react";
import { formatDateTime, formatDate, formatTime } from "@/lib/utils";
import { UrgencyBadge } from "@/components/urgency-badge";
import { generateGoogleCalendarWebUrl } from "@/lib/calendar-utils";

export const dynamic = "force-dynamic";

function PatientDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const gcalStatus = searchParams.get("gcal_status");

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" && new Date(a.slotStart) >= new Date()
  );

  const cancelledLeaveAppointments = appointments.filter(
    (a) => a.status === "CANCELLED_LEAVE"
  );

  const pastVisits = appointments.filter(
    (a) => a.status === "COMPLETED" || new Date(a.slotStart) < new Date()
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <span className="text-xs uppercase font-bold text-primary tracking-wider">Patient Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Welcome back, {session?.user?.name || "Patient"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your consultations, track prescriptions, and sync everything with your Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAppointments}
            className="p-2 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/patient/book"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm shadow-md shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Appointment</span>
          </Link>
        </div>
      </div>

      {/* Google Calendar Connection Feedback Banner */}
      {gcalStatus === "connected" && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="font-bold">Google Calendar Linked!</strong> All your upcoming appointments are automatically synced and updated in your calendar.
          </div>
        </div>
      )}

      {/* Google Calendar Sync Widget Card */}
      <div className="rounded-2xl border bg-gradient-to-r from-blue-500/5 via-primary/5 to-purple-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Google Calendar Two-Way Sync</span>
              <span className="text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                Active
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sync visits to your personal calendar or add appointments with 1-click below.
            </p>
          </div>
        </div>

        <a
          href="/api/calendar/connect"
          className="px-4 py-2 rounded-xl bg-card border hover:bg-muted font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Connect Google Account</span>
        </a>
      </div>

      {/* Action Required: Cancelled Due to Doctor Leave Banner */}
      {cancelledLeaveAppointments.length > 0 && (
        <div className="space-y-3">
          {cancelledLeaveAppointments.map((appt) => (
            <div
              key={appt.id}
              className="rounded-2xl border-2 border-red-500/40 bg-red-500/10 p-5 text-red-950 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 mb-1">
                    ACTION REQUIRED • DOCTOR LEAVE RESCHEDULING
                  </div>
                  <h3 className="font-bold text-base text-foreground">
                    Appointment Cancelled with Dr. {appt.doctor?.user?.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Originally booked for {formatDateTime(appt.slotStart)}. Calendar event deleted. Priority slots are held for you to rebook in 1 click.
                  </p>
                </div>
              </div>

              <Link
                href={`/patient/rebook/${appt.id}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shrink-0 shadow-md shadow-red-600/20"
              >
                <span>Rebook in 1-Click</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Upcoming & Past Summary Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Upcoming Consultations & Visits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Upcoming Appointments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Upcoming Consultations ({upcomingAppointments.length})</span>
              </h2>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center bg-card/50">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-foreground">No Upcoming Appointments</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  You don&apos;t have any consultations scheduled. Search our doctors and reserve a 5-min locked slot.
                </p>
                <Link
                  href="/patient/book"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Book a Specialist
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appt) => {
                  const gcalUrl = generateGoogleCalendarWebUrl({
                    title: `CareLoop: Dr. ${appt.doctor?.user?.name} (${appt.doctor?.specialization})`,
                    description: `Doctor: Dr. ${appt.doctor?.user?.name}\nSpecialization: ${appt.doctor?.specialization}\nIntake Symptoms: ${appt.symptomsNotes || "None"}\nLocation: CareLoop Medical Center`,
                    startTime: appt.slotStart,
                    endTime: appt.slotEnd,
                  });

                  return (
                    <div
                      key={appt.id}
                      className="rounded-2xl border bg-card p-5 hover:border-primary/40 transition-all shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <UrgencyBadge level={appt.urgencyLevel} size="sm" />
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {appt.doctor?.specialization}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-foreground text-base">
                              Dr. {appt.doctor?.user?.name}
                            </h3>
                            <p className="text-xs text-primary font-semibold flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5" /> {formatDateTime(appt.slotStart)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </span>
                        </div>
                      </div>

                      {appt.symptomsNotes && (
                        <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                          <strong className="text-foreground">Intake Notes:</strong> {appt.symptomsNotes}
                        </p>
                      )}

                      {/* Google Calendar Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs">
                        <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> Track in your calendar:
                        </span>

                        <div className="flex items-center gap-2">
                          <a
                            href={gcalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-500/20"
                          >
                            <span>Add to Google Calendar</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <a
                            href={`/api/calendar/ics/${appt.id}`}
                            className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
                            title="Download .ics calendar invite"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Past Visits & AI Summaries Timeline */}
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <span>Past Visits & AI Summaries Timeline</span>
            </h2>

            {pastVisits.length === 0 ? (
              <div className="rounded-2xl border p-6 text-center text-xs text-muted-foreground bg-card">
                No past visit records yet.
              </div>
            ) : (
              <div className="space-y-4">
                {pastVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {formatDate(visit.slotStart)} • Dr. {visit.doctor?.user?.name} ({visit.doctor?.specialization})
                        </div>
                        <h4 className="font-bold text-foreground text-sm mt-0.5">
                          {visit.chiefComplaint || "Routine Consultation"}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                        {visit.status}
                      </span>
                    </div>

                    {/* AI Patient Summary Card */}
                    {visit.patientSummary ? (
                      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <Sparkles className="w-4 h-4" />
                            <span>AI Plain-Language Summary & Instructions</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                            Generated by Gemini
                          </span>
                        </div>

                        <div className="prose prose-xs dark:prose-invert max-w-none text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {visit.patientSummary}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-lg">
                        Clinical notes pending doctor finalization.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Medication Schedule & Care Reminders */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Active Care & Prescriptions</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Automated reminders are dispatched based on your doctor&apos;s prescriptions.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Lisinopril 20mg</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Daily Morning
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Take 1 tablet every morning with water. Blood pressure maintenance.
                </p>
                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Next reminder: Tomorrow 8:00 AM (Email)
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Daily Hydration & Rest</span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    Lifestyle
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Drink 2.5L water daily and maintain 30 mins moderate walking.
                </p>
              </div>
            </div>
          </div>

          {/* Clinic Information Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              <span>Need Assistance?</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you experience sudden severe chest pain, shortness of breath, or emergency symptoms, immediately call 911 or visit the nearest emergency room.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-muted-foreground">Loading dashboard...</div>}>
      <PatientDashboardContent />
    </Suspense>
  );
}
