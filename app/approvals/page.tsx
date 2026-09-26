"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  decideLeaveAsAssignee,
  fetchPendingApprovalsForMe,
  type EmpLeaveRequest,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";

export default function ApprovalsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpLeaveRequest[]>([]);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      setRows(await fetchPendingApprovalsForMe());
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
        <h1 className="font-semibold">My approvals</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 p-4 md:p-6">
        {rows.length === 0 ? (
          <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
            No pending items for you as a Leader.
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{r.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  {r.leaveType} · {r.fromYmd} → {r.toYmd}
                </p>
                {r.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await decideLeaveAsAssignee(r.id, true);
                      toast.success("Approved");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await decideLeaveAsAssignee(r.id, false);
                      toast.message("Rejected");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
