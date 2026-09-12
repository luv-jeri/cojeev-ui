import { readSiteFlags, type DeploymentEnvironment } from "../site-config";

export const ANALYTICS_OPT_OUT_KEY = "000h.analytics-opt-out";

export const analyticsPlacements = [
  "landing",
  "docs",
  "getting_started",
  "about",
] as const;
export type AnalyticsPlacement = (typeof analyticsPlacements)[number];

export type AnalyticsEventMap = {
  page_viewed: {
    route: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  };
  component_impression: {
    component_id: string;
    placement: AnalyticsPlacement;
    route: string;
  };
  demo_interacted: {
    component_id: string;
    placement: AnalyticsPlacement;
    route: string;
    interaction_kind: "activate" | "change";
  };
  variant_selected: {
    component_id: string;
    placement: AnalyticsPlacement;
    route: string;
    variant_id: "preview_background" | "motion_preset" | "theme" | "size" | "variant";
    variant_value: string;
  };
  install_command_copied: { component_id?: string; route: string };
  source_copied: { component_id: string; route: string };
  guide_copied: { component_id: string; route: string };
  copy_failed: {
    component_id?: string;
    route: string;
    copy_kind: "install_command" | "source" | "guide";
  };
  outbound_clicked: {
    destination_category: "github" | "shadcn" | "npm" | "external";
  };
};

export type AnalyticsEvent = keyof AnalyticsEventMap;
export type AnalyticsProperties<E extends AnalyticsEvent> = AnalyticsEventMap[E];
export type AnalyticsStatus =
  | "active"
  | "not_configured"
  | "browser_privacy"
  | "opted_out";

type PublicEnvironment = Partial<Record<
  | "NEXT_PUBLIC_ANALYTICS_ENABLED"
  | "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
  | "NEXT_PUBLIC_POSTHOG_HOST"
  | "NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT"
  | "NEXT_PUBLIC_RELEASE_SHA",
  string
>>;

export type AnalyticsConfig = {
  enabled: boolean;
  host: "https://us.i.posthog.com" | "https://eu.i.posthog.com" | null;
  projectToken: string | null;
  /** Beta and production share one PostHog project; this is what lets a dashboard filter production. */
  environment: DeploymentEnvironment | null;
  release: string | null;
};

export type AnalyticsRuntime = {
  fetch: (input: string, init?: RequestInit) => Promise<unknown>;
  getPrivacySignal: () => boolean;
  getStorage: () => Pick<Storage, "getItem" | "setItem">;
  randomId: () => string;
};

export type Campaign = Pick<AnalyticsEventMap["page_viewed"],
  "utm_source" | "utm_medium" | "utm_campaign" | "utm_content"
>;

const allowedHosts = new Set<NonNullable<AnalyticsConfig["host"]>>([
  "https://us.i.posthog.com",
  "https://eu.i.posthog.com",
]);
const placements = new Set<string>(analyticsPlacements);
const campaignKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;
const variantIds = new Set([
  "preview_background",
  "motion_preset",
  "theme",
  "size",
  "variant",
]);
const destinationCategories = new Set(["github", "shadcn", "npm", "external"]);
const copyKinds = new Set(["install_command", "source", "guide"]);
const interactionKinds = new Set(["activate", "change"]);

export function readAnalyticsConfig(env: PublicEnvironment): AnalyticsConfig {
  const candidate = env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ?? "";
  const host = allowedHosts.has(candidate as NonNullable<AnalyticsConfig["host"]>)
    ? candidate as NonNullable<AnalyticsConfig["host"]>
    : null;
  const projectToken = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || null;
  // `next build` always runs with NODE_ENV=production, so only the explicit flag may enable capture.
  // Anything but "true" — including unset — means disabled, in a production build too.
  const environmentAllowsCapture = env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const flags = readSiteFlags(env);
  return {
    enabled: Boolean(host && projectToken && environmentAllowsCapture),
    host,
    projectToken,
    environment: flags.environment,
    release: flags.releaseSha,
  };
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || hostname === "[::1]" || /^127\./.test(hostname);
}

export function sanitizeRoute(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  let route = value.split(/[?#]/, 1)[0] || "/";
  // App Router strips basePath; browser location does not. Store one route form.
  const sitePath = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://luv-jeri.github.io/cojeev-ui").pathname.replace(/\/+$/, "");
  if (sitePath && (route === sitePath || route.startsWith(`${sitePath}/`))) route = route.slice(sitePath.length) || "/";
  if (/(?:^|\/)(?:feedback-admin|workspace)(?:\/|$)/i.test(route)) return null;
  return route;
}

function boundedToken(value: string | null): string | null {
  if (!value || value.length > 64 || !/^[a-z0-9][a-z0-9._-]*$/i.test(value)) return null;
  return value;
}

export function parseCampaign(search: string, previous: Campaign = {}): Campaign {
  const result = { ...previous };
  let parameters: URLSearchParams;
  try {
    parameters = new URLSearchParams(search);
  } catch {
    return result;
  }
  for (const key of campaignKeys) {
    const value = boundedToken(parameters.get(key));
    if (value) result[key] = value;
  }
  return result;
}

export function categorizeOutboundUrl(
  href: string,
  currentOrigin: string,
): AnalyticsEventMap["outbound_clicked"]["destination_category"] | null {
  let url: URL;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return null;
  }
  if (url.origin === currentOrigin || !/^https?:$/.test(url.protocol)) return null;
  const hostname = url.hostname.toLowerCase();
  if (hostname === "github.com" || hostname.endsWith(".github.com")) return "github";
  if (hostname === "ui.shadcn.com" || hostname.endsWith(".shadcn.com")) return "shadcn";
  if (hostname === "npmjs.com" || hostname.endsWith(".npmjs.com")) return "npm";
  return "external";
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(value);
  return keys.length <= allowed.length && keys.every((key) => allowed.includes(key));
}

function componentId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

function normalizeProperties(
  event: string,
  value: unknown,
): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const properties = value as Record<string, unknown>;
  if (event === "page_viewed") {
    if (!exactKeys(properties, ["route", ...campaignKeys])) return null;
    const route = typeof properties.route === "string" ? sanitizeRoute(properties.route) : null;
    if (!route) return null;
    const normalized: Record<string, string> = { route };
    for (const key of campaignKeys) {
      if (properties[key] === undefined) continue;
      const campaignValue = typeof properties[key] === "string" ? boundedToken(properties[key]) : null;
      if (!campaignValue) return null;
      normalized[key] = campaignValue;
    }
    return normalized;
  }
  if (event === "outbound_clicked") {
    if (!exactKeys(properties, ["destination_category"])) return null;
    return typeof properties.destination_category === "string" && destinationCategories.has(properties.destination_category)
      ? { destination_category: properties.destination_category }
      : null;
  }

  const route = typeof properties.route === "string" ? sanitizeRoute(properties.route) : null;
  if (!route) return null;
  if (event === "component_impression") {
    if (!exactKeys(properties, ["component_id", "placement", "route"])) return null;
    return componentId(properties.component_id) && typeof properties.placement === "string" && placements.has(properties.placement)
      ? { component_id: properties.component_id, placement: properties.placement, route }
      : null;
  }
  if (event === "demo_interacted") {
    if (!exactKeys(properties, ["component_id", "placement", "route", "interaction_kind"])) return null;
    return componentId(properties.component_id) && typeof properties.placement === "string" && placements.has(properties.placement) && typeof properties.interaction_kind === "string" && interactionKinds.has(properties.interaction_kind)
      ? { component_id: properties.component_id, placement: properties.placement, route, interaction_kind: properties.interaction_kind }
      : null;
  }
  if (event === "variant_selected") {
    if (!exactKeys(properties, ["component_id", "placement", "route", "variant_id", "variant_value"])) return null;
    const selectedValue = typeof properties.variant_value === "string" ? boundedToken(properties.variant_value) : null;
    return componentId(properties.component_id) && typeof properties.placement === "string" && placements.has(properties.placement) && typeof properties.variant_id === "string" && variantIds.has(properties.variant_id) && selectedValue
      ? { component_id: properties.component_id, placement: properties.placement, route, variant_id: properties.variant_id, variant_value: selectedValue }
      : null;
  }
  if (event === "install_command_copied") {
    if (!exactKeys(properties, ["component_id", "route"])) return null;
    if (properties.component_id !== undefined && !componentId(properties.component_id)) return null;
    return properties.component_id ? { component_id: properties.component_id as string, route } : { route };
  }
  if (event === "source_copied" || event === "guide_copied") {
    if (!exactKeys(properties, ["component_id", "route"]) || !componentId(properties.component_id)) return null;
    return { component_id: properties.component_id, route };
  }
  if (event === "copy_failed") {
    if (!exactKeys(properties, ["component_id", "route", "copy_kind"])) return null;
    if (properties.component_id !== undefined && !componentId(properties.component_id)) return null;
    if (typeof properties.copy_kind !== "string" || !copyKinds.has(properties.copy_kind)) return null;
    return properties.component_id
      ? { component_id: properties.component_id as string, route, copy_kind: properties.copy_kind }
      : { route, copy_kind: properties.copy_kind };
  }
  return null;
}

export function createAnalyticsClient(config: AnalyticsConfig, runtime: AnalyticsRuntime) {
  let optedOut = false;
  const listeners = new Set<() => void>();
  try {
    const stored = runtime.getStorage().getItem(ANALYTICS_OPT_OUT_KEY);
    optedOut = stored === "true";
  } catch {
    // Storage can be unavailable in hardened browsers; the in-memory choice still works.
  }
  const distinctId = runtime.randomId().slice(0, 200);

  const status = (): AnalyticsStatus => {
    if (!config.enabled || !config.host || !config.projectToken) return "not_configured";
    if (runtime.getPrivacySignal()) return "browser_privacy";
    if (optedOut) return "opted_out";
    return "active";
  };

  return {
    status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptOut(value: boolean) {
      optedOut = value;
      try {
        runtime.getStorage().setItem(ANALYTICS_OPT_OUT_KEY, JSON.stringify(value));
      } catch {
        // The preference remains effective for this page load.
      }
      for (const listener of listeners) listener();
    },
    track(event: AnalyticsEvent, properties: AnalyticsEventMap[AnalyticsEvent]): boolean {
      if (status() !== "active") return false;
      const normalized = normalizeProperties(event, properties);
      if (!normalized) return false;
      const body = JSON.stringify({
        api_key: config.projectToken,
        distinct_id: distinctId,
        event,
        properties: {
          ...normalized,
          ...(config.environment ? { environment: config.environment } : {}),
          ...(config.release ? { release_sha: config.release } : {}),
          $process_person_profile: false,
          $geoip_disable: true,
        },
      });
      try {
        void runtime.fetch(`${config.host}/i/v0/e/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // Analytics failure must never break the product interaction.
      }
      return true;
    },
  };
}

function browserRuntime(): AnalyticsRuntime {
  return {
    fetch: (input, init) => window.fetch(input, init),
    getPrivacySignal: () => {
      const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
      return navigator.doNotTrack === "1" || privacyNavigator.globalPrivacyControl === true;
    },
    getStorage: () => window.localStorage,
    randomId: () => {
      if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return `anonymous-${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
    },
  };
}

let singleton: ReturnType<typeof createAnalyticsClient> | null = null;

export function getAnalyticsClient() {
  if (typeof window === "undefined") return null;
  if (!singleton) {
    const config = readAnalyticsConfig({
      NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT,
      NEXT_PUBLIC_RELEASE_SHA: process.env.NEXT_PUBLIC_RELEASE_SHA,
    });
    singleton = createAnalyticsClient(config, browserRuntime());
  }
  return singleton;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsProperties<E>,
): void {
  getAnalyticsClient()?.track(event, properties);
}
