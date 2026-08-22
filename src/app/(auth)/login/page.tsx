"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Activity, Lock, Mail, AlertCircle, ArrowRight, Zap, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error || "Invalid credentials");
      } else {
        // Redirect based on session role if possible or default to home
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto my-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign In to CareLoop</h1>
        <p className="text-xs text-muted-foreground">
          Access your clinical dashboard, scheduled visits, and AI follow-up notes.
        </p>
      </div>

      {/* Demo Credentials Helper Box */}
      <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
          <span>Quick Autofill Test Accounts:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFillDemo("patient.jane@careloop.local", "PatientPass123!")}
            className="text-left px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-medium transition-colors"
          >
            <div className="font-bold text-foreground">👤 Patient</div>
            <div className="text-muted-foreground text-[10px]">Jane Doe</div>
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo("dr.smith@careloop.local", "DoctorPass123!")}
            className="text-left px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-medium transition-colors"
          >
            <div className="font-bold text-foreground">🩺 Doctor (Cardio)</div>
            <div className="text-muted-foreground text-[10px]">Dr. Sarah Smith</div>
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo("dr.patel@careloop.local", "DoctorPass123!")}
            className="text-left px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-medium transition-colors"
          >
            <div className="font-bold text-foreground">🩺 Doctor (Derma)</div>
            <div className="text-muted-foreground text-[10px]">Dr. Rajesh Patel</div>
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo("admin@careloop.local", "AdminPass123!")}
            className="text-left px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-medium transition-colors"
          >
            <div className="font-bold text-foreground">👑 Admin</div>
            <div className="text-muted-foreground text-[10px]">Clinic Ops</div>
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. patient.jane@careloop.local"
              className="w-full px-3.5 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-primary/20"
          >
            <span>{isLoading ? "Signing in..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Register as Patient
          </Link>
        </div>
      </div>
    </div>
  );
}
