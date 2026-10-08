"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { changeOwnOtp, fetchEmployeeMe } from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
  updateStoredEmployee,
} from "@/lib/employeeSession";

function OtpRow({
  label,
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="flex justify-center">{label}</Label>
      <div className="flex justify-center overflow-x-auto px-1">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(v) => onChange(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          autoFocus={autoFocus}
          disabled={disabled}
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
  );
}

export default function ChangeOtpPage() {
  const router = useRouter();
  const [currentOtp, setCurrentOtp] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    void fetchEmployeeMe()
      .then((me) => {
        updateStoredEmployee(me);
        if (!me.mustChangeOtp) {
          router.replace("/home");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        clearEmployeeSession();
        router.replace("/");
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentOtp.length < 6 || newOtp.length < 6 || busy) return;
    setBusy(true);
    try {
      await changeOwnOtp(currentOtp, newOtp);
      const me = await fetchEmployeeMe();
      updateStoredEmployee(me);
      toast.success("Portal code updated");
      router.replace("/home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change code");
      setCurrentOtp("");
      setNewOtp("");
    } finally {
      setBusy(false);
    }
  };

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

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-300/40">
            <span className="text-sm font-bold tracking-tight">HC</span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-300 md:text-xs">
            HotCol Employee
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Set a new portal code
          </h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Required on first login. Enter the code from HR, then choose a new
            6-character code you will remember.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="relative space-y-6 overflow-hidden rounded-2xl border border-cyan-500/25 bg-card/90 p-5 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/15 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both sm:p-6"
          style={{ animationDelay: "60ms" }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400" />

          <OtpRow
            label="Current code"
            value={currentOtp}
            onChange={setCurrentOtp}
            autoFocus
            disabled={busy}
          />
          <OtpRow
            label="New code"
            value={newOtp}
            onChange={setNewOtp}
            disabled={busy}
          />

          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 font-semibold text-slate-950 hover:from-cyan-400 hover:to-teal-400"
            disabled={busy || currentOtp.length < 6 || newOtp.length < 6}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save new code"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Letters and digits only (e.g. AB1234). Keep your new code private.
        </p>
      </div>
    </div>
  );
}
