import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{HeroButton,heroButtonAppearances}from'./registry/cojeev/ui/hero-button';
import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';
const root=createRoot(document.getElementById('root'));window.concepts=heroButtonAppearances;window.calls=0;
window.showHero=(appearance,disabled=false)=>flushSync(()=>root.render(<div style={{display:'grid',justifyItems:'start',gap:20}}>
<HeroButton appearance={appearance} disabled={disabled} ref={node=>window.heroRef=node} onClick={()=>window.calls++}>Start here</HeroButton>
<HeroButton appearance={appearance} loading onClick={()=>window.calls++}>Working</HeroButton>
<HeroButton appearance={appearance} asChild disabled={disabled}><a href="#destination" onClick={()=>window.calls++}>Go somewhere</a></HeroButton>
</div>));window.quietHero=mode=>{setMotionMode(mode==='motion'?'off':'subtle');setFlowSettings({variant:mode==='flow'?'off':'glide'});};window.showHero('liquid');`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const response = await fetch(`${base}/docs/hero-button/`);
assert.equal(response.status, 200);
const html = await response.text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (match) =>
      (await fetch(new URL(match[1], base))).text(),
    ),
  )
).join("\n");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 780, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<div id="root" style="padding:32px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const button = page.getByRole("button", { name: "Start here", exact: true }),
    busy = page.getByRole("button", { name: "Working", exact: true }),
    link = page.getByRole("link", { name: "Go somewhere", exact: true });
  for (const appearance of await page.evaluate(() => window.concepts)) {
    await page.evaluate(
      (appearance) => window.showHero(appearance, true),
      appearance,
    );
    assert.ok(await button.isDisabled());
    assert.equal(await busy.getAttribute("aria-busy"), "true");
    assert.equal(await link.getAttribute("aria-disabled"), "true");
    assert.equal(
      await page.evaluate(
        () =>
          window.heroRef ===
          document.querySelector('[data-slot="hero-button"]'),
      ),
      true,
    );
    const before = await page.evaluate(() => window.calls);
    await page.evaluate(() =>
      document
        .querySelectorAll('[data-slot="hero-button"]')
        .forEach((el) => el.click()),
    );
    assert.equal(
      await page.evaluate(() => window.calls),
      before,
      "disabled/loading/link cannot activate",
    );
    assert.ok(
      await button.evaluate((el) => {
        const s = getComputedStyle(el);
        const probe = document.createElement("span");
        probe.style.color = s.getPropertyValue("--v-disabled-ink");
        el.append(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return s.color === expected;
      }),
      "disabled paint takes precedence over the concept palette",
    );
    await page.evaluate(
      (appearance) => window.showHero(appearance),
      appearance,
    );
    await button.click();
    await link.focus();
    await link.press("Enter");
    assert.equal(
      await page.evaluate(() => window.calls),
      before + 2,
      "each real button/link activates once",
    );
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const mode of ["motion", "flow"]) {
    await page.evaluate((mode) => window.quietHero(mode), mode);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-slot="hero-button"]')?.dataset
          .motionQuiet === "true",
    );
    await button.hover();
    const ink = await button
      .locator('[data-slot="hero-button-head"]')
      .getAttribute("d");
    await page.evaluate(async () => {
      for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    });
    assert.equal(
      await button.locator('[data-slot="hero-button-head"]').getAttribute("d"),
      ink,
      `${mode} Off keeps a static arrow`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS all12 hero concepts: native button/link, disabled/loading precedence and no activation, forwarded ref, exact action count, Motion Off and Flow Off",
  );
} finally {
  await browser.close();
}
