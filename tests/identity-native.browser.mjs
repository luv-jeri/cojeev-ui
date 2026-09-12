import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  html = await (await fetch(`${base}/docs/avatar/`)).text(),
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
    contents: `import{setMotionMode}from'./registry/cojeev/motion/settings';window.mode=setMotionMode;import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Avatar,AvatarImage,AvatarFallback,AvatarWrapper,AvatarEdit}from'./registry/cojeev/ui/avatar';import{Badge}from'./registry/cojeev/ui/badge';import{Icon}from'./registry/cojeev/ui/icon';const root=createRoot(document.getElementById('root'));window.edits=0;window.render=p=>flushSync(()=>root.render(<><AvatarWrapper><Avatar ref={n=>window.avatarNode=n} shape={p.shape} variant={p.tone} size="lg"><AvatarImage src={p.src} alt="Anaya's artwork"/><AvatarFallback>AR</AvatarFallback></Avatar><AvatarEdit ref={n=>window.editNode=n} disabled={p.disabled} onClick={()=>window.edits++}><Icon name="refresh"/></AvatarEdit></AvatarWrapper><Badge ref={n=>window.badgeNode=n} appearance={p.appearance} variant={p.tone} radius={p.radius} style={{marginTop:60}}>Ready for review</Badge></>));window.render({});`,
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
    viewport: { width: 500, height: 800 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(
    '<div id="root" style="display:grid;justify-items:start;padding:44px;width:450px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const edit = page.getByRole("button", { name: "Edit avatar" }),
    avatar = page.locator('[data-slot="avatar"]'),
    badge = page.locator('[data-slot="badge"]');
  const box = await edit.boundingBox();
  assert.ok(
    box.width >= 44 && box.height >= 44,
    "Avatar editing has a44px native target",
  );
  await edit.hover();
  await page.waitForTimeout(250);
  assert.deepEqual(
    await edit.boundingBox(),
    box,
    "The edit target does not rotate/scale",
  );
  await edit.press("Space");
  assert.equal(await page.evaluate(() => window.edits), 1);
  assert.equal(await edit.evaluate((el) => el === window.editNode), true);
  assert.equal(await avatar.evaluate((el) => el === window.avatarNode), true);
  assert.equal(await badge.evaluate((el) => el === window.badgeNode), true);
  assert.equal(await badge.getAttribute("role"), null);
  await page.evaluate(() => window.render({ disabled: true }));
  await edit.dispatchEvent("click");
  assert.equal(await page.evaluate(() => window.edits), 1);
  const src =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#95BAE8"/></svg>',
    );
  await page.evaluate((src) => window.render({ src }), src);
  await avatar.getByRole("img", { name: "Anaya's artwork" }).waitFor();
  assert.equal(
    await avatar.locator('[data-slot="avatar-fallback"]').count(),
    0,
  );
  await page.evaluate(() =>
    window.render({ src: "data:image/svg+xml,broken" }),
  );
  await avatar.getByText("AR", { exact: true }).waitFor();
  for (const appearance of ["stamp", "tag", "counter"]) {
    await page.evaluate(
      (appearance) =>
        window.render({ appearance, tone: "blue", radius: "square" }),
      appearance,
    );
    assert.equal(await badge.getAttribute("data-appearance"), appearance);
    assert.equal(
      await badge.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      "0px",
    );
    assert.equal(await badge.getAttribute("tabindex"), null);
    await badge.locator("[data-morph-body]").waitFor({ state: "attached" });
    const square = await badge.locator("[data-morph-body]").getAttribute("d");
    await page.evaluate(
      (appearance) =>
        window.render({ appearance, tone: "blue", radius: "round" }),
      appearance,
    );
    await page.waitForTimeout(80);
    assert.notEqual(
      await badge.locator("[data-morph-body]").getAttribute("d"),
      square,
      "The painted badge—not just its CSS box—honours corners",
    );
  }
  const tones = [
    "default",
    "pink",
    "yellow",
    "olive",
    "blue",
    "ink",
    "cream",
    "pink-soft",
    "yellow-soft",
    "olive-soft",
    "blue-soft",
    "danger",
    "pending",
    "count",
    "dashed",
    "caps",
    "test",
    "live",
  ];
  for (const mode of ["light", "dark"]) {
    await page.evaluate(
      (mode) => (document.documentElement.dataset.mode = mode),
      mode,
    );
    const paints = [];
    for (const tone of tones) {
      await page.evaluate(
        (tone) => window.render({ appearance: "tag", tone }),
        tone,
      );
      await page.waitForTimeout(40);
      const paint = await badge
        .locator("[data-morph-body]")
        .evaluate((el) => getComputedStyle(el).fill);
      assert.ok(
        paint !== "transparent" && paint !== "rgba(0, 0, 0, 0)",
        `${mode} ${tone} has paint`,
      );
      assert.notEqual(
        paint,
        await badge.evaluate((el) => getComputedStyle(el).color),
        `${mode} ${tone} has contrasting ink`,
      );
      paints.push(paint);
    }
    assert.ok(new Set(paints).size >= 8, `${mode} has independent accents`);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() =>
    window.render({ appearance: "stamp", tone: "pink" }),
  );
  const sample = () =>
    badge.evaluate(async (el) => {
      const b = el.getBoundingClientRect();
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: b.right - 1,
          clientY: b.y + b.height / 2,
          pointerType: "mouse",
        }),
      );
      const paths = [];
      for (let n = 0; n < 20; n++) {
        await new Promise(requestAnimationFrame);
        paths.push(el.querySelector("[data-morph-body]")?.getAttribute("d"));
      }
      return new Set(paths).size;
    });
  await page.waitForTimeout(80);
  assert.ok((await sample()) > 2, "Stamp responds through the shared contour");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  assert.equal(await sample(), 1, "Reduced motion stays still");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.mode("off"));
  await page.waitForTimeout(100);
  assert.equal(await sample(), 1, "Motion off stays still");
  console.log(
    "PASS identity native:44px stationary edit button, native/ref/disabled, image-success/error fallback, noninteractive badges and corner scope",
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
