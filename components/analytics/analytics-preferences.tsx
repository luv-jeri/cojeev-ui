"use client";

import * as React from "react";
import {
  getAnalyticsClient,
  type AnalyticsStatus,
} from "@/lib/analytics/client";
import { Button } from "@/registry/cojeev/ui/button";
import { BodySecondary, Title } from "@/registry/cojeev/ui/typography";

const messages: Record<AnalyticsStatus, string> = {
  active: "Anonymous website analytics is on. You can turn it off here.",
  not_configured: "Analytics is not connected on this site. No website events are being sent.",
  browser_privacy: "Your browser privacy signal is preventing analytics. No website events are being sent.",
  opted_out: "Analytics is off in this browser. No website events are being sent.",
};

export function AnalyticsPreferences() {
  const [status, setStatus] = React.useState<AnalyticsStatus>("not_configured");

  React.useEffect(() => {
    const client = getAnalyticsClient();
    if (!client) return;
    const update = () => setStatus(client.status());
    update();
    return client.subscribe(update);
  }, []);

  const client = getAnalyticsClient();
  const canChoose = status === "active" || status === "opted_out";
  return (
    <section aria-labelledby="analytics-preferences-title">
      <Title as="h2" id="analytics-preferences-title">Analytics preference</Title>
      <BodySecondary role="status" aria-live="polite">{messages[status]}</BodySecondary>
      {canChoose && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => client?.setOptOut(status === "active")}
        >
          {status === "active" ? "Turn analytics off" : "Allow anonymous analytics"}
        </Button>
      )}
    </section>
  );
}
