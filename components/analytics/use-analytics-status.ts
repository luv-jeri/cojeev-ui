"use client";

import * as React from "react";
import { getAnalyticsClient, type AnalyticsStatus } from "@/lib/analytics/client";

const serverStatus: AnalyticsStatus = "not_configured";

export function useAnalyticsStatus(): AnalyticsStatus {
  const client = getAnalyticsClient();
  return React.useSyncExternalStore(
    (listener) => client?.subscribe(listener) ?? (() => undefined),
    () => client?.status() ?? serverStatus,
    () => serverStatus,
  );
}
