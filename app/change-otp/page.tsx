"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
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

export default function ChangeOtpPage() {
  const router = useRouter();
  const [currentOtp, setCurrentOtp] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    void fetchEmployeeMe()
      .then((me) => {
        updateStoredEmployee(me);
        if (!me.mustChangeOtp) router.replace("/home");
      })
      .catch(() => {
        clearEmployeeSession();
        router.replace("/");
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await changeOwnOtp(currentOtp, newOtp);
      const me = await fetchEmployeeMe();
      updateStoredEmployee(me);
      toast.success("Portal code updated");
      router.replace("/home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_#0b1220_55%,_#05080f_100%)] px-4 text-slate-50">
      <Toaster richColors position="top-center" />
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md"
      >
        <div className="space-y-1 text-center">
          <h1 className="font-serif text-2xl text-white">Set a new portal code</h1>
          <p className="text-sm text-slate-300">
            Required on first login. Use 6 letters and digits.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-200">Current code</Label>
          <InputOTP
            maxLength={6}
            value={currentOtp}
            onChange={(v) =>
              setCurrentOtp(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="border-white/20 bg-black/40 text-white" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-200">New code</Label>
          <InputOTP
            maxLength={6}
            value={newOtp}
            onChange={(v) =>
              setNewOtp(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="border-white/20 bg-black/40 text-white" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          type="submit"
          className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
          disabled={busy || currentOtp.length < 6 || newOtp.length < 6}
        >
          {busy ? "Saving…" : "Save new code"}
        </Button>
      </form>
    </div>
  );
}
