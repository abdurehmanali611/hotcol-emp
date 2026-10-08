/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Clock3,
  History,
  Inbox,
  Loader2,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";
import {
  createOwnLeaveRequest,
  fetchMyLeaveBalances,
  fetchMyLeaveRequests,
  fetchMyLeaveTypes,
  type EmpLeaveBalance,
  type EmpLeaveRequest,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
} from "@/lib/employeeSession";

type LeaveTypeOption = { code: string; label: string; paid: boolean };
type HistoryFilter = "all" | "pending" | "approved" | "rejected";

/** Searchable leave-type combobox — same pattern as hotel store item name. */
function LeaveTypeCombobox({
  value,
  onChange,
  options,
  disabled,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  options: LeaveTypeOption[];
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const selected = useMemo(
    () => options.find((t) => t.code === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter(
      (t) =>
        t.label.toLowerCase().includes(query) ||
        t.code.toLowerCase().includes(query),
    );
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch(selected?.label || "");
        else setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className="h-12 w-full justify-between rounded-xl border-border/80 bg-background px-3 font-normal shadow-sm"
        >
          <span
            className={cn(
              "min-w-0 truncate text-left",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected
              ? `${selected.label}${selected.paid === false ? " · unpaid" : ""}`
              : "Select leave type…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search leave types…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>No leave type matches.</CommandEmpty>
            ) : (
              <CommandGroup heading="Leave types">
                {filtered.map((t) => {
                  const isSelected = value === t.code;
                  return (
                    <CommandItem
                      key={t.code}
                      value={`${t.code}-${t.label}`}
                      onSelect={() => {
                        onChange(t.code);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      {t.paid === false ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          unpaid
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmdLocal(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function daysBetweenInclusive(fromYmd: string, toYmd: string): number | null {
  const from = parseYmdLocal(fromYmd);
  const to = parseYmdLocal(toYmd);
  if (!from || !to || to < from) return null;
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function formatDisplayDate(ymd: string): string {
  const d = parseYmdLocal(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(fromYmd: string, toYmd: string): string {
  if (fromYmd === toYmd) return formatDisplayDate(fromYmd);
  return `${formatDisplayDate(fromYmd)} → ${formatDisplayDate(toYmd)}`;
}

function formatDays(n: number): string {
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  return `${rounded} day${n === 1 ? "" : "s"}`;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize tracking-wide",
        s === "approved" &&
          "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
        s === "rejected" &&
          "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
        s === "pending" &&
          "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
        s !== "approved" &&
          s !== "rejected" &&
          s !== "pending" &&
          "bg-muted text-muted-foreground ring-1 ring-border/60",
      )}
    >
      {status}
    </span>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  hint,
  tone = "sky",
}: {
  icon: typeof CalendarDays;
  title: string;
  hint?: string;
  tone?: "sky" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/35"
      : tone === "amber"
        ? "bg-amber-500/20 text-amber-300 ring-amber-400/35"
        : "bg-sky-500/20 text-sky-300 ring-sky-400/35";

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
          toneClass,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 space-y-0.5 pt-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint ? (
          <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

const BALANCE_TONES = [
  {
    idle: "border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-400/40 hover:bg-emerald-500/15",
    active:
      "border-emerald-400/55 bg-emerald-500/20 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-400/35",
    bar: "bg-emerald-400",
    number: "text-emerald-200",
  },
  {
    idle: "border-sky-500/25 bg-sky-500/10 hover:border-sky-400/40 hover:bg-sky-500/15",
    active:
      "border-sky-400/55 bg-sky-500/20 shadow-md shadow-sky-950/30 ring-1 ring-sky-400/35",
    bar: "bg-sky-400",
    number: "text-sky-200",
  },
  {
    idle: "border-amber-500/25 bg-amber-500/10 hover:border-amber-400/40 hover:bg-amber-500/15",
    active:
      "border-amber-400/55 bg-amber-500/20 shadow-md shadow-amber-950/30 ring-1 ring-amber-400/35",
    bar: "bg-amber-400",
    number: "text-amber-200",
  },
  {
    idle: "border-teal-500/25 bg-teal-500/10 hover:border-teal-400/40 hover:bg-teal-500/15",
    active:
      "border-teal-400/55 bg-teal-500/20 shadow-md shadow-teal-950/30 ring-1 ring-teal-400/35",
    bar: "bg-teal-400",
    number: "text-teal-200",
  },
] as const;

export default function LeavePage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmpLeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveTypeOption[]>([]);
  const [balances, setBalances] = useState<EmpLeaveBalance[]>([]);
  const [leaveType, setLeaveType] = useState("");
  const [fromYmd, setFromYmd] = useState("");
  const [toYmd, setToYmd] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const [list, t, b] = await Promise.all([
        fetchMyLeaveRequests(),
        fetchMyLeaveTypes(),
        fetchMyLeaveBalances(),
      ]);
      setRows(list);
      setTypes(t);
      setBalances(b);
      setLeaveType((prev) => prev || t[0]?.code || "");
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

  useEffect(() => {
    const n = daysBetweenInclusive(fromYmd, toYmd);
    if (n != null) setDays(String(n));
  }, [fromYmd, toYmd]);

  const typeLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of types) map.set(t.code, t.label);
    for (const b of balances) {
      if (!map.has(b.leaveType)) map.set(b.leaveType, b.label);
    }
    return map;
  }, [types, balances]);

  const selectedType = useMemo(
    () => types.find((t) => t.code === leaveType) ?? null,
    [types, leaveType],
  );

  const selectedBalance = useMemo(
    () => balances.find((b) => b.leaveType === leaveType) ?? null,
    [balances, leaveType],
  );

  const requestedDays = Number(days) || 0;
  const overBalance =
    selectedBalance != null &&
    requestedDays > 0 &&
    requestedDays > selectedBalance.availableDays;

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );

  const sortedRows = useMemo(() => {
    const rank = (s: string) =>
      s === "pending" ? 0 : s === "approved" ? 1 : 2;
    return [...rows].sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return (b.fromYmd || "").localeCompare(a.fromYmd || "");
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (historyFilter === "all") return sortedRows;
    return sortedRows.filter((r) => r.status === historyFilter);
  }, [sortedRows, historyFilter]);

  const canSubmit =
    !busy &&
    types.length > 0 &&
    Boolean(leaveType) &&
    Boolean(fromYmd) &&
    Boolean(toYmd) &&
    requestedDays > 0 &&
    daysBetweenInclusive(fromYmd, toYmd) != null;

  if (loading) {
    return (
      <EmpAppShell
        title="My leave"
        subtitle="Request and track leave"
        mainClassName="max-w-6xl"
      >
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-cyan-400" />
          Loading leave…
        </div>
      </EmpAppShell>
    );
  }

  return (
    <EmpAppShell
      title="My leave"
      subtitle="Balances, requests, and history"
      mainClassName="max-w-6xl"
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Form — left */}
        <EmpCard
          accent="sky"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 lg:col-span-7"
        >
          <SectionLabel
            icon={CalendarDays}
            title="Request leave"
            hint="Pick type and dates. Days fill from the range — edit for half-days."
            tone="sky"
          />

          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setBusy(true);
              try {
                await createOwnLeaveRequest({
                  leaveType,
                  fromYmd,
                  toYmd,
                  days: requestedDays,
                  reason,
                });
                toast.success("Leave submitted");
                setFromYmd("");
                setToYmd("");
                setDays("1");
                setReason("");
                await load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave type</Label>
              <LeaveTypeCombobox
                id="leave-type"
                value={leaveType}
                onChange={setLeaveType}
                options={types}
                disabled={busy}
              />
              {selectedBalance || selectedType ? (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {selectedBalance ? (
                    <Badge
                      variant="secondary"
                      className="border-cyan-500/30 bg-cyan-500/15 font-normal text-cyan-100"
                    >
                      {formatDays(selectedBalance.availableDays)} available
                    </Badge>
                  ) : null}
                  {selectedType?.paid === false ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 font-normal text-amber-200"
                    >
                      Unpaid — may affect payslip
                    </Badge>
                  ) : selectedType ? (
                    <span className="text-xs text-emerald-300/90">
                      Paid leave type
                    </span>
                  ) : null}
                </div>
              ) : null}
              {overBalance ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs text-amber-100">
                  This request ({formatDays(requestedDays)}) exceeds your
                  available balance (
                  {formatDays(selectedBalance?.availableDays ?? 0)}). You can
                  still submit — HR or approvers may adjust.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From</Label>
                <DatePicker
                  value={parseYmdLocal(fromYmd)}
                  onChange={(date) => {
                    const next = date ? formatYmd(date) : "";
                    setFromYmd(next);
                    if (toYmd && next && toYmd < next) setToYmd(next);
                  }}
                  placeholder="Start date"
                  disabled={busy}
                  className="h-12 rounded-xl border-cyan-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <DatePicker
                  value={parseYmdLocal(toYmd)}
                  onChange={(date) => {
                    setToYmd(date ? formatYmd(date) : "");
                  }}
                  placeholder="End date"
                  disabled={busy}
                  fromDate={parseYmdLocal(fromYmd)}
                  className="h-12 rounded-xl border-cyan-500/20"
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-44 space-y-2">
              <Label htmlFor="leave-days" className="flex justify-center">
                Days
              </Label>
              <Input
                id="leave-days"
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                className="h-12 rounded-xl border-cyan-500/25 bg-cyan-500/5 text-center text-base tabular-nums"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                disabled={busy}
              />
              <p className="text-center text-[11px] text-muted-foreground">
                {fromYmd && toYmd
                  ? formatDateRange(fromYmd, toYmd)
                  : "Auto from dates · edit for half-days"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-reason">
                Reason{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="leave-reason"
                rows={3}
                placeholder="Short note for your approver…"
                className="min-h-24 resize-y rounded-xl border-cyan-500/20 bg-background"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
            </div>

            {!types.length ? (
              <p className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                No leave types are configured yet. Ask HR to add them before you
                can submit.
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 text-base font-semibold text-slate-950 shadow-md shadow-cyan-950/40 hover:from-cyan-400 hover:to-teal-400"
              disabled={!canSubmit}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send className="size-4" />
                  Submit request
                </span>
              )}
            </Button>
          </form>
        </EmpCard>

        {/* Balances — right */}
        <EmpCard
          accent="emerald"
          className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:40ms] lg:col-span-5"
        >
          <SectionLabel
            icon={Wallet}
            title="Leave balances"
            hint="Available after pending. Tap a card to prefill the form."
            tone="emerald"
          />

          {balances.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-emerald-500/25 bg-emerald-500/5 px-4 py-8 text-center">
              <Inbox className="size-8 text-emerald-400/50" />
              <p className="text-sm text-muted-foreground">
                No balances on file yet. Ask HR if you expect leave entitlement.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {balances.map((b, i) => {
                const active = leaveType === b.leaveType;
                const tone = BALANCE_TONES[i % BALANCE_TONES.length]!;
                const usedRatio =
                  b.balanceDays > 0
                    ? Math.min(
                        1,
                        Math.max(
                          0,
                          (b.balanceDays - b.availableDays) / b.balanceDays,
                        ),
                      )
                    : 0;
                return (
                  <button
                    key={b.leaveType}
                    type="button"
                    onClick={() => setLeaveType(b.leaveType)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition",
                      active ? tone.active : tone.idle,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium tracking-tight">
                        {b.label}
                      </p>
                      <Badge
                        variant={b.paid === false ? "outline" : "secondary"}
                        className={cn(
                          "shrink-0 text-[10px]",
                          b.paid === false
                            ? "border-amber-400/40 text-amber-200"
                            : "border-emerald-400/30 bg-emerald-500/20 text-emerald-100",
                        )}
                      >
                        {b.paid === false ? "Unpaid" : "Paid"}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
                        tone.number,
                      )}
                    >
                      {b.availableDays}
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        available
                      </span>
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/25">
                      <div
                        className={cn("h-full rounded-full transition-all", tone.bar)}
                        style={{ width: `${Math.round(usedRatio * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Balance {b.balanceDays}</span>
                      {b.pendingDays > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Clock3 className="size-3" />
                          {b.pendingDays} pending
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </EmpCard>

        {/* Requests — full width under both */}
        <EmpCard
          accent="amber"
          className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:80ms] lg:col-span-12"
        >
          <SectionLabel
            icon={History}
            title="Your requests"
            tone="amber"
            hint={
              rows.length
                ? `${rows.length} total${pendingCount ? ` · ${pendingCount} pending` : ""}`
                : "Submitted leave appears here with approval status."
            }
          />

          {rows.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "pending", label: "Pending" },
                  { id: "approved", label: "Approved" },
                  { id: "rejected", label: "Rejected" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHistoryFilter(opt.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    historyFilter === opt.id
                      ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 px-4 py-10 text-center">
              <Inbox className="size-8 text-amber-400/50" />
              <p className="text-sm text-muted-foreground">
                No leave requests yet. Submit one above to get started.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No {historyFilter} requests.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filteredRows.map((r) => {
                const label = typeLabelByCode.get(r.leaveType) || r.leaveType;
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3.5 transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium tracking-tight">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateRange(r.fromYmd, r.toYmd)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.days ? formatDays(r.days) : null}
                          {r.status === "pending"
                            ? ` · step ${r.currentStepIndex + 1}`
                            : null}
                          {r.status !== "pending" && r.decidedBy
                            ? ` · ${r.decidedBy}`
                            : null}
                        </p>
                        {r.reason ? (
                          <p className="line-clamp-2 pt-0.5 text-xs text-muted-foreground/90">
                            {r.reason}
                          </p>
                        ) : null}
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </EmpCard>
      </div>
    </EmpAppShell>
  );
}
