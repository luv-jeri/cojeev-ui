import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { preview as previewServer } from "vite";

// Self-contained by default: serve the exported build the same way `npm run start` does,
// on an ephemeral port. ANALYTICS_URL still points the gate at an already-running server.
const expectSilent = process.argv.includes("--expect-silent");
const server = process.env.ANALYTICS_URL
  ? null
  : await previewServer({ configFile: false, base: "/cojeev-ui/", build: { outDir: process.env.ANALYTICS_TEST_OUT_DIR ?? "out" }, preview: { host: "127.0.0.1", port: 0, strictPort: true } });
const base = (process.env.ANALYTICS_URL ?? `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`).replace(/\/$/, "");
const testToken = process.env.ANALYTICS_TEST_TOKEN ?? "phc_public_test_token";
// A stamped fixture build inlines these; the gate is told the same values so every
// payload assertion below stays an exact key set either way.
// Each key is added only when its own variable is set: a half-configured fixture then fails on the
// missing stamp itself, never on an explicit `undefined` key that assert.deepEqual counts as a difference.
const stamped = {
  ...(process.env.ANALYTICS_TEST_ENVIRONMENT ? { environment: process.env.ANALYTICS_TEST_ENVIRONMENT } : {}),
  ...(process.env.ANALYTICS_TEST_RELEASE ? { release_sha: process.env.ANALYTICS_TEST_RELEASE } : {}),
};
const captureHosts = [
  "https://us.i.posthog.com/**",
  "https://eu.i.posthog.com/**",
];
const allowedProperties = {
  page_viewed: ["route", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
  component_impression: ["component_id", "placement", "route"],
  demo_interacted: ["component_id", "placement", "route", "interaction_kind"],
  variant_selected: ["component_id", "placement", "route", "variant_id", "variant_value"],
  install_command_copied: ["component_id", "route"],
  source_copied: ["component_id", "route"],
  guide_copied: ["component_id", "route"],
  copy_failed: ["component_id", "route", "copy_kind"],
  outbound_clicked: ["destination_category"],
};
const privacyProperties = ["$process_person_profile", "$geoip_disable", "environment", "release_sha"];
const consentKey = "000h.analytics-consent.v1";

async function analyticsContext(browser, init, consent = "allowed") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
    // Initial state only: unlike an init script, this does not overwrite a
    // visitor's later decline/withdrawal on every navigation or reload.
    storageState: { cookies: [], origins: [{
      origin: new URL(base).origin,
      localStorage: consent === null ? [] : [{ name: consentKey, value: consent }],
    }] },
  });
  const captures = [];
  const attempts = [];
  if (init) await context.addInitScript(init);
  const intercept = async (route) => {
    const request = route.request();
    attempts.push(request.url());
    if (!/\/i\/v0\/e\/?$/.test(new URL(request.url()).pathname)) {
      await route.abort();
      return;
    }
    captures.push({
      payload: request.postDataJSON(),
      headers: await request.allHeaders(),
    });
    await route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  };
  for (const pattern of captureHosts) await context.route(pattern, intercept);
  return { context, captures, attempts };
}

async function copyInstallCommand(page) {
  // The custom select's client-only label proves docs hydration without relying
  // on analytics itself as a readiness signal in silent contexts.
  await page.getByRole("combobox", { name: "Example approach", exact: true }).filter({ hasText: "Accent" }).waitFor();
  await page.bringToFront();
  const install = page.locator('.docs-command [data-slot="copy-control"]').first();
  await install.getByRole("button", { name: "Copy command", exact: true }).click();
  await install.locator('[data-copy-state="copied"]').waitFor();
}

async function waitFor(captures, predicate, label, timeout = 6_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = captures.find(({ payload }) => predicate(payload));
    if (found) return found.payload;
    await delay(40);
  }
  assert.fail(`Timed out waiting for analytics event: ${label}. Saw: ${captures.map(({ payload }) => `${payload.event}${payload.properties?.component_id ? `(${payload.properties.component_id})` : ""}`).join(", ")}`);
}

function events(captures, name) {
  return captures.filter(({ payload }) => payload.event === name).map(({ payload }) => payload);
}

async function exposeLandingSpecimen(page, captures) {
  const specimen = page.locator('[data-featured-component="motion-drawer"] [data-analytics-preview="motion-drawer"]');
  await specimen.waitFor();
  // Static HTML can satisfy the locator before the observer's effect is mounted.
  // Use the real provider event as the readiness boundary, then start exposure.
  await waitFor(captures, payload => payload.event === "page_viewed" && payload.properties.route === "/", "landing analytics hydration", 30_000);
  await specimen.scrollIntoViewIfNeeded();
  const visibleRatio = await specimen.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    return rect.width && rect.height ? width * height / (rect.width * rect.height) : 0;
  });
  assert(visibleRatio >= 0.5, `landing exposure starts with at least half the specimen in the viewport; saw ${visibleRatio}`);
  return specimen;
}

function assertSafeCaptures(captures) {
  for (const { payload, headers } of captures) {
    assert(Object.hasOwn(allowedProperties, payload.event), `unexpected event ${payload.event}`);
    assert.deepEqual(
      Object.keys(payload).sort(),
      ["api_key", "distinct_id", "event", "properties"].sort(),
      `${payload.event}: top-level payload is bounded`,
    );
    assert.equal(payload.api_key, testToken);
    assert.equal(typeof payload.distinct_id, "string");
    assert(payload.distinct_id.length > 0 && payload.distinct_id.length <= 200);
    assert.equal(payload.properties.$process_person_profile, false);
    assert.equal(payload.properties.$geoip_disable, true);
    assert.deepEqual(
      Object.keys(payload.properties).sort(),
      [...allowedProperties[payload.event], ...privacyProperties]
        .filter((key) => payload.properties[key] !== undefined)
        .sort(),
      `${payload.event}: properties match its allowlist`,
    );
    if (payload.properties.route) {
      assert(payload.properties.route.startsWith("/"));
      assert(!payload.properties.route.includes("?"));
      assert(!payload.properties.route.includes("#"));
      assert(!payload.properties.route.startsWith("/cojeev-ui/"), "basePath is removed from every route");
    }
    assert.equal(headers.referer, undefined, `${payload.event}: capture sends no referrer header`);
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /private=dontsend|Add a note|npx shadcn|clipboard|user.?agent|referrer/i);
  }
}

if (expectSilent) {
  const browser = await chromium.launch();
  try {
    for (const consent of [null, "allowed"]) {
    const { context, captures, attempts } = await analyticsContext(browser, undefined, consent);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/?utm_source=shadcn`, { waitUntil: "domcontentloaded" });
    await page.getByText("Analytics is not connected on this site.", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Allow analytics", exact: true }).count(), 0);
    for (const route of ["/", "/docs/", "/docs/button/", "/getting-started/"]) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.mouse.wheel(0, 2_000);
      await delay(400);
    }
    // The strongest capture path in the product: a real successful copy.
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(captures.length, 0, `a build without NEXT_PUBLIC_ANALYTICS_ENABLED=true sent ${captures.length} event(s)`);
    assert.equal(attempts.length, 0, "disabled configuration makes no PostHog requests even with stored consent");
    await context.close();
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  console.log("PASS: a build with analytics unset or explicitly disabled captures nothing.");
  process.exit(0);
}

const browser = await chromium.launch();
try {
  // The actual exported application's visitor choice, not a test-only client.
  {
    const { context, captures, attempts } = await analyticsContext(browser, undefined, null);
    const page = await context.newPage();
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Allow analytics", exact: true }).waitFor();
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, 0, "first visit, preview and copy stay silent before choice");
    await page.getByRole("button", { name: "No thanks", exact: true }).click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
    await page.reload();
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, 0, "decline persists across reload and copy");
    assert.equal(await page.getByRole("button", { name: "Allow analytics", exact: true }).count(), 0, "declined visitors are not prompted again");

    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    await page.getByRole("button", { name: "Turn analytics off", exact: true }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "allowed");
    await delay(300);
    assert.equal(attempts.length, 0, "Allow does not replay suppressed page/copy events");
    await page.getByRole("link", { name: "Get started", exact: true }).first().click();
    await page.waitForURL(/\/getting-started\/?$/);
    await waitFor(captures, p => p.event === "page_viewed" && p.properties.route === "/getting-started/", "first future page after Allow");
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await copyInstallCommand(page);
    await waitFor(captures, p => p.event === "install_command_copied", "future command copy after Allow");

    // Withdrawal in another tab must stop the already-open docs tab too.
    const preferences = await context.newPage();
    await preferences.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await preferences.getByRole("button", { name: "Turn analytics off", exact: true }).click();
    await preferences.getByRole("button", { name: "Allow analytics", exact: true }).waitFor();
    await delay(300); // let already-dispatched pre-withdrawal requests settle
    const withdrawnCount = attempts.length;
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, withdrawnCount, "cross-tab withdrawal stops later copy and exposure requests");
    await page.reload();
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, withdrawnCount, "withdrawal survives reload");
    assertSafeCaptures(captures);
    await context.close();
  }

  // A failed withdrawal write must still stop already-open peer tabs.
  {
    const { context, captures, attempts } = await analyticsContext(browser);
    const page = await context.newPage();
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await waitFor(captures, p => p.event === "page_viewed", "allowed peer is hydrated");
    const preferences = await context.newPage();
    await preferences.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await preferences.getByRole("button", { name: "Turn analytics off", exact: true }).waitFor();
    await preferences.evaluate(key => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new Error("Withdrawal write blocked by test");
        return original.call(this, name, value);
      };
    }, consentKey);
    await preferences.getByRole("button", { name: "Turn analytics off", exact: true }).click();
    await preferences.getByRole("status").filter({ hasText: /could not/i }).waitFor();
    await delay(300);
    await page.evaluate(key => {
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: "allowed" }));
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    }, consentKey);
    const withdrawnCount = attempts.length;
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, withdrawnCount, "failed persistence still withdraws capture in open peer tabs");
    assertSafeCaptures(captures);
    await context.close();
  }

  // Neither missing storage nor a failed preference write may enable capture.
  for (const storageMethod of ["getItem", "setItem"]) {
    const { context, attempts } = await analyticsContext(browser, undefined, null);
    await context.addInitScript(({ method, key }) => {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (args[0] === key || args[0] === "000h.analytics-opt-out") throw new Error("Storage blocked by test");
        return original.apply(this, args);
      };
    }, { method: storageMethod, key: consentKey });
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    if (storageMethod === "setItem") await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    await page.getByRole("status").filter({ hasText: /could not/i }).waitFor();
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await copyInstallCommand(page);
    await delay(1_200);
    assert.equal(attempts.length, 0, `failed storage ${storageMethod} stays silent`);
    await context.close();
  }

  {
    const { context, captures, attempts } = await analyticsContext(browser, undefined, null);
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Allow analytics", exact: true }).waitFor();
    const specimen = page.locator('[data-featured-component="motion-drawer"] [data-analytics-preview="motion-drawer"]');
    await specimen.scrollIntoViewIfNeeded();
    await delay(1_200);
    assert.equal(attempts.length, 0, "pre-consent component exposure sends nothing");
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    await delay(400);
    assert.equal(events(captures, "component_impression").length, 0, "pre-consent exposure time does not carry into the impression timer");
    assert.equal(events(captures, "page_viewed").length, 0, "Allow does not replay the initial page view");
    await waitFor(captures, p => p.event === "component_impression" && p.properties.component_id === "motion-drawer", "new full exposure after consent");
    assertSafeCaptures(captures);
    await context.close();
  }

  {
    const { context, captures } = await analyticsContext(browser);
    const page = await context.newPage();
    await page.goto(
      `${base}/docs/button/?utm_source=shadcn&utm_medium=registry&utm_campaign=000h-launch&utm_content=button-card&private=dontsend`,
      { waitUntil: "domcontentloaded" },
    );
    await page.locator('[data-analytics-preview="button"]').waitFor();
    const initialPage = await waitFor(captures, (payload) => payload.event === "page_viewed", "initial page view");
    assert.deepEqual(initialPage.properties, {
      route: "/docs/button/",
      utm_source: "shadcn",
      utm_medium: "registry",
      utm_campaign: "000h-launch",
      utm_content: "button-card",
      ...stamped,
      $process_person_profile: false,
      $geoip_disable: true,
    });
    await delay(300);
    assert.equal(events(captures, "page_viewed").length, 1, "Strict Mode does not duplicate the initial page view");

    const preview = page.locator('[data-analytics-preview="button"]');
    const previewTab = preview.getByRole("tab", { name: "Preview", exact: true });
    const codeTab = preview.getByRole("tab", { name: "Code", exact: true });
    await codeTab.click();
    await previewTab.click();
    await delay(100);
    assert.equal(events(captures, "demo_interacted").length, 0, "preview chrome is not a demo interaction");

    const demoButton = preview.locator('[data-example="button"][data-example-role="interactive"]').getByRole("button", { name: "Add a note", exact: true });
    await demoButton.click();
    const demo = await waitFor(captures, (payload) => payload.event === "demo_interacted", "real demo activation");
    assert.deepEqual(demo.properties, {
      component_id: "button",
      placement: "docs",
      route: "/docs/button/",
      interaction_kind: "activate",
      ...stamped,
      $process_person_profile: false,
      $geoip_disable: true,
    });

    const source = preview.locator('[data-slot="copy-control"]').filter({ has: page.getByRole("button", { name: "Copy code", exact: true }) }).first();
    await source.getByRole("button", { name: "Copy code", exact: true }).click();
    await source.locator('[data-copy-state="copied"]').waitFor();
    const sourceCopy = await waitFor(captures, (payload) => payload.event === "source_copied", "successful source copy");
    assert.equal(sourceCopy.properties.route, "/docs/button/");

    const install = page.locator('.docs-command [data-slot="copy-control"]').first();
    await install.getByRole("button", { name: "Copy command", exact: true }).click();
    await install.locator('[data-copy-state="copied"]').waitFor();
    const installCopy = await waitFor(captures, (payload) => payload.event === "install_command_copied", "successful install copy");
    assert.equal(installCopy.properties.route, "/docs/button/");

    await preview.getByRole("button", { name: "Background", exact: true }).click();
    await page.getByRole("dialog", { name: "Choose preview background" }).getByRole("button", { name: "Grid", exact: true }).click();
    const variant = await waitFor(captures, (payload) => payload.event === "variant_selected", "committed preview background");
    assert.deepEqual(
      {
        component_id: variant.properties.component_id,
        placement: variant.properties.placement,
        route: variant.properties.route,
        variant_id: variant.properties.variant_id,
        variant_value: variant.properties.variant_value,
      },
      {
        component_id: "button",
        placement: "docs",
        route: "/docs/button/",
        variant_id: "preview_background",
        variant_value: "grid",
      },
    );

    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw new Error("Denied by browser test");
      };
      document.execCommand = () => false;
    });
    const guide = page.locator('.docs-handoff [data-slot="copy-control"]').first();
    await guide.getByRole("button", { name: "Copy guide", exact: true }).click();
    await guide.locator('[data-copy-state="error"]').waitFor();
    const copyFailure = await waitFor(
      captures,
      (payload) => payload.event === "copy_failed" && payload.properties.copy_kind === "guide",
      "copy failure after both browser mechanisms fail",
    );
    assert.equal(copyFailure.properties.route, "/docs/button/");
    assert.equal(events(captures, "guide_copied").length, 0, "failed copies are never reported as successful");

    await page.getByRole("link", { name: "Getting started", exact: true }).first().click();
    await page.waitForURL(/\/docs\/?$/);
    const nextPage = await waitFor(
      captures,
      (payload) => payload.event === "page_viewed" && payload.properties.route === "/docs/",
      "completed SPA navigation",
    );
    assert.equal(nextPage.properties.utm_source, "shadcn", "campaign stays in memory across SPA navigation");
    assert.equal(nextPage.properties.utm_content, "button-card");
    await delay(300);
    assert.equal(events(captures, "page_viewed").filter((payload) => payload.properties.route === "/docs/").length, 1);
    assertSafeCaptures(captures);
    await context.close();
  }

  for (const holdHydration of [false, true]) {
    const { context, captures } = await analyticsContext(browser);
    const page = await context.newPage();
    let releaseScripts;
    if (holdHydration) {
      const released = new Promise(resolve => { releaseScripts = resolve; });
      await context.route('**/*.js', async route => { await released; await route.continue(); });
    }
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const exposure = exposeLandingSpecimen(page, captures);
    let earlyScroll = null;
    if (holdHydration) {
      await delay(300);
      earlyScroll = await page.evaluate(() => scrollY);
      releaseScripts();
    }
    const specimen = await exposure;
    if (holdHydration) assert.equal(earlyScroll, 0, "exposure setup must not scroll server HTML before analytics hydrates");
    const visibilitySnapshot = () => specimen.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        viewport: { width: innerWidth, height: innerHeight },
        scroll: { x: scrollX, y: scrollY },
        visibility: document.visibilityState,
        ready: document.readyState,
        fonts: document.fonts.status,
        htmlClass: document.documentElement.className,
      };
    });
    const exposureStart = await visibilitySnapshot();
    const impression = await waitFor(
      captures,
      (payload) => payload.event === "component_impression" && payload.properties.component_id === "motion-drawer",
      "50 percent visible for one second",
    ).catch(async (error) => {
      console.error("Landing impression visibility:", JSON.stringify({ start: exposureStart, end: await visibilitySnapshot() }));
      throw error;
    });
    assert.deepEqual(impression.properties, {
      component_id: "motion-drawer",
      placement: "landing",
      route: "/",
      ...stamped,
      $process_person_profile: false,
      $geoip_disable: true,
    });
    await page.locator("header").first().scrollIntoViewIfNeeded();
    await delay(150);
    await specimen.scrollIntoViewIfNeeded();
    await delay(1_200);
    assert.equal(
      events(captures, "component_impression").filter((payload) => payload.properties.component_id === "motion-drawer").length,
      1,
      "one component and placement emits once in a route visit",
    );
    assertSafeCaptures(captures);
    await context.close();
  }

  for (const [name, init] of [
    ["Do Not Track", () => Object.defineProperty(Navigator.prototype, "doNotTrack", { configurable: true, get: () => "1" })],
    ["Global Privacy Control", () => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { configurable: true, get: () => true })],
  ]) {
    const { context, captures, attempts } = await analyticsContext(browser, init);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByText("Your browser privacy signal is preventing analytics.", { exact: false }).waitFor();
    await delay(400);
    assert.equal(captures.length, 0, `${name} suppresses every event`);
    assert.equal(attempts.length, 0, `${name} overrides stored allowance without PostHog requests`);
    await context.close();
  }

  {
    const { context, captures } = await analyticsContext(browser, () => {
      localStorage.setItem("000h.analytics-opt-out", "true");
    }, null);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByText("Analytics is off in this browser.", { exact: false }).waitFor();
    assert.equal(captures.length, 0);
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    await page.getByRole("button", { name: "Turn analytics off", exact: true }).waitFor();
    await delay(300);
    assert.equal(captures.length, 0, "opting in does not flush suppressed history");
    await page.getByRole("link", { name: "Get started", exact: true }).first().click();
    await page.waitForURL(/\/getting-started\/?$/);
    await waitFor(
      captures,
      (payload) => payload.event === "page_viewed" && payload.properties.route === "/getting-started/",
      "first event after opt-in",
    );
    assert.equal(events(captures, "page_viewed").length, 1);
    assertSafeCaptures(captures);
    await context.close();
  }

  for (const consent of [null, "allowed"]) {
    const { context, captures, attempts } = await analyticsContext(browser, undefined, consent);
    const page = await context.newPage();
    for (const route of ["/workspace/", "/feedback-admin/"]) {
      await page.goto(`${base}${route}?draft=private`, { waitUntil: "domcontentloaded" });
      await delay(500);
      assert.equal(captures.length, 0, `${route} emits no events`);
      assert.equal(attempts.length, 0);
      assert.equal(await page.getByRole("button", { name: "Allow analytics", exact: true }).count(), 0, "private routes do not show an analytics prompt");
    }
    await context.close();
  }

  console.log("PASS: prior opt-in, persistent decline/withdrawal, cross-tab suppression, storage failure, bounded capture, copy truth, privacy signals, route deduplication, impressions and demo intent.");
} finally {
  await browser.close();
  await server?.close();
}
