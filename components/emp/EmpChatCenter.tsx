/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Building2,
  ImagePlus,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmpPersonCombobox } from "@/components/emp/EmpPersonCombobox";
import {
  createMyChatDirectApi,
  createMyChatGroupApi,
  createMyChatWithManagerApi,
  fetchMyChatMessages,
  fetchMyChatPeers,
  fetchMyChatThreads,
  fetchMyChatUnreadCount,
  markMyChatThreadReadApi,
  sendMyChatMessageApi,
  type EmpChatMessage,
  type EmpChatPeer,
  type EmpChatThread,
} from "@/lib/api/chat";
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const POLL_MS = 10000;
const CHAT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/jfif";
const CHAT_MAX_IMAGES = 5;

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewForLastMessage(t: EmpChatThread): string {
  const last = t.lastMessage;
  if (!last) return t.kind;
  if (last.body?.trim()) return last.body;
  if (last.imageUrl?.trim()) return "Photo";
  return t.kind;
}

function memberDisplayName(
  m: EmpChatThread["members"][number],
  peerNameById: Map<number, string>,
): string {
  if (m.isManager) return "Manager";
  const id = m.employeeId != null ? Number(m.employeeId) : null;
  return (
    (m.employeeName && m.employeeName !== "Manager" ? m.employeeName : null) ||
    (id != null ? peerNameById.get(id) : null) ||
    (id != null ? `#${id}` : "Member")
  );
}

/**
 * Emp-facing label: show the other party (coworker / Manager), never the
 * logged-in employee’s own name as the primary title.
 */
function threadListTitle(
  t: EmpChatThread,
  myEmployeeId: number | null,
  peerNameById: Map<number, string>,
): string {
  const others = t.members.filter((m) => {
    if (m.isManager) return true;
    if (myEmployeeId == null || m.employeeId == null) return true;
    return Number(m.employeeId) !== Number(myEmployeeId);
  });

  const otherEmpNames = others
    .filter((m) => !m.isManager)
    .map((m) => memberDisplayName(m, peerNameById))
    .filter((n): n is string => Boolean(n && n.trim() && !n.startsWith("#")));
  const hasManager = others.some((m) => m.isManager);

  const stored = String(t.title || "").trim();
  const storedIsSelf = (() => {
    if (!stored || myEmployeeId == null) return false;
    const lower = stored.toLowerCase();
    const me = t.members.find(
      (m) =>
        !m.isManager &&
        m.employeeId != null &&
        Number(m.employeeId) === Number(myEmployeeId),
    );
    if (me?.employeeName && me.employeeName.toLowerCase() === lower) {
      return true;
    }
    const mapped = peerNameById.get(myEmployeeId);
    return Boolean(mapped && mapped.toLowerCase() === lower);
  })();

  if (t.kind === "group") {
    if (stored && !storedIsSelf) return stored;
    const names = [
      ...otherEmpNames,
      hasManager ? "Manager" : null,
    ].filter((n): n is string => Boolean(n));
    if (names.length) return names.join(", ");
    return `Group #${t.id}`;
  }

  if (otherEmpNames.length >= 1) return otherEmpNames.join(", ");
  if (hasManager) return "Manager";
  if (stored && !storedIsSelf) return stored;
  return `Chat #${t.id}`;
}

function threadMembersSubtitle(
  t: EmpChatThread,
  myEmployeeId: number | null,
  peerNameById: Map<number, string>,
): string {
  return t.members
    .filter((m) => {
      if (m.isManager) return true;
      if (myEmployeeId == null || m.employeeId == null) return true;
      return Number(m.employeeId) !== Number(myEmployeeId);
    })
    .map((m) => memberDisplayName(m, peerNameById))
    .join(" · ");
}

/** Employee self-service chat: coworkers + optional Manager. */
export function EmpChatCenter({ myEmployeeId }: { myEmployeeId: number | null }) {
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [threads, setThreads] = useState<EmpChatThread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<EmpChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [peers, setPeers] = useState<EmpChatPeer[]>([]);
  const [pickPeerIds, setPickPeerIds] = useState<number[]>([]);
  const [withManagerDirect, setWithManagerDirect] = useState(false);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [groupWithManager, setGroupWithManager] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingFileRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [t, u, p] = await Promise.all([
        fetchMyChatThreads(),
        fetchMyChatUnreadCount(),
        fetchMyChatPeers(),
      ]);
      setThreads(t);
      setUnread(u);
      setPeers(p);
    } catch {
      /* keep last good state */
    }
  }, []);

  const loadMessages = useCallback(
    async (threadId: number, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setMsgsLoading(true);
      try {
        const rows = await fetchMyChatMessages(threadId);
        setMessages(rows);
        await markMyChatThreadReadApi(threadId);
        void load();
      } catch (e) {
        if (!opts?.quiet) {
          toast.error(
            e instanceof Error ? e.message : "Could not load messages",
          );
        }
      } finally {
        if (!opts?.quiet) setMsgsLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      void load();
      if (activeId) void loadMessages(activeId, { quiet: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [open, activeId, load, loadMessages]);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId],
  );

  const peerNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of peers) map.set(p.id, p.fullName);
    return map;
  }, [peers]);

  useEffect(() => {
    if (activeId && open) void loadMessages(activeId);
  }, [activeId, open, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  const mine = (m: EmpChatMessage) =>
    !m.senderIsManager &&
    myEmployeeId != null &&
    Number(m.senderEmployeeId) === myEmployeeId;

  const canSend =
    Boolean(draft.trim() || pendingImageUrls.length) &&
    !busy &&
    !uploadingImage;
  const atImageLimit = pendingImageUrls.length >= CHAT_MAX_IMAGES;

  const handlePickImage = () => {
    if (busy || uploadingImage || atImageLimit) return;
    pickingFileRef.current = true;
    const onWindowFocus = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false;
      }, 0);
    };
    window.addEventListener("focus", onWindowFocus, { once: true });
    fileInputRef.current?.click();
  };

  const removePendingImage = (index: number) => {
    setPendingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    pickingFileRef.current = false;
    if (files.length === 0) return;

    const slotsLeft = CHAT_MAX_IMAGES - pendingImageUrls.length;
    if (slotsLeft <= 0) {
      toast.error(`You can attach up to ${CHAT_MAX_IMAGES} images at a time.`);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please choose image files (PNG, JPEG, or WebP).");
      return;
    }
    if (imageFiles.length < files.length) {
      toast.error("Some files were skipped because they are not images.");
    }

    const toUpload = imageFiles.slice(0, slotsLeft);
    if (imageFiles.length > slotsLeft) {
      toast.info(
        `Only ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} added (max ${CHAT_MAX_IMAGES}).`,
      );
    }

    setUploadingImage(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${toUpload.length}…`);
        const url = await uploadImageToCloudinary(toUpload[i], {
          folder: "hotcol-hr-chat",
        });
        uploaded.push(url);
      }
      setPendingImageUrls((prev) =>
        [...prev, ...uploaded].slice(0, CHAT_MAX_IMAGES),
      );
    } catch (err) {
      if (uploaded.length > 0) {
        setPendingImageUrls((prev) =>
          [...prev, ...uploaded].slice(0, CHAT_MAX_IMAGES),
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Image upload failed. Try again.",
      );
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  };

  const handleSend = async () => {
    if (!active || !canSend) return;
    const text = draft.trim();
    const images = pendingImageUrls.map((url) => url.trim()).filter(Boolean);
    setBusy(true);
    try {
      if (images.length === 0) {
        await sendMyChatMessageApi(active.id, text);
      } else {
        for (let i = 0; i < images.length; i++) {
          await sendMyChatMessageApi(
            active.id,
            i === 0 ? text : "",
            images[i],
          );
        }
      }
      setDraft("");
      setPendingImageUrls([]);
      await loadMessages(active.id, { quiet: true });
      draftRef.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSheetOpenChange = (next: boolean) => {
    if (!next && (uploadingImage || pickingFileRef.current)) return;
    setOpen(next);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative h-9 w-9 border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
            aria-label="Team chat"
          >
            <MessageSquare className="h-4 w-4" />
            {unread > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
              >
                {unread > 99 ? "99+" : unread}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex w-full max-w-full flex-col gap-0 border-cyan-500/20 bg-[#0b1520] p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg data-[side=right]:md:max-w-xl">
          <div
            className="h-1 w-full shrink-0 bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400"
            aria-hidden
          />
          <SheetHeader className="border-b border-cyan-500/15 bg-cyan-500/5 px-4 py-3.5 text-left">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="min-w-0 space-y-1">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                    <MessageSquare className="size-4" />
                  </span>
                  Team chat
                </SheetTitle>
                <SheetDescription className="text-xs leading-relaxed">
                  Message coworkers or Manager. Groups via the people icon.
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                onClick={() => setGroupOpen(true)}
                aria-label="New group"
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-2.5 border-b border-cyan-500/15 bg-card/40 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <EmpPersonCombobox
                    people={peers}
                    valueIds={pickPeerIds}
                    onChange={setPickPeerIds}
                    placeholder="Start chat with coworker…"
                    emptyText="No coworkers found."
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 shrink-0 bg-cyan-600 hover:bg-cyan-500"
                  disabled={pickPeerIds.length === 0 || busy}
                  onClick={async () => {
                    const peerEmployeeId = pickPeerIds[0];
                    if (peerEmployeeId == null) return;
                    setBusy(true);
                    try {
                      const t = await createMyChatDirectApi({
                        peerEmployeeId,
                        withManager: withManagerDirect,
                      });
                      setPickPeerIds([]);
                      await load();
                      setActiveId(t.id);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Could not start chat",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Open
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Checkbox
                    checked={withManagerDirect}
                    onCheckedChange={(v) => setWithManagerDirect(v === true)}
                  />
                  Include Manager in coworker chat
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const t = await createMyChatWithManagerApi();
                      await load();
                      setActiveId(t.id);
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Could not open Manager chat",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Building2 className="size-3.5" />
                  )}
                  Chat with Manager
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[11rem_1fr] md:grid-cols-[12.5rem_1fr]">
              <ul className="max-h-40 space-y-0.5 overflow-y-auto border-b border-cyan-500/15 bg-card/30 p-2 sm:max-h-none sm:border-b-0 sm:border-r">
                {threads.length === 0 ? (
                  <li className="flex flex-col items-center gap-1.5 px-2 py-10 text-center">
                    <UserRound className="size-5 text-muted-foreground/40" />
                    <span className="text-[11px] text-muted-foreground">
                      No chats yet
                    </span>
                  </li>
                ) : (
                  threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-xl px-2.5 py-2 text-left text-xs transition",
                          activeId === t.id
                            ? "bg-cyan-500/20 ring-1 ring-cyan-400/35"
                            : "hover:bg-muted/50",
                        )}
                        onClick={() => setActiveId(t.id)}
                      >
                        <p className="truncate font-medium text-foreground">
                          {threadListTitle(t, myEmployeeId, peerNameById)}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {previewForLastMessage(t)}
                        </p>
                        {t.lastMessage?.createdAt ? (
                          <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                            {formatMsgTime(t.lastMessage.createdAt)}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="flex min-h-0 flex-col bg-background/20">
                {active ? (
                  <div className="border-b border-cyan-500/10 px-3 py-2">
                    <p className="truncate text-sm font-medium">
                      {threadListTitle(active, myEmployeeId, peerNameById)}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {threadMembersSubtitle(
                        active,
                        myEmployeeId,
                        peerNameById,
                      ) || "Conversation"}
                    </p>
                  </div>
                ) : null}
                <div className="min-h-52 flex-1 space-y-2.5 overflow-y-auto p-3">
                  {!active ? (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/25">
                        <MessageSquare className="size-6 text-cyan-400/70" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select or start a conversation
                      </p>
                      <p className="max-w-56 text-[11px] text-muted-foreground/80">
                        Use Chat with Manager for a private line, or pick a
                        coworker above.
                      </p>
                    </div>
                  ) : msgsLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin text-cyan-400" />
                      Loading…
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                      No messages yet — say hello.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex w-full",
                          mine(m) ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "inline-block max-w-60 space-y-2 rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-68",
                            mine(m)
                              ? "bg-cyan-600 text-white"
                              : m.senderIsManager
                                ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-400/35"
                                : "bg-muted/80 ring-1 ring-border/40",
                          )}
                        >
                          <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] opacity-75">
                            <span className="font-medium">{m.senderName}</span>
                            <span className="whitespace-nowrap">
                              {formatMsgTime(m.createdAt)}
                            </span>
                          </div>
                          {m.imageUrl ? (
                            <a
                              href={m.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-lg"
                            >
                              <Image
                                src={m.imageUrl}
                                alt="Chat attachment"
                                width={280}
                                height={200}
                                className="max-h-40 w-auto object-contain"
                                unoptimized
                              />
                            </a>
                          ) : null}
                          {m.body ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {m.body}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={endRef} />
                </div>
                {active ? (
                  <div className="space-y-2 border-t border-cyan-500/15 bg-card/50 p-3">
                    {pendingImageUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pendingImageUrls.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            className="relative inline-block"
                          >
                            <Image
                              src={url}
                              alt={`Attachment preview ${index + 1}`}
                              width={80}
                              height={80}
                              className="h-16 w-16 rounded-lg border object-cover"
                              unoptimized
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute -right-2 -top-2 h-5 w-5 rounded-full shadow-sm"
                              aria-label={`Remove image ${index + 1}`}
                              disabled={busy || uploadingImage}
                              onClick={() => removePendingImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={CHAT_IMAGE_ACCEPT}
                        multiple
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        onChange={(e) => void handleImageFileChange(e)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 border-cyan-500/30"
                        disabled={busy || uploadingImage || atImageLimit}
                        aria-label="Attach images"
                        title={
                          !isCloudinaryConfigured()
                            ? "Image upload not configured"
                            : atImageLimit
                              ? `Maximum ${CHAT_MAX_IMAGES} images`
                              : `Attach images (up to ${CHAT_MAX_IMAGES})`
                        }
                        onClick={() => {
                          if (!isCloudinaryConfigured()) {
                            toast.error(
                              "Image upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_PRESET_NAME and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to .env.local.",
                            );
                            return;
                          }
                          handlePickImage();
                        }}
                      >
                        {uploadingImage ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ImagePlus className="size-4" />
                        )}
                      </Button>
                      <Textarea
                        ref={draftRef}
                        rows={2}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder={
                          uploadProgress || "Message… (Enter to send)"
                        }
                        className="min-h-10 resize-none border-cyan-500/20 bg-background/70"
                        disabled={busy || uploadingImage}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-cyan-600 hover:bg-cyan-500"
                        disabled={!canSend}
                        onClick={() => void handleSend()}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {uploadProgress ??
                        (atImageLimit
                          ? `${CHAT_MAX_IMAGES}/${CHAT_MAX_IMAGES} images · Enter to send`
                          : `Up to ${CHAT_MAX_IMAGES} images · Enter to send · Shift+Enter for new line`)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-cyan-500/20 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New group chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="group-title">Title</Label>
              <Input
                id="group-title"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Optional group name"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={groupWithManager}
                onCheckedChange={(v) => setGroupWithManager(v === true)}
              />
              Include Manager
            </label>
            <div className="space-y-1.5">
              <Label>Members</Label>
              <EmpPersonCombobox
                people={peers}
                valueIds={groupMemberIds}
                onChange={setGroupMemberIds}
                multiple
                placeholder="Search & pick coworkers…"
                emptyText="No coworkers found."
              />
            </div>
            <Button
              type="button"
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              disabled={busy}
              onClick={async () => {
                if (groupMemberIds.length < 1) {
                  toast.error("Pick at least one coworker");
                  return;
                }
                setBusy(true);
                try {
                  const t = await createMyChatGroupApi({
                    title: groupTitle.trim() || undefined,
                    peerEmployeeIds: groupMemberIds,
                    withManager: groupWithManager,
                  });
                  setGroupOpen(false);
                  setGroupTitle("");
                  setGroupMemberIds([]);
                  setGroupWithManager(false);
                  await load();
                  setActiveId(t.id);
                  setOpen(true);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Could not create group",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
