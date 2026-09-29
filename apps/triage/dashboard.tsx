import { useEffect, useState } from "react";
import { Card, CardContent } from "@/registry/cojeev/ui/card";
import { Badge } from "@/registry/cojeev/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/registry/cojeev/ui/tabs";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/registry/cojeev/ui/table";
import { Button } from "@/registry/cojeev/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/registry/cojeev/ui/alert-dialog";
import type { DataSource, Decision, TriageCounts, TriageDetail, TriageListRow } from "./types";

const TABS = [["check", "Needs your check"], ["approved", "Approved"], ["rejected", "Rejected"], ["pending", "Waiting"], ["all", "All"]] as const;
const date = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function trust(r: TriageListRow): string | null {
  if (r.triage_state === "pending") return null;
  if (r.triage_by === "owner") return "Decided by you";
  if (r.triage_by === "join") return `Joined #${r.issue_number}`;
  return r.verified_at ? "Verified by you" : "AI only — not re-verified";
}

function Row({ r, selected, onSelect }: { r: TriageListRow; selected: boolean; onSelect: () => void }) {
  const t = trust(r);
  return (
    <TableRow className="tri-row" aria-selected={selected} onClick={onSelect}>
      <TableCell>
        <div className="tri-cell-title">
          <strong>{r.triage_title ?? r.title}</strong>
          <div className="tri-badges">
            <Badge size="sm" variant={r.kind === "bug" ? "pink-soft" : "blue-soft"}>{r.kind === "bug" ? "Bug" : "Request"}</Badge>
            {r.triage_state === "pending"
              ? <Badge size="sm" variant="yellow">Waiting for AI</Badge>
              : <Badge size="sm" variant={r.triage_state === "approved" ? "olive" : "danger"}>{r.triage_state === "approved" ? "Approved" : "Rejected"}</Badge>}
            {t && <Badge size="sm" variant={t.startsWith("AI only") ? "yellow-soft" : "default"}>{t}</Badge>}
          </div>
        </div>
      </TableCell>
      <TableCell>{date(r.created_at)}</TableCell>
      <TableCell>
        {r.issue_number != null && <a className="tri-link" href={r.issue_url ?? "#"} onClick={(e) => e.stopPropagation()}>#{r.issue_number}</a>}
      </TableCell>
    </TableRow>
  );
}

function Detail({ d, onVerify, onDecide }: { d: TriageDetail; onVerify: () => void; onDecide: (x: Decision) => void }) {
  const { report: r } = d;
  const links: string[] = JSON.parse(r.references_json || "[]");
  const settled = r.triage_state !== "pending";
  const next: Decision = r.triage_state === "approved" ? "rejected" : "approved";
  const needsVerify = settled && r.triage_by === "ai" && !r.verified_at;
  return (
    <Card className="tri-panel"><CardContent className="tri-detail">
      {settled && (
        <div className="tri-actions">
          {needsVerify && <Button variant="accent" onClick={onVerify}>Mark verified</Button>}
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline">Overturn → {next === "approved" ? "Approve" : "Reject"}</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader className="flex-col">
                <AlertDialogTitle>{next === "approved" ? "Approve this report?" : "Reject this report?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {next === "approved" ? "Creates a public issue and emails the reporter." : `Closes #${r.issue_number}. No email.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDecide(next)}>{next === "approved" ? "Approve" : "Reject"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <div><h3>Visitor&apos;s report</h3><strong>{r.title}</strong><p>{r.description}</p></div>
      <div><h3>Email</h3><p>{r.email}</p></div>
      {links.length > 0 && <div><h3>Links</h3><ul>{links.map((l) => <li key={l}><a className="tri-link" href={l}>{l}</a></li>)}</ul></div>}
      {d.attachments.length > 0 && (
        <div><h3>Attachments</h3><ul>{d.attachments.map((a) => (
          <li key={a.id}><a className="tri-link" href={`/api/reports/${r.id}/attachments/${a.id}`} download>{a.name}</a> <span className="tri-muted">({(a.size / 1e6).toFixed(1)} MB)</span></li>
        ))}</ul></div>
      )}
      {r.triage_reason && <div><h3>AI reason</h3><p>{r.triage_reason}</p></div>}
      {r.triage_body && <div><h3>Drafted issue</h3><strong>{r.triage_title}</strong><p>{r.triage_body}</p></div>}
      <div><h3>Emails and jobs</h3><ul>{d.deliveries.map((j) => (
        <li key={j.id}>{j.kind.replace(/_/g, " ")} <Badge size="sm" variant={j.state === "sent" ? "olive-soft" : "yellow-soft"}>{j.state}</Badge></li>
      ))}</ul></div>
    </CardContent></Card>
  );
}

export function TriageDashboard({ source }: { source: DataSource }) {
  const [tab, setTab] = useState<string>("check");
  const [rows, setRows] = useState<TriageListRow[]>([]);
  const [counts, setCounts] = useState<TriageCounts>({ pending: 0, approved: 0, rejected: 0, unverified: 0 });
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<TriageDetail | null>(null);
  const [mode, setMode] = useState(document.documentElement.dataset.mode ?? "light");

  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);

  useEffect(() => {
    let live = true;
    void source.list(tab, 0).then((res) => {
      if (!live) return;
      setRows(res.reports);
      setCounts(res.counts);
      setSel((cur) => (cur && res.reports.some((x) => x.id === cur) ? cur : res.reports[0]?.id ?? null));
    });
    return () => { live = false; };
  }, [source, tab, tick]);
  useEffect(() => { document.documentElement.dataset.mode = mode; }, [mode]);
  useEffect(() => {
    if (!sel) return;
    let live = true;
    void source.detail(sel).then((d) => live && setDetail(d));
    return () => { live = false; };
  }, [source, sel, tick]);

  const act = (fn: (id: string) => Promise<void>) => async () => { if (sel) { await fn(sel); reload(); } };
  const cards: [string, number][] = [["Waiting for AI", counts.pending], ["Approved", counts.approved], ["Rejected", counts.rejected], ["Not re-verified", counts.unverified]];

  return (
    <main className="tri-wrap">
      <header className="tri-head">
        <h1 style={{ margin: 0 }}>Report triage</h1>
        <Button variant="outline" size="sm" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>{mode === "dark" ? "Light mode" : "Dark mode"}</Button>
      </header>
      <section className="tri-counters" aria-label="Totals">
        {cards.map(([label, n]) => <Card key={label}><CardContent><div className="tri-num">{n}</div><div className="tri-label">{label}</div></CardContent></Card>)}
      </section>
      {counts.pending > 0 && <p className="tri-hint">Run <code>npm run triage</code> to process {counts.pending} waiting reports.</p>}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{TABS.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="tri-split">
        <TableContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Date</TableHead><TableHead>Issue</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => <Row key={r.id} r={r} selected={r.id === sel} onSelect={() => setSel(r.id)} />)}
              {rows.length === 0 && <TableRow><TableCell colSpan={3}>Nothing here.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        {sel && detail?.report.id === sel && <Detail d={detail} onVerify={act(source.verify)} onDecide={(x) => act((id) => source.decide(id, x))()} />}
      </div>
    </main>
  );
}
