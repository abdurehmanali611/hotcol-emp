/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Camera,
  Loader2,
  Mail,
  Phone,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { EmpAppShell, EmpCard } from "@/components/emp/EmpAppShell";
import {
  fetchEmployeeMe,
  updateOwnProfile,
} from "@/lib/api/employee";
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";
import {
  clearEmployeeSession,
  readEmployeeToken,
  updateStoredEmployee,
  type EmployeePublic,
} from "@/lib/employeeSession";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "active")
    return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
  if (s === "on_leave" || s === "on leave")
    return "border-amber-400/40 bg-amber-500/20 text-amber-100";
  if (s === "terminated")
    return "border-rose-400/40 bg-rose-500/20 text-rose-100";
  return "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";
}

function OrgField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 px-3.5 py-3">
      <div className="flex items-center gap-2 text-teal-300/90">
        <Icon className="size-3.5 shrink-0" />
        <p className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium tracking-tight text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<EmployeePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!readEmployeeToken()) {
      router.replace("/");
      return;
    }
    try {
      const row = await fetchEmployeeMe();
      updateStoredEmployee(row);
      setMe(row);
      setPhone(row.phone || "");
      setEmail(row.email || "");
      setImageUrl(row.profileImageUrl || "");
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

  const dirty = useMemo(() => {
    if (!me) return false;
    return (
      phone.trim() !== (me.phone || "").trim() ||
      email.trim() !== (me.email || "").trim() ||
      imageUrl.trim() !== (me.profileImageUrl || "").trim()
    );
  }, [me, phone, email, imageUrl]);

  const initials = initialsFromName(me?.fullName || "");
  const orgPosition = (me?.orgPosition || "employee").replace(/^./, (c) =>
    c.toUpperCase(),
  );

  const onPickPhoto = () => {
    if (uploading || busy) return;
    if (!isCloudinaryConfigured()) {
      toast.error("Photo upload is not configured on this device.");
      return;
    }
    fileRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, {
        folder: "hotcol-emp-profiles",
      });
      setImageUrl(url);
      toast.success("Photo ready — save to apply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!me || !dirty || busy) return;
    setBusy(true);
    try {
      const updated = await updateOwnProfile({
        profileImageUrl: imageUrl.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      updateStoredEmployee(updated);
      setMe(updated);
      setPhone(updated.phone || "");
      setEmail(updated.email || "");
      setImageUrl(updated.profileImageUrl || "");
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <EmpAppShell
        title="Profile"
        subtitle="Your details"
        mainClassName="max-w-2xl"
      >
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-teal-400" />
          Loading profile…
        </div>
      </EmpAppShell>
    );
  }

  return (
    <EmpAppShell
      title="Profile"
      subtitle="Photo, contact, and org details"
      mainClassName="max-w-2xl"
    >
      {/* Hero */}
      <EmpCard
        accent="teal"
        className="overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-teal-500/15 via-transparent to-cyan-500/10" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div
              className={cn(
                "relative flex size-28 items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br from-teal-400/40 via-cyan-500/30 to-emerald-400/35 text-2xl font-bold tracking-tight text-teal-50 shadow-lg shadow-teal-950/40 ring-2 ring-teal-300/30",
              )}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN URLs
                <img
                  src={imageUrl}
                  alt={me?.fullName || "Profile"}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={onPickPhoto}
              disabled={uploading || busy}
              className="absolute -bottom-1 -right-1 inline-flex size-9 items-center justify-center rounded-xl border border-teal-400/40 bg-teal-500/90 text-slate-950 shadow-md transition hover:bg-teal-400 disabled:opacity-60"
              aria-label="Change photo"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {me?.fullName || "Employee"}
              </h2>
              <p className="text-sm text-teal-100/80">
                {[me?.jobTitle, me?.department].filter(Boolean).join(" · ") ||
                  "Role not set"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge
                variant="outline"
                className={cn("capitalize", statusTone(me?.status || ""))}
              >
                {(me?.status || "—").replace(/_/g, " ")}
              </Badge>
              <Badge
                variant="outline"
                className="border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
              >
                {orgPosition}
              </Badge>
              {me?.HotelName ? (
                <Badge
                  variant="outline"
                  className="border-border/50 bg-muted/40 font-normal text-muted-foreground"
                >
                  {me.HotelName}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Tap the camera to change your photo. Contact fields below are
              editable — name and org role are managed by HR.
            </p>
            {imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-rose-200"
                disabled={busy || uploading}
                onClick={() => setImageUrl("")}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>
      </EmpCard>

      {/* Editable contact */}
      <EmpCard
        accent="sky"
        className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:40ms]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5 pt-0.5">
            <h3 className="text-base font-semibold tracking-tight">
              Contact details
            </h3>
            <p className="text-sm text-muted-foreground">
              Phone and email you want HR and leaders to use.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label
              htmlFor="profile-phone"
              className="inline-flex items-center gap-1.5"
            >
              <Phone className="size-3.5 text-sky-300" />
              Phone
            </Label>
            <PhoneInput
              id="profile-phone"
              defaultCountry="ET"
              countryCallingCodeEditable
              international
              value={phone || undefined}
              onChange={(value) => setPhone(value || "")}
              disabled={busy}
              className="w-full min-w-0 [&_button]:h-11 [&_button]:rounded-s-xl [&_button]:border-sky-500/20 [&_button]:bg-sky-500/5 [&_input]:h-11 [&_input]:rounded-e-xl [&_input]:border-sky-500/20 [&_input]:bg-sky-500/5"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="profile-email"
              className="inline-flex items-center gap-1.5"
            >
              <Mail className="size-3.5 text-sky-300" />
              Email
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="you@example.com"
              className="h-11 rounded-xl border-sky-500/20 bg-sky-500/5"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || busy}
          className="h-11 w-full rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 font-semibold text-slate-950 shadow-md shadow-cyan-950/30 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Save className="size-4" />
              {dirty ? "Save changes" : "No changes"}
            </span>
          )}
        </Button>
      </EmpCard>

      {/* Org (read-only) */}
      <EmpCard
        accent="emerald"
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:80ms]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/35">
            <Shield className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5 pt-0.5">
            <h3 className="text-base font-semibold tracking-tight">
              Organization
            </h3>
            <p className="text-sm text-muted-foreground">
              Set by HR — contact them if something looks wrong.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <OrgField icon={Building2} label="Department" value={me?.department || ""} />
          <OrgField icon={Briefcase} label="Job title" value={me?.jobTitle || ""} />
          <OrgField icon={Shield} label="Org position" value={orgPosition} />
          <OrgField
            icon={UserRound}
            label="Status"
            value={(me?.status || "—").replace(/_/g, " ")}
          />
        </div>
      </EmpCard>
    </EmpAppShell>
  );
}
