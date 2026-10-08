"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import {
  EmpEmptyState,
  EmpLoadingBlock,
  EmpSectionLabel,
  formatEmpDateRange,
} from "@/components/emp/EmpChrome";
import {
  decideLeaveAsAssignee,
  fetchEmployeeMe,
  fetchPendingApprovalsForMe,
  type EmpLeaveRequest,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
  updateStoredEmployee,
} from "@/lib/employeeSession";

export default function ApprovalsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const me = await fetchEmployeeMe();
      updateStoredEmployee(me);
      if (me.orgPosition !== "leader") {
        router.replace("/home");
        return;
      }
      setRows(await fetchPendingApprovalsForMe());
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

  const decide = async (id: number, approve: boolean) => {
    setBusyId(id);
    try {
      await decideLeaveAsAssignee(id, approve);
      toast.success(approve ? "Leave approved" : "Leave rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <EmpAppShell
        title="My approvals"
        subtitle="Leave waiting on you as Leader"
        mainClassName="max-w-3xl"
      >
        <EmpLoadingBlock label="Loading approvals…" />
      </EmpAppShell>
    );
  }

  return (
    <EmpAppShell
      title="My approvals"
      subtitle="Leave waiting on you as Leader"
      mainClassName="max-w-3xl"
    >
      <EmpCard
        accent="rose"
        className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <EmpSectionLabel
          icon={ClipboardCheck}
          title="Pending leave"
          tone="rose"
          hint={
            rows.length
              ? `${rows.length} request${rows.length === 1 ? "" : "s"} need your decision`
              : "When teammates submit leave that routes to you, they appear here."
          }
        />

        {rows.length === 0 ? (
          <EmpEmptyState
            title="You're all caught up"
            hint="No leave is waiting on you as Leader right now."
            tone="rose"
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r, i) => {
              const busy = busyId === r.id;
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 transition hover:border-rose-400/35 hover:bg-rose-500/10 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
                  style={{ animationDelay: `${40 + i * 35}ms` }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-semibold tracking-tight">
                        {r.employeeName || "Teammate"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-rose-100/90">{r.leaveType}</span>
                        {" · "}
                        {formatEmpDateRange(r.fromYmd, r.toYmd)}
                        {r.days
                          ? ` · ${r.days} day${r.days === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      <p className="text-xs text-amber-200/90">
                        Approval step {r.currentStepIndex + 1}
                      </p>
                      {r.reason ? (
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {r.reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        className="h-10 min-w-24 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 font-semibold text-slate-950 hover:from-emerald-400 hover:to-teal-400"
                        disabled={busy}
                        onClick={() => void decide(r.id, true)}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Check className="size-4" />
                            Approve
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 min-w-24 rounded-xl border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                        disabled={busy}
                        onClick={() => void decide(r.id, false)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <X className="size-4" />
                          Reject
                        </span>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </EmpCard>
    </EmpAppShell>
  );
}
