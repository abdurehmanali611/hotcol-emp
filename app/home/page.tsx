"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_at_top,_#f0f4f8_0%,_#e8eef4_40%,_#dce6f0_100%)] text-slate-900">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">
            HotCol · ESS
          </p>
          <h1 className="truncate text-sm font-semibold">
            {me?.fullName || "Employee"}
          </h1>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative h-9 w-9"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <Badge
                  variant="destructive"
                  className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
                >
                  {unread}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {notes.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="mb-1 w-full rounded-md px-2 py-2 text-left hover:bg-muted/80"
                    onClick={() => {
                      void markOwnNotificationRead(n.id)
                        .then(() => load())
                        .catch((e) =>
                          toast.error(
                            e instanceof Error ? e.message : "Could not mark read",
                          ),
                        );
                    }}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
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
          className="gap-1.5"
          onClick={() => {
            clearEmployeeSession();
            router.replace("/");
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Welcome</h2>
          <p className="mt-1 text-sm text-slate-600">
            {me?.jobTitle || "Team member"}
            {me?.department ? ` · ${me.department}` : ""}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Leave, payslips, and profile ESS panels ship next. Your notifications
            appear in the bell above.
          </p>
        </section>
      </main>
    </div>
  );
}
