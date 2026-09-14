import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/linear-modal/`)).text();
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{LinearModal}from'./registry/cojeev/ui/linear-modal';import{setMotionMode}from'./registry/cojeev/motion/settings';window.mode=setMotionMode;const root=createRoot(document.getElementById('root'));const src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#aaccdd"/><circle cx="300" cy="170" r="110" fill="#eeaabb"/></svg>');window.render=p=>flushSync(()=>root.render(<LinearModal key={p.key??'same'} ref={n=>window.host=n} title="A closer look" description="Sample detail" src={src} alt="Pink sun" variant={p.variant} open={p.controlled?true:undefined} defaultOpen={p.defaultOpen} onOpenChange={v=>window.changed=v}><input aria-label="Local draft" defaultValue="Keep it"/>{Array.from({length:p.long?20:1},(_,i)=><p key={i}>A useful detail with room to read. This is paragraph {i+1}.</p>)}</LinearModal>));window.render({});`,
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
      viewport: { width: 1100, height: 800 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(
    '<div id="root" style="padding:30px;max-width:480px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  // Sample in the browser frame loop before activation, so protocol round trips
  // cannot miss the opening frames on a busy local documentation server.
  await page.evaluate(() => {
    window.traceSurface = (selector) => {
      window.traceFrames = [];
      window.traceDone = new Promise((resolve) => {
        const until = performance.now() + 900;
        const frame = () => {
          const e = document.querySelector(selector);
          if (e)
            window.traceFrames.push({
              width: e.getBoundingClientRect().width,
              image: e.querySelector("img")?.getBoundingClientRect().width,
            });
          if (performance.now() < until) requestAnimationFrame(frame);
          else resolve(window.traceFrames);
        };
        requestAnimationFrame(frame);
      });
    };
  });
  const card = page.getByRole("button", {
      name: "Read A closer look",
      exact: true,
    }),
    modal = page.getByRole("dialog", { name: "A closer look", exact: true });
  await page.waitForTimeout(150);
  assert.equal(
    await page
      .locator("[data-slot=linear-modal]")
      .evaluate((e) => e === window.host),
    true,
  );
  const before = await card.boundingBox();
  await card.hover();
  await page.mouse.down();
  await page.waitForTimeout(50);
  assert.deepEqual(await card.boundingBox(), before);
  await page.evaluate(() => window.traceSurface(".v-linear-modal__detail"));
  await page.mouse.up();
  await modal.waitFor();
  const frames = await page.evaluate(() => window.traceDone);
  assert.ok(
    new Set(frames.map((f) => Math.round(f.width))).size > 2,
    "Opening must interpolate shared surface geometry, not only opacity",
  );
  assert.ok(
    new Set(frames.map((f) => Math.round(f.image))).size > 2,
    "Image has visible shared continuity",
  );
  await page.waitForTimeout(300);
  await modal
    .getByRole("textbox", { name: "Local draft" })
    .fill("Focus stays here");
  await page.keyboard.press("Tab");
  assert.equal(
    await modal.evaluate((e) => e.contains(document.activeElement)),
    true,
  );
  const close = modal.getByRole("button", {
    name: "Close detail",
    exact: true,
  });
  const cb = await close.boundingBox();
  assert.ok(cb.width >= 44 && cb.height >= 44);
  await page.evaluate(() => window.traceSurface(".v-linear-modal__card"));
  await close.click();
  const reverse = (await page.evaluate(() => window.traceDone)).map(
    (frame) => frame.width,
  );
  await modal.waitFor({ state: "hidden" });
  assert.ok(
    new Set(reverse.map(Math.round)).size > 2,
    "Closing returns through shared geometry",
  );
  assert.equal(await card.evaluate((e) => e === document.activeElement), true);
  // Interrupt opening, and then open a fresh cycle; there must be one dialog and one final state.
  await card.click();
  await page.waitForTimeout(35);
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  await card.click();
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  for (const quiet of ["reduced", "off"]) {
    if (quiet === "reduced")
      await page.emulateMedia({ reducedMotion: "reduce" });
    else {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => window.mode("off"));
    }
    await card.click();
    await modal.waitFor();
    assert.equal(
      await modal.evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    await page.waitForTimeout(100);
    assert.equal(
      await modal.evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    await page.keyboard.press("Escape");
    await modal.waitFor({ state: "hidden" });
  }
  await page.setViewportSize({ width: 390, height: 600 });
  await page.evaluate(() =>
    window.render({
      long: true,
      variant: "centered",
      defaultOpen: true,
      key: "long",
    }),
  );
  await modal.waitFor();
  const viewport = modal.locator("[data-slot=scroll-area-viewport]");
  assert.equal(
    await viewport.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    "none",
  );
  await modal
    .locator("[data-slot=scroll-area-thumb]")
    .waitFor({ state: "visible" });
  await viewport.hover();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(150);
  assert.ok((await viewport.evaluate((e) => e.scrollTop)) > 0);
  const mb = await modal.boundingBox();
  assert.ok(mb.y >= 0 && mb.y + mb.height <= 601);
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  await page.evaluate(() => window.render({ controlled: true }));
  await modal.waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await modal.isVisible(), true);
  assert.equal(await page.evaluate(() => window.changed), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS Linear Modal actual shared image/surface enter and reverse, rapid interruption, quiet/off,44px stable targets, focus/ref, controlled and owned long scroll",
  );
} finally {
  await browser.close();
}
