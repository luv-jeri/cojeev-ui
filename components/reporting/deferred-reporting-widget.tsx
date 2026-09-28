"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ComponentMatch } from "@/lib/reporting/contracts";

// The panel, its drawer and its form controls are a large chunk that no page needs to paint.
// Fetch it once the browser is idle so it never competes with the page's own first render.
const ReportingWidget = dynamic(
  () => import("./reporting-widget").then((module) => module.ReportingWidget),
  { ssr: false },
);

export function DeferredReportingWidget({ entries }: { entries: ComponentMatch[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setReady(true);
    // A request for the panel is reason enough to mount it now; the panel then opens that request.
    window.addEventListener("cojeev:report", start, { once: true });
    const stop = () => window.removeEventListener("cojeev:report", start);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(start, { timeout: 2500 });
      return () => { stop(); window.cancelIdleCallback(handle); };
    }
    const handle = setTimeout(start, 1200);
    return () => { stop(); clearTimeout(handle); };
  }, []);
  return ready ? <ReportingWidget entries={entries} /> : null;
}
