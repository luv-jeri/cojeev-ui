import type { Decision, TriageCounts, TriageListRow } from "@/lib/reporting/triage-contract";
export type { Decision, TriageBy, TriageCounts, TriageListRow, TriageState } from "@/lib/reporting/triage-contract";

// Shape of GET /v1/admin/reports/:id (privateDetail in workers/reporting/src/reports.ts).
export type TriageDetail = {
  report: TriageListRow & { description: string; references_json: string; triage_reason: string | null; triage_body: string | null };
  attachments: { id: string; name: string; type: string; size: number; state: string }[];
  // True when another approved report holds the same issue (added to the Worker response by the reporting lane).
  shared?: boolean;
  deliveries: { id: string; kind: string; state: string; attempts: number; last_error: string | null; reviewed_at: number | null }[];
};

export type DataSource = {
  list(filter: string, offset: number): Promise<{ reports: TriageListRow[]; hasMore: boolean; counts: TriageCounts }>;
  detail(id: string): Promise<TriageDetail>;
  verify(id: string): Promise<void>;
  decide(id: string, decision: Decision): Promise<void>;
};
