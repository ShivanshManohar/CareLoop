"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Filter,
  Stethoscope,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Zap,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { formatDateTime, formatTime } from "@/lib/utils";
import { UrgencyBadge } from "@/components/urgency-badge";
import { generateGoogleCalendarWebUrl } from "@/lib/calendar-utils";

export default function DoctorQueuePage() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Failed to load doctor appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const highUrgencyCount = appointments.filter(
    (a) => (a.urgencyLevel || "").toUpperCase() === "HIGH" && a.status === "CONFIRMED"
  ).length;

  const mediumUrgencyCount = appointments.filter(
    (a) => (a.urgencyLevel || "").toUpperCase() === "MEDIUM" && a.status === "CONFIRMED"
  ).length;

  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  const filteredAppointments = appointments.filter((a) => {
    if (urgencyFilter === "ALL") return true;
    return (a.urgencyLevel || "LOW").toUpperCase() === urgencyFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header & Triage Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Stethoscope className="w-4 h-4" /> Clinical Triage Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
            {session?.user?.name || "Doctor"} Daily Schedule
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Appointments are pre-screened and prioritized with AI triage urgency flags (Red/Amber/Green).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh triage queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <a
            href="/api/calendar/connect"
            className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>Connect Doctor Calendar</span>
          </a>
          <Link
            href="/doctor/schedule"
            className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4 text-primary" />
            <span>Hours & Leave</span>
          </Link>
        </div>
      </div>

      {/* Triage KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* High Urgency Card */}
        <div className="rounded-2xl border bg-red-500/10 border-red-500/30 p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> High Urgency Triage
            </span>
            <div className="text-3xl font-black text-red-700 dark:text-red-300 mt-1">{highUrgencyCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Requires immediate attention</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Medium Urgency Card */}
        <div className="rounded-2xl border bg-amber-500/10 border-amber-500/30 p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Medium Urgency
            </span>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1">{mediumUrgencyCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Subacute symptoms</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Visits Card */}
        <div className="rounded-2xl border bg-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Visits Completed Today
            </span>
            <div className="text-3xl font-black text-foreground mt-1">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">AI summaries finalized</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Queue Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setUrgencyFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              urgencyFilter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setUrgencyFilter("HIGH")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              urgencyFilter === "HIGH"
                ? "bg-red-600 text-white font-bold"
                : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
            }`}
          >
            High Urgency ({highUrgencyCount})
          </button>
          <button
            onClick={() => setUrgencyFilter("MEDIUM")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              urgencyFilter === "MEDIUM"
                ? "bg-amber-600 text-white font-bold"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            Medium Urgency ({mediumUrgencyCount})
          </button>
          <button
            onClick={() => setUrgencyFilter("LOW")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              urgencyFilter === "LOW"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            Routine / Low
          </button>
        </div>
      </div>

      {/* Appointment Queue List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center bg-card">
            <Stethoscope className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-foreground">No Appointments Matching Filter</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select &quot;All Appointments&quot; or check back for new patient bookings.
            </p>
          </div>
        ) : (
          filteredAppointments.map((appt) => {
            const isHigh = (appt.urgencyLevel || "").toUpperCase() === "HIGH";
            const isCompleted = appt.status === "COMPLETED";

            let suggestedQuestions: string[] = [];
            try {
              suggestedQuestions = JSON.parse(appt.suggestedQuestions || "[]");
            } catch {
              suggestedQuestions = [];
            }

            const gcalUrl = generateGoogleCalendarWebUrl({
              title: `Patient Consult: ${appt.patient?.name} (${appt.urgencyLevel || "Routine"} Urgency)`,
              description: `Patient: ${appt.patient?.name}\nEmail: ${appt.patient?.email}\nPhone: ${appt.patient?.phone || "N/A"}\nChief Complaint: ${appt.chiefComplaint || appt.symptomsNotes}\nSuggested Questions: ${suggestedQuestions.join("\n- ")}`,
              startTime: appt.slotStart,
              endTime: appt.slotEnd,
            });

            return (
              <div
                key={appt.id}
                className={`rounded-2xl border p-6 transition-all shadow-sm ${
                  isHigh && !isCompleted
                    ? "border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20"
                    : isCompleted
                    ? "bg-card/60 opacity-80"
                    : "bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Patient Info & Timing */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <UrgencyBadge level={appt.urgencyLevel} size="md" />
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatDateTime(appt.slotStart)}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                        <span>{appt.patient?.name}</span>
                        {appt.patient?.phone && (
                          <span className="text-xs font-normal text-muted-foreground">({appt.patient.phone})</span>
                        )}
                      </h3>
                      <p className="text-xs text-foreground font-medium mt-1">
                        <strong className="text-primary">Chief Complaint:</strong>{" "}
                        {appt.chiefComplaint || appt.symptomsNotes || "Routine consultation."}
                      </p>
                    </div>

                    {/* AI Suggested Questions Preview */}
                    {suggestedQuestions.length > 0 && (
                      <div className="bg-muted/50 rounded-xl p-3 border space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" /> AI Suggested Diagnostic Questions:
                        </span>
                        <ul className="text-xs text-foreground/90 space-y-0.5 list-disc pl-4">
                          {suggestedQuestions.slice(0, 2).map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions & Google Calendar Link */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 shrink-0">
                    <a
                      href={gcalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      title="Open event in Google Calendar"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Calendar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <Link
                      href={`/doctor/appointment/${appt.id}`}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                        isCompleted
                          ? "bg-muted hover:bg-muted/80 text-foreground"
                          : isHigh
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      }`}
                    >
                      <span>{isCompleted ? "Review Summary" : "Open Consult Room"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
