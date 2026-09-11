import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/alert/`)).text();
const css = (
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Alert,AlertIcon,AlertBody,AlertTitle,AlertDescription,AlertClose}from'./registry/cojeev/ui/alert';import{Progress,ProgressIndicator}from'./registry/cojeev/ui/progress';import{Icon}from'./registry/cojeev/ui/icon';const root=createRoot(document.getElementById('root'));window.clicks=0;window.render=p=>flushSync(()=>root.render(<><Alert as="section" ref={n=>window.alertNode=n} presentation={p.presentation} variant={p.tone} role={p.role??'alert'}><AlertIcon><Icon name="info"/></AlertIcon><AlertBody><AlertTitle>One important thought</AlertTitle><AlertDescription>Keep the next action readable even when this explanation wraps onto several lines.</AlertDescription></AlertBody><AlertClose ref={n=>window.closeNode=n} disabled={p.disabled} onClick={()=>window.clicks++}><Icon name="close"/></AlertClose></Alert><Progress ref={n=>window.progressNode=n} aria-label="Work" value={p.value} max={p.max} appearance={p.appearance}>{p.custom?<ProgressIndicator style={{'--p':'25%'}}/>:undefined}</Progress></>));window.render({value:45});`,
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
    viewport: { width: 520, height: 800 },
    reducedMotion: "no-preference",
  });
  await page.setContent(
    '<div id="root" style="padding:32px;width:420px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const close = page.getByRole("button", { name: "Dismiss alert" }),
    meter = page.getByRole("progressbar", { name: "Work" });
  const b = await close.boundingBox();
  assert.ok(
    b.width >= 44 && b.height >= 44,
    "Dismissal has a44px native target",
  );
  await close.hover();
  await page.waitForTimeout(350);
  assert.deepEqual(
    await close.boundingBox(),
    b,
    "The dismissal target does not rotate",
  );
  assert.equal(await close.evaluate((el) => el === window.closeNode), true);
  assert.equal(
    await page.getByRole("alert").evaluate((el) => el.tagName),
    "SECTION",
  );
  await close.click();
  assert.equal(await page.evaluate(() => window.clicks), 1);
  await page.evaluate(() => window.render({ disabled: true, value: 45 }));
  await close.dispatchEvent("click");
  assert.equal(await page.evaluate(() => window.clicks), 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const appearance of ['organic','line','segmented']) {
    await page.evaluate(p=>window.render({value:45,appearance:p}),appearance);
    const geometry=await meter.evaluate(async el=>{for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);const svg=el.querySelector('svg'),fill=svg.querySelector('.v-progress__fill');return {view:svg.viewBox.baseVal.width,width:svg.getBoundingClientRect().width,fill:fill.getBoundingClientRect().width};});
    assert.ok(Math.abs(geometry.view-geometry.width)<1,'The first drawing uses its actual measured viewport');
    if(appearance!=='segmented')assert.ok(Math.abs(geometry.fill/geometry.width-.45)<.02,'Paint represents45% rather than only announcing it');
  }
  for (const [value, max, want] of [
    [-20, 100, 0],
    [140, 100, 100],
    [2, 4, 2],
    [NaN, 100, null],
    [null, 100, null],
  ]) {
    await page.evaluate((p) => window.render(p), { value, max });
    assert.equal(
      await meter.getAttribute("aria-valuenow"),
      want === null ? null : String(want),
    );
  }
  await page.evaluate(() => window.render({ value: 25, custom: true }));
  assert.equal(await meter.getAttribute("data-custom"), "true");
  assert.equal(await meter.evaluate((el) => el === window.progressNode), true);
  assert.equal(
    await meter.locator('[data-slot="progress-indicator"]').count(),
    1,
  );
  console.log(
    "PASS Alert/Progress native: stable dismissal, polymorphism/ref/role/disabled, bounded/unknown values and custom indicator",
  );
} finally {
  await browser.close();
}
