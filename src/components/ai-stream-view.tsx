"use client";

import React, { useState } from "react";
import { Sparkles, AlertCircle, Copy, Check, RefreshCw } from "lucide-react";

interface AIStreamViewProps {
  content: string;
  isStreaming?: boolean;
  summaryStatus?: "pending" | "completed" | "failed" | string;
  failedReason?: string | null;
  rawNotes?: string;
  onRetry?: () => void;
}

export function AIStreamView({
  content,
  isStreaming = false,
  summaryStatus = "completed",
  failedReason,
  rawNotes,
  onRetry,
}: AIStreamViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || rawNotes || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Failure Mode Banner
  if (summaryStatus === "failed") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  AI Summary Unavailable — Showing Raw Notes
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {failedReason || "The AI processing service is temporarily busy. Your raw clinical notes are preserved."}
                </p>
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry AI
              </button>
            )}
          </div>
        </div>

        {rawNotes && (
          <div className="rounded-xl border bg-card p-5 text-card-foreground">
            <h5 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">
              Raw Doctor Notes
            </h5>
            <p className="text-sm font-mono whitespace-pre-wrap text-foreground bg-muted/50 p-4 rounded-lg border">
              {rawNotes}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-card-foreground">
      {/* Header */}
      <div className="px-5 py-3.5 border-b bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            {isStreaming ? "AI Generating Live Summary..." : "Patient-Friendly AI Summary"}
          </span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary animate-pulse">
              Streaming Tokens
            </span>
          )}
        </div>

        {content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            title="Copy summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>

      {/* Streamed Body */}
      <div className="p-6">
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 animate-pulse" />
            <p>No summary generated yet. Doctor clinical notes will appear here in plain language.</p>
          </div>
        )}
      </div>
    </div>
  );
}
