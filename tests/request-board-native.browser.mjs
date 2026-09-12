import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(base + "/requests/")).text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^\"]+\.css[^\"]*)"/g)].map(async (m) =>
      (await fetch(new URL(m[1], base))).text(),
    ),
  )
).join("\n");
const bundle = await build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{RequestBoard}from'./components/reporting/request-board';createRoot(document.getElementById('root')).render(<RequestBoard/>);`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_REPORTING_API_URL": '"https://board.test"',
    "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": '""',
  },
  plugins: [
    {
      name: "native-host-adapters",
      setup(b) {
        b.onResolve({ filter: /^next\/link$/ }, () => ({
          path: "link",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^\.\/reporting-widget$/ }, () => ({
          path: "widget",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          loader: "tsx",
          resolveDir: process.cwd(),
          contents:
            args.path === "link"
              ? `import React from'react';export default function Link(p){return <a {...p}/>;}`
              : `export const STATUS_LABELS={received:'Received',planned:'Planned',in_progress:'In progress',resolved:'Live',declined:'Not planned'};export function openRequest(topic){window.requested=topic??'new';}`,
        }));
      },
    },
  ],
});
await mkdir("output/playwright/request-board-recovery", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let hold,
    requestedPaths = [];
  const row = (id, title, status = "planned") => ({
    id,
    title,
    status,
    demand: id === "one" ? 12 : 3,
    createdAt: Date.now() - 86400000,
    componentUrl:
      status === "resolved" ? base + "/docs/bento-grid/" : undefined,
  });
  await page.route("https://board.test/**", async (route) => {
    const url = new URL(route.request().url());
    requestedPaths.push(url.pathname + url.search);
    const q = url.searchParams.get("q"),
      offset = url.searchParams.get("offset");
    if (q === "slow") await new Promise((r) => (hold = r));
    const data =
      q === "nothing"
        ? { requests: [], hasMore: false }
        : q === "fresh"
          ? { requests: [row("fresh", "A fresh idea")], hasMore: false }
          : q === "slow"
            ? {
                requests: [row("stale", "This stale response must not appear")],
                hasMore: false,
              }
            : offset === "2"
              ? {
                  requests: [
                    row("two", "An available composition", "resolved"),
                    row("three", "A new open idea", "received"),
                  ],
                  hasMore: false,
                }
              : {
                  requests: [
                    row("one", "A layered timeline for long histories"),
                    row("two", "An available composition", "resolved"),
                  ],
                  hasMore: true,
                };
    await route
      .fulfill({
        status: q === "error" ? 503 : 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify(
          q === "error" ? { error: "Temporarily unavailable" } : data,
        ),
      })
      .catch(() => {});
  });
  await page.setContent('<div id="root"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page
    .getByRole("heading", { name: "A layered timeline for long histories" })
    .waitFor();
  assert.equal(await page.locator(".requests-rows>li").count(), 2);
  await page
    .getByRole("button", { name: /I need this too/ })
    .first()
    .click();
  assert.equal(await page.evaluate(() => window.requested.id), "one");
  assert.equal(
    await page
      .getByRole("link", { name: /See component/ })
      .getAttribute("href"),
    base + "/docs/bento-grid/",
  );
  await page
    .getByRole("button", { name: "Load more requests", exact: true })
    .click();
  await page.getByRole("heading", { name: "A new open idea" }).waitFor();
  assert.equal(
    await page.locator(".requests-rows>li").count(),
    3,
    "pagination deduplicates an overlapping response",
  );
  for (const width of [1280, 390])
    for (const mode of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (m) => (document.documentElement.dataset.mode = m),
        mode,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      await page.screenshot({
        path: `output/playwright/request-board-recovery/board-${width}-${mode}.png`,
        fullPage: true,
      });
    }
  const search = page.getByRole("searchbox", {
    name: "Search component requests",
  });
  await search.fill("slow");
  await page.waitForTimeout(300);
  await search.fill("fresh");
  await page.getByRole("heading", { name: "A fresh idea" }).waitFor();
  hold();
  await page.waitForTimeout(100);
  assert.equal(
    await page.getByText("This stale response must not appear").count(),
    0,
  );
  assert.equal(await page.locator(".requests-rows>li").count(), 1);
  await search.fill("nothing");
  await page
    .getByRole("heading", { name: "No requests match that search." })
    .waitFor();
  assert.equal(await page.locator(".requests-rows>li").count(), 0);
  await search.fill("error");
  await page.getByRole("alert").waitFor();
  assert.match(
    await page.getByRole("alert").innerText(),
    /Temporarily unavailable/,
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await page.waitForTimeout(350);
  assert.ok(requestedPaths.filter((x) => x.includes("q=error")).length >= 2);
  assert.ok(
    requestedPaths.every((x) => x.startsWith("/v1/requests?")),
    "all requests read-only",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS connected board fixture: joining, link, demand, paging/dedup, stale search cancellation, empty/error/retry;4 captures; no external writes",
  );
} finally {
  await browser.close();
}
