import type { TriageInput, Verdict } from "../../lib/reporting/triage-contract";

export type RunDeps = { fetch: typeof fetch; api: string; token: string; model: string; dryRun: boolean; judge: (r: TriageInput) => Promise<Verdict>; log: (line: string) => void };

export async function runTriage(d: RunDeps): Promise<{ approved: number; rejected: number; failed: number; skipped: number }> {
  const n = { approved: 0, rejected: 0, failed: 0, skipped: 0 };
  const auth = { Authorization: `Bearer ${d.token}` };
  const list = await d.fetch(`${d.api}/v1/admin/triage`, { headers: auth });
  if (!list.ok) throw new Error(`Could not list reports (HTTP ${list.status}).`);
  const { reports } = await list.json() as { reports: TriageInput[] };
  for (const r of [...reports].sort((a, b) => a.createdAt - b.createdAt)) {
    let v: Verdict;
    try { v = await d.judge(r); } catch (e) { n.failed++; d.log(`✗ failed ${r.id.slice(0, 8)} ${(e as Error).message}`); continue; }
    const line = v.decision === "approved" ? `✓ approved  ${r.kind}  "${v.title}" → issue queued` : `✗ rejected  ${r.kind}  "${v.title}" — ${v.reason}`;
    if (d.dryRun) { d.log(`[dry-run] ${line}`); continue; }
    const put = await d.fetch(`${d.api}/v1/admin/reports/${r.id}/triage`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json", Origin: d.api },
      body: JSON.stringify({ ...v, by: "ai", model: d.model })
    });
    if (put.status === 409) { n.skipped++; d.log(`- skipped ${r.id.slice(0, 8)} already decided`); }
    else if (!put.ok) { n.failed++; d.log(`✗ failed ${r.id.slice(0, 8)} Worker answered HTTP ${put.status}`); }
    else { n[v.decision]++; d.log(line); }
  }
  return n;
}

export const exitCodeFor = (r: { failed: number }): number => (r.failed > 0 ? 1 : 0);
