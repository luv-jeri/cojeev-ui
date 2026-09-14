/** Focused real-widget test; only Next's route context is supplied by the fixture. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium } from "playwright";

const fixture = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import './registry/cojeev/styles/tokens.css';
      import './registry/cojeev/styles/theme.css';
      import './registry/cojeev/styles/base.css';
      import './registry/cojeev/styles/motion-drawer.css';
      import './registry/cojeev/styles/scroll-area.css';
      import './registry/cojeev/styles/button.css';
      import './registry/cojeev/styles/input.css';
      import './registry/cojeev/styles/textarea.css';
      import {ReportingWidget} from './components/reporting/reporting-widget';
      createRoot(document.getElementById('root')).render(<ReportingWidget entries={[]} />);`,
    resolveDir: process.cwd(), sourcefile: "reporting-consent.tsx", loader: "tsx",
  },
  bundle: true, write: false, outdir: "/fixture", jsx: "automatic", format: "iife",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "route-context", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "route", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const usePathname = () => location.pathname;" }));
  } }],
  logLevel: "silent",
});
const js = fixture.outputFiles.find(file => file.path.endsWith(".js")).text;
const css = fixture.outputFiles.find(file => file.path.endsWith(".css"))?.text ?? "";
const server = createServer((request, response) => {
  if (request.url === "/widget.js") { response.setHeader("Content-Type", "text/javascript"); response.end(js); }
  else { response.setHeader("Content-Type", "text/html"); response.end(`<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div><script src="/widget.js"></script></body></html>`); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const blocked = [];
  await context.route("**/*", route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    blocked.push(route.request().url()); return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const open = async () => {
    await page.getByRole("button", { name: "Request a feature or report a bug", exact: true }).click();
    await page.getByRole("button", { name: "Clear draft", exact: true }).waitFor();
  };
  const stored = () => page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("cojeev-reporting-v1", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("drafts").objectStore("drafts").get("workspace");
      read.onsuccess = () => { db.close(); resolve(read.result?.drafts?.bug?.diagnostics); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }));
  const saved = async present => {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const value = await stored();
      if (present ? Boolean(value) : value === null) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail("Draft database did not persist the expected diagnostics state");
  };
  await page.goto(origin);
  await open();
  await page.getByRole("tab", { name: "Report a bug", exact: true }).click();
  assert.equal(await page.locator(".report-diagnostic-groups").count(), 0,
    "New bug draft must not attach diagnostics before explicit inclusion");
  await page.getByRole("button", { name: "Include browser details", exact: true }).waitFor();
  await saved(false);
  await page.getByRole("button", { name: "Close reporting panel", exact: true }).click();
  await page.reload(); await open();
  assert.equal(await stored(), null, "Unconsented diagnostics must remain absent after persistence/reload");
  await page.getByRole("button", { name: "Include browser details", exact: true }).click();
  await page.locator(".report-diagnostic-groups").waitFor();
  const included = await page.locator(".report-diagnostic-groups pre").allTextContents();
  assert.ok(included.length > 0, "Explicit inclusion still captures browser details");
  await saved(true);
  await page.getByRole("button", { name: "Close reporting panel", exact: true }).click();
  await page.reload(); await open();
  assert.deepEqual(await page.locator(".report-diagnostic-groups pre").allTextContents(), included,
    "Previously included details survive reload unchanged");
  assert.ok(await stored(), "Explicitly included details persist in the actual draft database");
  await page.getByRole("button", { name: "Remove all browser details", exact: true }).click();
  await page.getByRole("button", { name: "Include browser details", exact: true }).waitFor();
  await saved(false);
  await page.getByRole("button", { name: "Close reporting panel", exact: true }).click();
  await page.reload(); await open();
  assert.equal(await stored(), null, "Removed diagnostics stay removed after reload");
  assert.equal(await page.locator(".report-diagnostic-groups").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, [], "The fixture should not attempt any external request");
  console.log("PASS: new bug drafts omit diagnostics; explicit inclusion and removal persist through reload.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
