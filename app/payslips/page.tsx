"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { fetchMyPayslips, type EmpPayslip } from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";

export default function PayslipsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpPayslip[]>([]);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      setRows(await fetchMyPayslips());
    } catch {
      clearEmployeeSession();
      router.replace("/");
    }
  }, [router]);

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
        <h1 className="font-semibold">My payslips</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 p-4 md:p-6">
        {rows.length === 0 ? (
          <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
            No payslips yet.
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-medium">
                {r.monthName || r.periodKey || r.payslipNumber}
              </p>
              <p className="text-muted-foreground">
                {r.fromYmd} → {r.toYmd} · {r.paymentStatus}
              </p>
              <p className="mt-2">
                Net{" "}
                <span className="font-semibold">
                  {Number(r.netPayETB || 0).toLocaleString()} ETB
                </span>
              </p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
