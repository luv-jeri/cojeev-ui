import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/carousel/`)).text();
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
    contents: `
import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Carousel,CarouselContent,CarouselItem,CarouselNavigation,CarouselDots,CarouselPrevious,CarouselNext}from'./registry/cojeev/ui/carousel';import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';
const root=createRoot(document.getElementById('root'));window.events=[];window.render=p=>flushSync(()=>root.render(<Carousel key={p.fixture} aria-label="Ideas" dir={p.inherit ? undefined : p.dir??'ltr'} onIndexChange={n=>{window.index=n;window.events.push(n)}} style={{width:320}}><CarouselContent scrollbar={p.scrollbar} ref={n=>window.viewport=n} onKeyDown={e=>{if(window.cancel)e.preventDefault()}}>{Array.from({length:p.count??4},(_,i)=><CarouselItem key={i} asChild><article aria-label={'Idea '+(i+1)} style={{width:280,height:180,padding:16,background:'var(--v-canvas)'}}><h3>Idea {i+1}</h3><input aria-label={'Edit '+(i+1)} defaultValue="Keep this text"/></article></CarouselItem>)}</CarouselContent><CarouselNavigation><CarouselDots/><CarouselPrevious disabled={false} onClick={e=>{if(window.cancel)e.preventDefault()}}/><CarouselNext disabled={false} onClick={e=>{if(window.cancel)e.preventDefault()}}/></CarouselNavigation></Carousel>));window.quiet=k=>{setMotionMode(k==='motion'?'off':'subtle');setFlowSettings({variant:k==='flow'?'off':'glide'})};window.render({});`,
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
    viewport: { width: 700, height: 700 },
    reducedMotion: "reduce",
  });
  await page.setContent('<div id="root" style="padding:35px 73px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const scrollbar of [false, true])
    for (const dir of ["ltr", "rtl"]) {
      await page.evaluate((p) => window.render(p), {
        scrollbar,
        dir,
        fixture: `${scrollbar}-${dir}`,
      });
      const next = page.getByRole("button", { name: "Next slide" }),
        prev = page.getByRole("button", { name: "Previous slide" }),
        viewport = page.locator('[data-slot="carousel-content"]');
      await page.waitForFunction(
        () => window.viewport?.scrollWidth > window.viewport.clientWidth,
      );
      assert.equal(
        await prev.isDisabled(),
        true,
        "The first boundary stays disabled even with disabled=false",
      );
      assert.equal(
        await viewport.evaluate((el) => el === window.viewport),
        true,
        "Ref is the actual native scrollport",
      );
      await next.click();
      await page.waitForFunction(() => window.index === 1);
      assert.ok(await viewport.evaluate((el) => Math.abs(el.scrollLeft) > 200));
      await viewport.focus();
      await page.keyboard.press("End");
      await page.waitForFunction(() => window.index === 3);
      assert.equal(await next.isDisabled(), true);
      await page.keyboard.press("Home");
      await page.waitForFunction(() => window.index === 0);
      await page.evaluate(() => (window.cancel = true));
      await next.click();
      assert.equal(await page.evaluate(() => window.index), 0);
      await viewport.focus();
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => window.index), 0);
      await page.evaluate(() => (window.cancel = false));
      const edit = page.getByRole("textbox", { name: "Edit 1" });
      await edit.focus();
      await edit.press("ArrowRight");
      assert.equal(
        await page.evaluate(() => window.index),
        0,
        "Arrows in an editor do not move the carousel",
      );
      const dot = page.getByRole("button", { name: "Tile 2", exact: true });
      const b = await dot.boundingBox();
      assert.ok(
        b.width >= 44 && b.height >= 44,
        "Dot has a stationary 44px target",
      );
      await dot.click();
      await page.waitForFunction(() => window.index === 1);
      const b2 = await dot.boundingBox();
      assert.equal(
        b.width,
        b2.width,
        "Selected paint does not widen the hit target",
      );
      if (scrollbar) {
        assert.equal(
          await page
            .locator(
              '[data-slot="scroll-area"][data-scrollbar-variant="organic"]',
            )
            .count(),
          1,
        );
        await page
          .locator(
            '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
          )
          .waitFor({ state: "visible" });
      }
    }
  for (const mode of ["motion", "flow"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate((k) => window.quiet(k), mode);
    await page.getByRole("button", { name: "Tile 4", exact: true }).click();
    await page.waitForFunction(() => window.index === 3);
    assert.equal(
      await page.locator('[data-slot="carousel"]').getAttribute("data-motion"),
      "off",
    );
  }
  await page.evaluate(() => {
    document.getElementById("root").dir = "rtl";
    window.render({ fixture: "inherited", inherit: true, scrollbar: true });
  });
  assert.equal(
    await page
      .locator('[data-slot="carousel-content"]')
      .evaluate((el) => getComputedStyle(el).direction),
    "rtl",
    "The owned scrollbar preserves inherited RTL",
  );
  await page.getByRole("button", { name: "Next slide" }).click();
  await page.waitForFunction(
    () => window.index === 1 && window.viewport.scrollLeft < -200,
  );
  await page.evaluate(() => {
    document.getElementById("root").dir = "ltr";
    window.render({ fixture: "smooth", scrollbar: true });
    window.quiet("normal");
  });
  await page.getByRole("button", { name: "Tile 4", exact: true }).click();
  await page.getByRole("button", { name: "Tile 2", exact: true }).click();
  await page.waitForFunction(
    () => window.index === 1 && Math.abs(window.viewport.scrollLeft - 296) < 2,
  );
  await page.waitForTimeout(180);
  assert.equal(
    await page.evaluate(() => window.index),
    1,
    "Reversing a smooth scroll retains the requested item",
  );
  await page.evaluate(() =>
    window.render({ fixture: "single", count: 1, scrollbar: true }),
  );
  assert.equal(
    await page
      .locator('[data-slot="carousel-content"]')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    true,
    "A fitting single slide does not acquire decorative horizontal overflow",
  );
  await page.evaluate(() =>
    window.render({ fixture: "empty", count: 0, scrollbar: true }),
  );
  assert.equal(await page.locator('[data-slot="carousel-dot"]').count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "Next slide" }).isDisabled(),
    true,
  );
  assert.equal(
    await page.getByRole("button", { name: "Previous slide" }).isDisabled(),
    true,
  );
  console.log(
    "PASS Carousel native: owned/legacy scrolling, LTR/RTL bounds, Home/End, cancellation, editor keys, refs/Slot, stable dots, empty and quiet modes",
  );
} finally {
  await browser.close();
}
