"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  RefreshCw,
  BellRing,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [loadingPersona, setLoadingPersona] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, pass: string, targetPath: string, key: string) => {
    setLoadingPersona(key);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password: pass,
      });
      if (res?.ok) {
        router.push(targetPath);
        router.refresh();
      }
    } finally {
      setLoadingPersona(null);
    }
  };

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by Google Gemini 2.0 Flash & Atomic Slot Locks</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Intelligent Healthcare Scheduling & <span className="text-primary">Clinical Follow-up</span>
        </h1>

        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          CareLoop pairs structured patient intake with real-time AI triage, atomic 5-minute slot holds to eliminate double-bookings, and live-streamed clinical notes for doctors and patients.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/patient/book"
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Calendar className="w-4 h-4" />
            <span>Book an Appointment</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl border bg-card hover:bg-muted font-semibold transition-all"
          >
            Sign In with Account
          </Link>
        </div>
      </section>

      {/* 1-Click Interactive Persona Sandbox */}
      <section className="rounded-2xl border bg-card/60 backdrop-blur p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Zap className="w-4 h-4" /> Evaluation Sandbox
            </div>
            <h2 className="text-2xl font-bold text-foreground">Test Different Roles in 1-Click</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Jump straight into role-specific workflows with pre-seeded data:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patient Card */}
          <div className="rounded-xl border bg-background p-5 hover:border-primary/50 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                👤
              </div>
              <h3 className="font-bold text-foreground text-sm">Jane Doe</h3>
              <span className="inline-block text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                Patient Role
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Test the 5-min slot hold timer, symptom intake form, and past AI visit summaries.
              </p>
            </div>
            <button
              onClick={() =>
                handleQuickLogin("patient.jane@careloop.local", "PatientPass123!", "/patient", "patient")
              }
              disabled={loadingPersona === "patient"}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {loadingPersona === "patient" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Launch Patient Portal</span>
            </button>
          </div>

          {/* Doctor 1 (Cardiology) */}
          <div className="rounded-xl border bg-background p-5 hover:border-primary/50 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                🩺
              </div>
              <h3 className="font-bold text-foreground text-sm">Dr. Sarah Smith</h3>
              <span className="inline-block text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                Cardiologist
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                View Red/Amber urgency triage queue & stream live AI summaries from clinical notes.
              </p>
            </div>
            <button
              onClick={() =>
                handleQuickLogin("dr.smith@careloop.local", "DoctorPass123!", "/doctor", "doc1")
              }
              disabled={loadingPersona === "doc1"}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {loadingPersona === "doc1" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Launch Dr. Smith</span>
            </button>
          </div>

          {/* Doctor 2 (Dermatology) */}
          <div className="rounded-xl border bg-background p-5 hover:border-primary/50 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                🩺
              </div>
              <h3 className="font-bold text-foreground text-sm">Dr. Rajesh Patel</h3>
              <span className="inline-block text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Dermatologist
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Test doctor leave scheduling, automated appointment cancellation, and rebook links.
              </p>
            </div>
            <button
              onClick={() =>
                handleQuickLogin("dr.patel@careloop.local", "DoctorPass123!", "/doctor", "doc2")
              }
              disabled={loadingPersona === "doc2"}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {loadingPersona === "doc2" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Launch Dr. Patel</span>
            </button>
          </div>

          {/* Admin */}
          <div className="rounded-xl border bg-background p-5 hover:border-primary/50 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                👑
              </div>
              <h3 className="font-bold text-foreground text-sm">Clinic Administrator</h3>
              <span className="inline-block text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                Admin Role
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inspect operational KPIs, manage doctor rosters, and trigger notification queue retries.
              </p>
            </div>
            <button
              onClick={() =>
                handleQuickLogin("admin@careloop.local", "AdminPass123!", "/admin", "admin")
              }
              disabled={loadingPersona === "admin"}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {loadingPersona === "admin" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Launch Admin</span>
            </button>
          </div>
        </div>
      </section>

      {/* Core Technical Highlights Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Engineered for Concurrency & Clinical Accuracy
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Every feature is backed by database constraints and failure resilience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">5-Min Slot Hold Lock</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a patient begins intake, a temporary lock prevents concurrent race conditions. Automatically sweeps expired holds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Urgency Triage Queue</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pre-visit intake is classified into High/Medium/Low urgency with 3 diagnostic questions prepared before the patient enters.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Live Streaming Summaries</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Converts complex clinical notes into plain-language patient summaries token-by-token with automatic fallback on API outage.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Resilient Job Queue</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Notification and calendar sync jobs write to a dedicated DB queue with exponential backoff retries and admin visibility.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
