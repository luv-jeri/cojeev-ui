import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/toggle/`)).text();
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Toggle}from'./registry/cojeev/ui/toggle';import{Item,ItemGroup,ItemContent,ItemTitle,ItemDescription}from'./registry/cojeev/ui/item';import{setMotionMode}from'./registry/cojeev/motion/settings';window.mode=setMotionMode;const root=createRoot(document.getElementById('root'));window.changes=[];window.activations=0;window.render=p=>flushSync(()=>root.render(<><Toggle key={p.key??'same'} ref={n=>window.toggleNode=n} appearance={p.appearance} variant={p.variant} radius={p.radius} pressed={p.pressed} defaultPressed={p.defaultPressed} disabled={p.disabled} onPressedChange={v=>window.changes.push(v)} onClick={e=>{if(p.cancel)e.preventDefault()}} aria-label="Pin note">Pin note</Toggle><ItemGroup><Item ref={n=>window.itemNode=n} appearance={p.itemAppearance} variant={p.selected?'selected':undefined} radius={p.radius} disabled={p.disabled} onClick={()=>window.activations++}><ItemContent as="span"><ItemTitle as="span">A field note</ItemTitle><ItemDescription as="span">Sample notebook</ItemDescription></ItemContent></Item></ItemGroup></>));window.render({appearance:'tool',itemAppearance:'ledger'});`,
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 700, height: 800 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(
    '<div id="root" style="padding:60px;display:grid;gap:50px;justify-items:start"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const toggle = page.getByRole("button", { name: "Pin note", exact: true }),
    item = page.getByRole("button", { name: "A field note Sample notebook" });
  const box = await toggle.boundingBox();
  await toggle.hover();
  await page.mouse.down();
  await page.waitForTimeout(180);
  assert.deepEqual(
    await toggle.boundingBox(),
    box,
    "Toggle hit rectangle must not shrink under a held pointer",
  );
  await page.mouse.up();
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await toggle.press("Space");
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  assert.equal(await toggle.evaluate((e) => e === window.toggleNode), true);
  assert.equal(await item.evaluate((e) => e === window.itemNode), true);
  assert.ok(box.height >= 44);
  await item.press("Enter");
  assert.equal(await page.evaluate(() => window.activations), 1);
  await page.evaluate(() => window.render({ pressed: false, cancel: true }));
  const n = await page.evaluate(() => window.changes.length);
  await toggle.click();
  assert.equal(await page.evaluate(() => window.changes.length), n);
  await page.evaluate(() => window.render({ pressed: false }));
  await toggle.click();
  assert.equal(
    await toggle.getAttribute("aria-pressed"),
    "false",
    "Controlled refusal remains authoritative",
  );
  await page.evaluate(() =>
    window.render({ key: "default", defaultPressed: true }),
  );
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  for (const appearance of ["tool", "bookmark", "preference"]) {
    await page.evaluate(
      (appearance) =>
        window.render({ appearance, pressed: true, radius: "square" }),
      appearance,
    );
    assert.equal(await toggle.getAttribute("data-appearance"), appearance);
    assert.equal(
      await toggle.evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
      "0px",
    );
  }
  for (const appearance of ["ledger", "cover", "detail"]) {
    await page.evaluate(
      (itemAppearance) =>
        window.render({ itemAppearance, selected: true, radius: "soft" }),
      appearance,
    );
    assert.equal(await item.getAttribute("data-appearance"), appearance);
    assert.equal(
      await item.evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
      "8px",
    );
  }
  await page.evaluate(() =>
    window.render({ disabled: true, pressed: true, appearance: "tool" }),
  );
  const disabledN = await page.evaluate(() => window.changes.length);
  await toggle.dispatchEvent("click");
  await item.dispatchEvent("click");
  assert.equal(await page.evaluate(() => window.changes.length), disabledN);
  assert.equal(await page.evaluate(() => window.activations), 1);
  for (const mode of ["light", "dark"])
    for (const pressed of [true, false]) {
      await page.evaluate(
        ({ mode, pressed }) => {
          document.documentElement.dataset.mode = mode;
          window.render({ appearance: "tool", pressed });
        },
        { mode, pressed },
      );
      const colours = await toggle.evaluate((e) => {
        const c = getComputedStyle(e);
        return [c.color, c.getPropertyValue("--mfill")];
      });
      assert.ok(colours[0] && colours[1]);
    }
  await page.evaluate(() =>
    window.render({ appearance: "tool", itemAppearance: "ledger" }),
  );
  for (const control of [toggle, item]) {
    await control.locator("[data-morph-body]").waitFor({ state: "attached" });
    const normalBox = await control.boundingBox();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await control.hover({ position: { x: 9, y: 9 } });
    const moving = new Set();
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(30);
      moving.add(await control.locator("[data-morph-body]").getAttribute("d"));
    }
    assert.ok(
      moving.size > 2,
      "Shared surface actually responds, not just a data attribute",
    );
    assert.deepEqual(await control.boundingBox(), normalBox);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    const quiet = new Set();
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(30);
      quiet.add(await control.locator("[data-morph-body]").getAttribute("d"));
    }
    assert.equal(quiet.size, 1);
    await page.mouse.move(680, 780);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.mode("off"));
  await toggle.hover();
  await page.waitForTimeout(250);
  const off = await toggle.locator("[data-morph-body]").getAttribute("d");
  await page.waitForTimeout(200);
  assert.equal(
    await toggle.locator("[data-morph-body]").getAttribute("d"),
    off,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Toggle/Item native state, cancellation, disabled, refs, corners and fixed targets",
  );
} finally {
  await browser.close();
}
