"use client";

import Link from "next/link";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import type { Receipt, ReportKind } from "@/lib/reporting/contracts";
import { emailReceiptLabel, issueReceiptLabel } from "@/lib/reporting/receipt-labels";
import { isHttps } from "@/lib/reporting/track";
import { STATUS_LABELS } from "./report-request";

const sentFile = (state: string) => state === "uploaded" || state === "ready";

/** The receipt as the receipt step and every sent-list row show it, defined once. */
export function ReceiptDetail({ receipt, kind, busy, onRefresh, onNavigate }: {
  receipt: Receipt; kind: ReportKind; emailEnabled: boolean | undefined; busy: boolean; onRefresh: () => void; onNavigate: () => void;
}) {
  const uploaded = receipt.attachments.filter(file => sentFile(file.state)).length;
  const expired = receipt.attachments.filter(file => file.state === "expired").length;
  const status = kind === "bug" && receipt.status === "resolved" ? "Resolved" : STATUS_LABELS[receipt.status];
  return (
    <>
      <p className="report-receipt-status">
        <span>Status: {status}</span>
        {receipt.attachments.length > 0 && <span>{uploaded} of {receipt.attachments.length} files uploaded</span>}
        {expired > 0 && <span>{expired} expired</span>}
        {receipt.issueNumber && receipt.issueUrl && isHttps(receipt.issueUrl) && (
          <span>
            Tracked as{" "}
            <a href={receipt.issueUrl} target="_blank" rel="noopener noreferrer">#{receipt.issueNumber}</a>
          </span>
        )}
      </p>
      <details className="report-delivery">
        <summary>Delivery details</summary>
        <dl>
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div><dt>Email receipt</dt><dd>{emailReceiptLabel(receipt)}</dd></div>
          <div><dt>Issue</dt><dd>{issueReceiptLabel(receipt)}</dd></div>
          <div>
            <dt>Attachments</dt>
            <dd>{uploaded} of {receipt.attachments.length} uploaded{expired ? ` · ${expired} expired` : ""}</dd>
          </div>
        </dl>
        <div className="report-receipt-id"><span>Report ID</span><code>{receipt.id}</code></div>
      </details>
      {receipt.componentUrl && (
        <Button asChild fullWidth>
          <a href={receipt.componentUrl}>
            Open component <AnimatedIcon name="arrow-up-right" style={{ width: 17, height: 17 }} />
          </a>
        </Button>
      )}
      <p className="report-help">Keep your receipt. It lets you check this report later.</p>
      <div className="report-row">
        <Button variant="outline" disabled={busy} onClick={onRefresh}>Refresh status</Button>
        <Button
          variant="outline"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `cojeev-receipt-${receipt.id}.json`;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download receipt
        </Button>
        {receipt.statusKey && (
          <Button asChild variant="outline">
            <Link
              href={`/track/#${receipt.id}.${receipt.statusKey}`}
              onClick={event => {
                onNavigate();
                // A client-side push to the same page changes the fragment without a hashchange, so the page would keep showing the old report; setting the hash fires it.
                if (location.pathname.replace(/\/$/, "").endsWith("/track")) { event.preventDefault(); location.hash = event.currentTarget.hash; }
              }}
            >
              Track this report
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
