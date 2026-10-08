"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { employeeLogin } from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
  saveEmployeeSession,
} from "@/lib/employeeSession";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const submittedFor = useRef<string | null>(null);

  useEffect(() => {
    if (readEmployeeToken()) {
      router.replace("/home");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration auth gate
    setChecking(false);
  }, [router]);

  useEffect(() => {
    if (checking || submitting || otp.length !== 6) return;
    if (submittedFor.current === otp) return;
    submittedFor.current = otp;

    async function login() {
      setSubmitting(true);
      try {
        const session = await employeeLogin(otp);
        saveEmployeeSession(session);
        toast.success(
          session.employee.mustChangeOtp
            ? "Signed in — set a new portal code"
            : `Welcome, ${session.employee.fullName.split(" ")[0] || "there"}`,
        );
        router.replace(
          session.employee.mustChangeOtp ? "/change-otp" : "/home",
        );
      } catch (err) {
        clearEmployeeSession();
        submittedFor.current = null;
        setOtp("");
        toast.error(err instanceof Error ? err.message : "Could not sign in");
      } finally {
        setSubmitting(false);
      }
    }

    void login();
  }, [otp, checking, submitting, router]);

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1220]">
        <Loader2 className="size-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0a1220]">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#0a1220] via-[#0c1a28] to-[#0a221c]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-300/40">
            <span className="text-sm font-bold tracking-tight">HC</span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300 md:text-xs">
            HotCol Employee
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Enter your portal code
          </h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Use the 6-character code from HR. That is all you need — letters and
            digits, unique to you.
          </p>
        </div>

        <div
          className="relative space-y-5 overflow-hidden rounded-2xl border border-cyan-500/25 bg-card/90 p-5 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/15 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both sm:p-6"
          style={{ animationDelay: "60ms" }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400" />

          <div className="space-y-3">
            <Label className="flex justify-center">Portal code</Label>
            <div className="flex justify-center overflow-x-auto px-1">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(v) =>
                  setOtp(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                autoFocus
                disabled={submitting}
                inputMode="text"
                pattern="[A-Za-z0-9]*"
                containerClassName="gap-1.5 sm:gap-2"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPGroup key={i}>
                    <InputOTPSlot
                      index={i}
                      className="size-9 rounded-lg border border-cyan-500/25 bg-cyan-500/5 text-base uppercase sm:size-10"
                    />
                  </InputOTPGroup>
                ))}
              </InputOTP>
            </div>
          </div>

          {submitting ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-cyan-400" />
              Signing in…
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ask HR if you need a new code. After first login you may be asked to
          change it.
        </p>
      </div>
    </div>
  );
}
