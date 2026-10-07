import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { preview } from "vite";

const searchCheck = "ui_live_search_reload_and_console_are_clean";
const diagnostics = [];
const ignoredCancellations = [];
const reportingOrigins = new Set(["https://feedback.cojeev.com", "https://feedback-beta.cojeev.com"]);
let server, browser, base, origin, readOnly;
before(async () => {
  if (process.env.UI_BROWSER_URL) {
    const url = new URL(process.env.UI_BROWSER_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname.replace(/\/$/, "") !== "/ui" || url.search || url.hash || url.username || url.password) throw new Error(`FAIL ${searchCheck} /ui/`);
    origin = url.origin;
    base = `${origin}/ui`;
    readOnly = !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } else {
    server = await preview({ configFile: false, base: "/ui/", build: { outDir: "out" }, preview: { host: "127.0.0.1", port: 0, strictPort: true } });
    origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    base = `${origin}/ui`;
    readOnly = false;
  }
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close(); await server?.close();
  console.log(`IGNORED ui_request_cancellations ${ignoredCancellations.length}${ignoredCancellations.length ? ` ${ignoredCancellations.join(" ")}` : ""}`);
  if (diagnostics.length) throw new Error(`FAIL ${searchCheck} ${diagnostics[0]}`);
});

function observe(context) {
  const ignored = new Set();
  const path = url => { try { return new URL(url).pathname; } catch { return "/ui/"; } };
  context.on("request", request => {
    if (path(request.url()).includes("/ui/ui/")) diagnostics.push(path(request.url()));
  });
  context.on("requestfailed", request => {
    if (ignored.has(request.url())) return;
    try {
      const url = new URL(request.url());
      const pageOrigin = new URL(request.frame().page().url()).origin;
      const headers = request.headers();
      const resource = request.resourceType();
      const rscPrefetch = ["fetch", "xhr"].includes(resource) && headers.rsc === "1" &&
        (headers["next-router-prefetch"] === "1" || headers["next-router-segment-prefetch"] !== undefined);
      // R-FW1-1: Next static-export route discovery uses unmarked HEAD fetches.
      const routeDiscovery = resource === "fetch" && request.method() === "HEAD";
      if (request.failure()?.errorText === "net::ERR_ABORTED" && url.origin === pageOrigin && url.pathname.startsWith("/ui/") && (rscPrefetch || routeDiscovery)) {
        ignoredCancellations.push(url.pathname);
        return;
      }
    } catch { /* Requests without a page origin are still failures. */ }
    diagnostics.push(path(request.url()));
  });
  context.on("response", response => {
    if (response.status() >= 400 && !ignored.has(response.url())) diagnostics.push(path(response.url()));
  });
  context.on("page", page => {
    page.on("console", message => {
      if (message.type() === "error" && !ignored.has(message.location().url)) diagnostics.push(path(message.location().url || page.url()));
    });
    page.on("framenavigated", frame => {
      if (path(frame.url()).includes("/ui/ui/")) diagnostics.push(path(frame.url()));
    });
  });
  return ignored;
}

async function openPage(t, path, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
  t.after(() => context.close());
  const ignored = observe(context);
  await context.route(/^https?:\/\//, route => {
    const request = route.request(), url = new URL(request.url());
    if (url.href === "https://cojeev.com/") {
      ignored.add(request.url());
      return route.fulfill({ contentType: "text/html", body: "<p>Intercepted apex navigation</p>" });
    }
    if (reportingOrigins.has(url.origin) && request.method() === "POST") {
      ignored.add(request.url());
      return route.abort();
    }
    if (readOnly || url.origin === origin) return route.continue();
    if (reportingOrigins.has(url.origin)) return route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": origin }, body: JSON.stringify({ local: true, emailEnabled: false, turnstileSiteKey: "", requests: [], total: 0, status: "received" }) });
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  return { page, context };
}

test("disabled_shell_footer_still_has_funnel_link", async t => {
  for (const path of ["/", "/track/", "/feedback-admin/", "/workspace/"]) {
    await t.test(path, async t => {
      const { page } = await openPage(t, path);
      const link = page.getByRole("link", { name: "Explore Cojeev", exact: true });
      assert.equal(await link.count(), 1);
      await link.scrollIntoViewIfNeeded();
      assert.equal(await link.isVisible(), true);
      assert.equal(await link.evaluate(node => {
        const main = document.querySelector("main");
        if (!main) return false;
        if (!main.contains(node)) return !!(main.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
        return main.lastElementChild === node;
      }), true, `${path}: link follows main content`);
      assert.equal(await link.getAttribute("href"), "https://cojeev.com/");
      assert.equal(await link.getAttribute("target"), null);
    });
  }
});

test("header_brand_and_cojeev_attribution_are_distinct_links", async t => {
  for (const path of ["/", "/docs/button/"]) for (const width of [1280, 390]) {
    await t.test(`${path} at ${width}px`, async t => {
      const { page } = await openPage(t, path, width);
      const docs = path.startsWith("/docs/");
      const header = page.locator(docs ? width === 390 ? ".docs-mobile" : ".docs-rail-heading" : ".story-header");
      const brand = header.locator(docs ? "a.docs-brand" : "a.story-brand");
      const attribution = header.getByRole("link", { name: "by Cojeev", exact: true });
      assert.equal(await brand.count(), 1);
      assert.ok(["/ui/", "/ui/docs/"].includes(await brand.getAttribute("href")));
      assert.equal(await attribution.count(), 1);
      assert.equal(await attribution.getAttribute("href"), "https://cojeev.com/");
      assert.equal(await attribution.getAttribute("target"), null);
      assert.equal(await attribution.isVisible(), true);
      assert.equal(await attribution.evaluate(node => {
        const brand = node.parentElement.querySelector("a.story-brand, a.docs-brand");
        return brand?.parentElement === node.parentElement && !brand.contains(node);
      }), true, "brand and attribution are siblings");
      assert.equal(await header.locator("a a").count(), 0);
      const box = await attribution.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width, "attribution fits the header");
    });
  }
});

test("collapsed_desktop_header_keeps_attribution_separate_inside_rail", async t => {
  const { page } = await openPage(t, "/docs/button/");
  const rail = page.locator(".docs-sidebar");
  const header = rail.locator(".docs-rail-heading");
  await header.getByRole("button", { name: "Collapse navigation", exact: true }).click();
  await header.getByRole("button", { name: "Expand navigation", exact: true }).waitFor();
  assert.equal(await rail.getAttribute("data-state"), "collapsed");
  const brand = header.locator("a.docs-brand");
  const attribution = header.getByRole("link", { name: "by Cojeev", exact: true });
  const expand = header.getByRole("button", { name: "Expand navigation", exact: true });
  assert.equal(await brand.getAttribute("href"), "/ui/docs/");
  assert.equal(await attribution.count(), 1);
  assert.equal(await attribution.isVisible(), true);
  assert.equal(await attribution.getAttribute("href"), "https://cojeev.com/");
  assert.equal(await attribution.getAttribute("target"), null);
  assert.equal(await attribution.evaluate(node => {
    const brand = node.parentElement.querySelector("a.docs-brand");
    const expand = node.closest(".docs-rail-heading").querySelector("button");
    return brand?.parentElement === node.parentElement && !brand.contains(node) && !expand.contains(node);
  }), true, "attribution is a sibling anchor separate from the expand button");
  assert.equal(await header.locator("a a, button a").count(), 0);
  assert.equal(await expand.isVisible(), true);
  assert.equal(await rail.evaluate(node => getComputedStyle(node.closest(".docs-shell")).gridTemplateColumns.split(" ")[0]),
    "160px", "collapsed rail occupies a 160px grid column");
  const railBox = await rail.boundingBox();
  assert.ok(railBox && railBox.width <= 160, "sidebar fits inside the 160px rail column");
  for (const link of [brand, attribution, expand]) {
    const box = await link.boundingBox();
    assert.ok(box && box.x >= railBox.x && box.x + box.width <= railBox.x + railBox.width,
      "header link or expand button fits inside the collapsed rail");
  }
});

test("docs_header_attribution_gap_tracks_spacing_token_at_same_default_size", async t => {
  for (const width of [1280, 390]) {
    await t.test(`${width}px`, async t => {
      const { page } = await openPage(t, "/docs/button/", width);
      const header = page.locator(width === 390 ? ".docs-mobile" : ".docs-rail-heading");
      const attribution = header.getByRole("link", { name: "by Cojeev", exact: true });
      assert.equal(await attribution.evaluate(node => getComputedStyle(node.parentElement).rowGap), "2px");
      // A spacing override must reach the group; a hard-coded 2px gap ignores it.
      await attribution.evaluate(node => node.parentElement.style.setProperty("--s-1", "8px"));
      assert.equal(await attribution.evaluate(node => getComputedStyle(node.parentElement).rowGap), "4px");
    });
  }
});

test("funnel_link_is_keyboard_accessible_in_compact_and_full_shells", async t => {
  for (const path of ["/", "/about/", "/docs/button/", "/track/"]) {
    await t.test(path, async t => {
      const { page, context } = await openPage(t, path);
      const link = page.getByRole("link", { name: "Explore Cojeev", exact: true });
      assert.equal(await link.count(), 1);
      await link.scrollIntoViewIfNeeded();
      // Start from the preceding tab stop, or the document start on an empty Track page.
      await link.evaluate(node => {
        const stops = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')).filter(candidate => candidate.tabIndex >= 0 && !candidate.disabled && candidate.getClientRects().length);
        const index = stops.indexOf(node);
        if (index < 0) throw new Error("The funnel link must be a real tab stop");
        if (index > 0) stops[index - 1].focus();
        else {
          const previous = document.body.getAttribute("tabindex");
          document.body.tabIndex = -1;
          document.body.focus();
          if (previous === null) document.body.removeAttribute("tabindex");
          else document.body.setAttribute("tabindex", previous);
        }
      });
      await page.keyboard.press("Tab");
      assert.equal(await link.evaluate(node => node === document.activeElement && node.matches(":focus-visible")), true, "Tab reaches the link with visible focus");
      assert.equal(await link.evaluate(node => getComputedStyle(node).outlineStyle !== "none" && parseFloat(getComputedStyle(node).outlineWidth) > 0), true);
      let intercepted = false;
      await context.route("https://cojeev.com/", route => { intercepted = true; return route.fulfill({ contentType: "text/html", body: "<p>Intercepted apex navigation</p>" }); });
      const tabs = context.pages().length;
      await Promise.all([page.waitForURL("https://cojeev.com/"), page.keyboard.press("Enter")]);
      assert.equal(intercepted, true);
      assert.equal(context.pages().length, tabs, "Enter uses the same tab");
    });
  }
});

test("next_navigation_adds_ui_once", async t => {
  const { page, context } = await openPage(t, "/");
  const requests = [];
  page.on("request", request => {
    const url = new URL(request.url());
    const headers = request.headers();
    if (url.origin === origin && (headers.rsc || headers["next-router-prefetch"] || url.searchParams.has("_rsc") || url.pathname.endsWith(".txt"))) requests.push(url.pathname);
  });
  const click = async (link, path) => {
    assert.ok((await link.getAttribute("href")).startsWith(`/ui${path}`));
    await link.click();
    await page.waitForURL(url => url.pathname === `/ui${path}`);
    assert.ok(new URL(page.url()).pathname.startsWith("/ui/"));
    assert.ok(!new URL(page.url()).pathname.includes("/ui/ui/"));
  };
  await click(page.locator('.story-header a[href="/ui/docs/"]'), "/docs/");
  await click(page.locator('.docs-sidebar a[href="/ui/docs/agent-chat/"]').first(), "/docs/agent-chat/");
  await click(page.getByRole("link", { name: "Open the full agent workspace example →", exact: true }), "/workspace/");
  await click(page.locator('.workspace-page__nav a[href="/ui/docs/agent-chat/"]'), "/docs/agent-chat/");
  await click(page.locator('.docs-sidebar a[href="/ui/requests/"]').first(), "/requests/");
  await click(page.locator('.requests-nav a[href="/ui/"]'), "/");
  await click(page.locator('.story-footer a[href="/ui/privacy/"]'), "/privacy/");
  await click(page.locator('.story-header a.story-brand'), "/");

  assert.ok(requests.length > 0, "navigation exercised prefetch/RSC requests");
  assert.ok(requests.every(path => path.startsWith("/ui/") && !path.includes("/ui/ui/")));
  assert.equal(context.pages().length, 1);
  if (readOnly) return;

  // A disposable browser receipt exposes the actual track Link without sending a report.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("cojeev-reporting-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("drafts");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put([{ kind: "request", title: "Navigation fixture", sentAt: 1, receipt: { id: "00000000-0000-4000-8000-000000000008", token: "a".repeat(64), statusKey: "b".repeat(64), status: "received", topicId: null, email: "setup_required", issue: "setup_required", attachments: [] } }], "sent");
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Request a feature / Report a bug", exact: true }).click();
  await page.getByRole("button", { name: /^Sent from this browser/ }).click();
  await page.locator(".report-sent-row").filter({ hasText: "Navigation fixture" }).click();
  await click(page.getByRole("link", { name: "Track this report", exact: true }), "/track/");
  await page.waitForLoadState("networkidle");
  assert.ok(requests.length > 0, "navigation exercised prefetch/RSC requests");
  assert.ok(requests.every(path => path.startsWith("/ui/") && !path.includes("/ui/ui/")));
  assert.equal(context.pages().length, 1);
});

test("ui_live_search_reload_and_console_are_clean", async t => {
  let page;
  try {
    ({ page } = await openPage(t, "/docs/"));
    await page.getByRole("button", { name: "Search components", exact: true }).first().click();
    await page.getByRole("combobox", { name: "Search documentation", exact: true }).fill("button");
    const buttonResult = page.getByRole("option").filter({
      has: page.locator(".docs-search-result strong").filter({ hasText: /^Button$/ }),
    });
    await buttonResult.waitFor({ state: "visible" });
    await buttonResult.click();
    await page.waitForURL(url => url.pathname === "/ui/docs/button/");
    assert.equal(new URL(page.url()).pathname, "/ui/docs/button/");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).pathname, "/ui/docs/button/");
    assert.equal(await page.getByRole("heading", { name: "Button", exact: true }).first().isVisible(), true);
    if (diagnostics.length) throw new Error("Browser diagnostics");
    console.log(`PASS ${searchCheck}`);
  } catch {
    const path = diagnostics[0] ?? (page ? new URL(page.url()).pathname : "/ui/docs/");
    throw new Error(`FAIL ${searchCheck} ${path}`);
  }
});
