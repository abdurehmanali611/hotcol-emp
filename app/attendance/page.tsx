/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock3,
} from "lucide-react";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import {
  EmpEmptyState,
  EmpLoadingBlock,
  EmpSectionLabel,
  EmpStatusPill,
  formatEmpDisplayDate,
} from "@/components/emp/EmpChrome";
import { cn } from "@/lib/utils";
import {
  fetchMyAttendance,
  fetchMyIncidents,
  fetchMyShifts,
  type EmpAttendance,
  type EmpIncident,
  type EmpShift,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function payImpactLabel(inc: EmpIncident): string {
  if (inc.percentOfSalary > 0) {
    return `${inc.salaryDeduct ? "Deduction" : "Increase"} ${inc.percentOfSalary}% of salary`;
  }
  if (inc.amountETB > 0) {
    return `${inc.salaryDeduct ? "Deduction" : "Increase"} ${Number(inc.amountETB).toLocaleString()} ETB`;
  }
  return "No direct pay amount";
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      className={cn(
        "min-w-30 flex-1 rounded-xl border px-3 py-3",
        tone,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<EmpAttendance[]>([]);
  const [incidents, setIncidents] = useState<EmpIncident[]>([]);
  const [shifts, setShifts] = useState<EmpShift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const [a, i, s] = await Promise.all([
        fetchMyAttendance(),
        fetchMyIncidents(),
        fetchMyShifts(),
      ]);
      setAttendance(a);
      setIncidents(i);
      setShifts(s);
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

  const absenceCount = useMemo(
    () =>
      attendance.filter((r) => String(r.status).toLowerCase() === "absent")
        .length,
    [attendance],
  );

  const lateCount = useMemo(
    () =>
      attendance.filter((r) => {
        const s = String(r.status).toLowerCase();
        return s === "late" || s === "half_day";
      }).length,
    [attendance],
  );

  if (loading) {
    return (
      <EmpAppShell
        title="Time & attendance"
        subtitle="Absences, incidents, and shifts"
        mainClassName="max-w-4xl"
      >
        <EmpLoadingBlock label="Loading attendance…" />
      </EmpAppShell>
    );
  }

  return (
    <EmpAppShell
      title="Time & attendance"
      subtitle="Absences, incidents, and shifts"
      mainClassName="max-w-4xl"
    >
      <EmpCard
        accent="amber"
        className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <EmpSectionLabel
          icon={ClipboardList}
          title="Overview"
          tone="amber"
          hint="Days and events that can affect your payslip. HR records these — contact them if something looks wrong."
        />
        <div className="flex flex-wrap gap-3">
          <StatChip
            label="Attendance"
            value={attendance.length}
            tone="border-sky-500/30 bg-sky-500/10 text-sky-100"
          />
          <StatChip
            label="Absent"
            value={absenceCount}
            tone={
              absenceCount
                ? "border-rose-500/35 bg-rose-500/15 text-rose-100"
                : "border-border/50 bg-muted/30 text-muted-foreground"
            }
          />
          <StatChip
            label="Late / half"
            value={lateCount}
            tone="border-amber-500/30 bg-amber-500/10 text-amber-100"
          />
          <StatChip
            label="Incidents"
            value={incidents.length}
            tone="border-rose-500/30 bg-rose-500/10 text-rose-100"
          />
          <StatChip
            label="Shifts"
            value={shifts.length}
            tone="border-teal-500/30 bg-teal-500/10 text-teal-100"
          />
        </div>
      </EmpCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <EmpCard
          accent="sky"
          className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:40ms]"
        >
          <EmpSectionLabel
            icon={Clock3}
            title="Attendance"
            tone="sky"
            hint={`${attendance.length} day${attendance.length === 1 ? "" : "s"} on record`}
          />
          {attendance.length === 0 ? (
            <EmpEmptyState
              title="No attendance rows yet"
              hint="Clock-ins and absences will show here once HR records them."
              tone="sky"
            />
          ) : (
            <ul className="space-y-2">
              {attendance.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-4 py-3.5 transition hover:border-sky-400/30 hover:bg-sky-500/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium tracking-tight">
                        {formatEmpDisplayDate(row.workDate)}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5 shrink-0 text-sky-300/80" />
                        In {formatTime(row.clockInAt)} · Out{" "}
                        {formatTime(row.clockOutAt)}
                      </p>
                      {row.notes ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground/90">
                          {row.notes}
                        </p>
                      ) : null}
                    </div>
                    <EmpStatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </EmpCard>

        <EmpCard
          accent="rose"
          className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:70ms]"
        >
          <EmpSectionLabel
            icon={AlertTriangle}
            title="Incidents"
            tone="rose"
            hint="Payroll-linked notes recorded by HR"
          />
          {incidents.length === 0 ? (
            <EmpEmptyState
              title="No incidents on file"
              hint="Deductions or bonuses from incidents will appear here."
              tone="rose"
            />
          ) : (
            <ul className="space-y-2">
              {incidents.map((inc) => (
                <li
                  key={inc.id}
                  className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3.5 transition hover:border-rose-400/30 hover:bg-rose-500/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium tracking-tight">{inc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEmpDisplayDate(inc.occurredYmd || "")}
                        {inc.kind ? ` · ${inc.kind}` : ""}
                      </p>
                      {inc.detail ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground/90">
                          {inc.detail}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex max-w-44 shrink-0 rounded-full px-2.5 py-0.5 text-center text-[11px] font-medium tracking-wide",
                        inc.salaryDeduct
                          ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/35"
                          : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
                      )}
                    >
                      {payImpactLabel(inc)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </EmpCard>
      </div>

      <EmpCard
        accent="teal"
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:100ms]"
      >
        <EmpSectionLabel
          icon={CalendarClock}
          title="Scheduled shifts"
          tone="teal"
          hint={`${shifts.length} upcoming or recent shift${shifts.length === 1 ? "" : "s"}`}
        />
        {shifts.length === 0 ? (
          <EmpEmptyState
            title="No shifts scheduled yet"
            hint="When HR assigns you a shift, it will show here."
            tone="teal"
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-teal-500/15 bg-teal-500/5 px-4 py-3.5 transition hover:border-teal-400/30 hover:bg-teal-500/10"
              >
                <p className="font-medium tracking-tight">
                  {formatEmpDisplayDate(s.workDate)}
                </p>
                <p className="mt-1 text-sm text-teal-100/90">
                  {s.startTime} – {s.endTime}
                </p>
                {s.department ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.department}
                  </p>
                ) : null}
                {s.notes ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">
                    {s.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </EmpCard>
    </EmpAppShell>
  );
}
