"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { REPORTING_API, reportingFetch } from "@/lib/reporting/client";
import type { RequestTopic } from "@/lib/reporting/contracts";
import { openRequest, STATUS_LABELS } from "./reporting-widget";

export function relativeAge(timestamp: number, now = Date.now()): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const days = Math.max(0, Math.floor((now - ms) / 86400000));
  if (days === 0) return "Today"; if (days === 1) return "1 day ago"; if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30); return `${months} ${months === 1 ? "month" : "months"} ago`;
}
const milliseconds = (time: number) => time < 1e12 ? time * 1000 : time;
export function RequestBoard() {
  const [query, setQuery] = useState(""), [rows, setRows] = useState<RequestTopic[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [hasMore, setHasMore] = useState(false), [reload, setReload] = useState(0);
  const load = useCallback(async (offset: number, signal?: AbortSignal) => {
    setBusy(true); setError("");
    try { const result = await reportingFetch<{ requests: RequestTopic[]; hasMore: boolean }>(`/v1/requests?q=${encodeURIComponent(query)}&offset=${offset}`, { signal }); if (signal?.aborted) return; setRows(previous => offset ? [...previous, ...result.requests] : result.requests); setHasMore(result.hasMore); }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "The request board could not load."); } finally { if (!signal?.aborted) setBusy(false); }
  }, [query]);
  useEffect(() => { if (!REPORTING_API) return; const abort = new AbortController(); const timeout = setTimeout(() => { void load(0, abort.signal); }, 250); return () => { clearTimeout(timeout); abort.abort(); }; }, [load, reload]);
  return <main className="requests-page">
    <nav className="requests-nav" aria-label="Request board navigation"><Link href="/">Cojeev UI</Link><Link href="/docs">Explore the library <ArrowUpRight size={15} /></Link></nav>
    <header className="requests-header"><div><span className="requests-kicker">Made with your input</span><h1>What should we<br />build next?</h1><p>Ask for the component you wish existed. Join an idea that would help you, and follow it from request to release.</p></div><div className="requests-invitation"><Sparkles size={28} aria-hidden="true" /><p>We aim to build requested components within <strong>36 hours</strong>. Timing depends on demand and complexity.</p><Button onClick={() => openRequest()}>Request a component <ArrowUpRight size={17} /></Button></div></header>
    <section className="requests-list" aria-labelledby="requests-heading"><div className="requests-list-head"><h2 id="requests-heading">The request board</h2><label className="requests-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search component requests</span><Input type="search" placeholder="Search requests" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      {!REPORTING_API ? <div className="requests-empty"><h3>The board is being connected.</h3><p>You can prepare a request using the panel. Sending and live demand will appear when the report service is ready.</p><Button variant="outline" onClick={() => openRequest()}>Prepare a request</Button></div> : <>
        {error && <div className="requests-empty" role="alert"><h3>We couldn’t load the requests.</h3><p>{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Try again</Button></div>}
        <div role="status" className="requests-loading">{busy ? "Loading requests…" : !error && rows.length ? `${rows.length} requests shown` : ""}</div>
        {!busy && !error && !rows.length && <div className="requests-empty"><h3>{query ? "No requests match that search." : "What are you missing?"}</h3><p>{query ? "Try a broader term, or tell us about the component you need." : "Be the first to suggest the next addition to the library."}</p><Button variant="outline" onClick={() => openRequest()}>Make a request</Button></div>}
        <ol className="requests-rows">{rows.map(topic => <li key={topic.id}><div className="request-demand" aria-label={`${topic.demand} ${topic.demand === 1 ? "person wants" : "people want"} this`}><strong>{topic.demand}</strong><span>{topic.demand === 1 ? "person" : "people"}</span></div><div className="request-details"><div className="request-title-row"><h3>{topic.title}</h3><span className="request-status" data-status={topic.status}>{STATUS_LABELS[topic.status]}</span></div><p><time dateTime={new Date(milliseconds(topic.createdAt)).toISOString()} title={new Date(milliseconds(topic.createdAt)).toLocaleString()}>{relativeAge(topic.createdAt)}</time><span aria-hidden="true"> · </span><span>Requested {new Date(milliseconds(topic.createdAt)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span></p></div>{topic.status === "resolved" && topic.componentUrl ? <Button asChild variant="outline"><a href={topic.componentUrl}>See component <ArrowUpRight size={16} /></a></Button> : <Button variant="outline" onClick={() => openRequest(topic)}>I need this too</Button>}</li>)}</ol>
        {hasMore && <Button className="requests-more" variant="outline" loading={busy} onClick={() => load(rows.length)}>Load more requests</Button>}
      </>}
    </section><footer className="requests-footer"><p>Demand counts distinct people. Request titles are public; emails and supporting details stay private.</p><Link href="/docs">Back to the components <ArrowUpRight size={15} /></Link></footer>
  </main>;
}
