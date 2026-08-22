"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Filter,
  Send,
  Zap,
  Mail,
  Calendar,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Job ${jobId} re-dispatched successfully.`);
        fetchJobs();
      }
    } catch (err) {
      console.error("Failed to retry job:", err);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleProcessAll = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/cron/process-jobs", { method: "POST" });
      const data = await res.json();
      setStatusMessage(
        `Processed ${data.notifications?.processed || 0} jobs (${data.notifications?.succeeded || 0} succeeded, ${data.notifications?.failed || 0} failed).`
      );
      fetchJobs();
    } catch (err) {
      console.error("Failed to sweep queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter === "ALL") return true;
    return j.status === statusFilter;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Operations
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Bell className="w-4 h-4" /> Resilient Background Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
            Notification Jobs & Retries
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Every email and Google Calendar synchronization job is tracked with exponential backoff retries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleProcessAll}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Process All Pending Now</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-xs font-bold text-muted-foreground mr-1">Status:</span>
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === "ALL"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setStatusFilter("FAILED")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === "FAILED"
              ? "bg-red-600 text-white"
              : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
          }`}
        >
          Failed ({jobs.filter((j) => j.status === "FAILED").length})
        </button>
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === "PENDING"
              ? "bg-blue-600 text-white"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
          }`}
        >
          Pending ({jobs.filter((j) => j.status === "PENDING").length})
        </button>
        <button
          onClick={() => setStatusFilter("SENT")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === "SENT"
              ? "bg-emerald-600 text-white"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          Sent ({jobs.filter((j) => j.status === "SENT").length})
        </button>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden text-card-foreground">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold border-b tracking-wider">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Created / Next Retry</th>
                <th className="py-3 px-4">Error Diagnostics</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No notification jobs found matching filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        {job.type.includes("EMAIL") ? (
                          <Mail className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span>{job.type.replace("EMAIL_", "").replace("CALENDAR_", "")}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono">{job.recipient}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          job.status === "SENT"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : job.status === "FAILED"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {job.status === "SENT" && <CheckCircle2 className="w-3 h-3" />}
                        {job.status === "FAILED" && <AlertCircle className="w-3 h-3" />}
                        {job.status === "PENDING" && <Clock className="w-3 h-3" />}
                        <span>{job.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div>{formatDateTime(job.createdAt)}</div>
                      {job.nextRetryAt && job.status === "FAILED" && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                          Retry: {formatDateTime(job.nextRetryAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-muted-foreground">
                      {job.lastError ? (
                        <span className="text-red-600 dark:text-red-400 font-mono text-[11px]" title={job.lastError}>
                          {job.lastError}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[11px]">Clean / No errors</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {job.status !== "SENT" && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingJobId === job.id}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
