"use client";

import { AnimatedIcon, StateChevron } from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import type { SentEntry } from "@/lib/reporting/draft";
import { sentStatusWord } from "@/lib/reporting/receipt-labels";
import { ReceiptDetail } from "./receipt-detail";

const shortDate = (at: number) => new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Reports sent from this browser. Renders nothing when there are none. */
export function SentList({ entries, expanded, openId, emailEnabled, busy, onToggle, onOpen, onRefresh, onRemove }: {
  entries: SentEntry[]; expanded: boolean; openId: string | null; emailEnabled: boolean | undefined; busy: boolean;
  onToggle: () => void; onOpen: (id: string | null) => void; onRefresh: (id: string) => void; onRemove: (id: string) => void;
}) {
  if (!entries.length) return null;
  return (
    <div className="report-sent">
      <button type="button" className="report-sent-toggle" aria-expanded={expanded} aria-controls="report-sent-list" onClick={onToggle}>
        <span>Sent from this browser · {entries.length}</span>
        <StateChevron open={expanded} />
      </button>
      {expanded && (
        <ul className="report-sent-list" id="report-sent-list">
            {entries.map(({ kind, title, sentAt, receipt }) => {
              const open = openId === receipt.id;
              return (
                <li key={receipt.id}>
                  <button type="button" className="report-sent-row" aria-expanded={open} aria-controls={`report-sent-${receipt.id}`} onClick={() => onOpen(open ? null : receipt.id)}>
                    <AnimatedIcon name={kind === "bug" ? "bug" : "sparkles"} style={{ width: 18, height: 18 }} aria-hidden="true" />
                    <span className="report-sent-row-title">{title}</span>
                    <span className="report-sent-row-meta">{shortDate(sentAt)} · {sentStatusWord(kind, receipt)}</span>
                    <StateChevron open={open} />
                  </button>
                  {open && (
                    <div className="report-sent-detail report-receipt" id={`report-sent-${receipt.id}`} role="region" aria-labelledby={`report-sent-h-${receipt.id}`}>
                      <h3 tabIndex={-1} id={`report-sent-h-${receipt.id}`}>{title}</h3>
                      <ReceiptDetail receipt={receipt} kind={kind} emailEnabled={emailEnabled} busy={busy} onRefresh={() => onRefresh(receipt.id)} />
                      <p className="report-warning">This key is the only way to check this report from here.</p>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => onRemove(receipt.id)}>Remove from this device</Button>
                    </div>
                  )}
                </li>
              );
            })}
            <li className="report-sent-note">Only the newest 50 are kept. Download a receipt to keep an older one.</li>
        </ul>
      )}
    </div>
  );
}
