"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { fetchEmployeeMe } from "@/lib/api/employee";
import {
  clearEmployeeSession,
  readEmployeeToken,
  type EmployeePublic,
} from "@/lib/employeeSession";

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<EmployeePublic | null>(null);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      setMe(await fetchEmployeeMe());
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
        <h1 className="font-semibold">Profile</h1>
      </header>
      <main className="mx-auto max-w-lg p-4 md:p-6">
        <div className="space-y-3 rounded-2xl border bg-white p-6 shadow-sm text-sm">
          <p>
            <span className="text-muted-foreground">Name</span>
            <br />
            <span className="font-medium">{me?.fullName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Department</span>
            <br />
            <span className="font-medium">{me?.department || "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Position</span>
            <br />
            <span className="font-medium capitalize">
              {me?.orgPosition || "employee"}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Specific role</span>
            <br />
            <span className="font-medium">{me?.jobTitle || "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Phone / email</span>
            <br />
            <span className="font-medium">
              {me?.phone || "—"} · {me?.email || "—"}
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
