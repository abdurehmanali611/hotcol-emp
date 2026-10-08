"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Wallet } from "lucide-react";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import {
  EmpEmptyState,
  EmpLoadingBlock,
  EmpSectionLabel,
  EmpStatusPill,
  formatEmpDateRange,
  formatEmpMoney,
} from "@/components/emp/EmpChrome";
import { fetchMyPayslips, type EmpPayslip } from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";
import { cn } from "@/lib/utils";

export default function PayslipsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpPayslip[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const net = rows.reduce((sum, r) => sum + Number(r.netPayETB || 0), 0);
    const gross = rows.reduce(
      (sum, r) => sum + Number(r.grossSalaryETB || 0),
      0,
    );
    const paid = rows.filter((r) => {
      const st = String(r.paymentStatus).toLowerCase();
      return st === "marked_paid" || st === "approved" || st === "paid";
    }).length;
    return { net, gross, paid };
  }, [rows]);

  if (loading) {
    return (
      <EmpAppShell
        title="My payslips"
        subtitle="Payment history"
        mainClassName="max-w-3xl"
      >
        <EmpLoadingBlock label="Loading payslips…" />
      </EmpAppShell>
    );
  }

  return (
    <EmpAppShell
      title="My payslips"
      subtitle="Payment history"
      mainClassName="max-w-3xl"
    >
      <EmpCard
        accent="emerald"
        className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <EmpSectionLabel
          icon={Wallet}
          title="Payslip summary"
          tone="emerald"
          hint="Net pay from generated slips. Contact Finance or HR if a period is missing."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-200/80">
              Slips
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-100">
              {rows.length}
            </p>
          </div>
          <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-teal-200/80">
              Paid
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-teal-100">
              {totals.paid}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 sm:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-200/80">
              Total net
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-cyan-100">
              {formatEmpMoney(totals.net)}
            </p>
          </div>
        </div>
      </EmpCard>

      <EmpCard
        accent="teal"
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:50ms]"
      >
        <EmpSectionLabel
          icon={Banknote}
          title="History"
          tone="teal"
          hint={
            rows.length
              ? "Newest periods first when available"
              : "Generated payslips will list here"
          }
        />

        {rows.length === 0 ? (
          <EmpEmptyState
            title="No payslips yet"
            hint="When Finance or HR generates your payslip, it will appear in this list."
            tone="emerald"
          />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className={cn(
                  "rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-4 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both",
                )}
                style={{ animationDelay: `${60 + i * 30}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold tracking-tight">
                      {r.monthName || r.periodKey || r.payslipNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatEmpDateRange(r.fromYmd, r.toYmd)}
                    </p>
                    {r.payslipNumber ? (
                      <p className="text-xs text-muted-foreground/80">
                        #{r.payslipNumber}
                      </p>
                    ) : null}
                  </div>
                  <EmpStatusPill status={r.paymentStatus || "pending"} />
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-emerald-500/10 pt-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Gross
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatEmpMoney(r.grossSalaryETB)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">
                      Net pay
                    </p>
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-emerald-300">
                      {formatEmpMoney(r.netPayETB)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </EmpCard>
    </EmpAppShell>
  );
}
