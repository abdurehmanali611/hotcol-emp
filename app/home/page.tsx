"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  LogOut,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import { EmpChatCenter } from "@/components/emp/EmpChatCenter";
import {
  fetchEmployeeMe,
  fetchEmployeeNotifications,
  markOwnNotificationRead,
  type EmpNotification,
} from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeMe,
  readEmployeeToken,
  updateStoredEmployee,
  type EmployeePublic,
} from "@/lib/employeeSession";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  {
    href: "/leave",
    title: "Leave",
    desc: "Balances, requests, and history",
    icon: CalendarDays,
    tint: "from-sky-500/30 to-cyan-500/10 text-sky-300 ring-sky-400/35",
    border: "hover:border-sky-400/50",
    glow: "group-hover:bg-sky-500/10",
  },
  {
    href: "/attendance",
    title: "Time & attendance",
    desc: "Absences, incidents, and shifts",
    icon: ClipboardList,
    tint: "from-amber-500/30 to-orange-500/10 text-amber-300 ring-amber-400/35",
    border: "hover:border-amber-400/50",
    glow: "group-hover:bg-amber-500/10",
  },
  {
    href: "/payslips",
    title: "Payslips",
    desc: "Net pay and payment history",
    icon: Wallet,
    tint: "from-emerald-500/30 to-teal-500/10 text-emerald-300 ring-emerald-400/35",
    border: "hover:border-emerald-400/50",
    glow: "group-hover:bg-emerald-500/10",
  },
  {
    href: "/profile",
    title: "Profile",
    desc: "Photo, contact, and org details",
    icon: UserRound,
    tint: "from-teal-500/30 to-cyan-500/10 text-teal-300 ring-teal-400/35",
    border: "hover:border-teal-400/50",
    glow: "group-hover:bg-teal-500/10",
  },
] as const;

const LEADER_NAV = {
  href: "/approvals",
  title: "My approvals",
  desc: "Decide team leave as Leader",
  icon: ClipboardCheck,
  tint: "from-rose-500/30 to-orange-500/10 text-rose-300 ring-rose-400/35",
  border: "hover:border-rose-400/50",
  glow: "group-hover:bg-rose-500/10",
} as const;

export default function EmployeeHomePage() {
  const router = useRouter();
  const [me, setMe] = useState<EmployeePublic | null>(null);
  const [notes, setNotes] = useState<EmpNotification[]>([]);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const employee = await fetchEmployeeMe();
      updateStoredEmployee(employee);
      setMe(employee);
      if (employee.mustChangeOtp) {
        router.replace("/change-otp");
        return;
      }
      const list = await fetchEmployeeNotifications();
      setNotes(list);
    } catch {
      clearEmployeeSession();
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setMe(readEmployeeMe());
    void load();
  }, [load]);

  const unread = notes.filter((n) => !n.readAt).length;
  const firstName = me?.fullName?.split(" ")[0] || "there";
  const isLeader = me?.orgPosition === "leader";
  const nav = isLeader
    ? [...BASE_NAV.slice(0, 2), LEADER_NAV, ...BASE_NAV.slice(2)]
    : [...BASE_NAV];

  return (
    <EmpAppShell
      showBack={false}
      title={me?.fullName || "Employee"}
      avatarUrl={me?.profileImageUrl || null}
      subtitle={
        [me?.jobTitle, me?.department, isLeader ? "Leader" : ""]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      actions={
        <>
          <EmpChatCenter myEmployeeId={me?.id ?? null} />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative h-9 w-9 border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
                  >
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 border-cyan-500/20 bg-card/95 p-0 shadow-xl shadow-cyan-950/40"
            >
              <div className="border-b border-cyan-500/15 bg-cyan-500/5 px-3 py-2.5">
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {unread
                    ? `${unread} unread · tap to mark read`
                    : "Leave and HR messages for you"}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {notes.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  notes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={cn(
                        "mb-1 w-full rounded-xl px-3 py-2.5 text-left transition",
                        n.readAt
                          ? "hover:bg-muted/60"
                          : "bg-cyan-500/10 hover:bg-cyan-500/15",
                      )}
                      onClick={() => {
                        void markOwnNotificationRead(n.id)
                          .then(() => load())
                          .catch((e) =>
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Could not mark read",
                            ),
                          );
                        if (n.href) router.push(n.href);
                      }}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
            onClick={() => {
              clearEmployeeSession();
              router.replace("/");
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </>
      }
    >
      <EmpCard
        accent="sky"
        className="overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/15 via-transparent to-emerald-500/10" />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300">
              Welcome
            </p>
            {isLeader ? (
              <Badge className="border-rose-400/35 bg-rose-500/20 text-[10px] text-rose-100">
                Leader
              </Badge>
            ) : null}
            {unread > 0 ? (
              <Badge className="border-amber-400/35 bg-amber-500/20 text-[10px] text-amber-100">
                {unread} new
              </Badge>
            ) : null}
          </div>
          <h2 className="bg-linear-to-r from-cyan-200 via-sky-100 to-emerald-200 bg-clip-text text-2xl font-semibold tracking-tight text-transparent md:text-3xl">
            Hello, {firstName}
          </h2>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">
            {isLeader
              ? "Jump into leave, attendance, team approvals, payslips, or your profile."
              : "Jump into leave, time & attendance, payslips, or your profile."}
          </p>
        </div>
      </EmpCard>

      <nav className="grid gap-3 sm:grid-cols-2">
        {nav.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-card/90 p-5 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-400/10 transition",
                item.border,
                "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
              )}
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100",
                  item.glow,
                )}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "mb-3 flex size-11 items-center justify-center rounded-xl bg-linear-to-br ring-1 transition",
                    item.tint,
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="mt-1 size-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <p className="relative font-semibold tracking-tight">
                {item.title}
              </p>
              <p className="relative mt-1 text-sm text-muted-foreground">
                {item.desc}
              </p>
            </Link>
          );
        })}
      </nav>
    </EmpAppShell>
  );
}
