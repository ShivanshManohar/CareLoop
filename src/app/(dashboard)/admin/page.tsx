"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  Calendar,
  UserCheck,
  AlertTriangle,
  Bell,
  RefreshCw,
  ArrowRight,
  Stethoscope,
  Users,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleTriggerCron = async () => {
    setIsTriggeringCron(true);
    setCronMessage(null);
    try {
      const res = await fetch("/api/cron/process-jobs", { method: "POST" });
      const data = await res.json();
      setCronMessage(
        `Cron executed: Released ${data.expiredHoldsReleased} expired holds. Processed ${data.notifications?.processed || 0} notifications.`
      );
      fetchMetrics();
    } catch (err: any) {
      setCronMessage("Cron execution failed.");
    } finally {
      setIsTriggeringCron(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="w-4 h-4" /> Clinic Operations & Resilience
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
            Admin Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time monitoring of consultation bookings, cancellation trends, and notification queue health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleTriggerCron}
            disabled={isTriggeringCron}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isTriggeringCron ? "Sweeping Queue..." : "Run Cron Sweep Now"}</span>
          </button>
        </div>
      </div>

      {cronMessage && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{cronMessage}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bookings Today */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Bookings Today</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground">
            {metrics?.bookingsToday ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics?.totalAppointments ?? 0} all-time consultations
          </p>
        </div>

        {/* Cancellation Rate */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Cancellation Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {metrics?.cancellationRate ?? "0.0%"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics?.cancelledAppointments ?? 0} cancelled (incl. leave)
          </p>
        </div>

        {/* No-Show Rate */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>No-Show Rate</span>
            <UserCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
            {metrics?.noShowRate ?? "0.0%"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics?.noShowAppointments ?? 0} unfulfilled visits
          </p>
        </div>

        {/* Failed Notifications */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Failed Notifications</span>
            <Bell className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400">
            {metrics?.failedNotifications ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics?.pendingNotifications ?? 0} queued pending retry
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/doctors"
          className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary/40 transition-all flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
              Manage Doctor Roster & Hours
            </h3>
            <p className="text-xs text-muted-foreground">
              Add new doctor accounts, configure specializations, slot durations, and working hours.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>

        <Link
          href="/admin/notifications"
          className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary/40 transition-all flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
              Notification Queue & Failure Inspection
            </h3>
            <p className="text-xs text-muted-foreground">
              Inspect email and calendar sync attempts, debug error logs, and manually re-dispatch jobs.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>
      </div>
    </div>
  );
}
