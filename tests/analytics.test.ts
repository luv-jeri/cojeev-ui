import { test } from "node:test";
import assert from "node:assert/strict";
import {
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

const enabled = {
  enabled: true,
  host: "https://us.i.posthog.com" as const,
  projectToken: "phc_public_test_token",
};

test("configuration requires a token, an approved PostHog host, and explicit non-production enabling", () => {
  assert.equal(readAnalyticsConfig({ NODE_ENV: "development", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com" }).enabled, false);
  assert.equal(readAnalyticsConfig({ NODE_ENV: "development", NEXT_PUBLIC_ANALYTICS_ENABLED: "true", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com" }).enabled, true);
  assert.equal(readAnalyticsConfig({ NODE_ENV: "production", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" }).enabled, true);
  assert.equal(readAnalyticsConfig({ NODE_ENV: "production", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "", NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com" }).enabled, false);
  assert.equal(readAnalyticsConfig({ NODE_ENV: "production", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_x", NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.example.com" }).enabled, false);
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
  const harness = runtime();
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
  const harness = runtime();
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

test("DNT, GPC, opt-out, invalid configuration, and storage errors all fail closed", () => {
  for (const getPrivacySignal of [() => true]) {
    const harness = runtime({ getPrivacySignal });
    const client = createAnalyticsClient(enabled, harness.runtime);
    assert.equal(client.status(), "browser_privacy");
    assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
    assert.equal(harness.requests.length, 0);
  }

  const brokenStorage = runtime({ getStorage: () => { throw new Error("blocked"); } });
  const client = createAnalyticsClient(enabled, brokenStorage.runtime);
  assert.equal(client.status(), "active");
  client.setOptOut(true);
  assert.equal(client.status(), "opted_out");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), false);
  client.setOptOut(false);
  assert.equal(brokenStorage.requests.length, 0, "events suppressed while opted out are never replayed");
  assert.equal(client.track("page_viewed", { route: "/docs/" }), true);
  assert.equal(brokenStorage.requests.length, 1);

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
  const harness = runtime();
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
