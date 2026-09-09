"use client";

import { useState, useSyncExternalStore } from "react";
const subscribeHydration = () => () => {};
import Link from "next/link";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { REPORTING_API, reportingFetch } from "@/lib/reporting/client";
import { isUUID, type ReportStatus } from "@/lib/reporting/contracts";

type Row = { id: string; kind: "bug" | "request"; title: string; status: ReportStatus; created_at: number; issue_number: number | null; email: string; topic_id: string | null };
type Detail = { report: Row & { description: string; references_json: string; diagnostics_json: string; pins_json: string }; attachments: { id: string; name: string; type: string; size: number; state: string }[]; deliveries: { id: string; kind: string; state: string; attempts: number; last_error: string | null }[] };
const labels: Record<ReportStatus, string> = { received: "Received", planned: "Planned", in_progress: "In progress", resolved: "Resolved / live", declined: "Not planned" };
function pretty(value: string | null) { try { return JSON.stringify(JSON.parse(value || "null"), null, 2); } catch { return value; } }

export function ReportingAdmin() {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [entry, setEntry] = useState(""), [token, setToken] = useState(""), [rows, setRows] = useState<Row[]>([]), [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null), [status, setStatus] = useState<ReportStatus>("received"), [componentUrl, setComponentUrl] = useState("");
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  async function api<T>(path: string, init: RequestInit = {}, auth = token): Promise<T> { return reportingFetch<T>(`/v1/admin${path}`, { ...init, headers: { Authorization: `Bearer ${auth}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } }); }
  async function list(offset = 0, auth = token) {
    setBusy("Loading reports…"); setError("");
    try {
      const result = await api<{ reports: Row[]; hasMore: boolean }>(`/reports?offset=${offset}`, {}, auth); setToken(auth); setEntry(""); setRows(previous => offset ? [...previous, ...result.reports] : result.reports); setHasMore(result.hasMore);
      if (!token) { const requested = new URLSearchParams(location.search).get("report"); if (requested && isUUID(requested)) await read(requested, auth); }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load reports."); } finally { setBusy(""); }
  }
  async function read(id: string, auth = token) {
    setBusy("Opening report…"); setError(""); setNotice("");
    try { const result = await api<Detail>(`/reports/${id}`, {}, auth); setDetail(result); setStatus(result.report.status); setComponentUrl(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open report."); } finally { setBusy(""); }
  }
  async function action(path: string, init: RequestInit, success: string) {
    setBusy("Saving…"); setError(""); setNotice("");
    try { await api(path, init); if (detail) await read(detail.report.id); await list(); setNotice(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The operation failed."); } finally { setBusy(""); }
  }
  async function download(file: Detail["attachments"][number]) {
    if (!detail) return; setError(""); setBusy(`Downloading ${file.name}…`);
    try {
      const result = await fetch(`${REPORTING_API}/v1/admin/reports/${detail.report.id}/attachments/${file.id}`, { headers: { Authorization: `Bearer ${token}` }, credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(30000) });
      if (!result.ok) throw new Error(`Download failed (${result.status}).`);
      const url = URL.createObjectURL(await result.blob()), anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Download failed."); } finally { setBusy(""); }
  }
  return <main className="feedback-admin" data-private=""><nav><Link href="/">Cojeev UI</Link>{token && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => { setToken(""); setRows([]); setDetail(null); setNotice(""); setError(""); }}>Lock reports</Button>}</nav><header><p>Maintainer workspace</p><h1>Private reports</h1><p>Read the context, follow delivery, and close the loop.</p></header>
    {!REPORTING_API && <p className="admin-error">Reporting is not connected. Set the public reporting API URL before using this screen.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}<p className="admin-progress" role="status">{busy}</p>
    {!token ? <form className="admin-login" onSubmit={event => { event.preventDefault(); void list(0, entry.trim()); }}><label>Maintainer token<Input type="password" autoComplete="off" required disabled={!hydrated} value={entry} onChange={event => setEntry(event.target.value)} /></label><p>The token stays in memory for this tab. Reload or lock to clear it.</p><Button type="submit" loading={!!busy} disabled={!REPORTING_API || !hydrated}>Unlock reports</Button></form> : <>
      <div className="admin-actions"><Button variant="outline" disabled={!!busy} onClick={() => list()}>Refresh reports</Button><Button variant="outline" disabled={!!busy} onClick={async () => { setBusy("Processing delivery jobs…"); setError(""); try { const result = await api<{ processed: number }>("/drain", { method: "POST" }); await list(); if (detail) await read(detail.report.id); setNotice(`Processed ${result.processed} delivery jobs.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not process jobs."); } finally { setBusy(""); } }}>Process queued deliveries</Button></div>
      <div className="admin-workspace"><section className="admin-reports" aria-label="Reports">{!rows.length && !busy && <p>No reports have arrived yet.</p>}{rows.map(row => <button key={row.id} type="button" className="admin-report-row" aria-pressed={detail?.report.id === row.id} onClick={() => read(row.id)} disabled={!!busy}><span>{row.kind} · {labels[row.status]}</span><strong>{row.title}</strong><small>{row.email} · {new Date(row.created_at < 1e12 ? row.created_at * 1000 : row.created_at).toLocaleDateString()}</small></button>)}{hasMore && <Button variant="outline" disabled={!!busy} onClick={() => list(rows.length)}>Load more</Button>}</section>
        <section className="admin-detail" aria-label="Selected report">{!detail ? <div className="admin-empty"><h2>Choose a report</h2><p>Private context, attachments and delivery history appear here.</p></div> : <><div className="admin-detail-title"><span>{detail.report.kind}</span><h2>{detail.report.title}</h2><p>{detail.report.email}</p><code>{detail.report.id}</code></div><p className="admin-description">{detail.report.description}</p>
          <form className="admin-status-form" onSubmit={event => { event.preventDefault(); void action(`/reports/${detail.report.id}`, { method: "PATCH", body: JSON.stringify({ status, ...(componentUrl ? { componentUrl } : {}) }) }, "Status saved. Relevant updates are queued for delivery."); }}><label>Status<select aria-label="Status" value={status} onChange={event => setStatus(event.target.value as ReportStatus)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{detail.report.kind === "request" && status === "resolved" && <label>Live component URL<Input type="url" required value={componentUrl} onChange={event => setComponentUrl(event.target.value)} placeholder="https://…/docs/component/" /><small>Required to mark a request live and notify its subscribers.</small></label>}<Button type="submit" disabled={!!busy}>Save status</Button></form>
          <section><h3>Attachments</h3>{!detail.attachments.length && <p>No attachments.</p>}{detail.attachments.map(file => <div className="admin-attachment" key={file.id}><span>{file.name}<small>{file.type} · {(file.size / 1024 / 1024).toFixed(2)} MiB · {file.state}</small></span><Button size="sm" variant="outline" disabled={!!busy || file.state !== "uploaded"} onClick={() => download(file)}>Download</Button></div>)}</section>
          <section className="admin-technical"><h3>Context</h3>{(["references_json", "pins_json", "diagnostics_json"] as const).map(key => <details key={key}><summary>{({ references_json: "Reference links", pins_json: "Element pins", diagnostics_json: "Browser diagnostics" })[key]}</summary><pre tabIndex={0}>{pretty(detail.report[key])}</pre></details>)}</section>
          <section><h3>Delivery history</h3>{!detail.deliveries.length && <p>No delivery jobs.</p>}{detail.deliveries.map(job => <div key={job.id} className="admin-delivery"><div><strong>{job.kind}</strong><span>{job.state} · {job.attempts} attempts</span>{job.last_error && <p>{job.last_error}</p>}</div>{job.state !== "sent" && job.state !== "done" && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => action(`/deliveries/${job.id}/retry`, { method: "POST" }, "Delivery retry queued.")}>Retry delivery</Button>}</div>)}<p className="admin-help">If an email delivery is uncertain, reconcile it with the provider before retrying to avoid sending a duplicate.</p></section></>}
        </section></div>
    </>}
  </main>;
}
