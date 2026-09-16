"use client";

import Link from "next/link";
import { getAnalyticsClient } from "@/lib/analytics/client";
import { Button } from "@/registry/cojeev/ui/button";
import { BodySecondary, Title } from "@/registry/cojeev/ui/typography";
import { useAnalyticsStatus } from "./use-analytics-status";
import "./analytics-consent.css";

export function AnalyticsConsent({ route }: { route: string | null }) {
  const status = useAnalyticsStatus();
  if (!route || route === "/privacy/" || status !== "awaiting_choice") return null;

  return (
    <aside className="analytics-consent" aria-labelledby="analytics-consent-title">
      <Title as="h2" id="analytics-consent-title">Help improve 000h</Title>
      <BodySecondary>
        Optional PostHog analytics measures page views and component interactions. It does not record sessions or typed content.
      </BodySecondary>
      <div className="analytics-consent__actions">
        <Button variant="outline" size="sm" onClick={() => getAnalyticsClient()?.setConsent("allowed")}>
          Allow analytics
        </Button>
        <Button variant="outline" size="sm" onClick={() => getAnalyticsClient()?.setConsent("declined")}>
          No thanks
        </Button>
      </div>
      <Link className="analytics-consent__privacy" href="/privacy/">Privacy</Link>
    </aside>
  );
}
