import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

interface UrgencyBadgeProps {
  level?: "Low" | "Medium" | "High" | string | null;
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
}

export function UrgencyBadge({ level = "Low", size = "md", showPulse = true }: UrgencyBadgeProps) {
  const normalizedLevel = (level || "Low").toUpperCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2 font-bold",
  }[size];

  if (normalizedLevel === "HIGH") {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 ${sizeClasses}`}
      >
        {showPulse && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5" />}
        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <span>High Urgency</span>
      </span>
    );
  }

  if (normalizedLevel === "MEDIUM") {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 ${sizeClasses}`}
      >
        {showPulse && <span className="w-2 h-2 rounded-full bg-amber-500 mr-0.5" />}
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Medium Urgency</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span>Routine / Low Urgency</span>
    </span>
  );
}
