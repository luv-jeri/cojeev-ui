// Repeatable loading baseline for the exported site. Serves an existing static export
// read-only on a random local port, loads representative routes in a fresh browser
// context per sample under fixed device/network settings, and records transfer bytes,
// decoded bytes, post-load traffic and main-thread metrics. It then drives a small
// scripted interaction on one route. Never sends analytics or reports: every
// non-loopback request is refused and listed in the output.
//
// Every emulation value below is a raw CDP setting recorded verbatim. No vendor
// throttling preset is claimed or matched.
//
// Usage: node scripts/measure-loading-baseline.mjs --export=<dir> [--runs=3] [--out=<json>]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { preview } from "vite";
import { chromium } from "playwright";

const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const exportDir = path.resolve(arg("export", "out"));
const runs = Number(arg("runs", "3"));
const interactionRuns = Number(arg("interaction-runs", "3"));
const outFile = path.resolve(arg("out", "artifacts/performance-baseline/baseline.json"));

// One explicit condition, so repeated runs stay comparable. These are the raw values
// handed to CDP, not a named preset: a mobile-sized viewport at DPR 2 with touch and
// the mobile flag set, a 4x CPU slowdown, and fixed throughput/latency numbers.
const CONDITION = {
  label: "mobile emulation, cold cache, raw CDP throttling values",
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  cpuThrottlingRate: 4,
  network: { downloadBytesPerSecond: 209715.2, uploadBytesPerSecond: 96000, latencyMs: 150 },
  settleMs: 3000,
};

const ROUTES = [
  { id: "homepage", path: "/" },
  { id: "docs-index", path: "/docs/" },
  { id: "docs-component", path: "/docs/accordion-gallery/" },
  { id: "privacy", path: "/privacy/" },
  { id: "reporting-requests", path: "/requests/" },
];

// Runs before any page script so nothing paints before the observers exist. Layout
// shift and interaction entries are retained raw; every derived figure is computed in
// Node from these entries, so the definition used is auditable from the output.
const OBSERVERS = () => {
  const state = { lcp: null, lcpElement: null, fcp: null, shifts: [], longTasks: [], events: [] };
  window.__baseline = state;
  const watch = (type, handler, extra = {}) => {
    try { new PerformanceObserver(list => list.getEntries().forEach(handler)).observe({ type, buffered: true, ...extra }); }
    catch { /* entry type unsupported in this browser */ }
  };
  watch("paint", entry => { if (entry.name === "first-contentful-paint") state.fcp = entry.startTime; });
  watch("largest-contentful-paint", entry => {
    state.lcp = entry.startTime;
    const node = entry.element;
    state.lcpElement = node ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.className && typeof node.className === "string" ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}` : ""}` : entry.url || null;
  });
  watch("layout-shift", entry => {
    if (entry.hadRecentInput) return;
    state.shifts.push({ start: entry.startTime, value: entry.value, sources: (entry.sources ?? []).map(source => source.node?.tagName?.toLowerCase() ?? "unknown").slice(0, 3) });
  });
  watch("longtask", entry => state.longTasks.push({ start: entry.startTime, duration: entry.duration }));
  // Event Timing entries for scripted interactions. These are individual entries, not
  // a field INP percentile; durations are reported by the API at 8 ms granularity.
  watch("event", entry => state.events.push({
    name: entry.name, start: entry.startTime, duration: entry.duration,
    processingStart: entry.processingStart, processingEnd: entry.processingEnd,
    target: entry.target?.tagName?.toLowerCase() ?? null,
  }), { durationThreshold: 16 });
  watch("first-input", entry => state.events.push({
    name: `first-input:${entry.name}`, start: entry.startTime, duration: entry.duration,
    processingStart: entry.processingStart, processingEnd: entry.processingEnd,
    target: entry.target?.tagName?.toLowerCase() ?? null,
  }));
};

const isLoopback = url => { try { return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname); } catch { return false; } };
const median = values => { const sorted = [...values].sort((a, b) => a - b); const middle = sorted.length >> 1; return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const round = (value, places = 1) => value === null || value === undefined ? null : Number(value.toFixed(places));

// A base64 data: URL carries its whole payload in the URL string. Keep only enough to
// identify it so the output stays readable and carries no embedded binary.
const sanitizeUrl = (url, baseUrl) => {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    return `${url.slice(0, comma + 1)}<${url.length - comma - 1} chars elided>`;
  }
  return baseUrl ? url.replace(baseUrl, "/cojeev-ui/") : url;
};

// Core Web Vitals CLS is the largest session window, not the whole-window sum: a new
// session starts after a 1 s gap or once the open one spans 5 s. Both figures are
// reported so neither definition is implied by the other.
const layoutShift = shifts => {
  const ordered = [...shifts].sort((a, b) => a.start - b.start);
  let best = 0, current = 0, first = null, previous = null;
  for (const shift of ordered) {
    if (first === null || shift.start - previous > 1000 || shift.start - first > 5000) { first = shift.start; current = 0; }
    current += shift.value; previous = shift.start;
    if (current > best) best = current;
  }
  return {
    sessionWindowMax: Number(best.toFixed(4)),
    total: Number(ordered.reduce((sum, shift) => sum + shift.value, 0).toFixed(4)),
    count: ordered.length,
    worstShift: ordered.reduce((worst, shift) => (!worst || shift.value > worst.value ? shift : worst), null),
  };
};

// Request headers, not arrival time, are what identify a prefetch. Chromium adds
// Purpose/Sec-Purpose for link prefetch; Next's router adds its own headers to the
// route-payload fetches it issues. Both are reported alongside — never merged with —
// the load-event phase, because "after the load event" and "a prefetch" are different
// questions and the earlier form of this script conflated them.
const PREFETCH_HEADERS = ["purpose", "sec-purpose", "next-router-prefetch", "x-nextjs-data", "rsc", "next-router-state-tree"];
const prefetchSignals = headers => {
  const hit = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = key.toLowerCase();
    if (PREFETCH_HEADERS.includes(name)) hit[name] = String(value).slice(0, 64);
  }
  return hit;
};

async function openContext(browser) {
  const version = browser.version();
  const major = version.split(".")[0];
  return browser.newContext({
    viewport: CONDITION.viewport,
    deviceScaleFactor: CONDITION.deviceScaleFactor,
    isMobile: CONDITION.isMobile,
    hasTouch: CONDITION.hasTouch,
    // Recorded verbatim in the output. This is the string this script sets, not a claim
    // about any particular physical handset.
    userAgent: `Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Mobile Safari/537.36`,
  });
}

async function preparePage(context) {
  const page = await context.newPage();
  await page.addInitScript(OBSERVERS);
  const cdp = await context.newCDPSession(page);
  const requests = new Map();
  const blocked = [];
  cdp.on("Network.requestWillBeSent", event => requests.set(event.requestId, {
    url: event.request.url, type: event.type ?? "Other", initiator: event.initiator?.type ?? "unknown",
    startMs: event.timestamp * 1000, decoded: 0, transfer: 0, mimeType: null, status: null,
    finished: false, failed: null, headers: { ...(event.request.headers ?? {}) },
  }));
  // Browser-added headers arrive separately from the ones page script sets.
  cdp.on("Network.requestWillBeSentExtraInfo", event => {
    const record = requests.get(event.requestId);
    if (record) record.headers = { ...record.headers, ...(event.headers ?? {}) };
  });
  cdp.on("Network.responseReceived", event => {
    const record = requests.get(event.requestId);
    if (record) { record.mimeType = event.response.mimeType; record.status = event.response.status; record.type = event.type ?? record.type; }
  });
  cdp.on("Network.dataReceived", event => { const record = requests.get(event.requestId); if (record) record.decoded += event.dataLength; });
  cdp.on("Network.loadingFinished", event => { const record = requests.get(event.requestId); if (record) { record.transfer = event.encodedDataLength; record.finished = true; } });
  cdp.on("Network.loadingFailed", event => { const record = requests.get(event.requestId); if (record) { record.failed = event.errorText ?? "failed"; record.finished = false; } });

  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: CONDITION.network.latencyMs,
    downloadThroughput: CONDITION.network.downloadBytesPerSecond,
    uploadThroughput: CONDITION.network.uploadBytesPerSecond,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CONDITION.cpuThrottlingRate });

  // Nothing leaves the machine. The predicate keeps loopback traffic out of the
  // interception handler entirely, so the measured page pays no per-request driver
  // cost for the requests that actually make up the payload.
  await page.route(url => !isLoopback(url.href), route_ => {
    blocked.push(route_.request().url());
    return route_.abort();
  });
  return { page, requests, blocked };
}

const describeAssets = (requests, loadWallMs, baseUrl) => [...requests.values()].map(record => ({
  url: sanitizeUrl(record.url, baseUrl), type: record.type, mimeType: record.mimeType, status: record.status,
  transfer: record.transfer, decoded: record.decoded, finished: record.finished, failed: record.failed,
  phase: record.url.startsWith("data:") ? "inlined" : record.startMs > loadWallMs ? "after-load" : "initial",
  prefetchHeaders: prefetchSignals(record.headers),
  startMs: record.startMs,
}));

async function measureLoad(browser, baseUrl, route) {
  const context = await openContext(browser);
  const { page, requests, blocked } = await preparePage(context);
  await page.goto(`${baseUrl}${route.path.replace(/^\//, "")}`, { waitUntil: "load", timeout: 180_000 });
  const loadMs = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.loadEventEnd ?? performance.now());
  await page.waitForTimeout(CONDITION.settleMs);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] ?? {};
    const state = window.__baseline;
    return {
      ttfbMs: nav.responseStart ?? null, domContentLoadedMs: nav.domContentLoadedEventEnd ?? null, loadMs: nav.loadEventEnd ?? null,
      fcpMs: state.fcp, lcpMs: state.lcp, lcpElement: state.lcpElement, shifts: state.shifts,
      longTasks: state.longTasks, domNodes: document.getElementsByTagName("*").length,
    };
  });

  const documentRecord = [...requests.values()].find(record => record.type === "Document");
  const assets = describeAssets(requests, (documentRecord?.startMs ?? 0) + loadMs, baseUrl);
  await context.close();
  return { metrics, assets, blocked: [...new Set(blocked)] };
}

// A small scripted interaction on the reporting route: open the launcher, switch tab,
// close. Three repetitions. These are individual Event Timing entries for three
// synthetic events, not field INP and not a percentile of real user input.
const STEPS = [
  { id: "open-launcher", find: page => page.locator("button.report-launcher"), settleFor: page => page.getByRole("tab", { name: "Report a bug" }) },
  { id: "switch-tab", find: page => page.getByRole("tab", { name: "Report a bug" }), settleFor: page => page.getByRole("tab", { name: "Report a bug", selected: true }) },
  { id: "close-panel", find: page => page.getByRole("button", { name: "Close reporting panel" }), settleFor: page => page.locator("button.report-launcher") },
];

async function measureInteraction(browser, baseUrl, route) {
  const context = await openContext(browser);
  const { page, requests, blocked } = await preparePage(context);
  await page.goto(`${baseUrl}${route.path.replace(/^\//, "")}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForTimeout(CONDITION.settleMs);

  const steps = [];
  for (const step of STEPS) {
    const before = { requests: new Set(requests.keys()), events: await page.evaluate(() => window.__baseline.events.length), tasks: await page.evaluate(() => window.__baseline.longTasks.length), clock: await page.evaluate(() => performance.now()) };
    const record = { step: step.id, action: "tap", ok: false, error: null };
    try {
      const target = step.find(page);
      await target.waitFor({ state: "visible", timeout: 30_000 });
      await target.first().evaluate(node => { if (node.disabled) throw new Error("target still disabled"); });
      await target.first().tap();
      await step.settleFor(page).waitFor({ state: "visible", timeout: 30_000 });
      record.ok = true;
    } catch (error) { record.error = String(error.message ?? error).split("\n")[0].slice(0, 200); }
    const after = await page.evaluate(() => ({ clock: performance.now(), events: window.__baseline.events, tasks: window.__baseline.longTasks }));
    record.wallMs = round(after.clock - before.clock);
    // Every discrete pointer/touch event in one tap shares the presentation frame that
    // ends it, so Event Timing reports many entries with an identical duration. Keeping
    // the whole list would be noise; the count, the longest entry and the primary event
    // types are retained so nothing is hidden and nothing is padded.
    const entries = after.events.slice(before.events).map(entry => ({
      name: entry.name, target: entry.target, durationMs: round(entry.duration),
      processingMs: round(entry.processingEnd - entry.processingStart),
      inputDelayMs: round(entry.processingStart - entry.start),
    }));
    const primary = ["pointerdown", "pointerup", "touchstart", "touchend", "click", "mousedown", "mouseup"];
    record.eventEntryCount = entries.length;
    record.longestEventEntry = entries.reduce((worst, entry) => (!worst || entry.durationMs > worst.durationMs ? entry : worst), null);
    record.primaryEventEntries = primary
      .map(name => entries.filter(entry => entry.name === name).reduce((worst, entry) => (!worst || entry.durationMs > worst.durationMs ? entry : worst), null))
      .filter(Boolean);
    record.longTasksMs = after.tasks.slice(before.tasks).map(task => round(task.duration));
    record.newRequests = [...requests.entries()].filter(([id]) => !before.requests.has(id))
      .map(([, value]) => ({ url: sanitizeUrl(value.url, baseUrl), type: value.type, status: value.status, transfer: value.transfer, decoded: value.decoded, finished: value.finished, failed: value.failed }));
    steps.push(record);
  }
  await context.close();
  return { steps, blocked: [...new Set(blocked)] };
}

const summarise = assets => {
  const buckets = {};
  for (const asset of assets) {
    const key = `${asset.phase}:${asset.type}`;
    buckets[key] ??= { phase: asset.phase, type: asset.type, count: 0, transfer: 0, decoded: 0 };
    buckets[key].count += 1; buckets[key].transfer += asset.transfer; buckets[key].decoded += asset.decoded;
  }
  // Unfinished requests contribute to the count but nothing to transfer, because
  // transfer is only known at loadingFinished. Surfacing the count keeps a byte total
  // truncated by the settle cut-off from reading as a complete one.
  const total = phase => {
    const rows = assets.filter(asset => asset.phase === phase);
    return {
      count: rows.length, transfer: rows.reduce((sum, row) => sum + row.transfer, 0), decoded: rows.reduce((sum, row) => sum + row.decoded, 0),
      unfinished: rows.filter(row => !row.finished && !row.failed).length, failed: rows.filter(row => row.failed).length,
      prefetchHeaderCount: rows.filter(row => Object.keys(row.prefetchHeaders).length > 0).length,
    };
  };
  const statuses = {};
  for (const asset of assets.filter(row => row.phase === "after-load")) {
    const key = asset.failed ? `failed:${asset.failed}` : String(asset.status ?? (asset.finished ? "no-status" : "unfinished"));
    statuses[key] = (statuses[key] ?? 0) + 1;
  }
  // Prefetch is an independent dimension, reported alongside the phase totals and never
  // folded into them: "requested after the load event" and "tagged as a prefetch by its
  // own request headers" are different questions with different answers.
  const tagged = assets.filter(asset => Object.keys(asset.prefetchHeaders).length > 0);
  const headerTaggedPrefetch = {
    count: tagged.length, transfer: tagged.reduce((sum, row) => sum + row.transfer, 0), decoded: tagged.reduce((sum, row) => sum + row.decoded, 0),
    headers: [...new Set(tagged.flatMap(row => Object.entries(row.prefetchHeaders).map(([key, value]) => `${key}: ${value}`)))],
  };
  return { byPhaseAndType: Object.values(buckets).sort((a, b) => b.transfer - a.transfer), initial: total("initial"), afterLoad: total("after-load"), inlined: total("inlined"), headerTaggedPrefetch, afterLoadStatuses: statuses };
};

const server = await preview({
  configFile: false, root: path.dirname(exportDir),
  base: "/cojeev-ui/", build: { outDir: path.basename(exportDir) },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
});
const baseUrl = server.resolvedUrls.local[0];
// Playwright gives each launch() its own temporary user-data directory and removes it
// on close; every sample below then gets a fresh context inside that one process.
const browser = await chromium.launch({ args: ["--disable-extensions", "--no-first-run"] });
const browserVersion = browser.version();
const userAgent = `Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion.split(".")[0]}.0.0.0 Mobile Safari/537.36`;

const results = [];
let interaction = null;
try {
  for (const route of ROUTES) {
    const samples = [];
    for (let run = 0; run < runs; run += 1) samples.push(await measureLoad(browser, baseUrl, route));
    const blockingMs = sample => sample.metrics.longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    const perRun = samples.map((sample, index) => {
      const bytes = summarise(sample.assets);
      return {
        run: index + 1,
        ttfbMs: round(sample.metrics.ttfbMs), fcpMs: round(sample.metrics.fcpMs), lcpMs: round(sample.metrics.lcpMs),
        lcpElement: sample.metrics.lcpElement,
        domContentLoadedMs: round(sample.metrics.domContentLoadedMs), loadMs: round(sample.metrics.loadMs),
        layoutShift: layoutShift(sample.metrics.shifts),
        longTaskCount: sample.metrics.longTasks.length,
        longTaskTotalMs: round(sample.metrics.longTasks.reduce((sum, task) => sum + task.duration, 0)),
        longestTaskMs: round(Math.max(0, ...sample.metrics.longTasks.map(task => task.duration))),
        blockingMs: round(blockingMs(sample)),
        domNodes: sample.metrics.domNodes,
        bytes: { initial: bytes.initial, afterLoad: bytes.afterLoad, inlined: bytes.inlined, afterLoadStatuses: bytes.afterLoadStatuses },
      };
    });
    const equal = pick => perRun.every(row => pick(row) === pick(perRun[0]));
    const last = samples.at(-1);
    results.push({
      route: route.id, path: route.path, runs: samples.length,
      perRun,
      medians: {
        ttfbMs: round(median(perRun.map(row => row.ttfbMs))), fcpMs: round(median(perRun.map(row => row.fcpMs))),
        lcpMs: round(median(perRun.map(row => row.lcpMs))),
        domContentLoadedMs: round(median(perRun.map(row => row.domContentLoadedMs))), loadMs: round(median(perRun.map(row => row.loadMs))),
        clsSessionWindowMax: round(median(perRun.map(row => row.layoutShift.sessionWindowMax)), 4),
        totalLayoutShift: round(median(perRun.map(row => row.layoutShift.total)), 4),
        longTaskCount: median(perRun.map(row => row.longTaskCount)),
        longTaskTotalMs: round(median(perRun.map(row => row.longTaskTotalMs))),
        longestTaskMs: round(median(perRun.map(row => row.longestTaskMs))),
        blockingMs: round(median(perRun.map(row => row.blockingMs))),
        inpMs: null, inpNote: "unavailable: no field input and no percentile; see interaction section for individual scripted Event Timing entries",
      },
      // Every phase total is compared, not just initial transfer, because the post-load
      // bucket is the one exposed to the settle cut-off and so the least likely to be stable.
      bytesStable: {
        initialTransfer: equal(row => row.bytes.initial.transfer), initialDecoded: equal(row => row.bytes.initial.decoded),
        afterLoadTransfer: equal(row => row.bytes.afterLoad.transfer), afterLoadDecoded: equal(row => row.bytes.afterLoad.decoded),
        inlinedDecoded: equal(row => row.bytes.inlined.decoded),
      },
      bytes: summarise(last.assets),
      // Every request of the final run, with its URL, status and finish state, so a later
      // reader can re-derive any claim made about this route instead of trusting an aggregate.
      assets: [...last.assets].sort((a, b) => b.transfer - a.transfer)
        .map(asset => ({ url: asset.url, type: asset.type, phase: asset.phase, status: asset.status, transfer: asset.transfer, decoded: asset.decoded, finished: asset.finished, failed: asset.failed, prefetchHeaders: asset.prefetchHeaders })),
      // Every run's refused outbound list, not only the final run's.
      blockedOutbound: { perRun: samples.map(sample => sample.blocked), union: [...new Set(samples.flatMap(sample => sample.blocked))] },
    });
    const summary = results.at(-1);
    console.log(`${route.id.padEnd(20)} LCP ${String(summary.medians.lcpMs).padStart(7)}ms  initial ${(summary.bytes.initial.transfer / 1024).toFixed(0).padStart(4)} KiB gzip  post-load ${(summary.bytes.afterLoad.transfer / 1024).toFixed(0).padStart(4)} KiB (${summary.bytes.afterLoad.prefetchHeaderCount}/${summary.bytes.afterLoad.count} header-tagged, ${summary.bytes.afterLoad.unfinished} unfinished)  long tasks ${summary.medians.longTaskCount}`);
  }

  const interactionRoute = ROUTES.find(route => route.id === "reporting-requests");
  const passes = [];
  for (let run = 0; run < interactionRuns; run += 1) passes.push(await measureInteraction(browser, baseUrl, interactionRoute));
  interaction = {
    route: interactionRoute.path, repetitions: passes.length,
    note: "Individual Event Timing entries for scripted taps. Not field INP, not a percentile, not a Core Web Vital.",
    passes: passes.map((pass, index) => ({ run: index + 1, steps: pass.steps })),
    blockedOutbound: { perRun: passes.map(pass => pass.blocked), union: [...new Set(passes.flatMap(pass => pass.blocked))] },
  };
  for (const pass of interaction.passes) {
    console.log(`interaction run ${pass.run}: ${pass.steps.map(step => `${step.step} ${step.ok ? `${step.wallMs}ms` : `FAILED(${step.error})`}`).join("  ")}`);
  }
} finally {
  await browser.close();
  await server.close();
}

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify({
  capturedAt: new Date().toISOString(), exportDir, baseUrl: "http://127.0.0.1:<random>/cojeev-ui/",
  condition: { ...CONDITION, userAgent }, runsPerRoute: runs, browser: `chromium ${browserVersion}`,
  contextIsolation: "one fresh browser context per sample, closed after it; one Chromium process for the whole set",
  results, interaction,
}, null, 2)}\n`);
console.log(`\nWrote ${outFile}`);
process.exit(0);
