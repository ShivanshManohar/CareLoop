"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "./providers";
import {
  Activity,
  Calendar,
  Clock,
  LogOut,
  Moon,
  Sun,
  User,
  ShieldCheck,
  Stethoscope,
  ChevronDown,
  Bell,
  Sparkles,
  Zap,
} from "lucide-react";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const role = (session?.user as any)?.role;

  const handleQuickLogin = async (email: string, pass: string, targetPath: string) => {
    setIsLoggingIn(true);
    setShowDemoMenu(false);
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
      setIsLoggingIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-primary">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground leading-tight font-extrabold text-lg">Care<span className="text-primary">Loop</span></span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-primary" /> AI Healthcare
              </span>
            </div>
          </Link>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            {role === "PATIENT" && (
              <>
                <Link
                  href="/patient"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/patient" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  My Visits & Rx
                </Link>
                <Link
                  href="/patient/book"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === "/patient/book" ? "bg-primary text-primary-foreground font-semibold" : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Book Appointment
                </Link>
              </>
            )}

            {role === "DOCTOR" && (
              <>
                <Link
                  href="/doctor"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === "/doctor" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" /> Daily Triage Queue
                </Link>
                <Link
                  href="/doctor/schedule"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === "/doctor/schedule" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Clock className="w-4 h-4" /> Hours & Leave
                </Link>
              </>
            )}

            {role === "ADMIN" && (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Ops Dashboard
                </Link>
                <Link
                  href="/admin/doctors"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/admin/doctors" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Doctor Roster
                </Link>
                <Link
                  href="/admin/notifications"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === "/admin/notifications" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" /> Notification Queue
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              title="Switch demo persona instantly"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Switch Persona</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-card p-2 shadow-xl z-50 text-card-foreground">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1">
                  1-Click Demo Login
                </div>
                <button
                  onClick={() => handleQuickLogin("patient.jane@careloop.local", "PatientPass123!", "/patient")}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-foreground">👤 Jane Doe (Patient)</span>
                  <span className="text-[11px] text-muted-foreground">Book slots & view AI visit summaries</span>
                </button>
                <button
                  onClick={() => handleQuickLogin("dr.smith@careloop.local", "DoctorPass123!", "/doctor")}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-foreground">🩺 Dr. Sarah Smith (Cardiology)</span>
                  <span className="text-[11px] text-muted-foreground">Urgency queue & live note streaming</span>
                </button>
                <button
                  onClick={() => handleQuickLogin("dr.patel@careloop.local", "DoctorPass123!", "/doctor")}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-foreground">🩺 Dr. Rajesh Patel (Dermatology)</span>
                  <span className="text-[11px] text-muted-foreground">Schedule management & triage queue</span>
                </button>
                <button
                  onClick={() => handleQuickLogin("admin@careloop.local", "AdminPass123!", "/admin")}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-foreground">👑 Clinic Admin</span>
                  <span className="text-[11px] text-muted-foreground">Ops dashboard & notification retries</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-md flex items-center justify-center border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Status / Login */}
          {status === "authenticated" && session?.user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-foreground">{session.user.name}</span>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  {role}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-9 h-9 rounded-md flex items-center justify-center border hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md text-xs font-semibold border hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
