"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  PlusCircle,
  Clock,
  User,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("DoctorPass123!");
  const [specialization, setSpecialization] = useState("General Practice");
  const [bio, setBio] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/doctors");
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          specialization,
          bio,
          slotDuration,
          startHour,
          endHour,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create doctor");
      }

      setSuccessMsg(`Doctor profile for ${name} created successfully!`);
      setShowAddModal(false);
      setName("");
      setEmail("");
      setBio("");
      fetchDoctors();
    } catch (err: any) {
      setError(err?.message || "Failed to create doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Doctor Roster & Availability
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage physician credentials, specializations, consultation slot durations, and rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDoctors}
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh doctors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Doctor</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border bg-card p-6 shadow-2xl max-w-lg w-full space-y-4 text-card-foreground animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <span>Create Doctor Profile</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Doctor Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Morgan"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dr.morgan@careloop.local"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Practice">General Practice</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Slot (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Hour (24h)</label>
                  <input
                    type="number"
                    min="6"
                    max="22"
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">End Hour (24h)</label>
                  <input
                    type="number"
                    min="7"
                    max="23"
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Bio / Qualifications</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Doctor's clinical background and subspecialties..."
                  className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90"
                >
                  {isSubmitting ? "Creating..." : "Save Doctor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <div
            key={doc.id}
            className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {doc.specialization}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {doc.slotDuration} min slots
                </span>
              </div>

              <div>
                <h3 className="font-bold text-lg text-foreground">{doc.user?.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {doc.user?.email}
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 bg-muted/30 p-3 rounded-xl border">
                {doc.bio || "Board certified physician."}
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Working Hours:</span>
                <span className="font-semibold text-foreground">
                  {doc.startHour}:00 - {doc.endHour}:00 (Mon-Fri)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Leaves:</span>
                <span className="font-semibold text-foreground">
                  {doc.leaves?.length || 0} scheduled
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Consultations:</span>
                <span className="font-semibold text-foreground">
                  {doc._count?.appointments ?? 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
