"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { employeeLogin } from "@/lib/api/employee";
import { saveEmployeeSession } from "@/lib/employeeSession";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [tenantTin, setTenantTin] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await employeeLogin(tenantTin.trim(), otp);
      saveEmployeeSession(session);
      if (session.employee.mustChangeOtp) {
        router.replace("/change-otp");
      } else {
        router.replace("/home");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_#0b1220_55%,_#05080f_100%)] px-4 py-10 text-slate-50">
      <Toaster richColors position="top-center" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
      >
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">
            HotCol
          </p>
          <h1 className="font-serif text-3xl tracking-tight text-white">
            Employee portal
          </h1>
          <p className="text-sm text-slate-300">
            Sign in with your property TIN and the portal code from HR.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tin" className="text-slate-200">
            Property TIN
          </Label>
          <Input
            id="tin"
            value={tenantTin}
            onChange={(e) => setTenantTin(e.target.value)}
            placeholder="TIN number"
            className="border-white/15 bg-black/30 text-white placeholder:text-slate-500"
            autoComplete="organization"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Portal code</Label>
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(v) => setOtp(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            inputMode="text"
            pattern="[A-Za-z0-9]*"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="border-white/20 bg-black/40 text-lg text-white"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-center text-xs text-slate-400">
            6 characters — letters and digits (e.g. AB1234)
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
          disabled={busy || otp.length < 6 || !tenantTin.trim()}
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
