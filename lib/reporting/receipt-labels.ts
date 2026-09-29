import type { Receipt, ReportKind } from "./contracts";

// The provider's own vocabulary. `accepted` means Resend took the request and returned an id;
// only a signed `delivered` event promotes the receipt's `email` field to "sent".
const DELIVERY_LABELS: Record<string, string> = {
  held: "Held pending delivery activation or review",
  queued: "Waiting to be sent",
  sending: "Being sent now",
  accepted: "Accepted by the email provider, delivery not confirmed yet",
  quota: "Waiting for the sending limit to reset",
  uncertain: "The provider response was unclear and will be checked before retrying",
};

// The outbox's own vocabulary for the GitHub job. `pending` here means configured and waiting;
// `held` means activation or historical review is outstanding, which the `issue` enum reports as pending too.
const ISSUE_LABELS: Record<string, string> = {
  held: "Held pending delivery activation or review",
  pending: "Waiting to be created",
  processing: "Being created now",
  triage: "Being reviewed",
};

/** Honest wording for the issue state. Held, unconfigured and unknown jobs are never called queued. */
export function issueReceiptLabel(receipt: Pick<Receipt, "issue" | "issueDelivery">): string {
  if (receipt.issue === "created") return "Created";
  if (receipt.issue === "not_planned") return "Reviewed — not something we can act on";
  if (receipt.issue === "setup_required") return "Issue tracker is not connected yet";
  if (receipt.issue === "needs_review") return "Needs maintainer review";
  return ISSUE_LABELS[receipt.issueDelivery ?? ""] ?? "Not created yet";
}

/** Honest wording for the email state. An unknown or missing provider state says only what is certain. */
export function emailReceiptLabel(receipt: Pick<Receipt, "email" | "emailDelivery">): string {
  if (receipt.email === "sent") return "Delivered";
  if (receipt.email === "setup_required") return "Email is not connected yet";
  if (receipt.email === "needs_review") return "Delivery needs maintainer review";
  return DELIVERY_LABELS[receipt.emailDelivery ?? ""] ?? "Not delivered yet";
}

/** What happens next, said only when email is known to be on. Never promises an email otherwise. */
export function receiptExpectation(kind: ReportKind, emailEnabled: boolean | undefined): string | null {
  if (emailEnabled !== true) return null;
  return kind === "request"
    ? "We’ll email you when we’ve looked at it, and again when it’s live."
    : "We’re looking into it. We’ll email you when it’s tracked, and again when it’s fixed.";
}
