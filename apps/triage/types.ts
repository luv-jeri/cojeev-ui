// Copied from the shared contract; switch these to lib/reporting/triage-contract.ts once it lands.
export type TriageState = "pending" | "approved" | "rejected";
export type TriageBy = "ai" | "owner" | "join";
export type Decision = "approved" | "rejected";
export type TriageCounts = { pending: number; approved: number; rejected: number; unverified: number };
export type TriageListRow = { id: string; kind: "bug" | "request"; title: string; email: string; status: string; created_at: number; issue_number: number | null; issue_url: string | null; triage_state: TriageState; triage_by: TriageBy | null; triage_model: string | null; triage_title: string | null; triaged_at: number | null; verified_at: number | null };

// Shape of GET /v1/admin/reports/:id (privateDetail in workers/reporting/src/reports.ts).
export type TriageDetail = {
  report: TriageListRow & { description: string; references_json: string; triage_reason: string | null; triage_body: string | null };
  attachments: { id: string; name: string; type: string; size: number; state: string }[];
  deliveries: { id: string; kind: string; state: string; attempts: number; last_error: string | null; reviewed_at: number | null }[];
};

export type DataSource = {
  list(filter: string, offset: number): Promise<{ reports: TriageListRow[]; hasMore: boolean; counts: TriageCounts }>;
  detail(id: string): Promise<TriageDetail>;
  verify(id: string): Promise<void>;
  decide(id: string, decision: Decision): Promise<void>;
};
