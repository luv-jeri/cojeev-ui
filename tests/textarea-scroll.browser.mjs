import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (await fetch(`${origin}/cojeev-ui/docs/textarea/`)).text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
      (await fetch(new URL(m[1], origin))).text(),
    ),
  )
).join("\n");
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{Textarea,TextareaScrollArea}from'./registry/cojeev/ui/textarea';
const root=createRoot(document.getElementById('root'));
function Harness(){const[text,setText]=React.useState('line\\n'.repeat(80));window.setText=setText;return <form><label htmlFor="draft">Draft</label><TextareaScrollArea><Textarea id="draft" name="draft" ref={node=>window.editor=node} value={text} onChange={event=>setText(event.target.value)} style={{height:160}}/></TextareaScrollArea></form>}
flushSync(()=>root.render(<React.StrictMode><Harness/></React.StrictMode>));window.unmount=()=>root.unmount();`,
    loader: "tsx",
    resolveDir: process.cwd(),
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
    viewport: { width: 700, height: 500 },
    reducedMotion: "reduce",
  });
  await page.setContent(
    '<style>body{padding:20px}form{max-width:380px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const editor = page.getByRole("textbox", { name: "Draft" }),
    bar = page.getByRole("scrollbar", { name: "Text scroll position" });
  await bar.waitFor();
  assert.equal(
    await page.locator('[data-slot="page-scrollbar"]').count(),
    0,
    "local editor never takes over document scrolling",
  );
  assert.equal(
    await page.locator("html").getAttribute("data-page-scrollbar"),
    null,
  );
  assert.equal(
    await editor.evaluate((e) => e === window.editor),
    true,
    "ref still reaches native textarea",
  );
  assert.equal(
    await editor.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    "none",
  );
  assert.equal(
    await editor.evaluate((e) => getComputedStyle(e).resize),
    "vertical",
  );
  assert.equal(await bar.getAttribute("aria-controls"), "draft");
  await editor.focus();
  await editor.press("PageDown");
  await page.waitForFunction(() => window.editor.scrollTop > 0);
  await editor.evaluate((e) => e.setSelectionRange(0, 4));
  assert.deepEqual(
    await editor.evaluate((e) => [e.selectionStart, e.selectionEnd]),
    [0, 4],
  );
  await bar.focus();
  await bar.press("Home");
  try {
    await page.waitForFunction(
      () => window.editor.scrollTop === 0,
      {},
      { timeout: 4000 },
    );
  } catch (error) {
    console.log(
      await page.evaluate(() => ({
        top: window.editor.scrollTop,
        range: [window.editor.selectionStart, window.editor.selectionEnd],
        active: document.activeElement.outerHTML,
        editor: window.editor.outerHTML,
      })),
    );
    throw error;
  }
  await bar.press("End");
  await page.waitForFunction(() => window.editor.scrollTop > 100);
  const before = await editor.inputValue();
  assert.equal(
    await page.evaluate(() =>
      new FormData(document.querySelector("form")).get("draft"),
    ),
    before,
  );
  const rail = await bar.boundingBox();
  await page.mouse.move(rail.x + rail.width / 2, rail.y + rail.height - 10);
  await page.mouse.down();
  await page.mouse.move(rail.x + rail.width / 2, rail.y + 8, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.editor.scrollTop < 20);
  await page.evaluate(() => window.setText("Short"));
  await bar.waitFor({ state: "hidden" });
  await page.evaluate(() => window.setText("Restored line\\n".repeat(100)));
  await bar.waitFor();
  await page.evaluate(() => (window.editor.style.height = "240px"));
  await page.waitForTimeout(50);
  assert.ok(
    (await bar.boundingBox()).height > 200,
    "rail tracks native editor resize",
  );
  await page.emulateMedia({ forcedColors: "active" });
  assert.notEqual(
    await editor.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    "none",
    "forced colors retain native fallback",
  );
  await bar.waitFor({ state: "hidden" });
  await page.emulateMedia({ forcedColors: "none" });
  await page.evaluate(() => {
    window.editor.wrap = "off";
    window.setText("One unwrapped line ".repeat(100));
  });
  await page.waitForTimeout(50);
  assert.notEqual(
    await editor.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    "none",
    "horizontal native editor scrolling is never hidden by a vertical adapter",
  );
  await bar.waitFor({ state: "hidden" });
  await page.evaluate(() => {
    window.savedEditor = window.editor;
    window.unmount();
  });
  assert.equal(
    await page.evaluate(() =>
      window.savedEditor.hasAttribute("data-element-scrollbar"),
    ),
    false,
    "cleanup restores native owner",
  );
  console.log(
    "PASS native textarea ref/form/edit/selection/resize, owned organic scrollbar keyboard/drag/content changes, forced-colors fallback and StrictMode cleanup",
  );
} finally {
  await browser.close();
}
