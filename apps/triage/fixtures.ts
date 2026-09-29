import type { DataSource, Decision, TriageDetail, TriageListRow } from "./types";

const day = 86_400_000;
const t0 = Date.parse("2026-09-28T10:00:00Z");
const base = { status: "received", triage_model: "gpt-5.6-sol", issue_url: null, issue_number: null, verified_at: null, triaged_at: null, triage_by: null, triage_title: null } as const;
const ai = (n: number) => ({ triage_by: "ai" as const, triaged_at: t0 - n * day + 3_600_000 });

const rows: TriageListRow[] = [
  { ...base, id: "rpt_p1", kind: "bug", title: "Copy button does nothing on Safari", email: "maya@example.com", created_at: t0, triage_state: "pending" },
  { ...base, id: "rpt_p2", kind: "request", title: "Please add a dark mode toggle to the docs", email: "leo@example.com", created_at: t0 - 0.2 * day, triage_state: "pending" },
  { ...base, ...ai(1), id: "rpt_a1", kind: "bug", title: "tabs jump when i click", email: "sam@example.com", created_at: t0 - day, triage_state: "approved", triage_title: "Tabs indicator jumps on first click", issue_number: 412, issue_url: "https://github.com/example/repo/issues/412" },
  { ...base, ...ai(2), id: "rpt_a2", kind: "request", title: "Date range picker", email: "ines@example.com", created_at: t0 - 2 * day, triage_state: "approved", triage_title: "Add a date range picker", issue_number: 398, issue_url: "https://github.com/example/repo/issues/398", verified_at: t0 - day },
  { ...base, id: "rpt_a3", kind: "request", title: "we need a range calendar", email: "omar@example.com", created_at: t0 - 3 * day, triage_state: "approved", triage_by: "join", triage_title: "Add a date range picker", triaged_at: t0 - 3 * day, issue_number: 398, issue_url: "https://github.com/example/repo/issues/398" },
  { ...base, ...ai(2.5), id: "rpt_a4", kind: "bug", title: "Modal traps focus after closing", email: "dana@example.com", created_at: t0 - 2.5 * day, triage_state: "approved", triage_title: "Focus is not restored after a modal closes" },
  { ...base, ...ai(3.5), id: "rpt_r3", kind: "request", title: "Add a confetti button", email: "kim@example.com", created_at: t0 - 3.5 * day, triage_state: "rejected", triage_title: "Add a confetti button", issue_number: 377, issue_url: "https://github.com/example/repo/issues/377" },
  { ...base, ...ai(1.5), id: "rpt_r1", kind: "bug", title: "asdf test test", email: "x@example.com", created_at: t0 - 1.5 * day, triage_state: "rejected", triage_title: "Unclear test message" },
  { ...base, id: "rpt_r2", kind: "request", title: "Make everything bigger", email: "pat@example.com", created_at: t0 - 4 * day, triage_state: "rejected", triage_by: "owner", triage_title: "Enlarge all components", triaged_at: t0 - 3 * day, verified_at: t0 - 3 * day },
];

const reasons: Record<string, string> = {
  rpt_a1: "Clear, reproducible layout bug in a shipped component. Matches no existing issue.",
  rpt_a2: "A concrete, in-scope component request with a described use case.",
  rpt_a3: "Same request as an existing issue, so it joins that issue instead of opening a new one.",
  rpt_a4: "Clear, reproducible accessibility bug. The issue has not been published yet.",
  rpt_r3: "Decorative and outside the scope of the component set. The earlier issue was closed.",
  rpt_r1: "No actionable content: the text is placeholder input with no steps or expected behaviour.",
  rpt_r2: "Too broad to act on. It does not name a component or a problem to solve.",
};
const descriptions: Record<string, string> = {
  rpt_p1: "Tapping Copy on the install snippet shows nothing and the clipboard stays empty. iOS 18, Safari.",
  rpt_p2: "The docs follow my system setting, but I would like a switch on the page.",
  rpt_a1: "When i click a tab the underline jumps to the left and then slides back. Chrome on Mac.",
  rpt_a2: "Booking flows need a start and end date in one calendar.",
  rpt_a3: "Could you add a calendar where I pick a range?",
  rpt_a4: "After closing a modal with Escape, keyboard focus goes to the top of the page.",
  rpt_r3: "A button that throws confetti would be fun.",
  rpt_r1: "asdf test test",
  rpt_r2: "Everything feels small. Make it all bigger please.",
};
const jobs = (r: TriageListRow): TriageDetail["deliveries"] => {
  const send = (kind: string, state = "done") => ({ id: `${r.id}:${kind}`, kind, state, attempts: 1, last_error: null, reviewed_at: null });
  const out = [send("email_received")];
  if (r.triage_state === "approved") out.push(...(r.issue_number == null ? [send("github", "pending")] : [send("github"), send("email_accepted")]));
  if (r.triage_state === "rejected") out.push(send("email_rejected"));
  return out;
};

const detailOf = (r: TriageListRow): TriageDetail => ({
  report: {
    ...r,
    description: descriptions[r.id] ?? "",
    references_json: JSON.stringify(r.id === "rpt_a1" ? ["https://000h.cojeev.com/docs/tabs"] : []),
    triage_reason: reasons[r.id] ?? null,
    triage_body: r.triage_state === "approved" && r.triage_by === "ai" ? `${descriptions[r.id]}${r.id === "rpt_a1" ? "\n\nExpected: the indicator slides from the current tab to the clicked one." : ""}` : null,
  },
  attachments: r.id === "rpt_a1" ? [{ id: "att_1", name: "tabs-jump.mp4", type: "video/mp4", size: 2_400_000, state: "uploaded" }] : [],
  deliveries: jobs(r),
});

const counts = () => ({
  pending: rows.filter((r) => r.triage_state === "pending").length,
  approved: rows.filter((r) => r.triage_state === "approved").length,
  rejected: rows.filter((r) => r.triage_state === "rejected").length,
  unverified: rows.filter((r) => r.triage_by === "ai" && !r.verified_at).length,
});
const filters: Record<string, (r: TriageListRow) => boolean> = {
  check: (r) => r.triage_by === "ai" && !r.verified_at,
  approved: (r) => r.triage_state === "approved",
  rejected: (r) => r.triage_state === "rejected",
  pending: (r) => r.triage_state === "pending",
  all: () => true,
};
const find = (id: string) => rows.find((r) => r.id === id)!;

// Fixture data only: state lives in memory and resets on reload.
export const fixtureSource: DataSource = {
  async list(filter) {
    return { reports: rows.filter(filters[filter] ?? filters.all), hasMore: false, counts: counts() };
  },
  async detail(id) { return detailOf(find(id)); },
  async verify(id) { find(id).verified_at = Date.now(); },
  async decide(id, decision: Decision) {
    const r = find(id);
    Object.assign(r, { triage_state: decision, triage_by: "owner", verified_at: Date.now(), triaged_at: Date.now() });
  },
};
