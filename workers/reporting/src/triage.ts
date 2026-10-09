import { validateVerdictRequest, type TriageCounts, type TriageInput, type TriageState } from "../../../lib/reporting/triage-contract";
import { getReport, topicIssue } from "./reports";
import { HttpError } from "./security";
import { now, type Env, type ReportRow } from "./types";

const EXPIRED = "This report has expired.";
export async function listUntriaged(env: Env): Promise<{ reports: TriageInput[] }> {
  const rows = await env.DB.prepare("SELECT id,kind,title,description,references_json,topic_id,created_at FROM reports WHERE triage_state='pending' AND private_purged=0 ORDER BY created_at,id LIMIT 50").all<Pick<ReportRow, "id" | "kind" | "title" | "description" | "references_json" | "topic_id" | "created_at">>();
  const files = rows.results.length ? await env.DB.prepare(`SELECT report_id,name,type FROM attachments WHERE report_id IN (${rows.results.map(() => "?").join(",")})`).bind(...rows.results.map(r => r.id)).all<{ report_id: string; name: string; type: string }>() : { results: [] };
  return { reports: rows.results.map(r => ({ id: r.id, kind: r.kind, title: r.title, description: r.description, references: JSON.parse(r.references_json), attachments: files.results.filter(f => f.report_id === r.id).map(f => ({ name: f.name, type: f.type })), topicId: r.topic_id, createdAt: r.created_at })) };
}

export async function applyVerdict(env: Env, id: string, raw: unknown): Promise<{ ok: true; triage_state: TriageState; queued: string[] }> {
  let req; try { req = validateVerdictRequest(raw); } catch (error) { throw new HttpError(422, error instanceof Error ? error.message : "Invalid verdict."); }
  const row = await getReport(env, id);
  if (row.source === "app") throw new HttpError(409, "App reports are delivered automatically; website triage does not apply.");
  if (row.private_purged) throw new HttpError(410, EXPIRED);
  const t = now(), db = env.DB, cur = row.triage_state;
  if (cur !== "pending") {
    if (req.by === "ai") throw new HttpError(409, "Already decided.");
    if (cur === req.decision) { await db.prepare("UPDATE reports SET verified_at=? WHERE id=?").bind(t, id).run(); return { ok: true, triage_state: cur, queued: [] }; }
  }
  const title = req.title ?? row.triage_title, body = req.body ?? row.triage_body, reason = req.reason ?? row.triage_reason;
  if (req.decision === "approved" && (!title || !body)) throw new HttpError(422, "Approving needs a title and body.");
  const topic = row.topic_id ? await topicIssue(env, row.topic_id) : null;
  const copy = req.decision === "approved" && !row.issue_number && topic;
  const guard = "EXISTS(SELECT 1 FROM reports WHERE id=? AND triage_state=? AND triage_by=? AND triaged_at=?)";
  const guardArgs = [id, req.decision, req.by, t];
  const jobs: { id: string; kind: string; payload?: string; alone?: boolean }[] = [];
  const cancel: string[] = [];
  const revive: string[] = [];
  // An approved report holding an issue that another approved report also holds must only detach, never close it.
  const held = cur === "approved" && !!row.issue_number;
  const shared = held ? !!await db.prepare("SELECT 1 AS x FROM reports WHERE issue_number=? AND id<>? AND triage_state='approved' AND source='website'").bind(row.issue_number, id).first() : false;
  if (req.decision === "rejected") {
    cancel.push("email_accepted");
    if (held) { if (!shared) jobs.push({ id: `${id}:github_state:${t}`, kind: "github_state", payload: '{"state":"closed"}', alone: true }); }
    else { if (cur === "approved") cancel.push("github"); jobs.push({ id: `${id}:email_rejected`, kind: "email_rejected" }); }
  } else {
    cancel.push("email_rejected");
    if (cur === "rejected" && row.issue_number) { revive.push("email_accepted"); jobs.push({ id: `${id}:github_state:${t}`, kind: "github_state", payload: '{"state":"open"}' }); }
    else { const kind = copy ? (row.status === "resolved" ? "email_resolved" : "email_accepted") : "github"; revive.push(kind); jobs.push({ id: `${id}:${kind}`, kind }); }
  }
  const others = "EXISTS(SELECT 1 FROM reports o WHERE o.issue_number=? AND o.id<>? AND o.triage_state='approved' AND o.source='website')";
  const detach = (col: string) => held && req.decision === "rejected" ? `CASE WHEN ${others} THEN NULL ELSE ${col} END` : `COALESCE(?,${col})`;
  const one = (v: unknown) => held && req.decision === "rejected" ? [row.issue_number, id] : [v ?? null];
  const issueArgs = [...one(copy ? topic.issue_number : null), ...one(copy ? topic.issue_node_id : null), ...one(copy ? topic.issue_url : null)];
  const statements = [
    db.prepare(`UPDATE reports SET triage_state=?,triage_by=?,triage_model=COALESCE(?,triage_model),triage_reason=?,triage_title=?,triage_body=?,triaged_at=?,verified_at=?,issue_number=${detach('issue_number')},issue_node_id=${detach('issue_node_id')},issue_url=${detach('issue_url')},updated_at=? WHERE id=? AND triage_state=?`)
      .bind(req.decision, req.by, req.model ?? null, reason, title, body, t, req.by === "owner" ? t : null, ...issueArgs, t, id, cur)
  ];
  // Jobs are inserted only if this exact update won, so a racing verdict never queues twice.
  for (const kind of cancel) statements.push(db.prepare(`UPDATE outbox SET state='cancelled',last_error='Superseded by an owner verdict.',lease_token=NULL WHERE id=? AND state IN ('pending','held') AND ${guard}`).bind(`${id}:${kind}`, ...guardArgs));
  for (const kind of revive) statements.push(db.prepare(`UPDATE outbox SET state='pending',due_at=?,reviewed_at=?,last_error=NULL WHERE id=? AND state IN ('cancelled','held') AND ${guard}`).bind(t, t, `${id}:${kind}`, ...guardArgs));
  for (const job of jobs) statements.push(db.prepare(`INSERT OR IGNORE INTO outbox(id,report_id,kind,state,due_at,created_at,reviewed_at,payload_json) SELECT ?,?,?,'pending',?,?,?,? WHERE ${guard}${job.alone ? ` AND NOT ${others}` : ""}`).bind(job.id, id, job.kind, t, t, t, job.payload ?? null, ...guardArgs, ...(job.alone ? [row.issue_number, id] : [])));
  const [update] = await db.batch(statements);
  if (!update.meta.changes) throw new HttpError(409, "Already decided.");
  return { ok: true, triage_state: req.decision, queued: jobs.map(j => j.kind) };
}

export async function markVerified(env: Env, id: string): Promise<{ ok: true }> {
  const row = await getReport(env, id);
  if (row.private_purged) throw new HttpError(410, EXPIRED);
  if (row.triage_state === "pending") throw new HttpError(409, "Decide this report before verifying it.");
  await env.DB.prepare("UPDATE reports SET verified_at=? WHERE id=?").bind(now(), id).run();
  return { ok: true };
}

const UNVERIFIED = "triage_state<>'pending' AND triage_by<>'join' AND verified_at IS NULL";
export async function adminList(env: Env, offset: number, filter: string | null) {
  if (filter !== null && !["pending", "approved", "rejected", "unverified"].includes(filter)) throw new HttpError(422, "Choose a valid triage filter.");
  const where = filter === null ? "" : filter === "unverified" ? `WHERE ${UNVERIFIED}` : "WHERE triage_state=?";
  const rows = await env.DB.prepare(`SELECT id,kind,title,status,created_at,issue_number,issue_url,email,topic_id,triage_state,triage_by,triage_model,triage_title,triaged_at,verified_at FROM reports ${where} ORDER BY created_at DESC,id LIMIT 21 OFFSET ?`).bind(...(filter && filter !== "unverified" ? [filter] : []), offset).all();
  const counts = await env.DB.prepare(`SELECT COALESCE(SUM(triage_state='pending'),0) AS pending,COALESCE(SUM(triage_state='approved'),0) AS approved,COALESCE(SUM(triage_state='rejected'),0) AS rejected,COALESCE(SUM(${UNVERIFIED}),0) AS unverified FROM reports`).first<TriageCounts>();
  return { reports: rows.results.slice(0, 20), hasMore: rows.results.length > 20, counts };
}
