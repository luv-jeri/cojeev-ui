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
import { emailReceiptLabel, issueReceiptLabel } from "@/lib/reporting/receipt-labels";
import { siteFlags } from "@/lib/site-config";
import {
  snapshotDiagnostics,
  startDiagnostics,
} from "@/lib/reporting/diagnostics";
import {
  emptyDraft,
  loadDraftWorkspace,
  saveDraftWorkspace,
  type ReportingDraft,
  type ReportingDraftWorkspace,
} from "@/lib/reporting/draft";
import { CropEditor, FilePreview, PinPicker } from "./capture-controls";
import { REPORT_EVENT, STATUS_LABELS, takeRequest } from "./report-request";
import { AreaPicker, CaptureStatus } from "./area-picker";
import { ReportInfo, ReportTool } from "./report-controls";
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
const sentFile = (state: string) => state === "uploaded" || state === "ready";

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
  const [topics, setTopics] = useState<RequestTopic[]>([]),
    [topicError, setTopicError] = useState("");
  const [picking, setPicking] = useState<false | "pins" | "area">(false),
    [capture, setCapture] = useState<File | null>(null),
    [dragging, setDragging] = useState(false),
    [reviewScope, setReviewScope] = useState("");
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
  const update = (changes: Partial<ReportingDraft>) =>
    setDraft((value) => ({ ...value, ...changes }));
  const persist = useCallback(async (value: ReportingDraft) => {
    draftsRef.current = { ...draftsRef.current, [value.kind]: value };
    try {
      await saveDraftWorkspace({
        activeKind: draftRef.current.kind,
        drafts: draftsRef.current,
      });
      setStorage("Draft saved");
    } catch {
      setStorage(
        "Draft storage is unavailable. Keep this page open; reloading may lose your report and files.",
      );
    }
  }, []);
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
      if (topic && !next.attempted)
        next = { ...next, topicId: topic.id, title: topic.title, frozen: null };
      draftRef.current = next;
      setDraft(next);
      setStep(next.receipt ? "receipt" : next.frozen ? "review" : "edit");
      setError(
        topic && next.attempted
          ? "Your previous request is still here. Finish or clear it before joining another."
          : "",
      );
      setTopics([]);
      setTopicError("");
      setDragging(false);
      setTurnstileToken("");
      setVerificationAttempt((value) => value + 1);
      void persist(next);
    },
    [persist],
  );
  useEffect(() => startDiagnostics(), []);
  useEffect(() => {
    let active = true;
    loadDraftWorkspace()
      .then((saved) => {
        if (active && saved) {
          draftsRef.current = saved.drafts;
          const next = saved.drafts[saved.activeKind] ?? {
            ...emptyDraft(),
            kind: saved.activeKind,
          };
          draftRef.current = next;
          setDraft(next);
          setStep(next.receipt ? "receipt" : next.frozen ? "review" : "edit");
        }
      })
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
    // Text is small, so it is written at once: a write that starts late can be cut off by a
    // reload. Files are Blobs and slow to store, so bursts of changes to them wait 300 ms.
    saveTimer.current = setTimeout(
      () => {
        void persist(draft);
      },
      draft.files.length ? 300 : 0,
    );
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loaded, persist]);
  useEffect(() => {
    const save = () => {
      if (loaded) void persist(draftRef.current);
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
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener(REPORT_EVENT, take);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener(REPORT_EVENT, take);
    };
  }, [loaded, persist, selectDraft, busy, capture]);
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
  useEffect(() => {
    if (!open || draft.kind !== "request" || !REPORTING_API) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => {
      reportingFetch<{ requests: RequestTopic[] }>(
        `/v1/requests?q=${encodeURIComponent(draft.title)}&offset=0`,
        { signal: abort.signal },
      )
        .then((result) => {
          setTopics(result.requests);
          setTopicError("");
        })
        .catch((cause) => {
          if (!abort.signal.aborted) setTopicError(message(cause));
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [open, draft.title, draft.kind]);
  useEffect(() => {
    if (step !== "edit") reviewTitle.current?.focus();
  }, [step]);
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
  async function uploadFiles(receipt: Receipt) {
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
      setStep("receipt");
      await persist(accepted);
      await uploadFiles(receipt);
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
      update({ receipt });
      setStep("receipt");
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
      // A receipt belongs to the current card; importing it must not discard
      // the other card's draft or change its report kind without evidence.
      const next = {
        ...emptyDraft(),
        kind: draftRef.current.kind,
        attempted: true,
        receipt,
      };
      draftRef.current = next;
      setDraft(next);
      setStep("receipt");
      await persist(next);
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
      await saveDraftWorkspace({
        activeKind: next.kind,
        drafts: draftsRef.current,
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
  const receipt = draft.receipt;
  const remainingFiles =
    receipt?.attachments.filter(
      (file) => !sentFile(file.state) && file.state !== "expired",
    ).length ?? 0;
  const uploadedFiles =
    receipt?.attachments.filter((file) => sentFile(file.state)).length ?? 0;
  const expiredFiles =
    receipt?.attachments.filter((file) => file.state === "expired").length ?? 0;
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
                          <span>
                            {entry.title}
                            <small>{entry.description}</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </Link>
                      ))}
                    </section>
                  )}
                  {draft.kind === "request" && !!topics.length && (
                    <section className="report-suggestions">
                      <h3>Others are asking for</h3>
                      {topics.slice(0, 4).map((topic) => (
                        <button
                          type="button"
                          key={topic.id}
                          onClick={() =>
                            update({ topicId: topic.id, title: topic.title })
                          }
                        >
                          <span>
                            {topic.title}
                            <small>
                              {topic.demand}{" "}
                              {topic.demand === 1 ? "person" : "people"} ·{" "}
                              {STATUS_LABELS[topic.status]}
                            </small>
                          </span>
                          <span className="report-join-label">Join</span>
                        </button>
                      ))}
                    </section>
                  )}
                  {topicError && (
                    <p className="report-help">
                      Existing requests could not load. You can still describe
                      your request.
                    </p>
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
                      <li key={pin.path} className="report-chip" title={pin.path}>
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
                <p className="report-help" role="status">
                  {busy || storage}
                </p>
                <Button type="submit" loading={!!busy} fullWidth>
                  Review {draft.kind === "request" ? "request" : "report"}
                  <ArrowUpRight size={17} />
                </Button>
                <div className="report-footer-links">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!busy}
                    onClick={clear}
                  >
                    Clear draft
                  </Button>
                  <Link href="/requests" onClick={() => setOpen(false)}>
                    View request board
                  </Link>
                </div>
                <input
                  ref={receiptInput}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Import a saved receipt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importReceipt(file);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => receiptInput.current?.click()}
                >
                  Check a saved receipt
                </Button>
              </div>
            </form>
          ) : step === "review" && draft.frozen ? (
            <div className="report-review">
              <h2 tabIndex={-1} ref={reviewTitle}>
                Ready to send?
              </h2>
              <p>
                {draft.kind === "request"
                  ? "Everything below is private. Your title only reaches the public board if a maintainer approves it."
                  : "Your report and attachments are private. A public issue with a generic title will point maintainers to it."}
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
                <summary>Inspect exactly what will be sent</summary>
                <p className="report-help">
                  These report fields and the files previewed above are
                  submitted. A secret receipt token and a verification token
                  authenticate the request.
                </p>
                <ReportSource>
                  {JSON.stringify(draft.frozen.report, null, 2)}
                </ReportSource>
              </details>
              <p className="report-help">
                By sending, you approve the content shown here, including every
                visible detail in your media. Technical details and media are
                kept for 30 days; contact and private report details for 180
                days.
              </p>
              {draft.attempted && (
                <div className="report-notice">
                  <p>
                    An earlier send was attempted. This exact report is locked
                    for safe retry.
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
                      Clearing removes this device’s draft and receipt key. An
                      already accepted report stays submitted. Check whether it
                      arrived before creating another.
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
              <p>
                {remainingFiles
                  ? "The text is safely stored. Finish uploading the remaining files below."
                  : "Thank you for helping shape Cojeev."}
              </p>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {draft.kind === "bug" && receipt.status === "resolved"
                      ? "Resolved"
                      : STATUS_LABELS[receipt.status]}
                  </dd>
                </div>
                <div>
                  <dt>Email receipt</dt>
                  <dd>
                    {emailReceiptLabel(receipt)}
                  </dd>
                </div>
                <div>
                  <dt>Issue</dt>
                  <dd>
                    {issueReceiptLabel(receipt)}
                  </dd>
                </div>
                <div>
                  <dt>Attachments</dt>
                  <dd>
                    {uploadedFiles} of {receipt.attachments.length} uploaded
                    {expiredFiles ? ` · ${expiredFiles} expired` : ""}
                  </dd>
                </div>
              </dl>
              {receipt.componentUrl && (
                <Button asChild fullWidth>
                  <a href={receipt.componentUrl}>
                    Open component <ArrowUpRight size={17} />
                  </a>
                </Button>
              )}
              <div className="report-receipt-id">
                <span>Report ID</span>
                <code>{receipt.id}</code>
              </div>
              <p className="report-help">
                This private receipt is saved on this device. Download a copy
                before clearing it; the secret token lets you check this report.
              </p>
              <div className="report-row">
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={refreshReceipt}
                >
                  Refresh status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(receipt, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = `cojeev-receipt-${receipt.id}.json`;
                    anchor.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download receipt
                </Button>
              </div>
              {!!remainingFiles &&
                (draft.files.length ? (
                  <Button
                    fullWidth
                    loading={!!busy}
                    onClick={() => {
                      setError("");
                      void uploadFiles(receipt);
                    }}
                  >
                    Retry remaining uploads
                  </Button>
                ) : (
                  <p className="report-help">
                    The original files are not on this device. Reopen the
                    original draft to finish its uploads. Expired attachments
                    are no longer available.
                  </p>
                ))}
              <p className="report-help" role="status">
                {busy || storage}
              </p>
              <Button variant="ghost" disabled={!!busy} onClick={clear}>
                Clear receipt & start another
              </Button>
              <Link href="/requests" onClick={() => setOpen(false)}>
                See what’s being requested <ArrowUpRight size={15} />
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
      {progress && (
        <CaptureStatus progress={progress} onCancel={stopCapture} />
      )}
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
