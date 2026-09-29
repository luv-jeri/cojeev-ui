"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatedIcon,
  type AnimatedIconProps,
} from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { Textarea, TextareaScrollArea } from "@/registry/cojeev/ui/textarea";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import {
  findComponents,
  isUUID,
  LIMITS,
  MEDIA_TYPES,
  validateReport,
  type ComponentMatch,
  type Diagnostics,
  type Receipt,
  type ReportKind,
  type RequestTopic,
} from "@/lib/reporting/contracts";
import {
  canEditRejectedSubmission,
  fetchReceipt,
  manifestFiles,
  receiptSecret,
  REPORTING_API,
  REPORTING_SITE_KEY,
  ReportingError,
  reportingFetch,
  submitReport,
  uploadAttachment,
  type ReportFile,
  type ReportingConfig,
} from "@/lib/reporting/client";
import {
  capturePage,
  CaptureCancelled,
  type CaptureArea,
  type CaptureProgress,
} from "@/lib/reporting/capture";
import { receiptExpectation } from "@/lib/reporting/receipt-labels";
import { siteFlags } from "@/lib/site-config";
import {
  snapshotDiagnostics,
  startDiagnostics,
} from "@/lib/reporting/diagnostics";
import {
  commitSent,
  emptyDraft,
  importedTitle,
  loadDraftWorkspace,
  loadSent,
  pullLegacyReceipts,
  removeSent,
  replaceSentReceipt,
  StorageUnavailableError,
  mergeSent,
  saveDraftKinds,
  type ReportingDraft,
  type ReportingDraftWorkspace,
  type SentEntry,
} from "@/lib/reporting/draft";
import { CropEditor, FilePreview, PinPicker } from "./capture-controls";
import { REPORT_EVENT, takeRequest } from "./report-request";
import { ReceiptDetail } from "./receipt-detail";
import { SentList } from "./sent-list";
import { AreaPicker, CaptureStatus } from "./area-picker";
import { MoreMenu, ReportInfo, ReportTool } from "./report-controls";
import { pinChipText, submittedPins } from "@/lib/reporting/pin-label";
import { TooltipProvider } from "@/registry/cojeev/ui/tooltip";
import { Turnstile } from "./turnstile";
import "./reporting.css";

// Keep the existing compact action measurements while sharing the library's
// icon artwork, pointer feedback and quiet-motion boundary.
function reportingIcon(name: AnimatedIconProps["name"]) {
  return function ReportingIcon({ size = 18 }: { size?: number }) {
    return <AnimatedIcon name={name} style={{ width: size, height: size }} />;
  };
}
const ArrowUpRight = reportingIcon("arrow-up-right"),
  Bug = reportingIcon("bug"),
  Check = reportingIcon("check"),
  Camera = reportingIcon("camera"),
  Crop = reportingIcon("crop"),
  Settings = reportingIcon("settings"),
  Paperclip = reportingIcon("paperclip"),
  PinIcon = reportingIcon("pin"),
  Sparkles = reportingIcon("sparkles"),
  X = reportingIcon("x");
function ReportSource({ children }: { children: string }) {
  return (
    <ScrollArea
      variant="plain"
      className="report-source"
      viewportProps={{ "aria-label": "Report details", tabIndex: 0 }}
    >
      <pre>{children}</pre>
    </ScrollArea>
  );
}

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Your draft is still here.";
const REQUEST_PRIVACY = "Private until we approve your title.";
// One constant so the owner's copy review can swap it in one place.
const BUG_PRIVACY = "Private. The public issue shows only a reference.";
const sentFile = (state: string) => state === "uploaded" || state === "ready";
const SENT_BANNER = {
  bug: "Report sent. Check your inbox for a receipt.",
  request: "Request sent. Check your inbox for a receipt.",
} as const;
const SENT_MEMORY_NOTE =
  "This list isn’t kept after you close the page. Download a receipt to keep it.";
const SENT_SAVE_ERROR =
  "Could not save this report to the sent list. Your receipt is still here.";

export function ReportingWidget({ entries }: { entries: ComponentMatch[] }) {
  const path = usePathname();
  return path.includes("feedback-admin") ? null : (
    <ReportingPanel entries={entries} />
  );
}
function ReportingPanel({ entries }: { entries: ComponentMatch[] }) {
  const descriptionLabel = useId();
  const [open, setOpen] = useState(false),
    [loaded, setLoaded] = useState(false),
    [draft, setDraft] = useState<ReportingDraft>(emptyDraft);
  const [step, setStep] = useState<"edit" | "review" | "receipt">("edit"),
    [busy, setBusy] = useState("");
  const [error, setError] = useState(""),
    [storage, setStorage] = useState(""),
    [config, setConfig] = useState<ReportingConfig | null>(null),
    [configError, setConfigError] = useState("");
  const [topics, setTopics] = useState<RequestTopic[]>([]);
  const [picking, setPicking] = useState<false | "pins" | "area">(false),
    [capture, setCapture] = useState<File | null>(null),
    [dragging, setDragging] = useState(false),
    [reviewScope, setReviewScope] = useState("");
  const [sent, setSent] = useState<SentEntry[]>([]),
    [sentExpanded, setSentExpanded] = useState(false),
    [openSentId, setOpenSentId] = useState<string | null>(null),
    [banner, setBanner] = useState<{ kind: ReportKind; id: string } | null>(
      null,
    ),
    [confirmDiscard, setConfirmDiscard] = useState(false),
    [sentInMemory, setSentInMemory] = useState(false);
  // While the sent-list transaction is in flight it is the only writer: a save that started
  // now would queue behind it and put the just-sent draft and its files back.
  // ponytail: the flag is set and cleared inside completeSend's try/finally, so no path can leave it set.
  const committing = useRef(false),
    focusSent = useRef(false);
  // Only drafts this tab changed are written, so a tab that merely loaded a draft can never put
  // an old copy back over what another tab sent or cleared. `fresh` is the draft object that came
  // from storage (or was just rebuilt from it): the save effect skips it because nothing changed.
  const pending = useRef<Partial<Record<ReportKind, ReportingDraft>>>({}),
    fresh = useRef<ReportingDraft | null>(null),
    // Receipts this tab moved into the sent list: a save effect React runs late for the pre-send
    // draft must not queue it again.
    committedIds = useRef(new Set<string>());
  // Review is a view, not part of the draft: it is open only for the tab and step it was
  // opened in, so a tab switch or leaving the edit step closes it.
  const scope = `${draft.kind}:${step}`,
    reviewing = reviewScope === scope,
    setReviewing = (on: boolean) => setReviewScope(on ? scope : "");
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const captureRun = useRef<AbortController | null>(null);
  const [turnstileToken, setTurnstileToken] = useState(""),
    [verificationAttempt, setVerificationAttempt] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null),
    receiptInput = useRef<HTMLInputElement>(null),
    draftRef = useRef(draft),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    reviewTitle = useRef<HTMLHeadingElement>(null);
  const draftsRef = useRef<ReportingDraftWorkspace["drafts"]>({});
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(
    () => () => {
      // An unmounting panel must not have a capture still running into its state.
      captureRun.current?.abort();
      captureRun.current = null;
    },
    [],
  );
  const update = (changes: Partial<ReportingDraft>) => {
    setBanner(null);
    setDraft((value) => ({ ...value, ...changes }));
  };
  const flush = useCallback(async () => {
    if (committing.current) return;
    const drafts = pending.current;
    if (!Object.keys(drafts).length) return;
    pending.current = {};
    try {
      await saveDraftKinds({ activeKind: draftRef.current.kind, drafts });
      setStorage("Draft saved");
    } catch {
      // Keep what failed, unless a newer change to the same kind has queued since.
      pending.current = { ...drafts, ...pending.current };
      setStorage(
        "Draft storage is unavailable. Keep this page open; reloading may lose your report and files.",
      );
    }
  }, []);
  const persist = useCallback(
    async (value: ReportingDraft) => {
      draftsRef.current = { ...draftsRef.current, [value.kind]: value };
      pending.current = { ...pending.current, [value.kind]: value };
      await flush();
    },
    [flush],
  );
  const selectDraft = useCallback(
    (kind: ReportKind, topic?: RequestTopic) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      draftsRef.current = {
        ...draftsRef.current,
        [draftRef.current.kind]: draftRef.current,
      };
      let next = draftsRef.current[kind] ?? {
        ...emptyDraft(),
        kind,
      };
      fresh.current = next;
      if (topic && !next.attempted) {
        next = { ...next, topicId: topic.id, title: topic.title, frozen: null };
        fresh.current = null;
        pending.current = { ...pending.current, [kind]: next };
      }
      draftRef.current = next;
      setDraft(next);
      setBanner(null);
      setConfirmDiscard(false);
      setStep(next.receipt ? "receipt" : next.frozen ? "review" : "edit");
      setError(
        topic && next.attempted
          ? "Your previous request is still here. Finish or clear it before joining another."
          : "",
      );
      setTopics([]);
      setDragging(false);
      setTurnstileToken("");
      setVerificationAttempt((value) => value + 1);
      // The switch itself is a change (the active tab); drafts are written only if pending.
      if (Object.keys(pending.current).length) void flush();
      else void saveDraftKinds({ activeKind: kind, drafts: {} }).catch(() => {});
    },
    [flush],
  );
  useEffect(() => startDiagnostics(), []);
  useEffect(() => {
    let active = true;
    (async () => {
      const [saved, list] = await Promise.all([
        loadDraftWorkspace(),
        loadSent().catch(() => []),
      ]);
      if (!active) return;
      let workspace = saved;
      let entries = list;
      if (saved) {
        const pulled = pullLegacyReceipts(saved, Date.now());
        if (pulled.entries.length) {
          try {
            // One transaction: the list gains the receipts and the drafts lose them, or neither.
            const moved = Object.fromEntries(
              Object.entries(pulled.workspace.drafts).filter(
                ([kind, value]) =>
                  value !== saved.drafts[kind as ReportKind],
              ),
            );
            entries = await commitSent(pulled.entries, {
              ...pulled.workspace,
              drafts: moved,
            });
            workspace = pulled.workspace;
          } catch {
            if (active)
              setStorage(
                "Draft storage is unavailable. Keep this page open to preserve your report.",
              );
          }
        }
      }
      if (!active) return;
      setSent(entries);
      if (workspace) {
        draftsRef.current = workspace.drafts;
        const next = workspace.drafts[workspace.activeKind] ?? {
          ...emptyDraft(),
          kind: workspace.activeKind,
        };
        draftRef.current = next;
        fresh.current = next;
        setDraft(next);
        setStep(next.receipt ? "receipt" : next.frozen ? "review" : "edit");
      } else fresh.current = draftRef.current;
    })()
      .catch(() => {
        if (active)
          setStorage(
            "Draft storage is unavailable. Keep this page open to preserve your report.",
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (draft === fresh.current) return;
    if (draft.receipt && committedIds.current.has(draft.receipt.id)) return;
    pending.current = { ...pending.current, [draft.kind]: draft };
    // Text is small, so it is written at once: a write that starts late can be cut off by a
    // reload. Files are Blobs and slow to store, so bursts of changes to them wait 300 ms.
    saveTimer.current = setTimeout(
      () => {
        void flush();
      },
      draft.files.length ? 300 : 0,
    );
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loaded, flush]);
  useEffect(() => {
    // An idle tab never writes: only edits not yet stored are flushed.
    const save = () => {
      if (loaded) void flush();
    };
    // Drafts load first; a request made before then, or before this panel mounted, stays pending.
    const take = () => {
      if (!loaded) return;
      const request = takeRequest();
      if (!request || busy || capture) return;
      selectDraft(request.kind ?? "request", request.topic);
      setOpen(true);
    };
    take();
    const hidden = () => {
      if (document.visibilityState === "hidden") save();
      else if (
        loaded &&
        !busy &&
        !capture &&
        !picking &&
        !committing.current &&
        !Object.keys(pending.current).length
      )
        void refreshFromStorage();
    };
    const focused = () => {
      if (loaded && document.visibilityState === "visible") hidden();
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("focus", focused);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener(REPORT_EVENT, take);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("focus", focused);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener(REPORT_EVENT, take);
    };
  }, [loaded, flush, selectDraft, busy, capture, picking]);
  /** A tab with nothing unsaved shows what other tabs have stored, so it cannot resend a report another tab sent. */
  async function refreshFromStorage() {
    try {
      const seen = draftRef.current;
      const [workspace, list] = await Promise.all([
        loadDraftWorkspace(),
        loadSent(),
      ]);
      // Anything typed while this was reading wins: it may be mid-write and not stored yet.
      if (
        Object.keys(pending.current).length ||
        committing.current ||
        draftRef.current !== seen
      )
        return;
      setSent(list);
      if (!workspace) return;
      draftsRef.current = workspace.drafts;
      const kind = draftRef.current.kind,
        next = workspace.drafts[kind] ?? { ...emptyDraft(), kind };
      const sig = (value: ReportingDraft) =>
        JSON.stringify({
          ...value,
          files: value.files.map((file) => file.id),
        });
      if (sig(next) === sig(draftRef.current)) return;
      draftRef.current = next;
      fresh.current = next;
      setDraft(next);
      setError("");
      setBanner(null);
      setConfirmDiscard(false);
      setStep(next.receipt ? "receipt" : next.frozen ? "review" : "edit");
    } catch {
      // The tab keeps what it shows.
    }
  }
  const loadConfig = useCallback(() => {
    if (!REPORTING_API) return;
    setConfigError("");
    reportingFetch<ReportingConfig>("/v1/config")
      .then(setConfig)
      .catch((cause) => setConfigError(message(cause)));
  }, []);
  useEffect(() => {
    if (!open || !REPORTING_API) return;
    const abort = new AbortController();
    reportingFetch<ReportingConfig>("/v1/config", { signal: abort.signal })
      .then((value) => {
        if (!abort.signal.aborted) {
          setConfig(value);
          setConfigError("");
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setConfigError(message(cause));
      });
    return () => abort.abort();
  }, [open]);
  const lookupOn = draft.kind === "request" && draft.title.trim().length >= 3;
  useEffect(() => {
    if (!open || !lookupOn || !REPORTING_API) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => {
      reportingFetch<{ requests: RequestTopic[] }>(
        `/v1/requests?q=${encodeURIComponent(draft.title)}&offset=0`,
        { signal: abort.signal },
      )
        .then((result) => setTopics(result.requests))
        .catch(() => {
          if (!abort.signal.aborted) setTopics([]);
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [open, draft.title, lookupOn]);
  useEffect(() => {
    if (step !== "edit") reviewTitle.current?.focus();
  }, [step]);
  const approvedTopics = lookupOn
    ? topics.filter((t) => t.approved).slice(0, 4)
    : [];
  const matches = useMemo(
    () =>
      draft.kind === "request" ? findComponents(draft.title, entries) : [],
    [draft.title, draft.kind, entries],
  );
  const siteKey = REPORTING_SITE_KEY || config?.turnstileSiteKey || "";
  const setup = !REPORTING_API
    ? "Reporting is being connected. You can prepare a draft; sending is unavailable."
    : configError || (!config ? "Connecting to the report service…" : "");
  async function addFiles(files: File[]) {
    const next: ReportFile[] = [
      ...draftRef.current.files,
      ...files.map((file) => ({ file, id: crypto.randomUUID() })),
    ];
    setError("");
    setBusy("Checking attachments…");
    try {
      await manifestFiles(next);
      update({ files: next });
      // A file is written to storage now, not after the debounce: storing a Blob takes long
      // enough that a reload right after attaching would otherwise cut the write off.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persist({ ...draftRef.current, files: next });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy("");
    }
  }
  async function prepare(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy("Preparing your review…");
    try {
      const current = draftRef.current;
      const references = Array.from(
        new Set(
          (current.description.match(/https?:\/\/[^\s<>]+/gi) ?? []).map(
            (value) => value.replace(/[),.;!?]+$/, ""),
          ),
        ),
      );
      const report = validateReport({
        id: crypto.randomUUID(),
        kind: current.kind,
        title: current.title,
        description:
          current.description.trim() ||
          (current.topicId ? "I would like this component too." : ""),
        email: current.email,
        references,
        pins: current.kind === "bug" ? submittedPins(current.pins) : [],
        attachments: await manifestFiles(current.files),
        diagnostics: current.kind === "bug" ? current.diagnostics : null,
        ...(current.topicId ? { topicId: current.topicId } : {}),
      });
      update({ frozen: { report, token: receiptSecret() } });
      setStep("review");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy("");
    }
  }
  async function uploadFiles(receipt: Receipt): Promise<boolean> {
    let currentReceipt = receipt;
    const failures: string[] = [];
    for (const item of draftRef.current.files) {
      if (
        currentReceipt.attachments.some(
          (file) =>
            file.id === item.id &&
            (sentFile(file.state) || file.state === "expired"),
        )
      )
        continue;
      setBusy(`Uploading ${item.file.name}…`);
      try {
        await uploadAttachment(currentReceipt, item);
        currentReceipt = {
          ...currentReceipt,
          attachments: currentReceipt.attachments.map((file) =>
            file.id === item.id ? { ...file, state: "uploaded" } : file,
          ),
        };
        const next = { ...draftRef.current, receipt: currentReceipt };
        draftRef.current = next;
        setDraft(next);
        await persist(next);
      } catch (cause) {
        failures.push(`${item.file.name}: ${message(cause)}`);
      }
    }
    if (failures.length)
      setError(
        `Your report is safely received. These files still need uploading: ${failures.join(" ")}`,
      );
    setBusy("");
    return currentReceipt.attachments.every(
      (file) => sentFile(file.state) || file.state === "expired",
    );
  }
  /**
   * The one way into the sent list (send, Start another, import). When storage cannot be opened at
   * all, the list is kept in memory for this page and says so; any other failure throws to the caller.
   */
  async function recordSent(
    entries: SentEntry[],
    workspace?: ReportingDraftWorkspace,
  ) {
    try {
      setSent(await commitSent(entries, workspace));
    } catch (cause) {
      if (!(cause instanceof StorageUnavailableError)) throw cause;
      setSent((list) => mergeSent(list, entries));
      setSentInMemory(true);
    }
  }
  /** Steps 3 and 4 of a send: one transaction clears the draft and adds the receipt to the list; only then does the form change. */
  async function completeSend(withBanner: boolean) {
    const current = draftRef.current,
      accepted = current.receipt;
    if (!accepted || committing.current) return;
    const kind = current.kind,
      blank = { ...emptyDraft(), kind };
    // No timed save may run from here on: it would write the old draft after the commit.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const { [kind]: dropped, ...others } = pending.current;
    pending.current = others;
    committing.current = true;
    setBusy("Saving to the sent list…");
    try {
      await recordSent(
        [
          {
            kind,
            title:
              current.frozen?.report.title ||
              current.title ||
              importedTitle(kind),
            sentAt: Date.now(),
            receipt: accepted,
          },
        ],
        { activeKind: kind, drafts: { [kind]: blank } },
      );
      // A save deferred while the commit ran holds the pre-send draft: drop it again.
      committedIds.current.add(accepted.id);
      pending.current = { ...pending.current };
      delete pending.current[kind];
      draftsRef.current = { ...draftsRef.current, [kind]: blank };
      draftRef.current = blank;
      fresh.current = blank;
      setDraft(blank);
      setStep("edit");
      setBanner(withBanner ? { kind, id: accepted.id } : null);
      setConfirmDiscard(false);
      setError("");
    } catch {
      if (dropped) pending.current = { ...pending.current, [kind]: dropped };
      setError(SENT_SAVE_ERROR);
      setStep("receipt");
    } finally {
      committing.current = false;
      setBusy("");
      // Any other kind deferred during the commit is written now.
      void flush();
    }
  }
  async function send() {
    if (!draft.frozen || !config || (!config.local && !turnstileToken)) return;
    setError("");
    setBusy("Sending your report…");
    const previouslyAttempted = draft.attempted;
    const frozen = draft.frozen,
      next = { ...draft, attempted: true };
    draftRef.current = next;
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(next);
    try {
      const receipt = await submitReport(frozen, turnstileToken);
      const accepted = { ...draftRef.current, receipt };
      draftRef.current = accepted;
      setDraft(accepted);
      if (accepted.files.length) setStep("receipt");
      await persist(accepted);
      if (await uploadFiles(receipt)) await completeSend(true);
    } catch (cause) {
      setError(message(cause));
      if (canEditRejectedSubmission(cause, previouslyAttempted)) {
        const editable = {
          ...draftRef.current,
          attempted: false,
          frozen: null,
        };
        draftRef.current = editable;
        setDraft(editable);
        setStep("edit");
        await persist(editable);
      }
    } finally {
      setBusy("");
      setTurnstileToken("");
      setVerificationAttempt((value) => value + 1);
    }
  }
  async function refreshReceipt() {
    const id = draft.frozen?.report.id ?? draft.receipt?.id,
      token = draft.frozen?.token ?? draft.receipt?.token;
    if (!id || !token) return;
    setBusy("Checking receipt…");
    setError("");
    try {
      const receipt = await fetchReceipt(id, token);
      const arrived = !draftRef.current.receipt;
      const next = { ...draftRef.current, receipt };
      draftRef.current = next;
      setDraft(next);
      setStep("receipt");
      // A report found after an unclear send is done the same way as one that just went through.
      if (
        arrived &&
        receipt.attachments.every(
          (file) => sentFile(file.state) || file.state === "expired",
        )
      ) {
        await persist(next);
        await completeSend(true);
      }
    } catch (cause) {
      if (
        cause instanceof ReportingError &&
        cause.status === 404 &&
        draft.attempted &&
        !draft.receipt
      ) {
        const editable = {
          ...draftRef.current,
          attempted: false,
          frozen: null,
        };
        draftRef.current = editable;
        setDraft(editable);
        setStep("edit");
        await persist(editable);
        setError(
          "No report was found for this receipt. You can edit your draft and submit again.",
        );
      } else setError(message(cause));
    } finally {
      setBusy("");
    }
  }
  async function importReceipt(file: File) {
    setBusy("Checking receipt…");
    setError("");
    try {
      if (file.size > 100000)
        throw new Error("Choose a Cojeev receipt JSON file.");
      const imported = JSON.parse(await file.text()) as {
        id?: unknown;
        token?: unknown;
      };
      if (
        !isUUID(imported.id) ||
        typeof imported.token !== "string" ||
        !/^[a-f0-9]{64}$/.test(imported.token)
      )
        throw new Error("This file is not a valid Cojeev receipt.");
      const receipt = await fetchReceipt(imported.id, imported.token);
      // Only the list changes: the form and both drafts stay exactly as they are.
      const kind = receipt.kind ?? draftRef.current.kind;
      await recordSent([
        {
          kind,
          title: importedTitle(kind),
          sentAt: Date.now(),
          receipt,
        },
      ]);
      setSentExpanded(true);
      setOpenSentId(receipt.id);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy("");
    }
  }
  async function clear() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const next = { ...emptyDraft(), kind: draftRef.current.kind };
    draftRef.current = next;
    setDraft(next);
    setStep("edit");
    setError("");
    setCapture(null);
    draftsRef.current = { ...draftsRef.current, [next.kind]: next };
    try {
      await saveDraftKinds({
        activeKind: next.kind,
        drafts: { [next.kind]: next },
      });
      setStorage("This draft was cleared. Your other draft is unchanged.");
    } catch {
      setStorage(
        "Could not remove the saved draft. Clear this site’s browser storage to remove it.",
      );
    }
  }
  function stopCapture() {
    captureRun.current?.abort();
    // Clearing the handle makes the aborted run stale, so its own cleanup cannot
    // reopen the drawer or clear status that a newer interaction now owns.
    captureRun.current = null;
    setProgress(null);
    setBusy("");
    setOpen(true);
  }
  async function screenshot(mode: "viewport" | "page", area?: CaptureArea) {
    captureRun.current?.abort();
    const run = new AbortController();
    captureRun.current = run;
    const stale = () => captureRun.current !== run;
    setProgress({ phase: "preparing" });
    setBusy("Capturing the page…");
    setError("");
    try {
      const file = await capturePage(mode, {
        area,
        signal: run.signal,
        onProgress: (value) => {
          if (!stale()) setProgress(value);
        },
      });
      // A late result from a cancelled or superseded run must never become an attachment.
      if (stale() || run.signal.aborted) return;
      setCapture(file);
    } catch (cause) {
      if (stale() || cause instanceof CaptureCancelled) return;
      setError(`${message(cause)} You can attach an image or video instead.`);
    } finally {
      if (!stale()) {
        captureRun.current = null;
        setProgress(null);
        setBusy("");
        setOpen(true);
      }
    }
  }
  async function retryUploads(receipt: Receipt) {
    setError("");
    setConfirmDiscard(false);
    if (await uploadFiles(receipt)) await completeSend(true);
  }
  /** Refreshes one list entry in place. A refresh that runs when a row opens is silent about failure. */
  async function refreshSent(id: string, silent: boolean) {
    const entry = sent.find((item) => item.receipt.id === id);
    if (!entry) return;
    if (!silent) {
      setBusy("Checking receipt…");
      setError("");
    }
    try {
      const fresh = await fetchReceipt(id, entry.receipt.token);
      setSent(await replaceSentReceipt(fresh));
    } catch (cause) {
      if (!silent) setError(message(cause));
    } finally {
      if (!silent) setBusy("");
    }
  }
  async function forgetSent(id: string) {
    try {
      setSent(await removeSent(id));
      setOpenSentId(null);
    } catch (cause) {
      setError(message(cause));
    }
  }
  useEffect(() => {
    if (!focusSent.current || !openSentId || !sentExpanded) return;
    focusSent.current = false;
    document
      .querySelector<HTMLElement>(".report-sent-detail h3")
      ?.focus();
  }, [openSentId, sentExpanded, sent]);
  const receipt = draft.receipt;
  const remainingFiles =
    receipt?.attachments.filter(
      (file) => !sentFile(file.state) && file.state !== "expired",
    ).length ?? 0;
  const reportContent = (
    <div data-reporting-chrome="" className="report-sheet">
      {!loaded ? (
        <p role="status">Loading your saved draft…</p>
      ) : (
        <>
          {setup && (
            <div className="report-notice" role="status">
              <p>{setup}</p>
              {configError && (
                <Button variant="outline" size="sm" onClick={loadConfig}>
                  Retry connection
                </Button>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="report-error">
              {error}
            </div>
          )}
          {capture ? (
            <CropEditor
              file={capture}
              onCancel={() => setCapture(null)}
              onAccept={(file) => {
                setCapture(null);
                void addFiles([file]);
              }}
            />
          ) : step === "edit" ? (
            <form
              onSubmit={prepare}
              className="report-form"
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                  event.preventDefault();
                  setDragging(true);
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setDragging(false);
              }}
              onDrop={(event) => {
                // Text dragged into a field must reach the field untouched.
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                setDragging(false);
                if (!busy) void addFiles(Array.from(event.dataTransfer.files));
              }}
              data-dragging={dragging || undefined}
            >
              {dragging && (
                <div className="report-drop-overlay" aria-hidden="true">
                  Drop files to attach
                </div>
              )}
              {banner && banner.kind === draft.kind && (
                <div className="report-sent-banner" role="status">
                  <span>{SENT_BANNER[banner.kind]}</span>
                  <a
                    href="#sent"
                    onClick={(event) => {
                      event.preventDefault();
                      focusSent.current = true;
                      setSentExpanded(true);
                      setOpenSentId(banner.id);
                      void refreshSent(banner.id, true);
                    }}
                  >
                    View
                  </a>
                </div>
              )}
              <label className="report-field">
                {draft.kind === "request"
                  ? "What component do you want?"
                  : "Short summary"}
                <Input
                  name="title"
                  required
                  minLength={3}
                  maxLength={120}
                  value={draft.title}
                  disabled={!!draft.topicId || !!busy}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder={
                    draft.kind === "request"
                      ? "e.g. A date range picker"
                      : "e.g. The menu closes before I can choose"
                  }
                />
              </label>
              {draft.topicId ? (
                <div className="report-notice">
                  <p>Joining this request. Your email counts once.</p>
                  <button
                    type="button"
                    className="report-link-button"
                    onClick={() => update({ topicId: undefined })}
                  >
                    Ask for something else
                  </button>
                </div>
              ) : (
                <>
                  {!!matches.length && (
                    <section className="report-suggestions">
                      <h3>Already in the library</h3>
                      {matches.map((entry) => (
                        <Link
                          key={entry.name}
                          href={`/docs/${entry.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>{entry.title}</span>
                          <ArrowUpRight size={16} />
                        </Link>
                      ))}
                    </section>
                  )}
                  {!!approvedTopics.length && (
                    <section className="report-suggestions">
                      <h3>Others want this too</h3>
                      {approvedTopics.map((topic) => (
                        <button
                          type="button"
                          key={topic.id}
                          onClick={() =>
                            update({ topicId: topic.id, title: topic.title })
                          }
                        >
                          <span>
                            {topic.title} · {topic.demand}{" "}
                            {topic.demand === 1 ? "person" : "people"} ·{" "}
                            <span className="report-join-label">Join</span>
                          </span>
                        </button>
                      ))}
                    </section>
                  )}
                </>
              )}
              <label className="report-field">
                <span className="report-label-row">
                  <span id={descriptionLabel}>
                    {draft.kind === "request"
                      ? "How would you use it?"
                      : "What happened?"}
                  </span>
                  {draft.topicId && (
                    <span className="report-optional">Optional</span>
                  )}
                </span>
                <TextareaScrollArea>
                  <Textarea
                    name="description"
                    aria-labelledby={descriptionLabel}
                    required={!draft.topicId}
                    maxLength={6000}
                    value={draft.description}
                    disabled={!!busy}
                    onChange={(event) =>
                      update({ description: event.target.value })
                    }
                    placeholder={
                      draft.kind === "request"
                        ? "Who needs it and why. Links welcome."
                        : "What you did, what you expected, what you saw."
                    }
                  />
                </TextareaScrollArea>
              </label>
              <TooltipProvider>
                <div className="report-toolbar">
                  <input
                    ref={fileInput}
                    className="sr-only"
                    type="file"
                    accept={MEDIA_TYPES.join(",")}
                    multiple
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => {
                      void addFiles(Array.from(event.target.files ?? []));
                      event.target.value = "";
                    }}
                    aria-label="Attach images or videos"
                  />
                  <ReportTool
                    label="Attach files"
                    word="Attach"
                    icon={<Paperclip size={17} />}
                    disabled={!!busy || draft.files.length >= LIMITS.files}
                    onClick={() => fileInput.current?.click()}
                  />
                  {draft.kind === "bug" && (
                    <>
                      <ReportTool
                        label="Pin elements"
                        word="Pin"
                        icon={<PinIcon size={17} />}
                        disabled={!!busy}
                        onClick={() => setPicking("pins")}
                      />
                      <ReportTool
                        label="Select area"
                        word="Area"
                        icon={<Crop size={17} />}
                        disabled={!!busy || draft.files.length >= LIMITS.files}
                        onClick={() => {
                          // The drawer must be shut before the rectangle is drawn
                          // and stay shut until the capture is reviewed.
                          setOpen(false);
                          setPicking("area");
                        }}
                      />
                      <ReportTool
                        label="Full page"
                        word="Page"
                        icon={<Camera size={17} />}
                        disabled={!!busy || draft.files.length >= LIMITS.files}
                        onClick={() => {
                          // Radix dismisses the drawer on an outside pointer press, so the
                          // capture toolbar would otherwise close it and lose the reopen.
                          setOpen(false);
                          void screenshot("page");
                        }}
                      />
                      <ReportTool
                        label="Include browser details"
                        word="Details"
                        icon={<Settings size={17} />}
                        pressed={!!draft.diagnostics}
                        onClick={() => {
                          setReviewing(false);
                          update({
                            diagnostics: draft.diagnostics
                              ? null
                              : snapshotDiagnostics(),
                          });
                        }}
                      />
                    </>
                  )}
                  <ReportInfo
                    kind={draft.kind}
                    beta={siteFlags.environment === "beta"}
                  />
                </div>
              </TooltipProvider>
              <div className="report-chips">
                {!!draft.files.length && (
                  <div className="report-attachments">
                    {draft.files.map((item) => (
                      <figure key={item.id} className="report-chip">
                        <FilePreview file={item.file} />
                        <figcaption>
                          <span className="report-chip-text">
                            {item.file.name}
                          </span>
                          <Button
                            variant="ghost"
                            className="report-chip-remove"
                            aria-label={`Remove ${item.file.name}`}
                            disabled={!!busy}
                            onClick={() =>
                              update({
                                files: draft.files.filter(
                                  (file) => file.id !== item.id,
                                ),
                              })
                            }
                          >
                            <X size={14} />
                          </Button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {draft.kind === "bug" && !!draft.pins.length && (
                  <ol className="report-pins">
                    {draft.pins.map((pin, index) => (
                      <li
                        key={pin.path}
                        className="report-chip"
                        title={pin.path}
                      >
                        <span className="report-chip-text">
                          {pinChipText(pin, index + 1)}
                        </span>
                        <Button
                          variant="ghost"
                          className="report-chip-remove"
                          aria-label={`Remove pin ${index + 1}`}
                          onClick={() =>
                            update({
                              pins: draft.pins.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <X size={14} />
                        </Button>
                      </li>
                    ))}
                  </ol>
                )}
                {draft.kind === "bug" && draft.diagnostics && (
                  <div className="report-diagnostics-chip report-chip">
                    <span className="report-chip-text">
                      Browser details included
                    </span>
                    <Button
                      variant="ghost"
                      className="report-chip-action"
                      aria-label="Review browser details"
                      aria-expanded={reviewing}
                      onClick={() => setReviewing(!reviewing)}
                    >
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      className="report-chip-remove"
                      aria-label="Remove browser details"
                      onClick={() => {
                        setReviewing(false);
                        update({ diagnostics: null });
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
                {draft.kind === "bug" && draft.diagnostics && reviewing && (
                  <DiagnosticReview
                    diagnostics={draft.diagnostics}
                    onChange={(diagnostics) => {
                      if (!diagnostics) setReviewing(false);
                      update({ diagnostics });
                    }}
                  />
                )}
              </div>
              <label className="report-field">
                Your email
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={draft.email}
                  disabled={!!busy}
                  onChange={(event) => update({ email: event.target.value })}
                  placeholder="you@example.com"
                  aria-describedby="email-help"
                />
              </label>
              <p id="email-help" className="report-help">
                {config?.emailEnabled === false
                  ? "Private. Email updates are off; save your receipt."
                  : "Private. Used only for updates."}
              </p>
              <div className="report-form-footer">
                <Button type="submit" loading={!!busy} fullWidth>
                  Review {draft.kind === "request" ? "request" : "report"}
                  <ArrowUpRight size={17} />
                </Button>
                <div className="report-footer-row">
                  <p className="report-help" role="status">
                    {busy || storage}
                  </p>
                  <MoreMenu
                    disabled={!!busy}
                    onClear={clear}
                    onBoard={() => setOpen(false)}
                    onOpenReceipt={() => receiptInput.current?.click()}
                  />
                </div>
                <SentList
                  entries={sent}
                  expanded={sentExpanded}
                  openId={openSentId}
                  emailEnabled={config?.emailEnabled}
                  busy={!!busy}
                  note={sentInMemory ? SENT_MEMORY_NOTE : ""}
                  onNavigate={() => setOpen(false)}
                  onToggle={() => setSentExpanded((value) => !value)}
                  onOpen={(id) => {
                    setOpenSentId(id);
                    if (id) void refreshSent(id, true);
                  }}
                  onRefresh={(id) => void refreshSent(id, false)}
                  onRemove={(id) => void forgetSent(id)}
                />
                <input
                  ref={receiptInput}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  aria-label="Import a saved receipt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importReceipt(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </form>
          ) : step === "review" && draft.frozen ? (
            <div className="report-review">
              <h2 tabIndex={-1} ref={reviewTitle}>
                Ready to send?
              </h2>
              <p className="report-privacy-line">
                {draft.kind === "request" ? REQUEST_PRIVACY : BUG_PRIVACY}
              </p>
              <div className="report-review-summary">
                <strong>{draft.frozen.report.title}</strong>
                <p>{draft.frozen.report.description}</p>
                <small>Reply to {draft.frozen.report.email}</small>
              </div>
              {!!draft.files.length && (
                <div className="report-attachments">
                  {draft.files.map((item) => (
                    <figure key={item.id}>
                      <FilePreview file={item.file} />
                      <figcaption>{item.file.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <details className="report-json">
                <summary>See exactly what will be sent</summary>
                <ReportSource>
                  {JSON.stringify(draft.frozen.report, null, 2)}
                </ReportSource>
              </details>
              <p className="report-help">
                By sending you approve everything shown, including anything
                visible in your files. Files and technical details are deleted
                after 30 days; your email and report after 180.
              </p>
              {draft.attempted && (
                <div className="report-notice">
                  <p>
                    A send was already tried. Check whether it arrived before
                    retrying.
                  </p>
                  <Button
                    variant="outline"
                    onClick={refreshReceipt}
                    disabled={!!busy}
                  >
                    Check whether it arrived
                  </Button>
                  <details>
                    <summary>Start over instead</summary>
                    <p className="report-help">
                      Starting over deletes this device’s draft and receipt key.
                      A report already accepted stays sent.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={clear}
                    >
                      Clear this local retry
                    </Button>
                  </details>
                </div>
              )}
              {config &&
                !config.local &&
                (siteKey ? (
                  <>
                    <Turnstile
                      siteKey={siteKey}
                      onToken={setTurnstileToken}
                      attempt={verificationAttempt}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setVerificationAttempt((value) => value + 1)
                      }
                    >
                      Retry verification
                    </Button>
                  </>
                ) : (
                  <p className="report-error">
                    Verification is not configured. Sending is unavailable until
                    it is connected.
                  </p>
                ))}
              <Button
                fullWidth
                loading={!!busy}
                disabled={
                  !REPORTING_API ||
                  !config ||
                  (!config.local && !turnstileToken)
                }
                onClick={send}
              >
                {draft.attempted
                  ? "Retry this exact report"
                  : "Send " + (draft.kind === "request" ? "request" : "report")}
              </Button>
              <p className="report-help" role="status">
                {busy || storage}
              </p>
              {!draft.attempted && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    update({ frozen: null });
                    setStep("edit");
                  }}
                >
                  Back to edit
                </Button>
              )}
            </div>
          ) : receipt ? (
            <section className="report-receipt">
              <span className="report-receipt-seal" aria-hidden="true">
                <Check size={28} />
              </span>
              <h2 ref={reviewTitle} tabIndex={-1}>
                Your {draft.kind === "request" ? "request" : "report"} is
                received.
              </h2>
              {receiptExpectation(draft.kind, config?.emailEnabled) && (
                <p>{receiptExpectation(draft.kind, config?.emailEnabled)}</p>
              )}
              {!!remainingFiles && (
                <p>
                  The text is safely stored. Finish uploading the remaining
                  files below.
                </p>
              )}
              <ReceiptDetail
                receipt={receipt}
                kind={draft.kind}
                emailEnabled={config?.emailEnabled}
                busy={!!busy}
                onRefresh={refreshReceipt}
                onNavigate={() => setOpen(false)}
              />
              {!!remainingFiles &&
                (draft.files.length ? (
                  <Button
                    fullWidth
                    loading={!!busy}
                    onClick={() => void retryUploads(receipt)}
                  >
                    Retry remaining uploads
                  </Button>
                ) : (
                  <p className="report-help">
                    The original files aren’t on this device, so they can’t be
                    re-sent from here.
                  </p>
                ))}
              <p className="report-help" role="status">
                {busy || storage}
              </p>
              <Button
                variant="ghost"
                disabled={!!busy}
                onClick={() => {
                  // Unsent files are lost by this, so the first press only asks.
                  if (remainingFiles && !confirmDiscard) setConfirmDiscard(true);
                  else void completeSend(false);
                }}
              >
                {remainingFiles && confirmDiscard
                  ? "Discard remaining files and start another"
                  : "Start another"}
              </Button>
              <Link href="/requests" onClick={() => setOpen(false)}>
                Request board <ArrowUpRight size={15} />
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
  return (
    <>
      <MotionDrawer
        open={open && !picking}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setBanner(null);
          if (!value && loaded) {
            // Save now, once: a reload right after closing must not beat the 300 ms debounce.
            if (saveTimer.current) clearTimeout(saveTimer.current);
            void persist(draftRef.current);
          }
        }}
        variant="stack"
        side="end"
        width={580}
        enableDrag={false}
        title="Request a feature or report a bug"
        description="Tell us what’s missing or what got in your way."
        closeLabel="Close reporting panel"
        onCloseAutoFocus={(event) => {
          if (picking) event.preventDefault();
        }}
        trigger={
          <button
            data-reporting-chrome=""
            type="button"
            className="report-launcher"
            disabled={!loaded}
            data-hidden={open || picking || !!progress || undefined}
          >
            <span className="report-launcher-shape" aria-hidden="true">
              <Sparkles size={21} />
            </span>
            <span>Request a feature / Report a bug</span>
          </button>
        }
        value={draft.kind}
        onValueChange={(value) => {
          if (!busy && !capture && (value === "request" || value === "bug"))
            selectDraft(value);
        }}
        panels={[
          {
            value: "request",
            label: "Request a feature",
            icon: <Sparkles size={17} />,
            disabled: !!busy || !!capture,
            children: draft.kind === "request" ? reportContent : null,
          },
          {
            value: "bug",
            label: "Report a bug",
            icon: <Bug size={17} />,
            disabled: !!busy || !!capture,
            children: draft.kind === "bug" ? reportContent : null,
          },
        ]}
      />
      {picking === "pins" && (
        <PinPicker
          initial={draft.pins}
          onDone={(pins) => {
            update({ pins });
            setPicking(false);
            setOpen(true);
          }}
        />
      )}
      {picking === "area" && (
        <AreaPicker
          onDone={(area) => {
            // Capture before the drawer reopens: reopening would move the page
            // under the rectangle the user just drew. The run itself reopens it.
            setPicking(false);
            if (area) void screenshot("viewport", area);
            else setOpen(true);
          }}
        />
      )}
      {progress && <CaptureStatus progress={progress} onCancel={stopCapture} />}
    </>
  );
}
function DiagnosticReview({
  diagnostics,
  onChange,
}: {
  diagnostics: Diagnostics;
  onChange: (diagnostics: Diagnostics | null) => void;
}) {
  return (
    <div className="report-diagnostic-groups">
      {Object.entries(diagnostics).map(([group, contents]) => (
        <details key={group}>
          <summary>
            {
              (
                {
                  environment: "Device & page",
                  console: "Warnings & errors",
                  network: "Failed requests",
                  actions: "Recent actions",
                } as Record<string, string>
              )[group]
            }
            <span>
              {Array.isArray(contents) ? `${contents.length} events` : ""}
            </span>
          </summary>
          <ReportSource>{JSON.stringify(contents, null, 2)}</ReportSource>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = { ...diagnostics };
              delete next[group as keyof Diagnostics];
              onChange(Object.keys(next).length ? next : null);
            }}
          >
            Remove this group
          </Button>
        </details>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
        Remove all browser details
      </Button>
    </div>
  );
}
