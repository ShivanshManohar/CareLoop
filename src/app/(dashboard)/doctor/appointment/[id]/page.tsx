"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  FileText,
  Pill,
  Send,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { UrgencyBadge } from "@/components/urgency-badge";
import { AIStreamView } from "@/components/ai-stream-view";

export default function DoctorConsultRoomPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.id as string;

  const [appointment, setAppointment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Doctor Clinical Form
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescription, setPrescription] = useState("");

  // AI Stream State
  const [patientSummary, setPatientSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<string>("pending");
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch appointment data
  useEffect(() => {
    async function loadAppointment() {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`);
        const data = await res.json();
        if (data.appointment) {
          setAppointment(data.appointment);
          setClinicalNotes(data.appointment.clinicalNotes || "");
          setPrescription(data.appointment.prescription || "");
          setPatientSummary(data.appointment.patientSummary || "");
          setSummaryStatus(data.appointment.summaryStatus || "pending");
          setFailedReason(data.appointment.summaryFailedReason || null);
        }
      } catch (err) {
        console.error("Failed to load appointment:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (appointmentId) loadAppointment();
  }, [appointmentId]);

  // Stream AI Patient-Friendly Summary
  const handleGenerateSummaryStream = async () => {
    if (!clinicalNotes.trim()) {
      alert("Please enter clinical notes first.");
      return;
    }

    setIsStreaming(true);
    setPatientSummary("");
    setSummaryStatus("pending");
    setFailedReason(null);

    try {
      const res = await fetch("/api/ai/post-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicalNotes, prescription }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "AI Stream failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const decoder = new TextDecoder("utf-8");
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setPatientSummary(accumulated);
      }

      setSummaryStatus("completed");
    } catch (err: any) {
      console.warn("AI streaming failed, activating failure handler:", err);
      setSummaryStatus("failed");
      setFailedReason(err?.message || "AI summary generation service temporarily unavailable.");
    } finally {
      setIsStreaming(false);
    }
  };

  // Finalize & Complete Appointment
  const handleFinalizeVisit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          clinicalNotes,
          prescription,
          patientSummary,
          summaryStatus,
          summaryFailedReason: failedReason,
        }),
      });

      if (res.ok) {
        router.push("/doctor");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to finalize appointment:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading consultation room...</div>;
  }

  if (!appointment) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Appointment not found.</div>;
  }

  let suggestedQuestions: string[] = [];
  try {
    suggestedQuestions = JSON.parse(appointment.suggestedQuestions || "[]");
  } catch {
    suggestedQuestions = [];
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <Link
            href="/doctor"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Triage Queue
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Consultation: {appointment.patient?.name}
            </h1>
            <UrgencyBadge level={appointment.urgencyLevel} size="md" />
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> {formatDateTime(appointment.slotStart)}
            <span>• Contact: {appointment.patient?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFinalizeVisit}
            disabled={isSaving || isStreaming}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Finalize & Complete Visit"}</span>
          </button>
        </div>
      </div>

      {/* Main Consult Grid: Pre-visit Brief on Left, Clinical Notes & AI Stream on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 Cols): AI Pre-Visit Brief & Patient Intake */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Pre-Visit Brief Box */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-4 h-4" />
                <span>AI Pre-Visit Triage Brief</span>
              </div>
              <UrgencyBadge level={appointment.urgencyLevel} size="sm" />
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Chief Complaint Analysis
                </span>
                <p className="text-xs font-medium text-foreground bg-primary/5 p-3 rounded-xl border border-primary/20 mt-1 leading-relaxed">
                  {appointment.chiefComplaint || "No pre-visit brief available."}
                </p>
              </div>

              {/* 3 Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" /> 3 Suggested Questions for Doctor:
                  </span>
                  <ul className="space-y-2">
                    {suggestedQuestions.map((q, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-foreground bg-muted/60 p-2.5 rounded-lg border flex items-start gap-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Raw Patient Intake Reported */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Patient Self-Reported Intake
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold text-foreground">{appointment.symptomsDuration || "Unspecified"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Severity (1–10):</span>
                <span className="font-semibold text-foreground">{appointment.symptomsSeverity || "N/A"} / 10</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Symptoms / Tags:</span>
                <span className="font-semibold text-foreground">{appointment.symptomsTags || "None"}</span>
              </div>
              <div className="pt-1">
                <span className="text-muted-foreground">Patient Notes:</span>
                <p className="text-foreground bg-muted/40 p-3 rounded-lg border mt-1 leading-relaxed">
                  {appointment.symptomsNotes || "No extra notes provided."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Clinical Notes, Prescription, & AI Live Summary */}
        <div className="lg:col-span-7 space-y-6">
          {/* Clinical Notes & Rx Form */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Doctor Clinical Notes & Findings</span>
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Clinical Examination & Diagnostic Findings
                </label>
                <textarea
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. BP 130/85 mmHg, regular heart rate. Mild bilateral wheezing. Advised oral antibiotics and rest..."
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescription & Follow-up Schedule
                </label>
                <textarea
                  rows={3}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg - 1 capsule 3x daily for 7 days with food. Follow-up in 10 days."
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* AI Streaming Trigger */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateSummaryStream}
                  disabled={isStreaming || !clinicalNotes.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isStreaming ? "animate-spin" : ""}`} />
                  <span>{isStreaming ? "Streaming AI Summary..." : "Generate AI Patient Summary"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Streamed / Patient-Friendly Summary Output Card */}
          <AIStreamView
            content={patientSummary}
            isStreaming={isStreaming}
            summaryStatus={summaryStatus}
            failedReason={failedReason}
            rawNotes={clinicalNotes}
            onRetry={handleGenerateSummaryStream}
          />
        </div>
      </div>
    </div>
  );
}
