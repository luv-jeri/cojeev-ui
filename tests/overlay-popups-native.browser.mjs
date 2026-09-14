import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  html = await (await fetch(`${base}/docs/hover-card/`)).text(),
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{TooltipProvider,Tooltip,TooltipTrigger,TooltipContent}from'./registry/cojeev/ui/tooltip';import{HoverCard,HoverCardTrigger,HoverCardContent}from'./registry/cojeev/ui/hover-card';import{Button}from'./registry/cojeev/ui/button';const root=createRoot(document.getElementById('root'));window.clicks=0;window.opens=[];window.render=p=>flushSync(()=>root.render(<><TooltipProvider><Tooltip delayDuration={0}><TooltipTrigger asChild><Button disabled={p.disabled} onClick={()=>window.clicks++} ref={n=>window.triggerNode=n}>Save</Button></TooltipTrigger><TooltipContent ref={n=>window.tipNode=n} appearance={p.tip} portal={p.portal}>Save the current note</TooltipContent></Tooltip></TooltipProvider><HoverCard open={p.open??false} onOpenChange={v=>window.opens.push(v)}><HoverCardTrigger asChild><Button>Notebook</Button></HoverCardTrigger><HoverCardContent ref={n=>window.cardNode=n} appearance={p.card} portal={p.portal} aria-label="Native preview"><h3>Notebook detail</h3>{Array.from({length:p.long?12:1},(_,n)=><p key={n}>A meaningful paragraph of preview content that remains selectable and readable. Detail {n+1}.</p>)}</HoverCardContent></HoverCard></>));window.render({});`,
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
    viewport: { width: 780, height: 650 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(
    '<div id="root" style="display:flex;gap:32px;padding:60px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const trigger = page.getByRole("button", { name: "Save", exact: true });
  assert.equal(await trigger.evaluate((el) => el === window.triggerNode), true);
  for (const tip of [undefined, "callout", "shortcut", "annotation"]) {
    await page.evaluate((tip) => window.render({ tip, portal: false }), tip);
    await trigger.focus();
    const content = page.locator('[data-slot="tooltip-content"]');
    await content.waitFor();
    assert.equal(await content.evaluate((el) => el === window.tipNode), true);
    assert.equal(await content.evaluate((el) => !!el.closest("#root")), true);
    assert.ok(await trigger.getAttribute("aria-describedby"));
    assert.equal(await content.locator("button,a,input").count(), 0);
    await trigger.press("Escape");
    await content.waitFor({ state: "hidden" });
    await trigger.blur();
  }
  await page.evaluate(() => window.render({ disabled: true }));
  await trigger.dispatchEvent("click");
  assert.equal(await page.evaluate(() => window.clicks), 0);
  await page.evaluate(() => window.render({}));
  await trigger.press("Enter");
  assert.equal(await page.evaluate(() => window.clicks), 1);
  await trigger.press("Escape");
  await trigger.blur();
  for (const card of [undefined, "identity", "preview", "media"]) {
    await page.evaluate(
      (card) =>
        window.render({ card, open: true, portal: false, long: !!card }),
      card,
    );
    const content = page.locator('[data-slot="hover-card-content"]');
    await content.waitFor();
    assert.equal(await content.evaluate((el) => el === window.cardNode), true);
    assert.equal(await content.evaluate((el) => !!el.closest("#root")), true);
    if (card) {
      const port = content.locator('[data-slot="scroll-area-viewport"]');
      assert.ok(await port.evaluate((el) => el.scrollHeight > el.clientHeight));
      await port.hover();
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
      assert.ok((await port.evaluate((el) => el.scrollTop)) > 0);
      assert.equal(await content.locator(".v-scroll__contour").count(), 1);
    }
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.opens.at(-1)), false);
    await page.evaluate(() => window.render({ open: false }));
    await content.waitFor({ state: "hidden" });
  }
  await page.evaluate(() =>
    window.render({ card: "preview", open: true, portal: true }),
  );
  assert.equal(
    await page
      .locator('[data-slot="hover-card-content"]')
      .evaluate((el) => !!el.closest("#root")),
    false,
  );
  const sample = async (selector) =>
    page.locator(selector).evaluate(async (el) => {
      const b = el.getBoundingClientRect();
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerType: "mouse",
          clientX: b.right - 2,
          clientY: b.y + b.height / 2,
        }),
      );
      const paths = [];
      for (let n = 0; n < 20; n++) {
        await new Promise(requestAnimationFrame);
        paths.push(el.querySelector("[data-morph-body]")?.getAttribute("d"));
      }
      return new Set(paths).size;
    });
  for (const kind of ["hover-card", "tooltip"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (kind === "tooltip") {
      await page.evaluate(() =>
        window.render({ tip: "annotation", portal: true }),
      );
      await trigger.focus();
    }
    const selector = `[data-slot="${kind}-content"]`;
    await page.locator(selector).waitFor();
    await page.waitForTimeout(350);
    assert.ok(
      (await sample(selector)) > 2,
      `${kind} has actual contour response`,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    assert.equal(
      await sample(selector),
      1,
      `${kind} stays still with reduced motion`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS popup native: Trigger/Content refs, native activation/disabled, described focus hints, Escape, portal modes, controlled close and organic wheel scrolling",
  );
} finally {
  await browser.close();
}
