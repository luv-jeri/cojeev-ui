"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bug, Check, Camera, Paperclip, Pin as PinIcon, Sparkles, X } from "lucide-react";
import { Button } from "@/registry/sahajiv/ui/button";
import { Input } from "@/registry/sahajiv/ui/input";
import { Textarea } from "@/registry/sahajiv/ui/textarea";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/registry/sahajiv/ui/sheet";
import { findComponents, isUUID, LIMITS, MEDIA_TYPES, validateReport, type ComponentMatch, type Diagnostics, type Receipt, type ReportKind, type RequestTopic } from "@/lib/reporting/contracts";
import { canEditRejectedSubmission, fetchReceipt, manifestFiles, receiptSecret, REPORTING_API, REPORTING_SITE_KEY, ReportingError, reportingFetch, submitReport, uploadAttachment, type ReportFile, type ReportingConfig } from "@/lib/reporting/client";
import { capturePage } from "@/lib/reporting/capture";
import { snapshotDiagnostics, startDiagnostics } from "@/lib/reporting/diagnostics";
import { deleteDraft, emptyDraft, loadDraft, saveDraft, type ReportingDraft } from "@/lib/reporting/draft";
import { CropEditor, FilePreview, PinPicker } from "./capture-controls";
import { Turnstile } from "./turnstile";
import "./reporting.css";

export const STATUS_LABELS = { received: "Received", planned: "Planned", in_progress: "In progress", resolved: "Live", declined: "Not planned" } as const;
export function openRequest(topic?: RequestTopic) { window.dispatchEvent(new CustomEvent("sahajiv:report", { detail: { kind: "request", topic } })); }
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Your draft is still here.";
const sentFile = (state: string) => state === "uploaded" || state === "ready";

export function ReportingWidget({ entries }: { entries: ComponentMatch[] }) {
  const path = usePathname();
  return path.includes("feedback-admin") ? null : <ReportingPanel entries={entries} />;
}
function ReportingPanel({ entries }: { entries: ComponentMatch[] }) {
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [draft, setDraft] = useState<ReportingDraft>(emptyDraft);
  const [step, setStep] = useState<"edit" | "review" | "receipt">("edit"), [busy, setBusy] = useState("");
  const [error, setError] = useState(""), [storage, setStorage] = useState(""), [config, setConfig] = useState<ReportingConfig | null>(null), [configError, setConfigError] = useState("");
  const [topics, setTopics] = useState<RequestTopic[]>([]), [topicError, setTopicError] = useState("");
  const [picking, setPicking] = useState(false), [capture, setCapture] = useState<File | null>(null), [dragging, setDragging] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(""), [verificationAttempt, setVerificationAttempt] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null), receiptInput = useRef<HTMLInputElement>(null), draftRef = useRef(draft), saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null), reviewTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const update = (changes: Partial<ReportingDraft>) => setDraft(value => ({ ...value, ...changes }));
  const persist = useCallback(async (value: ReportingDraft) => { try { await saveDraft(value); setStorage("Draft saved on this device."); } catch { setStorage("Draft storage is unavailable. Keep this page open; reloading may lose your report and files."); } }, []);
  useEffect(() => startDiagnostics(), []);
  useEffect(() => {
    let active = true;
    loadDraft().then(saved => { if (active && saved) { setDraft(saved); setStep(saved.receipt ? "receipt" : saved.frozen ? "review" : "edit"); } }).catch(() => { if (active) setStorage("Draft storage is unavailable. Keep this page open to preserve your report."); }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveTimer.current = setTimeout(() => { void persist(draft); }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, loaded, persist]);
  useEffect(() => {
    const save = () => { if (loaded) void persist(draftRef.current); };
    const event = (event: Event) => {
      const { kind, topic } = (event as CustomEvent<{ kind?: ReportKind; topic?: RequestTopic }>).detail ?? {};
      if (draftRef.current.attempted) { setError("Your previous report is still here. Finish or clear it before starting another."); setOpen(true); return; }
      setDraft(value => ({ ...value, kind: kind ?? "request", diagnostics: kind === "bug" ? snapshotDiagnostics() : null, topicId: topic?.id, title: topic?.title ?? value.title, frozen: null })); setStep("edit"); setOpen(true);
    };
    window.addEventListener("pagehide", save); window.addEventListener("sahajiv:report", event);
    return () => { window.removeEventListener("pagehide", save); window.removeEventListener("sahajiv:report", event); };
  }, [loaded, persist]);
  const loadConfig = useCallback(() => {
    if (!REPORTING_API) return;
    setConfigError(""); reportingFetch<ReportingConfig>("/v1/config").then(setConfig).catch(cause => setConfigError(message(cause)));
  }, []);
  useEffect(() => {
    if (!open || !REPORTING_API) return;
    const abort = new AbortController();
    reportingFetch<ReportingConfig>("/v1/config", { signal: abort.signal }).then(value => { if (!abort.signal.aborted) { setConfig(value); setConfigError(""); } }).catch(cause => { if (!abort.signal.aborted) setConfigError(message(cause)); });
    return () => abort.abort();
  }, [open]);
  useEffect(() => {
    if (!open || draft.kind !== "request" || !REPORTING_API) return;
    const abort = new AbortController(); const timeout = setTimeout(() => {
      reportingFetch<{ requests: RequestTopic[] }>(`/v1/requests?q=${encodeURIComponent(draft.title)}&offset=0`, { signal: abort.signal }).then(result => { setTopics(result.requests); setTopicError(""); }).catch(cause => { if (!abort.signal.aborted) setTopicError(message(cause)); });
    }, 300);
    return () => { clearTimeout(timeout); abort.abort(); };
  }, [open, draft.title, draft.kind]);
  useEffect(() => { if (step !== "edit") reviewTitle.current?.focus(); }, [step]);
  const matches = useMemo(() => draft.kind === "request" ? findComponents(draft.title, entries) : [], [draft.title, draft.kind, entries]);
  const siteKey = REPORTING_SITE_KEY || config?.turnstileSiteKey || "";
  const setup = !REPORTING_API ? "Reporting is being connected. You can prepare a draft; sending is unavailable." : configError || (!config ? "Connecting to the report service…" : "");
  async function addFiles(files: File[]) {
    const next: ReportFile[] = [...draftRef.current.files, ...files.map(file => ({ file, id: crypto.randomUUID() }))];
    setError(""); setBusy("Checking attachments…");
    try { await manifestFiles(next); update({ files: next }); } catch (cause) { setError(message(cause)); } finally { setBusy(""); }
  }
  async function prepare(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy("Preparing your review…");
    try {
      const current = draftRef.current;
      const references = Array.from(new Set((current.description.match(/https?:\/\/[^\s<>]+/gi) ?? []).map(value => value.replace(/[),.;!?]+$/, ""))));
      const report = validateReport({ id: crypto.randomUUID(), kind: current.kind, title: current.title, description: current.description.trim() || (current.topicId ? "I would like this component too." : ""), email: current.email, references, pins: current.kind === "bug" ? current.pins : [], attachments: await manifestFiles(current.files), diagnostics: current.kind === "bug" ? current.diagnostics : null, ...(current.topicId ? { topicId: current.topicId } : {}) });
      update({ frozen: { report, token: receiptSecret() } }); setStep("review");
    } catch (cause) { setError(message(cause)); } finally { setBusy(""); }
  }
  async function uploadFiles(receipt: Receipt) {
    let currentReceipt = receipt; const failures: string[] = [];
    for (const item of draftRef.current.files) {
      if (currentReceipt.attachments.some(file => file.id === item.id && (sentFile(file.state) || file.state === "expired"))) continue;
      setBusy(`Uploading ${item.file.name}…`);
      try {
        await uploadAttachment(currentReceipt, item);
        currentReceipt = { ...currentReceipt, attachments: currentReceipt.attachments.map(file => file.id === item.id ? { ...file, state: "uploaded" } : file) };
        const next = { ...draftRef.current, receipt: currentReceipt }; draftRef.current = next; setDraft(next); await persist(next);
      } catch (cause) { failures.push(`${item.file.name}: ${message(cause)}`); }
    }
    if (failures.length) setError(`Your report is safely received. These files still need uploading: ${failures.join(" ")}`);
    setBusy("");
  }
  async function send() {
    if (!draft.frozen || !config || (!config.local && !turnstileToken)) return;
    setError(""); setBusy("Sending your report…");
    const previouslyAttempted = draft.attempted;
    const frozen = draft.frozen, next = { ...draft, attempted: true };
    draftRef.current = next; setDraft(next); if (saveTimer.current) clearTimeout(saveTimer.current); await persist(next);
    try {
      const receipt = await submitReport(frozen, turnstileToken);
      const accepted = { ...draftRef.current, receipt }; draftRef.current = accepted; setDraft(accepted); setStep("receipt"); await persist(accepted);
      await uploadFiles(receipt);
    } catch (cause) {
      setError(message(cause));
      if (canEditRejectedSubmission(cause, previouslyAttempted)) {
        const editable = { ...draftRef.current, attempted: false, frozen: null }; draftRef.current = editable; setDraft(editable); setStep("edit"); await persist(editable);
      }
    } finally { setBusy(""); setTurnstileToken(""); setVerificationAttempt(value => value + 1); }
  }
  async function refreshReceipt() {
    const id = draft.frozen?.report.id ?? draft.receipt?.id, token = draft.frozen?.token ?? draft.receipt?.token;
    if (!id || !token) return; setBusy("Checking receipt…"); setError("");
    try { const receipt = await fetchReceipt(id, token); update({ receipt }); setStep("receipt"); }
    catch (cause) {
      if (cause instanceof ReportingError && cause.status === 404 && draft.attempted && !draft.receipt) {
        const editable = { ...draftRef.current, attempted: false, frozen: null }; draftRef.current = editable; setDraft(editable); setStep("edit"); await persist(editable); setError("No report was found for this receipt. You can edit your draft and submit again.");
      } else setError(message(cause));
    } finally { setBusy(""); }
  }
  async function importReceipt(file: File) {
    setBusy("Checking receipt…"); setError("");
    try {
      if (file.size > 100000) throw new Error("Choose a SahaJiv receipt JSON file.");
      const imported = JSON.parse(await file.text()) as { id?: unknown; token?: unknown };
      if (!isUUID(imported.id) || typeof imported.token !== "string" || !/^[a-f0-9]{64}$/.test(imported.token)) throw new Error("This file is not a valid SahaJiv receipt.");
      const receipt = await fetchReceipt(imported.id, imported.token);
      setDraft({ ...emptyDraft(), kind: "bug", attempted: true, receipt }); setStep("receipt");
    } catch (cause) { setError(message(cause)); } finally { setBusy(""); }
  }
  async function clear() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const next = emptyDraft(); draftRef.current = next; setDraft(next); setStep("edit"); setError(""); setCapture(null);
    try { await deleteDraft(); setStorage("Draft cleared from this device."); } catch { setStorage("Could not remove the saved draft. Clear this site’s browser storage to remove it."); }
  }
  async function screenshot(mode: "viewport" | "page") {
    setBusy("Capturing the page…"); setError("");
    try { setCapture(await capturePage(mode)); } catch (cause) { setError(`${message(cause)} You can attach an image or video instead.`); } finally { setBusy(""); }
  }
  const receipt = draft.receipt;
  const remainingFiles = receipt?.attachments.filter(file => !sentFile(file.state) && file.state !== "expired").length ?? 0;
  const uploadedFiles = receipt?.attachments.filter(file => sentFile(file.state)).length ?? 0;
  const expiredFiles = receipt?.attachments.filter(file => file.state === "expired").length ?? 0;
  return <>
    <Sheet open={open && !picking} onOpenChange={value => { setOpen(value); if (!value && loaded) void persist(draftRef.current); }}>
      <SheetTrigger asChild><button data-reporting-chrome="" type="button" className="report-launcher" disabled={!loaded} data-hidden={open || picking || undefined} aria-label="Request a component or report a bug"><span className="report-launcher-shape" aria-hidden="true"><Sparkles size={21} /></span><span>Make it better</span></button></SheetTrigger>
      <SheetContent data-reporting-chrome="" className="report-sheet" onCloseAutoFocus={event => { if (picking) event.preventDefault(); }}>
        <SheetHeader><div><span className="report-kicker">A little input. A better library.</span><SheetTitle>Make it better</SheetTitle></div><SheetClose asChild><Button variant="ghost" className="report-icon-button" aria-label="Close reporting panel"><X size={20} /></Button></SheetClose></SheetHeader>
        <SheetDescription>Tell us what’s missing or what got in your way.</SheetDescription>
        {!loaded ? <p role="status">Loading your saved draft…</p> : <>
          {setup && <div className="report-notice" role="status"><p>{setup}</p>{configError && <Button variant="outline" size="sm" onClick={loadConfig}>Retry connection</Button>}</div>}
          {config && !config.emailEnabled && <p className="report-help">Email updates are not connected yet. Your email stays private; keep your receipt to check progress here.</p>}
          {error && <div role="alert" className="report-error">{error}</div>}
          {capture ? <CropEditor file={capture} onCancel={() => setCapture(null)} onAccept={file => { setCapture(null); void addFiles([file]); }} /> : step === "edit" ? <form onSubmit={prepare} className="report-form">
            <fieldset disabled={!!busy}><legend className="sr-only">Report type</legend><div className="report-kind">{(["request", "bug"] as const).map(kind => <Button key={kind} variant={draft.kind === kind ? "accent" : "ghost"} aria-pressed={draft.kind === kind} onClick={() => update({ kind, topicId: undefined, diagnostics: kind === "bug" ? snapshotDiagnostics() : null })}>{kind === "request" ? <Sparkles size={17} /> : <Bug size={17} />}{kind === "request" ? "Request a component" : "Report a bug"}</Button>)}</div></fieldset>
            {draft.kind === "request" && <p className="report-target">We aim to build requested components within <strong>36 hours</strong>. Timing depends on demand and complexity.</p>}
            <label className="report-field">{draft.kind === "request" ? "Component title" : "What went wrong?"}<Input name="title" required minLength={3} maxLength={120} value={draft.title} disabled={!!draft.topicId || !!busy} onChange={event => update({ title: event.target.value })} placeholder={draft.kind === "request" ? "e.g. A date range picker" : "e.g. The menu closes before I can choose"} aria-describedby={draft.kind === "request" ? "public-title" : undefined} /></label>
            {draft.kind === "request" && <p id="public-title" className="report-help">This title will be public on the request board. Keep personal information out of it. Everything else stays private.</p>}
            {draft.topicId ? <div className="report-notice"><p>You’re joining an existing request. Your email counts once toward its demand.</p><Button size="sm" variant="outline" onClick={() => update({ topicId: undefined })}>Make a different request</Button></div> : <>
              {!!matches.length && <section className="report-suggestions"><h3>Already in the library</h3>{matches.map(entry => <Link key={entry.name} href={`/docs/${entry.name}`} target="_blank" rel="noopener noreferrer"><span>{entry.title}<small>{entry.description}</small></span><ArrowUpRight size={16} /></Link>)}</section>}
              {draft.kind === "request" && !!topics.length && <section className="report-suggestions"><h3>Others are asking for</h3>{topics.slice(0, 4).map(topic => <button type="button" key={topic.id} onClick={() => update({ topicId: topic.id, title: topic.title })}><span>{topic.title}<small>{topic.demand} {topic.demand === 1 ? "person" : "people"} · {STATUS_LABELS[topic.status]}</small></span><span className="report-join-label">Join</span></button>)}</section>}
              {topicError && <p className="report-help">Existing requests could not load. You can still describe your request.</p>}
            </>}
            <label className="report-field">{draft.kind === "request" ? "Details, inspiration & links" : "What happened, and what did you expect?"}{draft.topicId && <span className="report-help">Optional additional context</span>}<Textarea name="description" required={!draft.topicId} maxLength={6000} value={draft.description} disabled={!!busy} onChange={event => update({ description: event.target.value })} placeholder={draft.kind === "request" ? "Describe how you’d use it. Add reference links or tell us why it would help." : "Include the steps that led here and what you expected to happen. You can paste links here too."} /></label>
            <label className="report-field">Your email<Input name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} disabled={!!busy} onChange={event => update({ email: event.target.value })} placeholder="you@example.com" aria-describedby="email-help" /></label><p id="email-help" className="report-help">For a receipt and progress updates. Never shown on the public board.</p>
            <section className="report-evidence" onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) void addFiles(Array.from(event.dataTransfer.files)); }} data-dragging={dragging || undefined}><h3>Show us what you mean <span>Optional</span></h3><input ref={fileInput} className="sr-only" type="file" accept={MEDIA_TYPES.join(",")} multiple tabIndex={-1} onChange={event => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} aria-label="Attach images or videos" /><div className="report-row"><Button variant="outline" disabled={!!busy || draft.files.length >= LIMITS.files} onClick={() => fileInput.current?.click()}><Paperclip size={16} />Attach files</Button>{draft.kind === "bug" && <><Button variant="outline" disabled={!!busy} onClick={() => setPicking(true)}><PinIcon size={16} />Pin elements</Button><Button variant="outline" disabled={!!busy || draft.files.length >= LIMITS.files} onClick={() => screenshot("viewport")}><Camera size={16} />This view</Button><Button variant="outline" disabled={!!busy || draft.files.length >= LIMITS.files} onClick={() => screenshot("page")}>Full page</Button></>}</div><p className="report-drop-hint">{dragging ? "Drop files here" : "Drag images or videos here, or choose files above."}</p><p className="report-help">PNG, JPEG, WebP, MP4 or WebM. Up to six files, 10 MiB each, 30 MiB total. Screenshots are captured only when you ask.</p>
              {!!draft.files.length && <div className="report-attachments">{draft.files.map(item => <figure key={item.id}><FilePreview file={item.file} /><figcaption><span>{item.file.name}<small>{(item.file.size / 1024 / 1024).toFixed(2)} MiB</small></span><Button variant="ghost" className="report-icon-button" aria-label={`Remove ${item.file.name}`} disabled={!!busy} onClick={() => update({ files: draft.files.filter(file => file.id !== item.id) })}><X size={16} /></Button></figcaption></figure>)}</div>}
              {draft.kind === "bug" && !!draft.pins.length && <ol className="report-pins">{draft.pins.map((pin, index) => <li key={pin.path}><span>Pin {index + 1} · {pin.tag}<small>{pin.path}</small></span><Button variant="ghost" size="sm" aria-label={`Remove pin ${index + 1}`} onClick={() => update({ pins: draft.pins.filter((_, i) => i !== index) })}>Remove</Button></li>)}</ol>}
            </section>
            {draft.kind === "bug" && <section className="report-diagnostics"><h3>Browser details <span>You’re in control</span></h3><p className="report-help">Include device details and recent errors, failed routes, and structural clicks. No field values, request bodies, headers, cookies or storage are collected. Review and remove any group before sending.</p><Button variant="outline" onClick={() => update({ diagnostics: snapshotDiagnostics() })}>{draft.diagnostics ? "Refresh browser details" : "Include browser details"}</Button>{draft.diagnostics && <DiagnosticReview diagnostics={draft.diagnostics} onChange={diagnostics => update({ diagnostics })} />}</section>}
            <div className="report-form-footer"><p className="report-help" role="status">{busy || storage || "Your draft stays here when you close this panel."}</p><Button type="submit" loading={!!busy} fullWidth>Review {draft.kind === "request" ? "request" : "report"}<ArrowUpRight size={17} /></Button><div className="report-footer-links"><Button variant="ghost" size="sm" disabled={!!busy} onClick={clear}>Clear draft</Button><Link href="/requests" onClick={() => setOpen(false)}>View request board</Link></div><input ref={receiptInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Import a saved receipt" onChange={event => { const file = event.target.files?.[0]; if (file) void importReceipt(file); event.target.value = ""; }} /><Button variant="ghost" size="sm" disabled={!!busy} onClick={() => receiptInput.current?.click()}>Check a saved receipt</Button></div>
          </form> : step === "review" && draft.frozen ? <div className="report-review">
            <h2 tabIndex={-1} ref={reviewTitle}>Ready to send?</h2><p>{draft.kind === "request" ? "The title below is public. Your contact details, description and attachments are private." : "Your report and attachments are private. A public issue will point maintainers to the private report."}</p>
            <div className="report-review-summary"><strong>{draft.frozen.report.title}</strong><p>{draft.frozen.report.description}</p><small>Reply to {draft.frozen.report.email}</small></div>
            {!!draft.files.length && <div className="report-attachments">{draft.files.map(item => <figure key={item.id}><FilePreview file={item.file} /><figcaption>{item.file.name}</figcaption></figure>)}</div>}
            <details className="report-json"><summary>Inspect exactly what will be sent</summary><p className="report-help">These report fields and the files previewed above are submitted. A secret receipt token and a verification token authenticate the request.</p><pre tabIndex={0}>{JSON.stringify(draft.frozen.report, null, 2)}</pre></details>
            <p className="report-help">By sending, you approve the content shown here, including every visible detail in your media. Technical details and media are kept for 30 days; contact and private report details for 180 days.</p>
            {draft.attempted && <div className="report-notice"><p>An earlier send was attempted. This exact report is locked for safe retry.</p><Button variant="outline" onClick={refreshReceipt} disabled={!!busy}>Check whether it arrived</Button><details><summary>Start over instead</summary><p className="report-help">Clearing removes this device’s draft and receipt key. An already accepted report stays submitted. Check whether it arrived before creating another.</p><Button variant="ghost" size="sm" disabled={!!busy} onClick={clear}>Clear this local retry</Button></details></div>}
            {config && !config.local && (siteKey ? <><Turnstile siteKey={siteKey} onToken={setTurnstileToken} attempt={verificationAttempt} /><Button variant="ghost" size="sm" onClick={() => setVerificationAttempt(value => value + 1)}>Retry verification</Button></> : <p className="report-error">Verification is not configured. Sending is unavailable until it is connected.</p>)}
            <Button fullWidth loading={!!busy} disabled={!REPORTING_API || !config || (!config.local && !turnstileToken)} onClick={send}>{draft.attempted ? "Retry this exact report" : "Send " + (draft.kind === "request" ? "request" : "report")}</Button><p className="report-help" role="status">{busy || storage}</p>
            {!draft.attempted && <Button variant="ghost" onClick={() => { update({ frozen: null }); setStep("edit"); }}>Back to edit</Button>}
          </div> : receipt ? <section className="report-receipt"><span className="report-receipt-seal" aria-hidden="true"><Check size={28} /></span><h2 ref={reviewTitle} tabIndex={-1}>Your {draft.kind === "request" ? "request" : "report"} is received.</h2><p>{remainingFiles ? "The text is safely stored. Finish uploading the remaining files below." : "Thank you for helping shape SahaJiv."}</p><dl><div><dt>Status</dt><dd>{draft.kind === "bug" && receipt.status === "resolved" ? "Resolved" : STATUS_LABELS[receipt.status]}</dd></div><div><dt>Email receipt</dt><dd>{({ pending: "Queued", sent: "Sent", setup_required: "Email is not connected yet", needs_review: "Delivery needs maintainer review" })[receipt.email]}</dd></div><div><dt>Issue</dt><dd>{({ pending: "Queued", created: "Created", setup_required: "Issue tracker is not connected yet", needs_review: "Needs maintainer review" })[receipt.issue]}</dd></div><div><dt>Attachments</dt><dd>{uploadedFiles} of {receipt.attachments.length} uploaded{expiredFiles ? ` · ${expiredFiles} expired` : ""}</dd></div></dl>
            {receipt.componentUrl && <Button asChild fullWidth><a href={receipt.componentUrl}>Open component <ArrowUpRight size={17} /></a></Button>}<div className="report-receipt-id"><span>Report ID</span><code>{receipt.id}</code></div>
            <p className="report-help">This private receipt is saved on this device. Download a copy before clearing it; the secret token lets you check this report.</p>
            <div className="report-row"><Button variant="outline" disabled={!!busy} onClick={refreshReceipt}>Refresh status</Button><Button variant="outline" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sahajiv-receipt-${receipt.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Download receipt</Button></div>
            {!!remainingFiles && (draft.files.length ? <Button fullWidth loading={!!busy} onClick={() => { setError(""); void uploadFiles(receipt); }}>Retry remaining uploads</Button> : <p className="report-help">The original files are not on this device. Reopen the original draft to finish its uploads. Expired attachments are no longer available.</p>)}
            <p className="report-help" role="status">{busy || storage}</p><Button variant="ghost" disabled={!!busy} onClick={clear}>Clear receipt & start another</Button><Link href="/requests" onClick={() => setOpen(false)}>See what’s being requested <ArrowUpRight size={15} /></Link>
          </section> : null}
        </>}
      </SheetContent>
    </Sheet>
    {picking && <PinPicker initial={draft.pins} onDone={pins => { update({ pins }); setPicking(false); setOpen(true); }} />}
  </>;
}
function DiagnosticReview({ diagnostics, onChange }: { diagnostics: Diagnostics; onChange: (diagnostics: Diagnostics | null) => void }) {
  return <div className="report-diagnostic-groups">{Object.entries(diagnostics).map(([group, contents]) => <details key={group}><summary>{({ environment: "Device & page", console: "Warnings & errors", network: "Failed requests", actions: "Recent actions" } as Record<string, string>)[group]}<span>{Array.isArray(contents) ? `${contents.length} events` : ""}</span></summary><pre tabIndex={0}>{JSON.stringify(contents, null, 2)}</pre><Button variant="ghost" size="sm" onClick={() => { const next = { ...diagnostics }; delete next[group as keyof Diagnostics]; onChange(Object.keys(next).length ? next : null); }}>Remove this group</Button></details>)}<Button variant="ghost" size="sm" onClick={() => onChange(null)}>Remove all browser details</Button></div>;
}
