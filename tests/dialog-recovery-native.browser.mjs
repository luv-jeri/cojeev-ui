import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/dialog/`)).text();
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription,DialogClose}from'./registry/cojeev/ui/dialog';import{Button}from'./registry/cojeev/ui/button';const root=createRoot(document.getElementById('root'));window.render=p=>flushSync(()=>root.render(<Dialog open={p.controlled?true:undefined} onOpenChange={v=>window.changed=v}><DialogTrigger asChild><Button ref={n=>window.triggerNode=n}>Open detail</Button></DialogTrigger><DialogContent ref={n=>window.contentNode=n} showCloseButton onEscapeKeyDown={e=>{if(p.cancel)e.preventDefault()}}><DialogTitle>A useful detail</DialogTitle><DialogDescription>Keep the native contracts.</DialogDescription><input aria-label="Draft" defaultValue="Keep me"/><DialogClose asChild><Button>Done</Button></DialogClose></DialogContent></Dialog>));window.render({});`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 750 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<div id="root" style="padding:40px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const opener = page.getByRole("button", { name: "Open detail", exact: true });
  await opener.press("Enter");
  const modal = page.getByRole("dialog", { name: "A useful detail" });
  await modal.waitFor();
  assert.equal(
    await modal.evaluate((e) => getComputedStyle(e).animationName),
    "none",
    "shared flow is the only entry owner, not a second CSS transform animation",
  );
  const close = modal.getByRole("button", { name: "Close", exact: true });
  const box = await close.boundingBox();
  assert.ok(
    box.width >= 44 && box.height >= 44,
    "Close is a44px shared action",
  );
  assert.equal(await modal.evaluate((e) => e === window.contentNode), true);
  assert.equal(
    await page.evaluate(
      () =>
        document.querySelector("[data-slot=dialog-trigger]") ===
        window.triggerNode,
    ),
    true,
  );
  await modal
    .getByRole("textbox", { name: "Draft" })
    .fill("Retained while open");
  await close.focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await modal.evaluate((e) => e.contains(document.activeElement)),
    true,
  );
  await modal.press("Escape");
  await modal.waitFor({ state: "hidden" });
  assert.equal(
    await opener.evaluate((e) => e === document.activeElement),
    true,
  );
  await page.evaluate(() => window.render({ controlled: true }));
  await modal.waitFor();
  await close.click();
  assert.equal(await modal.isVisible(), true);
  assert.equal(await page.evaluate(() => window.changed), false);
  await page.evaluate(() => window.render({ controlled: true, cancel: true }));
  await page.evaluate(() => (window.changed = "unchanged"));
  await modal.press("Escape");
  assert.equal(await page.evaluate(() => window.changed), "unchanged");
  assert.deepEqual(errors, []);
  console.log(
    "PASS Dialog native entry ownership,44px close, Slot/ref, focus containment/return and controlled cancellation",
  );
} finally {
  await browser.close();
}
