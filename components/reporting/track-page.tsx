"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { fetchStatus, ReportingError } from "@/lib/reporting/client";
import type { PublicStage, PublicStatus } from "@/lib/reporting/public-status";
import { parseTrackFragment } from "@/lib/reporting/track";

type View = { phase: "loading" } | { phase: "missing" } | { phase: "failed" } | { phase: "found"; status: PublicStatus };
const STAGES: PublicStage[] = ["received", "reviewing", "tracked", "fixed"];

/** Copies only the known facts out of the response; any other field is dropped here. */
function whitelist(raw: unknown): PublicStatus | null {
  const r = raw as Partial<PublicStatus> | null;
  if (!r || (r.kind !== "bug" && r.kind !== "request") || typeof r.sentAt !== "number") return null;
  if (r.stage !== "closed" && !STAGES.includes(r.stage as PublicStage)) return null;
  const issue = typeof r.issueNumber === "number" && typeof r.issueUrl === "string" ? { issueNumber: r.issueNumber, issueUrl: r.issueUrl } : {};
  return { kind: r.kind, sentAt: r.sentAt, stage: r.stage as PublicStage, attachments: typeof r.attachments === "number" ? r.attachments : 0, ...issue };
}
const sentDate = (at: number) => new Date(at < 1e12 ? at * 1000 : at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function TrackPage() {
  const [hash, setHash] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The answer is kept with the request it belongs to, so a stale one is never shown for a new fragment.
  const [answer, setAnswer] = useState<{ token: string; view: View } | null>(null);

  // The fragment is read on the client only, after mount and on change; it is never stored or rewritten.
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const parsed = hash === null ? undefined : parseTrackFragment(hash);
  const token = `${attempt}${hash}`;
  useEffect(() => {
    if (!parsed) return;
    const controller = new AbortController();
    fetchStatus(parsed.id, parsed.key, controller.signal).then(raw => {
      const status = whitelist(raw);
      setAnswer({ token, view: status ? { phase: "found", status } : { phase: "failed" } });
    }, error => {
      if (controller.signal.aborted) return;
      setAnswer({ token, view: { phase: error instanceof ReportingError && error.status === 404 ? "missing" : "failed" } });
    });
    return () => controller.abort();
    // The parsed pair is a pure function of `hash`; `token` covers hash and retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const view: View = parsed === null ? { phase: "missing" } : answer?.token === token ? answer.view : { phase: "loading" };

  const status = view.phase === "found" ? view.status : null;
  const heading = view.phase === "missing" ? "Report not found" : status?.kind === "request" ? "Your request" : "Your report";
  return (
    <main className="track-page">
      <h1>{heading}</h1>
      <div role="status">
        {view.phase === "loading" && <p>Checking your report…</p>}
        {view.phase === "missing" && <p>Check the link in your email, or open your report from the browser you sent it from.</p>}
        {view.phase === "failed" && <><p>We couldn’t check this report right now. Try again in a moment.</p><Button type="button" onClick={retry}>Try again</Button></>}
        {status && <Found status={status} />}
      </div>
    </main>
  );
}

function Found({ status }: { status: PublicStatus }) {
  const labels: Record<PublicStage, string> = { received: "Received", reviewing: "Being reviewed", tracked: "Tracked", fixed: status.kind === "bug" ? "Fixed" : "Live", closed: "Closed" };
  const current = STAGES.indexOf(status.stage);
  return (
    <>
      <p className="track-fact">Sent {sentDate(status.sentAt)}</p>
      {status.stage === "closed"
        ? <><p><strong>Closed</strong></p><p>We checked your report, but it isn’t something we can act on, so we’ve closed it.</p></>
        : <ol className="track-stepper">
            {STAGES.map((stage, index) => (
              <li key={stage} data-state={index < current ? "done" : index === current ? "current" : "todo"} aria-current={index === current ? "step" : undefined}>
                {stage === "tracked" && status.issueNumber !== undefined && status.issueUrl
                  ? <a href={status.issueUrl} target="_blank" rel="noopener noreferrer">Tracked as #{status.issueNumber}</a>
                  : labels[stage]}
              </li>
            ))}
          </ol>}
      {status.attachments > 0 && <p className="track-fact">{status.attachments} {status.attachments === 1 ? "file" : "files"} attached</p>}
    </>
  );
}
