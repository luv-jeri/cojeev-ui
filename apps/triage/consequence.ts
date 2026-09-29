// R6/R26: the exact consequence of an overturn. Mirrors applyVerdict in workers/reporting/src/triage.ts.
export function consequence(r: { issue_number: number | null; triage_state: string; shared?: boolean }, to: "approved" | "rejected"): string {
  const n = r.issue_number;
  if (to === "approved") return n == null ? "Publishes a GitHub issue (or links the existing one for this request) and emails the reporter." : `Reopens #${n}. Emails the reporter the tracking link if they never received it.`;
  if (n == null) return "Cancels the pending issue and emails the reporter that it was declined.";
  return r.shared ? `Removes this report from #${n}. The issue stays open for the other reports. No email.` : `Closes #${n} as not planned. No email.`;
}
