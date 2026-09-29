export type TriageState = "pending" | "approved" | "rejected";
export type TriageBy = "ai" | "owner" | "join";
export type Decision = "approved" | "rejected";
export type Verdict = { decision: Decision; reason: string; title: string; body: string };
export type VerdictRequest = { decision: Decision; by: "ai" | "owner"; reason?: string; title?: string; body?: string; model?: string };
export type TriageInput = { id: string; kind: "bug" | "request"; title: string; description: string; references: string[]; attachments: { name: string; type: string }[]; topicId: string | null; createdAt: number };
export type TriageCounts = { pending: number; approved: number; rejected: number; unverified: number };
export type TriageListRow = { id: string; kind: "bug" | "request"; title: string; email: string; status: string; created_at: number; issue_number: number | null; issue_url: string | null; triage_state: TriageState; triage_by: TriageBy | null; triage_model: string | null; triage_title: string | null; triaged_at: number | null; verified_at: number | null };
export const TRIAGE_LIMITS = { title: { min: 3, max: 120 }, body: { min: 1, max: 20000 }, reason: { max: 500 } } as const;
export const VERDICT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["decision", "reason", "title", "body"],
  properties: {
    decision: { enum: ["approved", "rejected"] },
    reason: { type: "string", maxLength: 500 },
    title: { type: "string", minLength: 3, maxLength: 120 },
    body: { type: "string", minLength: 1, maxLength: 20000 }
  }
} as const;
function field(v: Record<string, unknown>, name: "reason" | "title" | "body", min: number, max: number): string | undefined {
  const value = v[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max || value.trim().length < min) throw new Error(`The ${name} must be ${min > 0 ? `${min} to ` : "at most "}${max} characters.`);
  return value;
}
export function validateVerdictRequest(raw: unknown): VerdictRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Send a verdict object.");
  const v = raw as Record<string, unknown>;
  if (Object.keys(v).some(k => !["decision", "by", "reason", "title", "body", "model"].includes(k))) throw new Error("Unsupported verdict field.");
  if (v.decision !== "approved" && v.decision !== "rejected") throw new Error("Decision must be approved or rejected.");
  if (v.by !== "ai" && v.by !== "owner") throw new Error("By must be ai or owner.");
  const { title, body, reason } = TRIAGE_LIMITS;
  const out: VerdictRequest = { decision: v.decision, by: v.by, reason: field(v, "reason", 0, reason.max), title: field(v, "title", title.min, title.max), body: field(v, "body", body.min, body.max) };
  if (v.model !== undefined) { if (typeof v.model !== "string" || v.model.length > 100) throw new Error("The model must be at most 100 characters."); out.model = v.model; }
  if (out.by === "ai" && (out.reason === undefined || out.title === undefined || out.body === undefined)) throw new Error("An AI verdict needs a reason, title and body.");
  return out;
}

/** Extra field on GET /v1/admin/reports/:id: true when another approved report holds the same issue. */
export type PrivateDetailShared = { shared: boolean };
