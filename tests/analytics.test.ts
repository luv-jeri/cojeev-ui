import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_CONSENT_KEY,
  categorizeOutboundUrl,
  createAnalyticsClient,
  isLoopbackHost,
  parseCampaign,
  readAnalyticsConfig,
  sanitizeRoute,
  type AnalyticsRuntime,
} from "../lib/analytics/client";

function runtime(overrides: Partial<AnalyticsRuntime> = {}) {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const values = new Map<string, string>();
  const value: AnalyticsRuntime = {
    fetch: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(null, { status: 204 });
    },
    getPrivacySignal: () => false,
    getStorage: () => ({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, next) => values.set(key, next),
    }),
    randomId: () => "page-load-7f345cae",
    ...overrides,
  };
  return { runtime: value, requests, values };
}

function allowedRuntime(overrides: Partial<AnalyticsRuntime> = {}) {
  const harness = runtime(overrides);
  harness.values.set(ANALYTICS_CONSENT_KEY, "allowed");
  return harness;
}

const enabled = {
  enabled: true,
  host: "https://us.i.posthog.com" as const,
  projectToken: "phc_public_test_token",
  environment: null,
  release: null,
};
const RELEASE = "a4a04600000000000000000000000000000000ab";

test("capture needs a token, an approved host, and the explicit enable flag in every build", () => {
  const configured = { NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" };
  // `next build` always sets NODE_ENV=production, so a released build must still obey the flag.
  assert.equal(readAnalyticsConfig(configured).enabled, false, "unset disables capture in a production build");
  assert.equal(readAnalyticsConfig({ ...configured, NEXT_PUBLIC_ANALYTICS_ENABLED: "false" }).enabled, false, "false disables capture in a production build");
  assert.equal(readAnalyticsConfig({ ...configured, NEXT_PUBLIC_ANALYTICS_ENABLED: "TRUE" }).enabled, false, "only the exact string enables capture");
  assert.equal(readAnalyticsConfig({ ...configured, NEXT_PUBLIC_ANALYTICS_ENABLED: "true" }).enabled, true);
  assert.equal(readAnalyticsConfig({ ...configured, NEXT_PUBLIC_ANALYTICS_ENABLED: "true", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "" }).enabled, false);
  assert.equal(readAnalyticsConfig({ ...configured, NEXT_PUBLIC_ANALYTICS_ENABLED: "true", NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.example.com" }).enabled, false);
});

test("an enabled client sends nothing before the visitor makes a choice", () => {
  const harness = runtime();
  const client = createAnalyticsClient(enabled, harness.runtime);

  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
  assert.equal(harness.requests.length, 0);
});

test("allowing persists and only future valid events are captured", () => {
  const harness = runtime();
  const client = createAnalyticsClient(enabled, harness.runtime);
  assert.equal(client.status(), "awaiting_choice");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
  client.setConsent("allowed");
  assert.equal(harness.values.get(ANALYTICS_CONSENT_KEY), "allowed");
  assert.equal(client.status(), "active");
  assert.equal(harness.requests.length, 0, "allow does not replay the suppressed page view");
  assert.equal(client.track("page_viewed", { route: "/getting-started/" }), true);
  assert.equal(JSON.parse(String(harness.requests[0].init?.body)).properties.route, "/getting-started/");
  const recreated = createAnalyticsClient(enabled, harness.runtime);
  assert.equal(recreated.status(), "active");
  assert.equal(recreated.track("page_viewed", { route: "/docs/" }), true);
  assert.equal(harness.requests.length, 2);
});

test("declining and withdrawing block capture synchronously and persist", () => {
  const harness = runtime();
  const client = createAnalyticsClient(enabled, harness.runtime);
  client.setConsent("declined");
  assert.equal(client.status(), "declined");
  assert.equal(harness.values.get(ANALYTICS_CONSENT_KEY), "declined");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
  client.setConsent("allowed");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), true);
  client.setConsent("declined");
  assert.equal(client.track("page_viewed", { route: "/getting-started/" }), false);
  assert.equal(harness.requests.length, 1);
  assert.equal(createAnalyticsClient(enabled, harness.runtime).status(), "declined");
});

test("malformed and legacy choices never grant consent", () => {
  for (const stored of ["true", "false", "null", "{broken", "yes"]) {
    const harness = runtime();
    harness.values.set(ANALYTICS_CONSENT_KEY, stored);
    if (stored === "false") harness.values.set("000h.analytics-opt-out", "false");
    const client = createAnalyticsClient(enabled, harness.runtime);
    assert.notEqual(client.status(), "active", `${stored} is not explicit consent`);
    assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
    assert.equal(harness.requests.length, 0);
  }
});

test("storage read and write failures fail closed while decline stays effective", () => {
  const readFailure = runtime({ getStorage: () => { throw new Error("blocked"); } });
  const unreadable = createAnalyticsClient(enabled, readFailure.runtime);
  assert.equal(unreadable.status(), "storage_unavailable");
  unreadable.setConsent("allowed");
  assert.equal(unreadable.track("page_viewed", { route: "/docs/" }), false);

  let reads = 0;
  let storageChanged: ((key: string | null, value: string | null) => void) | undefined;
  const transientFailure = runtime({
    getStorage: () => ({
      getItem: () => {
        reads += 1;
        if (reads === 1) throw new Error("temporarily blocked");
        return "allowed";
      },
      setItem: () => undefined,
    }),
    subscribeStorage: (listener) => {
      storageChanged = listener;
      return () => undefined;
    },
  });
  const latched = createAnalyticsClient(enabled, transientFailure.runtime);
  assert.equal(latched.status(), "storage_unavailable");
  assert.equal(latched.status(), "storage_unavailable", "a later read cannot silently enable this page load");
  storageChanged?.(null, null);
  assert.equal(latched.status(), "storage_unavailable", "a stale storage event cannot clear the failure latch");
  assert.equal(latched.track("page_viewed", { route: "/docs/" }), false);

  let stored = "allowed";
  const writeFailure = runtime({
    getStorage: () => ({ getItem: () => stored, setItem: () => { throw new Error("full"); } }),
  });
  const client = createAnalyticsClient(enabled, writeFailure.runtime);
  assert.equal(client.status(), "active");
  client.setConsent("declined");
  assert.equal(client.status(), "storage_unavailable", "a failed decline write is disclosed while this page remains blocked");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
  stored = "declined";
  client.setConsent("allowed");
  assert.notEqual(client.status(), "active", "a failed allow write cannot enable capture");
  assert.equal(writeFailure.requests.length, 0);
});

test("browser privacy, cross-tab withdrawal, and disabled configuration override stored allowance", () => {
  const privateHarness = allowedRuntime({ getPrivacySignal: () => true });
  const privateClient = createAnalyticsClient(enabled, privateHarness.runtime);
  assert.equal(privateClient.status(), "browser_privacy");
  assert.equal(privateClient.track("page_viewed", { route: "/docs/" }), false);
  const shared = allowedRuntime();
  const openTab = createAnalyticsClient(enabled, shared.runtime);
  assert.equal(openTab.track("page_viewed", { route: "/docs/" }), true);
  shared.values.set(ANALYTICS_CONSENT_KEY, "declined");
  assert.equal(openTab.track("page_viewed", { route: "/getting-started/" }), false);
  assert.equal(shared.requests.length, 1);
  const disabledHarness = allowedRuntime();
  const disabled = createAnalyticsClient({ ...enabled, enabled: false }, disabledHarness.runtime);
  assert.equal(disabled.status(), "not_configured");
  assert.equal(disabled.track("page_viewed", { route: "/docs/" }), false);
  assert.equal(disabledHarness.requests.length, 0);
});

test("a failed withdrawal write immediately blocks every open tab", () => {
  const values = new Map([[ANALYTICS_CONSENT_KEY, "allowed"]]);
  const listeners = new Set<(consent: "allowed" | "declined") => void>();
  const storageListeners = new Set<(key: string | null, value: string | null) => void>();
  const makeRuntime = (writeFails = false) => runtime({
    getStorage: () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (writeFails) throw new Error("storage blocked");
        values.set(key, value);
      },
    }),
    publishConsent: (consent: "allowed" | "declined") => {
      for (const listener of listeners) listener(consent);
    },
    subscribeConsent: (listener: (consent: "allowed" | "declined") => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeStorage: (listener: (key: string | null, value: string | null) => void) => {
      storageListeners.add(listener);
      return () => storageListeners.delete(listener);
    },
  } as unknown as Partial<AnalyticsRuntime>);
  const firstTab = makeRuntime();
  const secondTab = makeRuntime(true);
  const capturingClient = createAnalyticsClient(enabled, firstTab.runtime);
  const withdrawingClient = createAnalyticsClient(enabled, secondTab.runtime);
  assert.equal(capturingClient.track("page_viewed", { route: "/docs/" }), true);

  withdrawingClient.setConsent("declined");

  assert.equal(withdrawingClient.status(), "storage_unavailable");
  assert.equal(values.get(ANALYTICS_CONSENT_KEY), "allowed", "the failed write cannot be mistaken for persisted withdrawal");
  assert.equal(capturingClient.status(), "declined");
  for (const listener of storageListeners) listener(ANALYTICS_CONSENT_KEY, "allowed");
  assert.equal(capturingClient.status(), "declined", "a stale allowed storage event cannot undo failed withdrawal");
  assert.equal(capturingClient.track("page_viewed", { route: "/getting-started/" }), false);
  assert.equal(firstTab.requests.length, 1);
});

test("a broken cross-tab channel cannot interrupt a local choice", () => {
  const harness = runtime({
    publishConsent: () => { throw new Error("channel closed"); },
  });
  const client = createAnalyticsClient(enabled, harness.runtime);
  assert.doesNotThrow(() => client.setConsent("declined"));
  assert.equal(client.status(), "declined");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
});

test("release identifiers are read from the build, shape-checked, and ride the payload beside the privacy flags", () => {
  const configured = { NEXT_PUBLIC_ANALYTICS_ENABLED: "true", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" };
  const production = readAnalyticsConfig({ ...configured, NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "production", NEXT_PUBLIC_RELEASE_SHA: RELEASE });
  assert.equal(production.environment, "production");
  assert.equal(production.release, RELEASE);
  const junk = readAnalyticsConfig({ ...configured, NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "staging", NEXT_PUBLIC_RELEASE_SHA: "not-a-commit" });
  assert.equal(junk.environment, null, "an unknown environment name is not forwarded");
  assert.equal(junk.release, null, "a malformed release identifier is not forwarded");

  const stamped = allowedRuntime();
  createAnalyticsClient({ ...enabled, environment: "production", release: RELEASE }, stamped.runtime)
    .track("page_viewed", { route: "/docs/" });
  assert.deepEqual(JSON.parse(String(stamped.requests[0].init?.body)).properties, {
    route: "/docs/",
    environment: "production",
    release_sha: RELEASE,
    $process_person_profile: false,
    $geoip_disable: true,
  });

  // A caller still cannot smuggle them in: normalizeProperties rejects any extra key.
  const forged = allowedRuntime();
  const client = createAnalyticsClient(enabled, forged.runtime);
  assert.equal(client.track("page_viewed", { route: "/docs/", environment: "production" } as never), false);
  assert.equal(client.track("page_viewed", { route: "/docs/" }), true);
  assert.deepEqual(JSON.parse(String(forged.requests[0].init?.body)).properties, {
    route: "/docs/",
    $process_person_profile: false,
    $geoip_disable: true,
  }, "an unstamped build sends no environment or release key at all");
});

test("routes lose query and hash data while private surfaces are rejected", () => {
  assert.equal(sanitizeRoute("/cojeev-ui/docs/button/?secret=yes#copy"), "/docs/button/");
  assert.equal(sanitizeRoute("/cojeev-ui/feedback-admin/?draft=private"), null);
  assert.equal(sanitizeRoute("/workspace/attachment.txt"), null);
  assert.equal(sanitizeRoute("https://someone.example/private"), null);
});

test("campaign parsing accepts only bounded UTM fields and carries them across navigation", () => {
  const first = parseCampaign("?utm_source=shadcn&utm_medium=registry&utm_campaign=launch&utm_content=button&email=private");
  assert.deepEqual(first, {
    utm_source: "shadcn",
    utm_medium: "registry",
    utm_campaign: "launch",
    utm_content: "button",
  });
  assert.deepEqual(parseCampaign("?anything=ignored", first), first);
  assert.deepEqual(parseCampaign("?utm_content=%3Craw+copy%3E", first), first, "free-form campaign content is discarded");
});

test("capture sends an anonymous, GeoIP-disabled payload with only the event schema", () => {
  const harness = allowedRuntime();
  const client = createAnalyticsClient(enabled, harness.runtime);

  assert.equal(client.track("component_impression", {
    component_id: "button",
    placement: "docs",
    route: "/cojeev-ui/docs/button/?token=secret",
  }), true);
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0].input, "https://us.i.posthog.com/i/v0/e/");
  assert.equal(harness.requests[0].init?.credentials, "omit");
  assert.equal(harness.requests[0].init?.referrerPolicy, "no-referrer");
  const payload = JSON.parse(String(harness.requests[0].init?.body));
  assert.deepEqual(payload, {
    api_key: "phc_public_test_token",
    distinct_id: "page-load-7f345cae",
    event: "component_impression",
    properties: {
      component_id: "button",
      placement: "docs",
      route: "/docs/button/",
      $process_person_profile: false,
      $geoip_disable: true,
    },
  });
  assert.doesNotMatch(JSON.stringify(payload), /secret|referrer|user.?agent|clipboard/i);
});

test("unknown events, unexpected properties, and invalid variant identifiers are dropped", () => {
  const harness = allowedRuntime();
  const client = createAnalyticsClient(enabled, harness.runtime);

  assert.equal(client.track("page_viewed", { route: "/docs/", raw_text: "private" } as never), false);
  assert.equal(client.track("made_up_event" as never, {} as never), false);
  assert.equal(client.track("variant_selected", {
    component_id: "button",
    placement: "docs",
    route: "/docs/button/",
    variant_id: "button_label" as never,
    variant_value: "Send my private draft",
  }), false);
  assert.equal(harness.requests.length, 0);
});

test("DNT and invalid configuration fail closed", () => {
  for (const getPrivacySignal of [() => true]) {
    const harness = allowedRuntime({ getPrivacySignal });
    const client = createAnalyticsClient(enabled, harness.runtime);
    assert.equal(client.status(), "browser_privacy");
    assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
    assert.equal(harness.requests.length, 0);
  }

  const missing = createAnalyticsClient({ ...enabled, enabled: false }, runtime().runtime);
  assert.equal(missing.status(), "not_configured");
});

test("outbound links are reduced to a destination category", () => {
  assert.equal(categorizeOutboundUrl("https://github.com/luv-jeri/cojeev", "https://000h.dev"), "github");
  assert.equal(categorizeOutboundUrl("https://ui.shadcn.com/docs", "https://000h.dev"), "shadcn");
  assert.equal(categorizeOutboundUrl("https://www.npmjs.com/package/example", "https://000h.dev"), "npm");
  assert.equal(categorizeOutboundUrl("https://example.com/path?private=yes", "https://000h.dev"), "external");
  assert.equal(categorizeOutboundUrl("/docs/button/", "https://000h.dev"), null);
});

test("outbound event rejects route, URL, and label additions", () => {
  const harness = allowedRuntime();
  const client = createAnalyticsClient(enabled, harness.runtime);
  assert.equal(client.track("outbound_clicked", { destination_category: "github" }), true);
  assert.equal(client.track("outbound_clicked", {
    destination_category: "github",
    href: "https://github.com/private",
  } as never), false);
  const payload = JSON.parse(String(harness.requests[0].init?.body));
  assert.deepEqual(payload.properties, {
    destination_category: "github",
    $process_person_profile: false,
    $geoip_disable: true,
  });
});

test("Pages paths and router paths use the same analytics route", () => {
  assert.equal(sanitizeRoute("/cojeev-ui/docs/button/"), sanitizeRoute("/docs/button/"));
  assert.equal(sanitizeRoute("/cojeev-ui/"), "/");
  assert.equal(sanitizeRoute("/cojeev-ui-other/docs/"), "/cojeev-ui-other/docs/");
  for (const host of ["localhost", "preview.localhost", "127.0.0.1", "[::1]"]) assert.equal(isLoopbackHost(host), true);
  assert.equal(isLoopbackHost("000h.example.com"), false);
});
