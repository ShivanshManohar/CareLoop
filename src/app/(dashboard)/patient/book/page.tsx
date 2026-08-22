"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Filter,
  Activity,
  Heart,
  Smile,
  Zap,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { SlotCountdown } from "@/components/slot-countdown";

export default function BookAppointmentPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Active Hold State
  const [heldSlot, setHeldSlot] = useState<{
    start: string;
    end: string;
    timeLabel: string;
    expiresAt: string;
  } | null>(null);

  // Structured Intake Form State
  const [duration, setDuration] = useState("3 days");
  const [severity, setSeverity] = useState<number>(5);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const symptomTagOptions = [
    "Fever",
    "Chest Tightness",
    "Shortness of Breath",
    "Rash / Skin Lesion",
    "Headache",
    "Joint Pain",
    "Fatigue",
    "Cough",
    "Dizziness",
    "Palpitations",
  ];

  // Fetch doctors
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await fetch("/api/admin/doctors");
        const data = await res.json();
        if (data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          setSelectedDoctorId(data.doctors[0].id);
        }
      } catch (err) {
        console.error("Failed to load doctors:", err);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch available slots when doctor or date changes
  const fetchSlots = async () => {
    if (!selectedDoctorId || !selectedDate) return;
    setIsLoadingSlots(true);
    try {
      const res = await fetch(`/api/slots/available?doctorId=${selectedDoctorId}&date=${selectedDate}`);
      const data = await res.json();
      if (data.slots) {
        setSlots(data.slots);
      }
    } catch (err) {
      console.error("Failed to fetch slots:", err);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Handle acquiring a 5-min slot hold
  const handleSelectSlot = async (slot: any) => {
    setBookingError(null);
    try {
      const res = await fetch("/api/slots/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          slotStart: slot.start,
          slotEnd: slot.end,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || "Failed to hold slot");
        fetchSlots(); // refresh to show updated availability
        return;
      }

      setHeldSlot({
        start: slot.start,
        end: slot.end,
        timeLabel: slot.timeLabel,
        expiresAt: data.expiresAt,
      });
    } catch (err: any) {
      setBookingError(err?.message || "Error holding slot");
    }
  };

  // Handle releasing hold
  const handleReleaseHold = async () => {
    if (!heldSlot) return;
    try {
      await fetch(`/api/slots/hold?doctorId=${selectedDoctorId}&slotStart=${heldSlot.start}`, {
        method: "DELETE",
      });
    } finally {
      setHeldSlot(null);
      fetchSlots();
    }
  };

  // Tag toggle helper
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heldSlot) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          slotStart: heldSlot.start,
          slotEnd: heldSlot.end,
          symptomsDuration: duration,
          symptomsSeverity: severity,
          symptomsNotes: notes,
          symptomsTags: tags.join(", "),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || "Failed to complete booking");
        if (data.code === "SLOT_TAKEN") {
          setHeldSlot(null);
          fetchSlots();
        }
        return;
      }

      router.push("/patient");
      router.refresh();
    } catch (err: any) {
      setBookingError(err?.message || "Booking submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const specialties = Array.from(new Set(doctors.map((d) => d.specialization)));
  const filteredDoctors =
    selectedSpecialty === "ALL"
      ? doctors
      : doctors.filter((d) => d.specialization === selectedSpecialty);

  // Generate 7-day date options
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d"),
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <span className="text-xs uppercase font-bold text-primary tracking-wider">Appointment Booking</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
          Find a Specialist & Reserve Your Slot
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select your doctor, date, and time. Slots are temporarily locked for 5 minutes during intake to guarantee zero double-bookings.
        </p>
      </div>

      {bookingError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Booking Notice</h4>
            <p className="text-xs mt-0.5">{bookingError}</p>
          </div>
        </div>
      )}

      {/* Step 1: Doctor Selection */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>1. Choose Specialist</span>
          </h2>

          {/* Specialty Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSpecialty("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSpecialty === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Specialties
            </button>
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSpecialty === spec
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doc) => {
            const isSelected = doc.id === selectedDoctorId;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setHeldSlot(null);
                }}
                className={`cursor-pointer rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                    : "bg-card hover:border-primary/40"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {doc.specialization}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-foreground">{doc.user?.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {doc.bio || "Specialist physician dedicated to comprehensive patient care."}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>{doc.slotDuration} min consultations</span>
                  <span>{doc.startHour}:00 - {doc.endHour}:00</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Date & Available Slots Picker */}
      <div className="space-y-4 pt-4 border-t">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>2. Select Consultation Date & Time Slot</span>
        </h2>

        {/* Date Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dateOptions.map((d) => {
            const isSelected = selectedDate === d.value;
            return (
              <button
                key={d.value}
                onClick={() => {
                  setSelectedDate(d.value);
                  setHeldSlot(null);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 border-primary"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="text-xs font-semibold">{d.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{d.value}</div>
              </button>
            );
          })}
        </div>

        {/* Slot Grid */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Available Slots for {selectedDoctor?.user?.name} ({slots.filter((s) => s.isAvailable).length})</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              Click a slot to hold it for 5 minutes
            </span>
          </div>

          {isLoadingSlots ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading available schedule...
            </div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl p-4">
              No available slots on this day. The doctor may be off-duty or on leave. Please select another date.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {slots.map((slot) => {
                const isHeldByMe = heldSlot?.start === slot.start;
                const isAvailable = slot.isAvailable && !slot.isHeld;

                return (
                  <button
                    key={slot.start}
                    disabled={!isAvailable && !isHeldByMe}
                    onClick={() => handleSelectSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      isHeldByMe
                        ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary"
                        : isAvailable
                        ? "bg-background hover:bg-primary/10 hover:border-primary text-foreground"
                        : slot.isHeld
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-not-allowed opacity-75"
                        : "bg-muted/50 text-muted-foreground border-transparent cursor-not-allowed opacity-40 line-through"
                    }`}
                  >
                    <span>{slot.timeLabel}</span>
                    {slot.isHeld && !isHeldByMe && (
                      <span className="text-[9px] uppercase font-extrabold flex items-center gap-0.5 text-amber-600">
                        <Lock className="w-2.5 h-2.5" /> Held
                      </span>
                    )}
                    {isHeldByMe && (
                      <span className="text-[9px] uppercase font-extrabold text-primary-foreground flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Slot Hold Countdown & Structured Symptom Intake Form */}
      {heldSlot && (
        <div className="space-y-6 pt-4 border-t animate-in fade-in duration-300">
          {/* Active 5-minute Hold Banner */}
          <SlotCountdown
            expiresAt={heldSlot.expiresAt}
            onExpire={() => {
              setBookingError("Your 5-minute hold has expired. Please select the slot again.");
              setHeldSlot(null);
              fetchSlots();
            }}
            onExtend={() => handleSelectSlot(heldSlot)}
          />

          {/* Intake Form */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-4 h-4" /> AI-Assisted Clinical Intake
              </div>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                3. Describe Your Symptoms for Dr. {selectedDoctor?.user?.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our Gemini triage assistant uses these details to prepare a pre-consultation brief and urgency score for your doctor.
              </p>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-5">
              {/* Duration and Severity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    How long have you noticed these symptoms?
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Few hours">Less than 24 hours</option>
                    <option value="2-3 days">2 - 3 days</option>
                    <option value="1 week">About 1 week</option>
                    <option value="2-4 weeks">2 - 4 weeks (Subacute)</option>
                    <option value="Over 1 month">Over 1 month (Chronic)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Discomfort / Pain Scale (1–10)
                    </label>
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                      {severity} / 10 {severity >= 8 ? "🔥 High" : severity >= 5 ? "⚠️ Moderate" : "🌱 Mild"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>1 (Mild)</span>
                    <span>5 (Moderate)</span>
                    <span>10 (Severe)</span>
                  </div>
                </div>
              </div>

              {/* Symptom Tag Pills */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Select Associated Symptoms / Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {symptomTagOptions.map((tag) => {
                    const isSelected = tags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Symptom Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Additional Details & Main Concerns (Free text)
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe where the pain/discomfort is located, what triggers it, any medications taken..."
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleReleaseHold}
                  className="px-4 py-2.5 rounded-xl border hover:bg-muted text-xs font-semibold transition-colors"
                >
                  Cancel Hold
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
                >
                  <span>{isSubmitting ? "Confirming & Analyzing..." : "Confirm Booking & Sync Calendar"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
