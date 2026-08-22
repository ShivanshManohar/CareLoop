"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface SlotCountdownProps {
  expiresAt: string | Date; // ISO string or Date
  onExpire?: () => void;
  onExtend?: () => void;
}

export function SlotCountdown({ expiresAt, onExpire, onExtend }: SlotCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const target = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const totalDuration = 300; // 5 minutes (300 seconds)
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / totalDuration) * 100));

  const isUrgent = secondsRemaining < 60;
  const isWarning = secondsRemaining < 120 && !isUrgent;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        isExpired
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : isUrgent
          ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
          : isWarning
          ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
          : "bg-primary/5 border-primary/20 text-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              isExpired
                ? "bg-destructive text-destructive-foreground"
                : isUrgent
                ? "bg-red-500 text-white animate-pulse"
                : isWarning
                ? "bg-amber-500 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {isExpired ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isExpired ? "Slot Hold Expired" : "Slot Reserved For You"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isExpired
                ? "Your 5-minute reservation ended. Other patients can now book this slot."
                : "This slot is temporarily locked from other patients while you complete intake."}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xl font-mono font-black tracking-tight">{formattedTime}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining</div>
        </div>
      </div>

      {/* Progress Bar */}
      {!isExpired && (
        <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Action buttons on expiration / near expiration */}
      {isExpired && onExtend && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onExtend}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Re-lock Slot (5 Mins)
          </button>
        </div>
      )}
    </div>
  );
}
