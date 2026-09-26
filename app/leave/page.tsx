"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOwnLeaveRequest,
  fetchMyLeaveRequests,
  fetchMyLeaveTypes,
  type EmpLeaveRequest,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";

export default function LeavePage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpLeaveRequest[]>([]);
  const [types, setTypes] = useState<{ code: string; label: string }[]>([]);
  const [leaveType, setLeaveType] = useState("");
  const [fromYmd, setFromYmd] = useState("");
  const [toYmd, setToYmd] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const [list, t] = await Promise.all([
        fetchMyLeaveRequests(),
        fetchMyLeaveTypes(),
      ]);
      setRows(list);
      setTypes(t);
      if (!leaveType && t[0]) setLeaveType(t[0].code);
    } catch {
      clearEmployeeSession();
      router.replace("/");
    }
  }, [leaveType, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-svh bg-[#eef2f6] text-slate-900">
      <Toaster richColors />
      <header className="flex h-14 items-center gap-3 border-b bg-white/90 px-4">
        <Link href="/home" className="text-sm text-sky-700">
          ← Home
        </Link>
        <h1 className="font-semibold">My leave</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        <form
          className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await createOwnLeaveRequest({
                leaveType,
                fromYmd,
                toYmd,
                days: Number(days) || 1,
                reason,
              });
              toast.success("Leave submitted");
              setReason("");
              await load();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm font-medium">Request leave</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded-md border px-2"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Days</Label>
              <Input value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>From</Label>
              <Input
                type="date"
                value={fromYmd}
                onChange={(e) => setFromYmd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input
                type="date"
                value={toYmd}
                onChange={(e) => setToYmd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || !types.length}>
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </form>

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border bg-white p-3 text-sm">
              <p className="font-medium">
                {r.leaveType} · {r.fromYmd} → {r.toYmd}
              </p>
              <p className="text-muted-foreground">
                {r.status}
                {r.status === "pending"
                  ? ` · step ${r.currentStepIndex + 1}`
                  : ""}
                {r.days ? ` · ${r.days} day(s)` : ""}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
