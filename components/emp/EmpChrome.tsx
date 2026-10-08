"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmpSectionLabel({
  icon: Icon,
  title,
  hint,
  tone = "sky",
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "teal";
}) {
  const toneClass = {
    sky: "bg-sky-500/20 text-sky-300 ring-sky-400/35",
    emerald: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/35",
    amber: "bg-amber-500/20 text-amber-300 ring-amber-400/35",
    rose: "bg-rose-500/20 text-rose-300 ring-rose-400/35",
    teal: "bg-teal-500/20 text-teal-300 ring-teal-400/35",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
          toneClass,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 space-y-0.5 pt-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint ? (
          <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function EmpStatusPill({
  status,
  map,
}: {
  status: string;
  map?: Record<string, string>;
}) {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  const defaults: Record<string, string> = {
    unpaid: "Unpaid",
    marked_paid: "Marked paid",
    approved: "Marked paid",
    awaiting_finance: "Unpaid",
    paid: "Marked paid",
  };
  const label = map?.[s] || defaults[s] || status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize tracking-wide",
        (s === "approved" ||
          s === "paid" ||
          s === "marked_paid" ||
          s === "present" ||
          s === "active") &&
          "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
        (s === "rejected" || s === "absent" || s === "unpaid") &&
          "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
        (s === "pending" ||
          s === "late" ||
          s === "half_day" ||
          s === "on_leave" ||
          s === "awaiting_finance") &&
          "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
        ![
          "approved",
          "paid",
          "marked_paid",
          "present",
          "active",
          "rejected",
          "absent",
          "unpaid",
          "pending",
          "late",
          "half_day",
          "on_leave",
          "awaiting_finance",
        ].includes(s) &&
          "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
      )}
    >
      {label}
    </span>
  );
}

export function EmpEmptyState({
  title,
  hint,
  tone = "sky",
}: {
  title: string;
  hint?: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "teal";
}) {
  const toneClass = {
    sky: "border-sky-500/25 bg-sky-500/5 text-sky-400/50",
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-400/50",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-400/50",
    rose: "border-rose-500/25 bg-rose-500/5 text-rose-400/50",
    teal: "border-teal-500/25 bg-teal-500/5 text-teal-400/50",
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center",
        toneClass,
      )}
    >
      <Inbox className="size-8" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {hint ? (
        <p className="max-w-sm text-xs text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}

export function EmpLoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-cyan-400" />
      {label}
    </div>
  );
}

export function formatEmpDisplayDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "—";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEmpDateRange(fromYmd: string, toYmd: string): string {
  if (!fromYmd && !toYmd) return "—";
  if (fromYmd === toYmd || !toYmd) return formatEmpDisplayDate(fromYmd);
  return `${formatEmpDisplayDate(fromYmd)} → ${formatEmpDisplayDate(toYmd)}`;
}

export function formatEmpMoney(amount: number): string {
  return `${Number(amount || 0).toLocaleString()} ETB`;
}
