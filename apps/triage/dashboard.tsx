import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuBadge, SidebarMenuButton, SidebarMenuLabel } from "@/registry/cojeev/ui/sidebar";
import { Badge, BadgeIndicator } from "@/registry/cojeev/ui/badge";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Kbd } from "@/registry/cojeev/ui/kbd";
import { Empty, EmptyDescription, EmptyTitle } from "@/registry/cojeev/ui/empty";
import { Skeleton } from "@/registry/cojeev/ui/skeleton";
import { ThemeToggle, applyTheme, type ThemeMode } from "@/registry/cojeev/ui/theme-toggle";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/registry/cojeev/ui/toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/registry/cojeev/ui/alert-dialog";
import type { DataSource, Decision, TriageCounts, TriageDetail, TriageListRow } from "./types";

export type Target = "fixtures" | "local" | "beta" | "production" | "none";
type Tone = ComponentProps<typeof Badge>["variant"];
type ViewId = "check" | "approved" | "rejected" | "pending" | "all";
type View = { id: ViewId; label: string; icon: string; count: (c: TriageCounts) => number; blurb: string; empty: [string, string] };

const VIEWS: View[] = [
  { id: "check", label: "Needs your check", icon: "eye", count: (c) => c.unverified, blurb: "The AI decided these on its own. Read each one, then mark it verified or overturn it.", empty: ["All caught up", "Every AI decision has been checked. New ones land here after npm run triage."] },
  { id: "approved", label: "Approved", icon: "check-circle", count: (c) => c.approved, blurb: "Accepted as real. Each gets a public GitHub issue and a “tracked as #N” email.", empty: ["No approved reports", "Reports you or the AI accept show up here."] },
  { id: "rejected", label: "Rejected", icon: "x-circle", count: (c) => c.rejected, blurb: "Declined as not actionable. The visitor gets a polite email.", empty: ["No rejected reports", "Reports you or the AI decline show up here."] },
  { id: "pending", label: "Waiting for AI", icon: "clock", count: (c) => c.pending, blurb: "New reports the AI has not judged yet.", empty: ["Nothing waiting", "Every report has an AI decision."] },
  { id: "all", label: "All", icon: "inbox", count: (c) => c.pending + c.approved + c.rejected, blurb: "Every report, newest first.", empty: ["No reports yet", "Reports sent through the site widget show up here."] },
];
const TARGETS: Record<Target, [string, Tone]> = {
  production: ["Production", "pink"], beta: ["Beta", "yellow"], local: ["Local Worker", "blue"], fixtures: ["Fixtures", "default"], none: ["No admin token", "danger"],
};
const JOBS: Record<string, string> = {
  email_received: "Thank-you email to the visitor", email_owner_received: "New-report alert to you", github: "Public GitHub issue",
  github_state: "GitHub issue reopen or close", github_project: "GitHub project card", email_accepted: "“Tracked as #N” email",
  email_rejected: "Declined email", email_resolved: "“It’s fixed” email",
};
const JOB_STATES: Record<string, [string, Tone]> = {
  done: ["Done", "olive"], sent: ["Sent", "olive"], pending: ["Queued", "default"], processing: ["Sending", "blue"],
  held: ["Held", "yellow"], needs_review: ["Needs review", "danger"], cancelled: ["Cancelled", "default"],
};

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
const titleOf = (r: TriageListRow) => r.triage_title ?? r.title;
const shortDate = (ms: number) => {
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }) });
};
const longDate = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// Visitor-supplied: only http(s) addresses become links (the Worker checks this too).
const links = (json: string): string[] => { try { const v: unknown = JSON.parse(json || "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^https?:\/\//i.test(x)) : []; } catch { return []; } };
const size = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

function trust(r: TriageListRow): [string, Tone] | null {
  if (r.triage_state === "pending") return null;
  if (r.triage_by === "owner") return ["Decided by you", "default"];
  if (r.triage_by === "join") return [r.issue_number != null ? `Joined #${r.issue_number}` : "Joined a request", "default"];
  return r.verified_at ? ["Verified by you", "blue"] : ["AI only — not re-verified", "yellow"];
}

// R6: the exact consequence of an overturn, by current state and whether the report holds an issue.
function consequence(next: Decision, n: number | null) {
  if (next === "approved") return n == null ? "Publishes a GitHub issue (or links the existing one for this request) and emails the reporter." : `Reopens #${n}. No email.`;
  return n == null ? "Cancels the pending issue and emails the reporter that it was declined." : `Closes #${n} as not planned. No email.`;
}

function Badges({ r }: { r: TriageListRow }) {
  const t = trust(r);
  const [label, tone]: [string, Tone] = r.triage_state === "approved" ? ["Approved", "olive"] : r.triage_state === "rejected" ? ["Rejected", "danger"] : ["Waiting for AI", "default"];
  return (
    <div className="tri-badges">
      <Badge size="sm" variant="live" className="tri-kind">{r.kind === "bug" ? "Bug" : "Feature"}</Badge>
      <Badge size="sm" variant={tone}><BadgeIndicator />{label}</Badge>
      {t && <Badge size="sm" variant={t[1]}>{t[0]}</Badge>}
    </div>
  );
}

function Row({ r, selected, focusable, onSelect }: { r: TriageListRow; selected: boolean; focusable: boolean; onSelect: () => void }) {
  return (
    <li className="tri-row" data-selected={selected || undefined}>
      {/* Roving focus: one row is in the Tab order; arrow keys move between rows. */}
      <button type="button" className="tri-pick" data-id={r.id} tabIndex={focusable ? 0 : -1} aria-current={selected || undefined} onClick={onSelect}>{titleOf(r)}</button>
      <time className="tri-row__date" dateTime={new Date(r.created_at).toISOString()}>{shortDate(r.created_at)}</time>
      <Badges r={r} />
      {r.issue_number != null && (r.issue_url
        ? <a className="tri-row__issue" href={r.issue_url} target="_blank" rel="noreferrer" tabIndex={-1}>#{r.issue_number}</a>
        : <span className="tri-row__issue">#{r.issue_number}</span>)}
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="tri-list" aria-busy="true" aria-label="Loading reports">
      {[72, 58, 80, 64, 70].map((w) => (
        <div key={w} className="tri-row tri-row--skel">
          <Skeleton variant="line" style={{ width: `${w}%` }} />
          <Skeleton variant="line" style={{ width: 44 }} />
          <Skeleton variant="line" style={{ width: `${w - 30}%`, height: 20 }} />
        </div>
      ))}
    </div>
  );
}

type DetailProps = { d: TriageDetail; busy: boolean; error: string | null; onVerify: () => void; onDecide: (x: Decision) => void };

function Detail({ d, busy, error, onVerify, onDecide }: DetailProps) {
  const { report: r } = d;
  const refs = links(r.references_json);
  const settled = r.triage_state !== "pending";
  const next: Decision = r.triage_state === "approved" ? "rejected" : "approved";
  const needsVerify = settled && r.triage_by === "ai" && !r.verified_at;
  // Owner decisions are overturns (R17), so any reason on the report is the AI's.
  const byline = r.triage_by === "owner" ? `You decided this on ${longDate(r.triaged_at ?? r.created_at)}.${r.triage_reason ? " The reason above is the AI’s." : ""}`
    : r.triage_by === "join" ? `Joined an existing request on ${longDate(r.triaged_at ?? r.created_at)}.`
    : r.triaged_at ? `Judged by ${r.triage_model ?? "the AI"} on ${longDate(r.triaged_at)}.${r.verified_at ? ` You verified it on ${longDate(r.verified_at)}.` : ""}` : null;
  return (
    <>
      <div className="tri-panel__body">
        <header className="tri-panel__head">
          <Badges r={r} />
          <h2 tabIndex={-1}>{titleOf(r)}</h2>
          <div className="tri-panel__meta">
            <span>Received {longDate(r.created_at)}</span>
            {r.issue_url && <a href={r.issue_url} target="_blank" rel="noreferrer">Issue #{r.issue_number}<Icon name="external-link" size="sm" /></a>}
          </div>
        </header>

        <section className="tri-sec" aria-label="From the visitor">
          <h3>From the visitor</h3>
          <blockquote className="tri-quote">
            {r.title !== titleOf(r) && <p className="tri-quote__title">{r.title}</p>}
            <p>{r.description || "No description."}</p>
          </blockquote>
          <dl className="tri-facts">
            <dt>Email</dt><dd>{r.email || "Not given"}</dd>
            {refs.length > 0 && <><dt>Links</dt><dd><ul>{refs.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer">{l.replace(/^https?:\/\//, "")}</a></li>)}</ul></dd></>}
            {d.attachments.length > 0 && <><dt>Files</dt><dd><ul>{d.attachments.map((a) => (
              <li key={a.id}>
                {a.state === "uploaded"
                  ? <a className="tri-file" href={`/api/reports/${encodeURIComponent(r.id)}/attachments/${encodeURIComponent(a.id)}`} download={a.name}><Icon name="download" size="sm" />{a.name}</a>
                  : <span className="tri-file">{a.name}</span>}
                <span className="tri-muted">{a.state === "uploaded" ? size(a.size) : a.state}</span>
              </li>
            ))}</ul></dd></>}
          </dl>
        </section>

        {settled && (
          <section className="tri-sec" aria-label="Decision">
            <h3>Decision</h3>
            {r.triage_reason && <p className="tri-prose">{r.triage_reason}</p>}
            {byline && <p className="tri-muted">{byline}</p>}
          </section>
        )}

        {r.triage_body && (
          <section className="tri-sec" aria-label="Drafted issue">
            <h3>Drafted issue</h3>
            <article className="tri-issue">
              <p className="tri-issue__title">{r.triage_title}</p>
              <p className="tri-issue__body">{r.triage_body}</p>
            </article>
          </section>
        )}

        {d.deliveries.length > 0 && (
          <section className="tri-sec" aria-label="Emails and GitHub">
            <h3>Emails and GitHub</h3>
            <ul className="tri-jobs">{d.deliveries.map((j) => {
              const [label, tone] = JOB_STATES[j.state] ?? [j.state.replace(/_/g, " "), "default"];
              return (
                <li key={j.id}>
                  <span>{(JOBS[j.kind] ?? j.kind.replace(/_/g, " ")).replace("#N", r.issue_number != null ? `#${r.issue_number}` : "#N")}</span>
                  <Badge size="sm" variant={tone}>{j.state === "done" && j.kind.startsWith("email") ? "Sent" : label}</Badge>
                  {j.last_error && j.state !== "done" && <p className="tri-jobs__note" data-tone={j.state === "needs_review" ? "danger" : undefined}>{j.last_error}</p>}
                </li>
              );
            })}</ul>
          </section>
        )}
      </div>

      <footer className="tri-actions">
        {!settled ? (
          <p className="tri-wait"><Icon name="clock" size="sm" /><span>Waiting for the AI — run <code>npm run triage</code>.</span></p>
        ) : (
          <>
            {error && <p role="alert" className="tri-alert"><Icon name="alert-circle" size="sm" /><span>{error}</span></p>}
            <div className="tri-actions__row">
              {needsVerify && <Button variant="accent" className="tri-primary" loading={busy} onClick={onVerify}>Mark verified</Button>}
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" disabled={busy}>Overturn → {next === "approved" ? "Approve" : "Reject"}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{next === "approved" ? "Approve this report?" : "Reject this report?"}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <p className="tri-dialog-report">{titleOf(r)}</p>
                  <AlertDialogDescription>{consequence(next, r.issue_number)}</AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant={next === "approved" ? "default" : "danger"} onClick={() => onDecide(next)}>{next === "approved" ? "Approve" : "Reject"}</Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </footer>
    </>
  );
}

export function TriageDashboard({ source, target }: { source: DataSource; target: Target }) {
  const [view, setView] = useState<ViewId>("check");
  const [rows, setRows] = useState<TriageListRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [counts, setCounts] = useState<TriageCounts | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<TriageDetail | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // Errors carry the report id, so one report's error never shows over another.
  const [detailError, setDetailError] = useState<{ id: string; text: string } | null>(null);
  const [actionError, setActionError] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ id: number; title: string; text: string } | null>(null);
  const [mode, setMode] = useState<ThemeMode>(document.documentElement.dataset.mode === "dark" ? "dark" : "light");
  const [tick, setTick] = useState(0);
  const [pages, setPages] = useState(1);
  const [settled, setSettled] = useState(""); // the view:tick:pages the list last finished loading
  const lastIndex = useRef(0);
  const refocus = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reload = () => setTick((n) => n + 1);
  const current = VIEWS.find((v) => v.id === view)!;
  const listLoading = settled !== `${view}:${tick}:${pages}`;

  useEffect(() => {
    let live = true;
    const key = `${view}:${tick}:${pages}`;
    // Every reload fetches all the pages already shown, so rows from "Show more" and a selection on them stay put.
    // A changed view or a newer reload cancels this one, so stale pages never land.
    // ponytail: one request per shown page; add a page-size parameter to the admin API if lists grow long.
    void (async () => {
      let all: TriageListRow[] = [];
      for (let p = 0; p < pages; p++) {
        const res = await source.list(view, all.length);
        if (!live) return;
        const seen = new Set(all.map((r) => r.id)); // a report arriving mid-way shifts the offsets
        all = all.concat(res.reports.filter((r) => !seen.has(r.id)));
        if (p === pages - 1 || !res.hasMore) {
          setListError(null); setRows(all); setHasMore(res.hasMore); setCounts(res.counts); setSettled(key);
          // Keep the selection; if it left this view (verified, overturned), take the row that moved into its place.
          setSel((cur) => (cur && all.some((x) => x.id === cur) ? cur : all[Math.min(lastIndex.current, all.length - 1)]?.id ?? null));
          return;
        }
      }
    })().catch((e: unknown) => { if (live) { setListError(message(e)); setSettled(key); } });
    return () => { live = false; };
  }, [source, view, tick, pages]);
  useEffect(() => {
    const i = rows?.findIndex((r) => r.id === sel) ?? -1;
    if (i >= 0) lastIndex.current = i;
  }, [rows, sel]);
  useEffect(() => {
    if (!sel) return;
    let live = true;
    void source.detail(sel).then((d) => { if (live) { setDetail(d); setDetailError(null); } }).catch((e: unknown) => { if (live) setDetailError({ id: sel, text: message(e) }); });
    return () => { live = false; };
  }, [source, sel, tick]);

  const changeView = (v: ViewId) => {
    if (v === view) return;
    // A new view starts at its first report.
    setActionError(null); setListError(null); setRows(null); setHasMore(false); setSel(null); setPages(1);
    lastIndex.current = 0; refocus.current = null;
    setView(v);
  };
  const select = (id: string) => { if (id !== sel) { setActionError(null); setDetailError(null); } setSel(id); };
  const more = () => setPages((n) => n + 1);
  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!rows?.length) return;
    const i = rows.findIndex((r) => r.id === sel);
    const to = ({ ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 } as Record<string, number>)[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const r = rows[Math.max(0, Math.min(rows.length - 1, to))];
    select(r.id);
    listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(r.id)}"]`)?.focus();
  };
  // R18: any failure is shown in words; the list and counts reload either way.
  const act = async (done: string, fn: (id: string) => Promise<void>) => {
    if (!detail) return;
    const { id } = detail.report, title = titleOf(detail.report);
    setBusy(true); setActionError(null);
    try { await fn(id); setToast({ id: Date.now(), title: done, text: title }); } catch (e) { setActionError({ id, text: message(e) }); }
    refocus.current = id;
    setBusy(false); reload();
  };
  const changeMode = (m: ThemeMode) => { applyTheme(m); setMode(m); localStorage.setItem("triage-mode", m); };

  const shown = sel && detail?.report.id === sel ? detail : null;
  // After an action the clicked button is gone or disabled, so focus would fall to <body>. Once the list has
  // reloaded, focus the report's row; if it left this view, the heading of the report now shown.
  useEffect(() => {
    const id = refocus.current;
    if (!id || listLoading) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    const target = row ?? document.querySelector<HTMLElement>(".tri-panel__head h2")
      ?? (sel && detailError?.id !== sel ? null : document.getElementById("tri-view-title"));
    if (!target) return; // the next report is still loading
    refocus.current = null;
    target.focus();
  }, [listLoading, sel, shown, detailError]);
  const selInRows = !!rows?.some((r) => r.id === sel);
  const [targetLabel, targetTone] = TARGETS[target];

  return (
    <ToastProvider>
      <div className="tri-shell">
        <Sidebar className="tri-rail" data-morph="none">
          <SidebarHeader className="tri-brand">
            <span className="tri-brand__seal"><BrandMark /></span>
            <span className="tri-brand__name">000h<small>Report triage</small></span>
          </SidebarHeader>
          <SidebarContent aria-label="Views" data-flow="off">
            {VIEWS.map((v) => {
              const n = counts ? v.count(counts) : null;
              return (
                <SidebarMenuButton key={v.id} asChild isActive={view === v.id}>
                  <button type="button" onClick={() => changeView(v.id)}>
                    <Icon name={v.icon} />
                    <SidebarMenuLabel>{v.label}</SidebarMenuLabel>
                    {n !== null && <SidebarMenuBadge data-morph="none" data-attention={(v.id === "check" && n > 0) || undefined}>{n}</SidebarMenuBadge>}
                  </button>
                </SidebarMenuButton>
              );
            })}
          </SidebarContent>
          <SidebarFooter className="tri-foot">
            <div className="tri-target"><span>Reading from</span><Badge size="sm" variant={targetTone}>{targetLabel}</Badge></div>
            {counts && counts.pending > 0 && (
              <p className="tri-hint">Run <code>npm run triage</code> to process {counts.pending} waiting {counts.pending === 1 ? "report" : "reports"}.</p>
            )}
            <ThemeToggle mode={mode} onModeChange={changeMode} className="tri-theme" />
          </SidebarFooter>
        </Sidebar>

        <main className="tri-main" aria-labelledby="tri-view-title">
          <header className="tri-main__head">
            <h1 id="tri-view-title" tabIndex={-1}>{current.label}</h1>
            <div className="tri-main__tools">
              <span className="tri-keys" aria-hidden="true"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
              <Button variant="ghost" size="sm" onClick={reload}><Icon name="refresh-cw" size="sm" />Refresh</Button>
            </div>
            <p>{current.blurb}</p>
          </header>
          <div className="tri-main__scroll">
            {listError && (
              <p role="alert" className="tri-alert"><Icon name="alert-circle" size="sm" /><span>{listError}</span><Button variant="outline" size="sm" onClick={reload}>Try again</Button></p>
            )}
            {rows === null ? (!listError && <ListSkeleton />) : rows.length === 0 ? (
              <Empty className="tri-empty">
                <Icon name={current.icon} size="lg" />
                <EmptyTitle>{current.empty[0]}</EmptyTitle>
                <EmptyDescription>{current.empty[1]}</EmptyDescription>
              </Empty>
            ) : (
              <ul className="tri-list" ref={listRef} aria-label={`${current.label} reports`} onKeyDown={onListKey}>
                {rows.map((r, i) => (
                  <Row key={r.id} r={r} selected={r.id === sel} focusable={r.id === sel || (!selInRows && i === 0)} onSelect={() => select(r.id)} />
                ))}
              </ul>
            )}
            {hasMore && <Button variant="outline" size="sm" className="tri-more" loading={listLoading} onClick={more}>Show more</Button>}
          </div>
        </main>

        <aside className="tri-panel" aria-label="Report details">
          {shown ? (
            <Detail d={shown} busy={busy} error={actionError?.id === shown.report.id ? actionError.text : null}
              onVerify={() => void act("Marked verified", source.verify)}
              onDecide={(x) => void act(x === "approved" ? "Approved" : "Rejected", (id) => source.decide(id, x))} />
          ) : sel && detailError?.id === sel ? (
            <div className="tri-panel__body"><p role="alert" className="tri-alert"><Icon name="alert-circle" size="sm" /><span>{detailError.text}</span></p></div>
          ) : sel || (rows === null && !listError) ? (
            <div className="tri-panel__body" aria-busy="true" aria-label="Loading the report">
              <Skeleton variant="line" style={{ width: "40%" }} />
              <Skeleton variant="line" style={{ width: "85%", height: 24, marginTop: 16 }} />
              <Skeleton variant="card" style={{ height: 120, marginTop: 32 }} />
              <Skeleton variant="card" style={{ height: 80, marginTop: 24 }} />
            </div>
          ) : (
            <Empty className="tri-empty">
              <EmptyTitle>No report selected</EmptyTitle>
              <EmptyDescription>Pick a report to see what the visitor wrote and what the AI decided.</EmptyDescription>
            </Empty>
          )}
        </aside>
      </div>
      {toast && (
        <Toast key={toast.id} open onOpenChange={(o) => { if (!o) setToast(null); }}>
          <Icon name="check-circle" size="sm" />
          <div><ToastTitle>{toast.title}</ToastTitle><ToastDescription>{toast.text}</ToastDescription></div>
        </Toast>
      )}
      <ToastViewport className="tri-toasts" />
    </ToastProvider>
  );
}
