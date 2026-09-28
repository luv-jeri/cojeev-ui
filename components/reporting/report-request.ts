import type { ReportKind, RequestTopic } from "@/lib/reporting/contracts";

// What pages share with the reporting widget without loading it: the widget mounts after the page
// is idle, so a page that imported it directly would put the whole panel in its startup bundle.
export const STATUS_LABELS = {
  received: "Received",
  planned: "Planned",
  in_progress: "In progress",
  resolved: "Live",
  declined: "Not planned",
} as const;
export const REPORT_EVENT = "cojeev:report";
export type ReportRequest = { kind?: ReportKind; topic?: RequestTopic };
// A request made before the panel can listen waits here; the panel takes it once when it is ready.
let pendingRequest: ReportRequest | null = null;
export function openRequest(topic?: RequestTopic) {
  pendingRequest = { kind: "request", topic };
  window.dispatchEvent(new CustomEvent(REPORT_EVENT, { detail: pendingRequest }));
}
export const requestPending = () => pendingRequest !== null;
export function takeRequest() {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}
