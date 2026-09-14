import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  html = await (await fetch(`${base}/docs/chart-tooltip/`)).text(),
  css = (
    await Promise.all(
      [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
        (await fetch(new URL(m[1], base))).text(),
      ),
    )
  ).join("\n");
const bundle = await build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{ChartTooltip}from'./registry/cojeev/ui/chart-tooltip';const root=createRoot(document.getElementById('root'));window.render=p=>flushSync(()=>root.render(<div style={{position:'relative',width:300,height:260}}><ChartTooltip presentation={p.presentation} active={p.empty?null:{label:p.label??'Morning',items:p.items??[{label:'Notes',value:p.value??12,color:'pink'},{label:'Ideas',value:8,color:'blue'},{label:'Unobserved',value:null,color:'olive'}]}} position={p.position??{x:280,y:230}} bounds={{width:300,height:260}}/></div>));window.render({});`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 500 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<div id="root" style="padding:24px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const tip = page.getByRole("tooltip");
  await tip.waitFor();
  const row = tip.locator(".v-chart-tooltip__row").first();
  await row.evaluate((el) => (window.originalRow = el));
  await page.evaluate(() => window.render({ label: "Afternoon", value: 18 }));
  await page.waitForTimeout(30);
  assert.equal(
    await row.evaluate((el) => el === window.originalRow),
    true,
    "Point changes retain rows rather than animate ghost copies",
  );
  assert.equal(await tip.locator(".v-chart-tooltip__row").count(), 3);
  for (const presentation of ["compare", "summary", "ranked"]) {
    await page.evaluate(
      (presentation) => window.render({ presentation }),
      presentation,
    );
    await page.waitForTimeout(100);
    assert.equal(await tip.getAttribute("data-presentation"), presentation);
    assert.match(await tip.innerText(), /No observation/);
    const b = await tip.boundingBox();
    assert.ok(
      b.x >= 24 &&
        b.x + b.width <= 324 + 1 &&
        b.y >= 24 &&
        b.y + b.height <= 284 + 1,
      "The point detail remains inside plot bounds",
    );
    assert.equal(
      await tip.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
      "Decorative point detail never steals the cursor",
    );
  }
  await page.evaluate(() =>
    window.render({ presentation: "ranked", value: 4 }),
  );
  assert.match(await row.innerText(), /Ideas/);
  const colors = await tip
    .locator(".v-chart-tooltip__row")
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows.map((row) => [
          row.querySelector(
            "span:not(.v-chart-key):not(.v-chart-tooltip__rank)",
          ).textContent,
          getComputedStyle(row.querySelector(".v-chart-key")).backgroundColor,
        ]),
      ),
    );
  await page.evaluate(() =>
    window.render({ presentation: "compare", value: 4 }),
  );
  assert.match(await row.innerText(), /Notes/);
  assert.deepEqual(
    await tip
      .locator(".v-chart-tooltip__row")
      .evaluateAll((rows) =>
        Object.fromEntries(
          rows.map((row) => [
            row.querySelector(
              "span:not(.v-chart-key):not(.v-chart-tooltip__rank)",
            ).textContent,
            getComputedStyle(row.querySelector(".v-chart-key")).backgroundColor,
          ]),
        ),
      ),
    colors,
    "Ranking never reassigns series colours",
  );
  for (const value of [0, -10, 4]) {
    await page.evaluate(
      (value) => window.render({ presentation: "summary", value }),
      value,
    );
    assert.equal(
      await tip.locator(".v-chart-tooltip__total strong").innerText(),
      String(value + 8),
    );
    assert.match(await tip.innerText(), /Known subtotal/);
  }
  await page.evaluate(() => window.render({ items: [] }));
  assert.match(await tip.innerText(), /No observations/);
  await page.evaluate(() =>
    window.render({
      items: Array.from({ length: 24 }, (_, n) => ({
        label: `A deliberately long observation label ${n}`,
        value: n,
        color: "pink",
      })),
    }),
  );
  assert.ok((await tip.locator(".v-chart-tooltip__row").count()) <= 6);
  assert.match(
    await tip.locator(".sr-only").innerText(),
    /observation label 23: 23/,
  );
  assert.equal(
    await tip.evaluate((el) => getComputedStyle(el).overflowY),
    "hidden",
  );
  await page.evaluate(() => window.render({ empty: true }));
  await tip.waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS chart-tooltip native: stable rows, point changes, missing values, paired series, controlled layouts and edge placement",
  );
} finally {
  await browser.close();
}
