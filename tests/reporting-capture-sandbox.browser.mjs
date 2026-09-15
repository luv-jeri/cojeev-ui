import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

// C08-2: modern-screenshot builds its style-measuring sandbox iframe lazily and uses the frame's
// `contentDocument.body` immediately after assigning `srcdoc`. That assignment starts a navigation
// and the committing document has no body, so a capture that yields the main thread mid-clone can
// measure against null and die with "Cannot read properties of null (reading 'appendChild')".
// Waiting for that race to show up is unreliable, so the srcdoc setter is intercepted and leaves
// the frame in exactly the state the navigation window produces: a document with no documentElement.
// Case A proves the interception reproduces the failure on the library's own lazy sandbox.
// Case B proves capturePage no longer depends on that navigation: it never assigns srcdoc at all.
const output = process.env.CAPTURE_SANDBOX_OUTPUT ?? ".work/reporting/capture-sandbox";
await mkdir(output, { recursive: true });

const entry = join(output, "entry.mjs");
await writeFile(entry, `
export { capturePage, CaptureCancelled } from ${JSON.stringify(join(process.cwd(), "lib/reporting/capture.ts"))};
export { createContext, destroyContext, domToCanvas } from "modern-screenshot";
`);
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "browser", outfile: join(output, "bundle.mjs"), logLevel: "warning" });

// A page with enough varied tags that the clone keeps meeting uncached default styles, plus a
// same-origin iframe and a private block, so the filter and redaction paths run alongside the fix.
const fixture = `<!DOCTYPE html><meta charset="utf-8"><title>capture sandbox fixture</title>
<style>body{margin:0;background:#fff;font:11px system-ui}.row{display:flex;gap:2px;border-bottom:1px solid #eee}
.row>*{display:inline-block;width:60px;height:12px;overflow:hidden}iframe{width:120px;height:40px}</style>
<div id="app"></div>
<iframe id="inner" srcdoc="<b>inner frame</b>"></iframe>
<div id="secret" data-private style="position:fixed;left:40px;top:80px;width:160px;height:160px;background:rgb(255,0,255);z-index:9">PRIVATE</div>
<script>
const tags = ["p","span","b","i","em","strong","small","mark","code","kbd","samp","var","sub","sup","abbr","cite","dfn","q","s","u","time","data","output","ins","del","h1","h2","h3","h4","h5","h6","blockquote","pre","figure","figcaption","article","aside","footer","header","nav","section","details","summary","dl","dt","dd","ol","ul","li","table","tbody","tr","td","th","fieldset","legend","label","meter","progress","dialog","menu"];
const app = document.getElementById("app");
for (let r = 0; r < 120; r++) {
  const row = document.createElement("div"); row.className = "row";
  for (let c = 0; c < 8; c++) { const tag = tags[(r * 8 + c) % tags.length]; const cell = document.createElement(tag); cell.textContent = tag + r; row.append(cell); }
  app.append(row);
}
</script>`;
await writeFile(join(output, "fixture.html"), fixture);

const types = { ".html": "text/html", ".mjs": "text/javascript" };
const server = createServer(async (request, response) => {
  const name = request.url === "/" ? "/fixture.html" : request.url.split("?")[0];
  try {
    const body = await readFile(join(output, name));
    response.writeHead(200, { "content-type": types[extname(name)] ?? "text/plain" }); response.end(body);
  } catch { response.writeHead(404); response.end("not found"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const results = [], failures = [], timings = {};
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, reducedMotion: "reduce" });
  // Local only: a capture must never reach off the machine that took it.
  await context.route(/^https?:\/\//, route =>
    ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "load" });
  const started = Date.now();

  const outcome = await page.evaluate(async () => {
    const { capturePage, CaptureCancelled, createContext, destroyContext, domToCanvas } = await import("/bundle.mjs");
    const navigated = [];
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
    Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", {
      ...descriptor,
      set(value) {
        navigated.push(this.id);
        // The state a committing srcdoc navigation leaves behind: a document with no body.
        const sandboxDocument = this.contentDocument;
        if (sandboxDocument?.documentElement) sandboxDocument.removeChild(sandboxDocument.documentElement);
      },
    });
    const report = {};
    // A: the library's own lazy sandbox, with the same options the capture uses.
    const lazy = await createContext(document.documentElement, { width: 400, height: 400, scale: 1, autoDestruct: false, timeout: 8000 });
    try { await domToCanvas(lazy); report.lazy = "no error"; }
    catch (cause) { report.lazy = String(cause?.message); }
    finally { destroyContext(lazy); }
    report.lazyNavigated = navigated.length;

    // B: the real capture, under the same interception.
    navigated.length = 0;
    try {
      const file = await capturePage("page");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const pixels = canvas.getContext("2d");
      pixels.drawImage(bitmap, 0, 0);
      const data = pixels.getImageData(0, 0, canvas.width, canvas.height).data;
      let magenta = 0;
      for (let index = 0; index < data.length; index += 4) if (data[index] === 255 && data[index + 1] === 0 && data[index + 2] === 255) magenta++;
      report.capture = { name: file.name, type: file.type, size: file.size, width: bitmap.width, height: bitmap.height, magenta };
    } catch (cause) { report.capture = { error: String(cause?.message) }; }
    report.captureNavigated = navigated.length;
    report.sandboxesLeft = document.querySelectorAll('iframe[id^="__SANDBOX__"]').length;

    // C: cancelling still raises CaptureCancelled and leaves no frame behind.
    const aborter = new AbortController();
    const cancelled = capturePage("page", { signal: aborter.signal, onProgress: value => { if (value.phase === "reading") aborter.abort(); } });
    try { await cancelled; report.cancel = "no error"; }
    catch (cause) { report.cancel = cause instanceof CaptureCancelled ? "CaptureCancelled" : String(cause?.message); }
    report.sandboxesAfterCancel = document.querySelectorAll('iframe[id^="__SANDBOX__"]').length;

    Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", descriptor);
    return report;
  });
  timings.browserMs = Date.now() - started;

  assert.match(outcome.lazy, /Cannot read properties of null \(reading 'appendChild'\)/,
    "A sandbox left mid-navigation must reproduce the reported capture failure");
  assert.ok(outcome.lazyNavigated > 0, "The library creates its sandbox by navigating it");
  results.push(`A library-created sandbox caught mid srcdoc navigation fails with: ${outcome.lazy}`);

  assert.equal(outcome.capture.error, undefined, `capturePage must survive the same interception (${outcome.capture.error})`);
  assert.equal(outcome.captureNavigated, 0, "capturePage must not depend on a navigating sandbox frame");
  assert.equal(outcome.capture.type, "image/png");
  assert.ok(outcome.capture.size > 0 && outcome.capture.width > 0, "The capture produced a real image");
  assert.equal(outcome.capture.magenta, 0, "A data-private block must not be rendered into the screenshot");
  assert.equal(outcome.sandboxesLeft, 0, "The capture sandbox is removed with the context");
  results.push(`capturePage produced ${outcome.capture.width}×${outcome.capture.height} PNG (${outcome.capture.size} bytes), no srcdoc navigation, private block redacted`);

  assert.equal(outcome.cancel, "CaptureCancelled", "Cancelling a capture still raises CaptureCancelled");
  assert.equal(outcome.sandboxesAfterCancel, 0, "A cancelled capture removes its sandbox too");
  results.push("Cancellation still raises CaptureCancelled and leaves no sandbox frame behind");
} catch (cause) {
  failures.push(cause.message);
} finally {
  await browser.close();
  server.close();
}

results.forEach(line => console.log(`  ok  ${line}`));
failures.forEach(line => console.error(`  FAIL  ${line}`));
console.log(`capture sandbox checks: ${results.length} passed, ${failures.length} failed (${timings.browserMs ?? 0}ms in the browser)`);
process.exit(failures.length ? 1 : 0);
