import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/skeleton/`)).text();
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Skeleton,AsyncContent}from'./registry/cojeev/ui/skeleton';import{Spinner}from'./registry/cojeev/ui/spinner';import{Button}from'./registry/cojeev/ui/button';import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';window.mode=setMotionMode;window.flow=setFlowSettings;const root=createRoot(document.getElementById('root'));window.clicks=0;window.render=p=>flushSync(()=>root.render(<><Spinner ref={n=>window.spinnerNode=n} label="Preparing the local preview" appearance={p.appearance} paused={p.paused} variant={p.point?'point':'default'}><span data-child>Custom child</span></Spinner><Skeleton as="section" ref={n=>window.skelNode=n} effect={p.effect} paused={p.paused} style={{width:240,height:64,marginTop:50}}/><AsyncContent loading={p.loading??true} fallback={<Skeleton variant="line"/>} ref={n=>window.asyncNode=n}><input aria-label="Kept input" defaultValue="Keep this edit"/></AsyncContent><Button loading={p.busy} onClick={()=>window.clicks++}>Save a note</Button></>));window.unmount=()=>root.unmount();window.render({});`,
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
    viewport: { width: 600, height: 800 },
    reducedMotion: "no-preference",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(
    '<div id="root" style="padding:40px;width:500px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const spinner = page.locator('[data-slot="spinner"]'),
    skel = page.locator('section[data-slot="skeleton-item"]'),
    region = page.locator('[data-slot="skeleton-async"]');
  assert.equal(await spinner.evaluate((el) => el === window.spinnerNode), true);
  assert.equal(await skel.evaluate((el) => el === window.skelNode), true);
  assert.equal(await region.evaluate((el) => el === window.asyncNode), true);
  const defaultBox = await spinner.boundingBox();
  assert.equal(defaultBox.width, 34);
  assert.equal(defaultBox.height, 34);
  assert.equal(await spinner.getAttribute("role"), "status");
  assert.equal(
    await spinner.getAttribute("aria-label"),
    "Preparing the local preview",
  );
  assert.equal(await spinner.locator("[data-child]").count(), 1);
  await page
    .getByRole("textbox", { name: "Kept input", includeHidden: true })
    .evaluate((el) => el.focus());
  assert.notEqual(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Kept input",
    "Busy content is inert",
  );
  await page.evaluate(() => window.render({ loading: false }));
  const input = page.getByRole("textbox", { name: "Kept input" });
  await input.fill("A retained thought");
  await page.evaluate(() => window.render({ loading: true }));
  await page.evaluate(() => window.render({ loading: false }));
  assert.equal(await input.inputValue(), "A retained thought");
  const sample = async (locator) =>
    locator.evaluate(async (el) => {
      const values = [];
      for (let i = 0; i < 20; i++) {
        await new Promise(requestAnimationFrame);
        values.push(
          [...el.querySelectorAll("svg *,.v-skel__sheen")]
            .map((n) =>
              [
                n.getAttribute("d"),
                n.getAttribute("y"),
                n.getAttribute("rx"),
                n.getAttribute("transform"),
                n.style.transform,
                getComputedStyle(n).opacity,
              ].join("|"),
            )
            .join(";"),
        );
      }
      return new Set(values).size;
    });
  for (const appearance of ["bloom", "orbit", "relay"]) {
    await page.evaluate(
      (appearance) => window.render({ appearance, loading: false }),
      appearance,
    );
    await page.waitForFunction(() =>
      document
        .querySelector('[data-slot="spinner"]')
        .hasAttribute("data-animated"),
    );
    assert.ok(
      (await sample(spinner)) > 2,
      `${appearance} actually changes paint`,
    );
    assert.equal(
      await spinner.evaluate(async (el) => {
        for (let i = 0; i < 20; i++) {
          await new Promise(requestAnimationFrame);
          const r = el.querySelector("svg").getBoundingClientRect();
          for (const n of el.querySelectorAll(".v-pulse__mark,.seed")) {
            const length=n.getTotalLength(),matrix=n.getScreenCTM();
            for(let k=0;k<32;k++) {const b=n.getPointAtLength(length*k/32).matrixTransform(matrix);if(b.x<r.left-2||b.x>r.right+2||b.y<r.top-2||b.y>r.bottom+2)return false;}
          }
        }
        return true;
      }),
      true,
      `${appearance} paint stays inside its measured footprint`,
    );
    await page.evaluate(
      (appearance) =>
        window.render({ appearance, paused: true, loading: false }),
      appearance,
    );
    await page.waitForTimeout(80);
    assert.equal(
      await sample(spinner),
      1,
      `${appearance} is still when paused`,
    );
    assert.deepEqual(
      await spinner.boundingBox(),
      defaultBox,
      "Only internal paint moves",
    );
  }
  for (const effect of ["shimmer", "pulse", "ink"]) {
    await page.evaluate(
      (effect) => window.render({ effect, loading: false }),
      effect,
    );
    await page.waitForFunction(() =>
      document
        .querySelector('section[data-slot="skeleton-item"]')
        .hasAttribute("data-animated"),
    );
    assert.ok((await sample(skel)) > 2, `${effect} has actual paint motion`);
    if (effect === "ink") {
      assert.match(
        await skel
          .locator(".v-skel__sheen")
          .evaluate((el) => getComputedStyle(el).backgroundImage),
        /repeating-linear-gradient/,
      );
      assert.notEqual(
        await skel.locator("[data-morph-body]").getAttribute("stroke"),
        "transparent",
      );
    }
    await page.evaluate(
      (effect) => window.render({ effect, paused: true, loading: false }),
      effect,
    );
    await page.waitForTimeout(80);
    assert.equal(await sample(skel), 1, `${effect} stops when paused`);
  }
  await page.evaluate(() => window.render({ loading: false }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(80);
  assert.equal(await spinner.getAttribute("data-animated"), null);
  assert.equal(await sample(spinner), 1);
  assert.equal(await sample(skel), 1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const control of ["motion", "flow"]) {
    await page.evaluate(
      (c) =>
        c === "motion" ? window.mode("off") : window.flow({ variant: "off" }),
      control,
    );
    await page.waitForTimeout(80);
    assert.equal(await spinner.getAttribute("data-animated"), null);
    assert.equal(await skel.getAttribute("data-animated"), null);
    await page.evaluate(
      (c) =>
        c === "motion"
          ? window.mode("subtle")
          : window.flow({ variant: "glide" }),
      control,
    );
  }
  await page.evaluate(() => {
    document.getElementById("root").style.marginTop = "1800px";
  });
  await page.waitForFunction(
    () =>
      !document
        .querySelector('[data-slot="spinner"]')
        .hasAttribute("data-animated"),
  );
  assert.equal(await skel.getAttribute("data-animated"), null);
  await page.evaluate(() => {
    document.getElementById("root").style.marginTop = "0";
  });
  await page.waitForFunction(() =>
    document
      .querySelector('[data-slot="spinner"]')
      .hasAttribute("data-animated"),
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(80);
  assert.equal(await spinner.getAttribute("data-animated"), null);
  assert.equal(await skel.getAttribute("data-animated"), null);
  await page.evaluate(() => {
    delete document.visibilityState;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => window.render({ busy: true, loading: false }));
  const button = page.getByRole("button", { name: "Save a note" });
  assert.equal(await button.getAttribute("aria-busy"), "true");
  assert.equal(
    await button.locator('[data-slot="button-indicator"] svg').count(),
    1,
  );
  await button.dispatchEvent("click");
  assert.equal(await page.evaluate(() => window.clicks), 0);
  await page.evaluate(() => window.render({ busy: false, loading: false }));
  await button.click();
  assert.equal(await page.evaluate(() => window.clicks), 1);
  await page.evaluate(() => window.unmount());
  assert.equal(await page.locator("#root>*").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS loading native: default footprint/ref/children, busy/inert and retained edits, real effect/mechanism paint, paused/reduced/global/offscreen/hidden stillness and loading Button compatibility",
  );
} finally {
  await browser.close();
}
