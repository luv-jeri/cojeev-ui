import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/reading-trail/`)).text();
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
import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{ReadingTrail}from'./registry/cojeev/ui/reading-trail';
const root=createRoot(document.getElementById('root'));function App({presentation,empty=false,missing=false}){const[port,setPort]=React.useState(null);return <><ReadingTrail ref={n=>window.nav=n} presentation={presentation} label="Contents" scrollRoot={port} onClickCapture={e=>{if(window.cancel)e.preventDefault()}} items={empty?[]:missing?[{id:'absent',label:'Missing'}]:[{id:'one',label:'Notice'},{id:'two',label:'Connect',description:'Make the connection useful.'},{id:'three',label:'Return'},{id:'one',label:'Duplicate'},{id:'',label:'Empty'}]}/><div ref={n=>{setPort(n);window.port=n}} tabIndex={0} style={{height:240,overflow:'auto',scrollPaddingTop:16,border:'3px solid',marginTop:30}}>{['one','two','three'].map(id=><section id={id} key={id} style={{height:300,padding:16}}><h3>{id}</h3><input aria-label={'Note '+id}/></section>)}</div></>};window.render=p=>flushSync(()=>root.render(<App {...p}/>));window.render({});`,
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
    viewport: { width: 640, height: 1050 },
    reducedMotion: "no-preference",
  });
  await page.setContent(
    '<div id="root" style="padding:30px;width:340px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const nav = page.getByRole("navigation", { name: "Contents" });
  const connect = nav.getByRole("link", { name: /Connect/ });
  await nav.locator('[aria-current="location"]').waitFor();
  assert.equal(
    await nav.getByRole("link").count(),
    3,
    "Duplicate and empty IDs are consolidated",
  );
  assert.equal(
    await nav.evaluate((el) => el === window.nav),
    true,
    "Ref stays on the native nav",
  );
  const before = await connect.boundingBox();
  await connect.hover();
  await page.waitForTimeout(380);
  assert.deepEqual(
    await connect.boundingBox(),
    before,
    "Native link stays still while paint responds",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-slot="reading-trail"]').dataset.quiet ===
      "true",
  );
  await page.evaluate(() => (window.cancel = true));
  await connect.click();
  assert.equal(
    await page.evaluate(() => window.port.scrollTop),
    0,
    "Cancelled link does not scroll",
  );
  await page.evaluate(() => (window.cancel = false));
  await connect.click();
  await page.waitForFunction(
    () => document.activeElement?.id === "two" && window.port.scrollTop > 200,
  );
  await page.waitForFunction(() =>
    document
      .querySelector('[data-slot="reading-trail"] [aria-current="location"]')
      ?.textContent.includes("Connect"),
  );
  await page.getByRole("textbox", { name: "Note two" }).focus();
  assert.equal(
    await page.locator("#two").getAttribute("tabindex"),
    null,
    "Temporary section tabindex is restored after focus leaves",
  );
  await page.evaluate(() => { window.scrollCalls=0;const original=window.port.scrollTo.bind(window.port);window.port.scrollTo=(...args)=>{window.scrollCalls++;return original(...args)}; });
  await nav
    .getByRole("link", { name: /Return/ })
    .dispatchEvent("click", { ctrlKey: true });
  assert.equal(
    await page.evaluate(() => window.scrollCalls),
    0,
    "Modifier click is not hijacked",
  );
  await page.evaluate(() => (window.port.scrollTop = window.port.scrollHeight));
  await page.waitForFunction(
    () => document.querySelector("progress").value === 100,
  );
  assert.equal(
    await nav
      .getByRole("link", { name: /Return/ })
      .getAttribute("aria-current"),
    "location",
  );
  for (const presentation of ["spine", "bookmark", "overview"]) {
    await page.evaluate(
      (p) => window.render({ presentation: p }),
      presentation,
    );
    assert.equal(
      await page.evaluate(
        () =>
          window.port.scrollTop ===
          window.port.scrollHeight - window.port.clientHeight,
      ),
      true,
      "Article is not remounted by a presentation change",
    );
    assert.equal(await nav.getAttribute("data-quiet"), "true");
  }
  await page.evaluate(() => window.render({ missing: true }));
  await page.waitForFunction(
    () => document.querySelector("progress").value === 0,
  );
  assert.equal(
    await nav.locator('[aria-current="location"]').count(),
    0,
    "A missing section does not claim a measured location",
  );
  await page.evaluate(() => window.render({ empty: true }));
  assert.equal(await nav.getByRole("link").count(), 0);
  await nav.getByText("No sections to follow.").waitFor();
  console.log(
    "PASS Reading Trail native: legacy links/ref, deduplication, cancellation/modifiers, stable targets, local scroll, focus restoration, progress and missing/empty/quiet behavior",
  );
} finally {
  await browser.close();
}
