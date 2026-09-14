"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { categorizeOutboundUrl, parseCampaign, sanitizeRoute, track, type Campaign } from "@/lib/analytics/client";

type AnalyticsContextValue = {
  route: string | null;
  claimImpression: (key: string) => boolean;
};
export const AnalyticsContext = React.createContext<AnalyticsContextValue>({ route: null, claimImpression: () => false });

/** Page events and exposure claims belong to a completed route, not a render. */
export function AnalyticsProvider({ children }: { children: React.ReactNode | null }) {
  const pathname = usePathname();
  const route = pathname ? sanitizeRoute(pathname) : null;
  const campaign = React.useRef<Campaign>({});
  const lastTrackedRoute = React.useRef<string | null>(null);
  const context = React.useMemo<AnalyticsContextValue>(() => {
    const impressions = new Set<string>();
    return {
      route,
      claimImpression(key) {
        if (impressions.has(key)) return false;
        impressions.add(key);
        return true;
      },
    };
  }, [route]);

  React.useEffect(() => {
    if (lastTrackedRoute.current === route) return;
    lastTrackedRoute.current = route;
    if (!route) return;
    campaign.current = parseCampaign(window.location.search, campaign.current);
    track("page_viewed", { route, ...campaign.current });
  }, [route]);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!sanitizeRoute(window.location.pathname)) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const category = categorizeOutboundUrl(anchor.href, window.location.origin);
      if (category) track("outbound_clicked", { destination_category: category });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return <AnalyticsContext.Provider value={context}>{children}</AnalyticsContext.Provider>;
}
