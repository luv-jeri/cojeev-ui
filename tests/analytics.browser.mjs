import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { preview as previewServer } from "vite";

// Self-contained by default: serve the exported build the same way `npm run start` does,
// on an ephemeral port. ANALYTICS_URL still points the gate at an already-running server.
const expectSilent = process.argv.includes("--expect-silent");
const server = process.env.ANALYTICS_URL
  ? null
  : await previewServer({ configFile: false, base: "/cojeev-ui/", build: { outDir: "out" }, preview: { host: "127.0.0.1", port: 0, strictPort: true } });
const base = (process.env.ANALYTICS_URL ?? `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`).replace(/\/$/, "");
const testToken = process.env.ANALYTICS_TEST_TOKEN ?? "phc_public_test_token";
// A stamped fixture build inlines these; the gate is told the same values so every
// payload assertion below stays an exact key set either way.
const stamped = process.env.ANALYTICS_TEST_ENVIRONMENT
  ? { environment: process.env.ANALYTICS_TEST_ENVIRONMENT, release_sha: process.env.ANALYTICS_TEST_RELEASE }
  : {};
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

async function analyticsContext(browser, init) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const captures = [];
  if (init) await context.addInitScript(init);
  const intercept = async (route) => {
    const request = route.request();
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
  return { context, captures };
}

async function waitFor(captures, predicate, label, timeout = 6_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = captures.find(({ payload }) => predicate(payload));
    if (found) return found.payload;
    await delay(40);
  }
  assert.fail(`Timed out waiting for analytics event: ${label}. Saw: ${captures.map(({ payload }) => payload.event).join(", ")}`);
}

function events(captures, name) {
  return captures.filter(({ payload }) => payload.event === name).map(({ payload }) => payload);
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
    const { context, captures } = await analyticsContext(browser);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/?utm_source=shadcn`, { waitUntil: "domcontentloaded" });
    await page.getByText("Analytics is not connected on this site.", { exact: false }).waitFor();
    for (const route of ["/", "/docs/", "/docs/button/", "/getting-started/"]) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.mouse.wheel(0, 2_000);
      await delay(400);
    }
    // The strongest capture path in the product: a real successful copy.
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    const install = page.locator('.docs-command [data-slot="copy-control"]').first();
    await install.getByRole("button", { name: "Copy command", exact: true }).click();
    await install.locator('[data-copy-state="copied"]').waitFor();
    await delay(1_200);
    assert.equal(captures.length, 0, `a build without NEXT_PUBLIC_ANALYTICS_ENABLED=true sent ${captures.length} event(s)`);
    await context.close();
  } finally {
    await browser.close();
    await server?.close();
  }
  console.log("PASS: a build with analytics unset or explicitly disabled captures nothing.");
  process.exit(0);
}

const browser = await chromium.launch();
try {
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

  {
    const { context, captures } = await analyticsContext(browser);
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const specimen = page.locator('[data-analytics-preview="slider"]');
    await specimen.waitFor();
    await specimen.scrollIntoViewIfNeeded();
    await waitFor(
      captures,
      (payload) => payload.event === "component_impression" && payload.properties.component_id === "slider",
      "50 percent visible for one second",
    );
    await page.locator("header").first().scrollIntoViewIfNeeded();
    await delay(150);
    await specimen.scrollIntoViewIfNeeded();
    await delay(1_200);
    assert.equal(
      events(captures, "component_impression").filter((payload) => payload.properties.component_id === "slider").length,
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
    const { context, captures } = await analyticsContext(browser, init);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByText("Your browser privacy signal is preventing analytics.", { exact: false }).waitFor();
    await delay(400);
    assert.equal(captures.length, 0, `${name} suppresses every event`);
    await context.close();
  }

  {
    const { context, captures } = await analyticsContext(browser, () => {
      localStorage.setItem("000h.analytics-opt-out", "true");
    });
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByText("Analytics is off in this browser.", { exact: false }).waitFor();
    assert.equal(captures.length, 0);
    await page.getByRole("button", { name: "Allow anonymous analytics", exact: true }).click();
    await page.getByText("Anonymous website analytics is on.", { exact: false }).waitFor();
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

  {
    const { context, captures } = await analyticsContext(browser);
    const page = await context.newPage();
    await page.goto(`${base}/workspace/?draft=private`, { waitUntil: "domcontentloaded" });
    await delay(500);
    assert.equal(captures.length, 0, "private workspace routes emit no events");
    await context.close();
  }

  console.log("PASS: bounded analytics capture, copy truth, privacy signals, route deduplication, impressions and demo intent.");
} finally {
  await browser.close();
  await server?.close();
}
