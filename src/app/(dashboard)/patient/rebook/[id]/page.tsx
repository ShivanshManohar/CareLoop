"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { formatDateTime } from "@/lib/utils";

export default function RebookPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const appointmentId = params?.id as string;

  const [appointment, setAppointment] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointment details
  useEffect(() => {
    async function loadAppointment() {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`);
        const data = await res.json();
        if (data.appointment) {
          setAppointment(data.appointment);
        }
      } catch (err) {
        console.error("Failed to load appointment:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (appointmentId) loadAppointment();
  }, [appointmentId]);

  // Fetch available slots for the doctor
  useEffect(() => {
    async function fetchSlots() {
      if (!appointment?.doctorId || !selectedDate) return;
      try {
        const res = await fetch(`/api/slots/available?doctorId=${appointment.doctorId}&date=${selectedDate}`);
        const data = await res.json();
        if (data.slots) {
          setSlots(data.slots);
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      }
    }
    fetchSlots();
  }, [appointment, selectedDate]);

  const handleRebook = async () => {
    if (!selectedSlot || !appointment) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: appointment.doctorId,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          symptomsDuration: appointment.symptomsDuration,
          symptomsSeverity: appointment.symptomsSeverity,
          symptomsNotes: appointment.symptomsNotes,
          symptomsTags: appointment.symptomsTags,
          rebookedFromId: appointment.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rebook slot");
      }

      router.push("/patient");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Rebooking failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d"),
    };
  });

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Appointment not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Cancellation Notice Banner */}
      <div className="rounded-2xl border-2 border-red-500/30 bg-red-500/10 p-6 text-red-950 dark:text-red-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" /> 1-Click Priority Rebooking
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Reschedule Consultation with Dr. {appointment.doctor?.user?.name}
        </h1>
        <p className="text-xs text-muted-foreground">
          Your previous appointment on <strong>{formatDateTime(appointment.slotStart)}</strong> was cancelled due to doctor leave. Your intake notes and symptom description are preserved below.
        </p>
      </div>

      {/* Preserved Intake Symptoms */}
      <div className="rounded-2xl border bg-card p-5 space-y-2 text-card-foreground">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Preserved Symptom Intake Notes
        </h3>
        <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border">
          {appointment.symptomsNotes || "No specific symptom notes."}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span><strong>Duration:</strong> {appointment.symptomsDuration || "N/A"}</span>
          <span><strong>Severity:</strong> {appointment.symptomsSeverity || "N/A"}/10</span>
          <span><strong>Tags:</strong> {appointment.symptomsTags || "None"}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Slot Selection */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Select New Date & Slot</span>
        </h2>

        {/* Date options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dateOptions.map((d) => {
            const isSelected = selectedDate === d.value;
            return (
              <button
                key={d.value}
                onClick={() => {
                  setSelectedDate(d.value);
                  setSelectedSlot(null);
                }}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold border-primary shadow-sm"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="font-semibold">{d.label}</div>
              </button>
            );
          })}
        </div>

        {/* Available slots */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Available Slots ({slots.filter((s) => s.isAvailable).length})
          </h3>

          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No available slots on this date. Try another day.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary"
                        : slot.isAvailable
                        ? "bg-background hover:bg-muted text-foreground"
                        : "bg-muted text-muted-foreground opacity-40 cursor-not-allowed line-through"
                    }`}
                  >
                    {slot.timeLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 1-Click Rebook Action */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleRebook}
            disabled={!selectedSlot || isSubmitting}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Rebooking..." : "Confirm 1-Click Rebook"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
