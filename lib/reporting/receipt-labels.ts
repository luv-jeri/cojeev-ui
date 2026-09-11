import type { Receipt } from "./contracts";

// The provider's own vocabulary. `accepted` means Resend took the request and returned an id;
// only a signed `delivered` event promotes the receipt's `email` field to "sent".
const DELIVERY_LABELS: Record<string, string> = {
  held: "Held until email delivery is switched on",
  queued: "Waiting to be sent",
  sending: "Being sent now",
  accepted: "Accepted by the email provider, delivery not confirmed yet",
  quota: "Waiting for the sending limit to reset",
  uncertain: "The provider response was unclear and will be checked before retrying",
};

/** Honest wording for the email state. An unknown or missing provider state says only what is certain. */
export function emailReceiptLabel(receipt: Pick<Receipt, "email" | "emailDelivery">): string {
  if (receipt.email === "sent") return "Delivered";
  if (receipt.email === "setup_required") return "Email is not connected yet";
  if (receipt.email === "needs_review") return "Delivery needs maintainer review";
  return DELIVERY_LABELS[receipt.emailDelivery ?? ""] ?? "Not delivered yet";
}
