"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "HC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

const CARD_ACCENTS = {
  default:
    "from-cyan-400/70 via-sky-400/50 to-emerald-400/45",
  sky: "from-sky-400/80 via-cyan-400/50 to-teal-400/40",
  emerald: "from-emerald-400/80 via-teal-400/50 to-cyan-400/40",
  amber: "from-amber-400/80 via-orange-400/45 to-rose-400/35",
  rose: "from-rose-400/70 via-orange-400/40 to-amber-400/35",
  teal: "from-teal-400/80 via-cyan-400/50 to-sky-400/40",
} as const;

export type EmpCardAccent = keyof typeof CARD_ACCENTS;

/** Shared dark-friendly chrome for ESS pages after login. */
export function EmpAppShell({
  title,
  subtitle,
  actions,
  children,
  backHref = "/home",
  showBack = true,
  avatarUrl,
  className,
  mainClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  backHref?: string;
  showBack?: boolean;
  avatarUrl?: string | null;
  className?: string;
  mainClassName?: string;
}) {
  const initials = initialsFromName(title);

  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-background via-[#0c1624] to-[#0a1f1c]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.55_0.14_200_/_0.18),_transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 sticky top-0 shrink-0 border-b border-cyan-500/15 bg-card/75 shadow-sm shadow-cyan-950/20 backdrop-blur-md ring-1 ring-cyan-400/10">
        <div
          className="h-1 w-full bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400"
          aria-hidden
        />
        <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:gap-4 md:px-6">
          {showBack ? (
            <Link
              href={backHref}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 transition hover:bg-cyan-500/20 hover:text-cyan-50"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : (
            <div
              className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-cyan-400/40 via-sky-500/30 to-emerald-400/35 text-sm font-bold tracking-tight text-foreground shadow-md shadow-cyan-900/30 ring-1 ring-cyan-300/25"
              aria-hidden
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN URLs
                <img
                  src={avatarUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
                {title}
              </h1>
              {subtitle ? (
                <>
                  <span
                    className="hidden text-cyan-400/40 sm:inline"
                    aria-hidden
                  >
                    ·
                  </span>
                  <p className="truncate text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                </>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-linear-to-br from-cyan-400 to-emerald-400 text-[8px] font-bold text-slate-950 ring-1 ring-cyan-300/40">
                HC
              </span>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300/90">
                HotCol · ESS
              </p>
            </div>
          </div>

          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 pb-10 md:p-8",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function EmpCard({
  children,
  className,
  accent = "default",
}: {
  children: ReactNode;
  className?: string;
  accent?: EmpCardAccent;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-card/90 p-5 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-400/10 sm:p-6",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-linear-to-r",
          CARD_ACCENTS[accent],
        )}
      />
      {children}
    </div>
  );
}
