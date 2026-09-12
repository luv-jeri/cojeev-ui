// Repeatable loading baseline for the exported site. Serves an existing static export
// read-only on a random local port, loads representative routes in an owned browser
// profile under fixed device/network settings, and records transfer bytes, decoded
// bytes, prefetch traffic and main-thread metrics. Never sends analytics or reports:
// every non-loopback request is blocked and listed in the output.
//
// Usage: node scripts/measure-loading-baseline.mjs --export=<dir> [--runs=3] [--out=<json>]
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { preview } from "vite";
import { chromium } from "playwright";

const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const exportDir = path.resolve(arg("export", "out"));
const runs = Number(arg("runs", "3"));
const outFile = path.resolve(arg("out", "artifacts/performance-baseline/baseline.json"));

// One explicit condition, so repeated runs stay comparable. Numbers match Chrome's
// "Slow 4G" preset and a 4x CPU slowdown; the cache is disabled so every run is cold.
const CONDITION = {
  label: "throttled desktop, cold cache",
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  cpuThrottlingRate: 4,
  network: { downloadKbps: 1638.4, uploadKbps: 750, latencyMs: 150 },
  settleMs: 3000,
};

const ROUTES = [
  { id: "homepage", path: "/" },
  { id: "docs-index", path: "/docs/" },
  { id: "docs-component", path: "/docs/accordion-gallery/" },
  { id: "privacy", path: "/privacy/" },
  { id: "reporting-requests", path: "/requests/" },
];

// Runs before any page script so nothing paints before the observers exist.
const OBSERVERS = () => {
  const state = { lcp: null, lcpElement: null, fcp: null, cls: 0, worstShift: null, longTasks: [] };
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
    state.cls += entry.value;
    if (!state.worstShift || entry.value > state.worstShift.value) {
      state.worstShift = { value: entry.value, sources: (entry.sources ?? []).map(source => source.node?.tagName?.toLowerCase() ?? "unknown").slice(0, 3) };
    }
  });
  watch("longtask", entry => state.longTasks.push({ start: entry.startTime, duration: entry.duration }));
};

const isLoopback = url => { try { return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname); } catch { return false; } };
const median = values => { const sorted = [...values].sort((a, b) => a - b); const middle = sorted.length >> 1; return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const round = (value, places = 1) => value === null || value === undefined ? null : Number(value.toFixed(places));

async function measure(context, baseUrl, route) {
  const page = await context.newPage();
  await page.addInitScript(OBSERVERS);
  const cdp = await context.newCDPSession(page);
  const requests = new Map();
  const blocked = [];
  cdp.on("Network.requestWillBeSent", event => requests.set(event.requestId, {
    url: event.request.url, type: event.type ?? "Other", initiator: event.initiator?.type ?? "unknown",
    startMs: event.timestamp * 1000, decoded: 0, transfer: 0, mimeType: null, status: null, finished: false,
  }));
  cdp.on("Network.responseReceived", event => {
    const record = requests.get(event.requestId);
    if (record) { record.mimeType = event.response.mimeType; record.status = event.response.status; record.type = event.type ?? record.type; }
  });
  cdp.on("Network.dataReceived", event => { const record = requests.get(event.requestId); if (record) record.decoded += event.dataLength; });
  cdp.on("Network.loadingFinished", event => { const record = requests.get(event.requestId); if (record) { record.transfer = event.encodedDataLength; record.finished = true; } });

  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: CONDITION.network.latencyMs,
    downloadThroughput: (CONDITION.network.downloadKbps * 1024) / 8,
    uploadThroughput: (CONDITION.network.uploadKbps * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CONDITION.cpuThrottlingRate });

  // Nothing leaves the machine: analytics, reporting and any other origin is refused.
  await page.route("**/*", route_ => {
    if (isLoopback(route_.request().url())) return route_.continue();
    blocked.push(route_.request().url());
    return route_.abort();
  });

  await page.goto(`${baseUrl}${route.path.replace(/^\//, "")}`, { waitUntil: "load", timeout: 120_000 });
  const loadMs = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.loadEventEnd ?? performance.now());
  await page.waitForTimeout(CONDITION.settleMs);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] ?? {};
    const state = window.__baseline;
    return {
      ttfbMs: nav.responseStart ?? null, domContentLoadedMs: nav.domContentLoadedEventEnd ?? null, loadMs: nav.loadEventEnd ?? null,
      fcpMs: state.fcp, lcpMs: state.lcp, lcpElement: state.lcpElement, cls: state.cls, worstShift: state.worstShift,
      longTasks: state.longTasks, domNodes: document.getElementsByTagName("*").length,
    };
  });

  // A request that starts after the load event is post-load traffic: Next's router
  // prefetch of route payloads and chunks, plus anything a component fetches late.
  // A data: URL costs no network bytes of its own — its payload already arrived inside
  // whichever response embedded it, so counting it as transfer would double-count.
  const documentRecord = [...requests.values()].find(record => record.type === "Document");
  const navigationStartMs = documentRecord?.startMs ?? 0;
  const loadWallMs = navigationStartMs + loadMs;
  const assets = [...requests.values()].map(record => ({
    url: record.url, type: record.type, mimeType: record.mimeType, status: record.status,
    transfer: record.transfer, decoded: record.decoded,
    phase: record.url.startsWith("data:") ? "inlined" : record.startMs > loadWallMs ? "after-load" : "initial",
  }));
  await page.close();
  return { metrics, assets, blocked: [...new Set(blocked)] };
}

const summarise = assets => {
  const buckets = {};
  for (const asset of assets) {
    const key = `${asset.phase}:${asset.type}`;
    buckets[key] ??= { phase: asset.phase, type: asset.type, count: 0, transfer: 0, decoded: 0 };
    buckets[key].count += 1; buckets[key].transfer += asset.transfer; buckets[key].decoded += asset.decoded;
  }
  const total = phase => assets.filter(asset => asset.phase === phase).reduce((sum, asset) => ({ count: sum.count + 1, transfer: sum.transfer + asset.transfer, decoded: sum.decoded + asset.decoded }), { count: 0, transfer: 0, decoded: 0 });
  return { byPhaseAndType: Object.values(buckets).sort((a, b) => b.transfer - a.transfer), initial: total("initial"), afterLoad: total("after-load"), inlined: total("inlined") };
};

const server = await preview({
  configFile: false, root: path.dirname(exportDir),
  base: "/cojeev-ui/", build: { outDir: path.basename(exportDir) },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
});
const baseUrl = server.resolvedUrls.local[0];
const profileDir = await mkdtemp(path.join(tmpdir(), "cojeev-perf-profile-"));
const context = await chromium.launchPersistentContext(profileDir, {
  viewport: CONDITION.viewport, deviceScaleFactor: CONDITION.deviceScaleFactor,
  args: ["--disable-extensions", "--no-first-run"],
});

const browserVersion = context.browser()?.version() ?? "unknown";
const results = [];
try {
  for (const route of ROUTES) {
    const samples = [];
    for (let run = 0; run < runs; run += 1) samples.push(await measure(context, baseUrl, route));
    const last = samples.at(-1);
    const blockingMs = sample => sample.metrics.longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    results.push({
      route: route.id, path: route.path, runs: samples.length,
      timings: {
        ttfbMs: round(median(samples.map(sample => sample.metrics.ttfbMs))),
        fcpMs: round(median(samples.map(sample => sample.metrics.fcpMs))),
        lcpMs: round(median(samples.map(sample => sample.metrics.lcpMs))),
        lcpElement: last.metrics.lcpElement,
        domContentLoadedMs: round(median(samples.map(sample => sample.metrics.domContentLoadedMs))),
        loadMs: round(median(samples.map(sample => sample.metrics.loadMs))),
        inpMs: null, inpNote: "unavailable: this is a load-only measurement with no scripted interaction",
      },
      mainThread: {
        clsMedian: round(median(samples.map(sample => sample.metrics.cls)), 4),
        worstShift: last.metrics.worstShift,
        longTaskCountMedian: median(samples.map(sample => sample.metrics.longTasks.length)),
        longTaskTotalMsMedian: round(median(samples.map(sample => sample.metrics.longTasks.reduce((sum, task) => sum + task.duration, 0)))),
        longestTaskMsMedian: round(median(samples.map(sample => Math.max(0, ...sample.metrics.longTasks.map(task => task.duration))))),
        blockingMsMedian: round(median(samples.map(blockingMs))),
        domNodes: last.metrics.domNodes,
      },
      bytes: summarise(last.assets),
      bytesStable: samples.every(sample => summarise(sample.assets).initial.transfer === summarise(last.assets).initial.transfer),
      largestAssets: [...last.assets].sort((a, b) => b.transfer - a.transfer).slice(0, 10)
        .map(asset => ({ url: asset.url.replace(baseUrl, "/cojeev-ui/"), type: asset.type, phase: asset.phase, transfer: asset.transfer, decoded: asset.decoded })),
      blockedOutbound: last.blocked,
    });
    const summary = results.at(-1);
    console.log(`${route.id.padEnd(20)} LCP ${String(summary.timings.lcpMs).padStart(7)}ms  initial ${(summary.bytes.initial.transfer / 1024).toFixed(0).padStart(4)} KiB gzip / ${(summary.bytes.initial.decoded / 1024).toFixed(0).padStart(4)} KiB decoded  prefetch ${(summary.bytes.afterLoad.transfer / 1024).toFixed(0).padStart(4)} KiB  inlined ${(summary.bytes.inlined.decoded / 1024).toFixed(0).padStart(4)} KiB  long tasks ${summary.mainThread.longTaskCountMedian}`);
  }
} finally {
  await context.close();
  await rm(profileDir, { recursive: true, force: true });
  await server.close();
}

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify({
  capturedAt: new Date().toISOString(), exportDir, baseUrl: "http://127.0.0.1:<random>/cojeev-ui/",
  condition: CONDITION, runsPerRoute: runs, browser: `chromium ${browserVersion}`, results,
}, null, 2)}\n`);
console.log(`\nWrote ${outFile}`);
process.exit(0);
