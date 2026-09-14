"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import { Button } from "@/registry/cojeev/ui/button";
import { InputWrapper, InputControl } from "@/registry/cojeev/ui/input";
import { REPORTING_API, reportingFetch } from "@/lib/reporting/client";
import type { RequestTopic } from "@/lib/reporting/contracts";
import { BetaStamp } from "@/components/brand/beta-stamp";
import { openRequest, STATUS_LABELS } from "./reporting-widget";

export function relativeAge(timestamp: number, now = Date.now()): string {
  const days = Math.max(
    0,
    Math.floor((now - milliseconds(timestamp)) / 86400000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}
const milliseconds = (time: number) => (time < 1e12 ? time * 1000 : time);

export function RequestBoard() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<RequestTopic[]>([]);
  const [busy, setBusy] = useState(Boolean(REPORTING_API));
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const load = useCallback(
    async (offset: number) => {
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      const current = ++revision.current;
      setBusy(true);
      setError("");
      try {
        const result = await reportingFetch<{
          requests: RequestTopic[];
          hasMore: boolean;
        }>(`/v1/requests?q=${encodeURIComponent(query)}&offset=${offset}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || current !== revision.current) return;
        setRows((previous) =>
          offset
            ? [
                ...previous,
                ...result.requests.filter(
                  (row) => !previous.some((existing) => existing.id === row.id),
                ),
              ]
            : result.requests,
        );
        setHasMore(result.hasMore);
      } catch (cause) {
        if (!controller.signal.aborted && current === revision.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "The request board could not load.",
          );
      } finally {
        if (!controller.signal.aborted && current === revision.current)
          setBusy(false);
      }
    },
    [query],
  );
  useEffect(() => {
    if (!REPORTING_API) return;
    const timeout = setTimeout(() => {
      void load(0);
    }, 250);
    return () => {
      clearTimeout(timeout);
      pending.current?.abort();
    };
  }, [load, reload]);
  const search = (value: string) => {
    pending.current?.abort();
    ++revision.current;
    setQuery(value);
    setRows([]);
    setHasMore(false);
    setError("");
    setBusy(Boolean(REPORTING_API));
  };
  return (
    <main className="requests-page" data-request-workshop>
      <nav className="requests-nav" aria-label="Request board navigation">
        <Button asChild variant="ghost">
          <Link href="/">Cojeev UI</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/docs/">
            Explore the library <AnimatedIcon name="arrow-up-right" />
          </Link>
        </Button>
      </nav>
      <header className="requests-header">
        <div className="requests-heading">
          <span className="requests-kicker">
            The open workshop / Your ideas, our next chapter
          </span>
          <BetaStamp />
          <h1>
            What should we
            <br />
            <em>build next?</em>
          </h1>
          <p>
            Ask for the component you wish existed. Join an idea that would help
            you, and follow it from request to release.
          </p>
          <ol className="requests-process" aria-label="From request to release">
            <li>
              <span>01</span>Suggest
            </li>
            <li>
              <span>02</span>Shape it
            </li>
            <li>
              <span>03</span>Build together
            </li>
          </ol>
        </div>
        <aside
          className="requests-invitation"
          aria-label="An invitation to contribute"
        >
          <div className="requests-study" aria-hidden="true">
            <ShapeArtwork
              name="cushion"
              tone="pink"
              rotation={-12}
              shadowAngle={65}
              echoAngle={22}
            />
            <span>Room for your idea.</span>
          </div>
          <div>
            <span className="requests-kicker">A small invitation</span>
            <h2>Missing a piece?</h2>
            <p>
              We aim to build requested components within{" "}
              <strong>36 hours</strong>. Timing depends on demand and
              complexity.
            </p>
          </div>
          <Button onClick={() => openRequest()}>
            Request a component <AnimatedIcon name="arrow-up-right" />
          </Button>
        </aside>
      </header>
      <section className="requests-list" aria-labelledby="requests-heading">
        <div className="requests-list-head">
          <div>
            <span className="requests-kicker">Ideas in the workshop</span>
            <h2 id="requests-heading">The request board</h2>
          </div>
          <InputWrapper
            as="label"
            appearance="contour"
            radius="soft"
            className="requests-search"
          >
            <AnimatedIcon name="search" />
            <span className="sr-only">Search component requests</span>
            <InputControl
              type="search"
              placeholder="Find an idea…"
              value={query}
              disabled={!REPORTING_API}
              onChange={(event) => search(event.target.value)}
            />
          </InputWrapper>
        </div>
        {!REPORTING_API ? (
          <div className="requests-empty" data-board-state="offline">
            <span className="requests-empty__number" aria-hidden="true">
              <AnimatedIcon name="arrow-up-right" size="lg" />
            </span>
            <div>
              <span className="requests-kicker">Your idea can start here</span>
              <h3>The board is being connected.</h3>
              <p>
                Prepare a request now. Your draft stays on this device; sending
                and live demand will appear when the report service is ready.
              </p>
              <Button variant="secondary" onClick={() => openRequest()}>
                Prepare a request <AnimatedIcon name="pencil" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="requests-empty"
                role="alert"
                data-board-state="error"
              >
                <div>
                  <h3>We couldn’t load the requests.</h3>
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            )}
            <div role="status" className="requests-loading">
              {busy
                ? "Loading requests…"
                : !error && rows.length
                  ? `${rows.length} requests shown`
                  : ""}
            </div>
            {!busy && !error && !rows.length && (
              <div className="requests-empty" data-board-state="empty">
                <div>
                  <h3>
                    {query
                      ? "No requests match that search."
                      : "What are you missing?"}
                  </h3>
                  <p>
                    {query
                      ? "Try a broader term, or tell us about the component you need."
                      : "Be the first to suggest the next addition to the library."}
                  </p>
                  <Button variant="outline" onClick={() => openRequest()}>
                    Make a request
                  </Button>
                </div>
              </div>
            )}
            <ol className="requests-rows" aria-busy={busy}>
              {rows.map((topic) => (
                <li key={topic.id}>
                  <div
                    className="request-demand"
                    aria-label={`${topic.demand} ${topic.demand === 1 ? "person wants" : "people want"} this`}
                  >
                    <strong>{topic.demand}</strong>
                    <span>{topic.demand === 1 ? "person" : "people"}</span>
                  </div>
                  <div className="request-details">
                    <span className="request-status" data-status={topic.status}>
                      {STATUS_LABELS[topic.status]}
                    </span>
                    <h3>{topic.title}</h3>
                    <p>
                      <time
                        dateTime={new Date(
                          milliseconds(topic.createdAt),
                        ).toISOString()}
                        title={new Date(
                          milliseconds(topic.createdAt),
                        ).toLocaleString()}
                      >
                        {relativeAge(topic.createdAt)}
                      </time>
                      <span aria-hidden="true"> · </span>
                      <span>
                        Requested{" "}
                        {new Date(
                          milliseconds(topic.createdAt),
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                  {topic.status === "resolved" && topic.componentUrl ? (
                    <Button asChild variant="secondary">
                      <a href={topic.componentUrl}>
                        See component <AnimatedIcon name="arrow-up-right" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => openRequest(topic)}
                    >
                      I need this too <AnimatedIcon name="plus" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
            {hasMore && (
              <Button
                className="requests-more"
                variant="outline"
                loading={busy}
                disabled={busy}
                onClick={() => load(rows.length)}
              >
                Load more requests
              </Button>
            )}
          </>
        )}
      </section>
      <footer className="requests-footer">
        <p>
          Demand counts distinct people. Request titles are public; emails and
          supporting details stay private.
        </p>
        <Button asChild variant="ghost">
          <Link href="/docs/">
            Back to the components <AnimatedIcon name="arrow-up-right" />
          </Link>
        </Button>
      </footer>
    </main>
  );
}
