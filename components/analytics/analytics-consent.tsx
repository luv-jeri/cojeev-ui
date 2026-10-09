"use client";

import * as React from "react";
import Link from "next/link";
import { getAnalyticsClient } from "@/lib/analytics/client";
import { Button } from "@/registry/cojeev/ui/button";
import { BodySecondary, Title } from "@/registry/cojeev/ui/typography";
import { useAnalyticsStatus } from "./use-analytics-status";

const detailsId = "analytics-consent-details";

export function AnalyticsConsent({ route }: { route: string | null }): React.JSX.Element | null {
  const status = useAnalyticsStatus();
  const [expanded, setExpanded] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const visible = Boolean(route && route !== "/privacy/" && status === "awaiting_choice");

  const closeDetails = React.useCallback(() => {
    setExpanded(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  React.useEffect(() => {
    if (!expanded || !visible) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape") return;
      event.preventDefault();
      closeDetails();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDetails, expanded, visible]);

  if (!visible) return null;

  const choose = (consent: "allowed" | "declined") => getAnalyticsClient()?.setConsent(consent);

  return (
    <div className="analytics-consent-shell">
      {/* A one-line question people can answer without opening anything; small enough to stay out of LCP. */}
      <div className="analytics-consent-bar" data-expanded={expanded || undefined}>
        {!expanded && (
          <>
            <span className="analytics-consent-bar__question">Help improve 000h?</span>
            <Button type="button" size="sm" variant="outline" onClick={() => choose("allowed")}>
              Allow analytics
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => choose("declined")}>
              No thanks
            </Button>
          </>
        )}
        <Button
          ref={triggerRef}
          type="button"
          size="sm"
          variant="ghost"
          className="analytics-consent__trigger"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded(true)}
        >
          Analytics choices
        </Button>
      </div>
      {expanded && (
        <aside
          id={detailsId}
          className="analytics-consent"
          aria-labelledby="analytics-consent-title"
        >
          <Button
            ref={closeRef}
            type="button"
            size="sm"
            variant="ghost"
            className="analytics-consent__close"
            onClick={closeDetails}
          >
            Close analytics choices
          </Button>
          <Title as="h2" id="analytics-consent-title">Help improve 000h</Title>
          <BodySecondary>
            Optional PostHog analytics measures page views and component interactions. It does not record sessions or typed content.
          </BodySecondary>
          <div className="analytics-consent__actions">
            <Button variant="outline" size="sm" onClick={() => choose("allowed")}>
              Allow analytics
            </Button>
            <Button variant="outline" size="sm" onClick={() => choose("declined")}>
              No thanks
            </Button>
          </div>
          <Link className="analytics-consent__privacy" href="/privacy/">Privacy</Link>
        </aside>
      )}
    </div>
  );
}
