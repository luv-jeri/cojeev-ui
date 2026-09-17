"use client";

import {
  getAnalyticsClient,
  type AnalyticsStatus,
} from "@/lib/analytics/client";
import { Button } from "@/registry/cojeev/ui/button";
import { BodySecondary, Title } from "@/registry/cojeev/ui/typography";
import { useAnalyticsStatus } from "./use-analytics-status";

const messages: Record<AnalyticsStatus, string> = {
  active: "Website analytics is on. You can turn it off here.",
  not_configured: "Analytics is not connected on this site. No website events are being sent.",
  browser_privacy: "Your browser privacy signal is preventing analytics. No website events are being sent.",
  awaiting_choice: "Analytics stays off until you choose to allow it.",
  declined: "Analytics is off in this browser. No website events are being sent.",
  storage_unavailable: "Your analytics preference could not be read or saved. Analytics is off in this open page, but a previously allowed choice may resume after reload.",
};

export function AnalyticsPreferences() {
  const status = useAnalyticsStatus();
  const client = getAnalyticsClient();
  const canAllow = status === "awaiting_choice" || status === "declined";
  return (
    <section aria-labelledby="analytics-preferences-title">
      <Title as="h2" id="analytics-preferences-title">Analytics preference</Title>
      <BodySecondary role="status" aria-live="polite">{messages[status]}</BodySecondary>
      {status === "active" && (
        <Button
          type="button"
          variant="outline"
          onClick={() => client?.setConsent("declined")}
        >
          Turn analytics off
        </Button>
      )}
      {canAllow && (
        <div className="analytics-consent__actions">
          <Button type="button" variant="outline" onClick={() => client?.setConsent("allowed")}>
            Allow analytics
          </Button>
          {status === "awaiting_choice" && (
            <Button type="button" variant="outline" onClick={() => client?.setConsent("declined")}>
              No thanks
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
