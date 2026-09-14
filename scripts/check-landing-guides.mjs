/** The other routes that import components/landing/landing.css. The marketing
 *  gate opens the homepage and /work-with-me/; these three share the same
 *  stylesheet and nothing else opens them, so a change to a shared guide rule
 *  would otherwise go untested. Uses the existing static export or BASE_URL. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({
  configFile: false, base: "/cojeev-ui/", build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = (process.env.BASE_URL ?? (staticServer
  ? `http://127.0.0.1:${staticServer.httpServer.address().port}/cojeev-ui`
  : "http://127.0.0.1:4320/cojeev-ui")).replace(/\/$/, "");
const output = process.env.OUTPUT_DIR ?? "output/playwright/landing-guides";
const widths = (process.env.WIDTHS ?? "390,1440").split(",").map(Number);
await fs.mkdir(output, { recursive: true });

// `guide` marks the two pages built by components/landing/guide-shell.tsx, which
// is the only consumer of the shared .launch-guide and .launch-prose rules.
const routes = [
  { route: "/getting-started/", heading: "Make something yours.", guide: true },
  { route: "/privacy/", heading: "A little clarity.", guide: true },
  { route: "/about/", heading: /Hi, I’m Sanjay/, guide: false },
];

const results = [];
const browser = await chromium.launch();
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const { route, heading, guide } of routes) {
      const row = { width, route, checks: [] };
      try {
        await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.getByRole("heading", { level: 1, name: heading }).waitFor();
        if (guide) {
          assert.equal(await page.locator(".launch-guide > .launch-prose").count(), 1, "the guide shell must render its prose column");
          // The exact shared declarations a landing.css edit can silently drop.
          const prose = await page.locator(".launch-prose").evaluate(node => {
            const style = getComputedStyle(node.querySelectorAll("section")[0]);
            return {
              column: getComputedStyle(node).display,
              width: getComputedStyle(node.closest(".launch-guide")).maxWidth,
              border: style.borderTopWidth,
              links: [...node.querySelectorAll("a")].map(link => {
                const linkStyle = getComputedStyle(link);
                return `${linkStyle.textDecorationLine}|${linkStyle.textUnderlineOffset}`;
              }),
            };
          });
          assert.equal(prose.column, "grid", "prose sections stay in the shared grid");
          assert.equal(prose.width, "850px", "the guide keeps its shared reading width");
          assert.notEqual(prose.border, "0px", "prose sections keep their shared rule above");
          assert.ok(prose.links.length > 0, "the page must contain prose links to check");
          for (const link of prose.links) assert.equal(link, "underline|4px", `every prose link keeps the shared underline: ${prose.links.join(", ")}`);
          row.checks.push(`shared guide styles on ${prose.links.length} prose links`);
        }
        assert.ok(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), "page fits viewport");
        row.checks.push("no horizontal overflow");
        await page.screenshot({ path: path.join(output, `${route.replaceAll("/", "") || "home"}-${width}.png`), fullPage: true });
        row.pass = true;
      } catch (error) {
        row.pass = false; row.failure = error.message;
        await page.screenshot({ path: path.join(output, `failure-${route.replaceAll("/", "")}-${width}.png`), fullPage: true }).catch(() => {});
      }
      results.push(row);
      console.log(JSON.stringify(row));
    }
    assert.deepEqual(errors, [], `browser errors at ${width}px: ${errors.join("; ")}`);
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  if (staticServer) await new Promise(resolve => staticServer.httpServer.close(resolve));
}
if (results.some(row => !row.pass)) process.exitCode = 1;
