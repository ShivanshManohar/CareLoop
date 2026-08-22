"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Trash2,
  ArrowLeft,
  CalendarX,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DoctorSchedulePage() {
  const { data: session } = useSession();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("Medical Conference / Annual Leave");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveNotice, setLeaveNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/doctor/leave");
      const data = await res.json();
      if (data.leaves) {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleRecordLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    setError(null);
    setLeaveNotice(null);

    try {
      const res = await fetch("/api/doctor/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record leave");
      }

      setLeaveNotice(
        `Leave registered successfully! ${data.affectedCount || 0} overlapping appointment(s) were automatically transitioned to CANCELLED_LEAVE, and priority 1-click rebooking emails were enqueued.`
      );
      setStartDate("");
      setEndDate("");
      fetchLeaves();
    } catch (err: any) {
      setError(err?.message || "Failed to record leave");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <Link
            href="/doctor"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Triage Queue
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Schedule & Leave Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure your clinical availability and manage leave periods with automated patient rescheduling.
          </p>
        </div>
      </div>

      {leaveNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Leave Registered</h4>
            <p className="mt-0.5 leading-relaxed">{leaveNotice}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Record Leave Form */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-base border-b pb-3">
            <CalendarX className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span>Mark Leave / Absence</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            When you mark leave, CareLoop automatically cancels any booked consultations in that window and emails affected patients a <strong>1-click rebooking link</strong>.
          </p>

          <form onSubmit={handleRecordLeave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reason / Note</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual Leave, Emergency Surgery, CME"
                className="w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingLeave}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              <CalendarX className="w-4 h-4" />
              <span>{isSubmittingLeave ? "Registering & Rescheduling..." : "Record Leave & Notify Patients"}</span>
            </button>
          </form>
        </div>

        {/* Existing Leaves List */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Scheduled Leaves ({leaves.length})</span>
            </h3>
          </div>

          {leaves.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl">
              No leave periods scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border bg-muted/40 p-4 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </span>
                    <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded font-bold uppercase">
                      Leave
                    </span>
                  </div>
                  <p className="text-muted-foreground">{l.reason || "Scheduled absence"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
