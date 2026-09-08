/** Targeted current-source proof; serves existing out/ assets and never builds the site.
 * Run with node scripts/check-webkit-hidden-anchor.mjs [--output=output/playwright/custom].
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
import fs from "node:fs";
import { build } from "esbuild";
import { webkit, devices } from "playwright";
import { preview } from "vite";
import assert from "node:assert/strict";
const out = path.resolve(
  repoRoot,
  args.output || "output/playwright/webkit-hidden-anchor",
);
fs.mkdirSync(out, { recursive: true });
const server = await preview({
  configFile: false,
  root: repoRoot,
  base: "/sahajiv-ui/",
  build: { outDir: path.join(repoRoot, "out") },
  preview: { host: "127.0.0.1", port: 0 },
});
const base = `http://127.0.0.1:${server.httpServer.address().port}/sahajiv-ui`;
const built = await build({
  tsconfig: path.join(repoRoot, "tsconfig.json"),
  stdin: {
    sourcefile: "webkit-current.tsx",
    loader: "tsx",
    resolveDir: repoRoot,
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';
import{MultiSelect}from'./registry/sahajiv/ui/multi-select';import{ThemeToggle}from'./registry/sahajiv/ui/theme-toggle';import{Button}from'./registry/sahajiv/ui/button';
const host=document.createElement('div');host.id='webkit-current-fixture';host.style.cssText='position:fixed;inset:20px 16px auto;padding:16px;background:var(--v-canvas);z-index:10';document.body.append(host);
function Test(){const[value,setValue]=React.useState(['Design','Engineering']);const[shown,setShown]=React.useState(false);return <><MultiSelect label='Topics' options={['Design','Engineering','Research','Writing','Data'].map(label=>({value:label,label}))} value={value} onValueChange={setValue}/><p>Following: {value.join(', ')}.</p><Button onClick={()=>setShown(v=>!v)}>Reveal hidden control</Button><div style={{display:shown?'flex':'none',justifyContent:'flex-end'}}><ThemeToggle mode='light'/></div></>};createRoot(host).render(<Test/>);
`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const browser = await webkit.launch();
const results = [];
try {
  for (let pass = 0; pass < 2; pass++) {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/docs/multi-select/");
    await page.locator("[data-example=multi-select]").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: built.outputFiles[0].text });
    const root = page.locator("#webkit-current-fixture");
    const trigger = root.getByRole("button", { name: "Topics", exact: true });
    await trigger.waitFor();
    await trigger.tap();
    await page
      .getByRole("searchbox", { name: "Search Topics" })
      .fill("research");
    await page.getByRole("checkbox", { name: "Research", exact: true }).tap();
    await page.keyboard.press("Escape");
    await page
      .getByRole("searchbox", { name: "Search Topics" })
      .waitFor({ state: "hidden" });
    assert(await trigger.evaluate((e) => e === document.activeElement));
    assert(
      (await root.textContent()).includes(
        "Following: Design, Engineering, Research.",
      ),
    );
    await page.evaluate(() => {
      window.__widths = [];
      const sample = () => {
        window.__widths.push(document.documentElement.scrollWidth);
        window.__frame = requestAnimationFrame(sample);
      };
      sample();
    });
    await root.getByRole("button", { name: "Reveal hidden control" }).tap();
    await page.waitForTimeout(400);
    const widths = await page.evaluate(() => {
      cancelAnimationFrame(window.__frame);
      return window.__widths;
    });
    assert(Math.max(...widths) <= 391);
    assert(
      await root
        .getByRole("switch", { name: "Dark appearance" })
        .locator("svg.v-morph")
        .evaluate((e) => Number.parseFloat(e.style.width) > 0),
    );
    assert.deepEqual(errors, []);
    await root.screenshot({ path: `${out}/pass-${pass}.png` });
    results.push({
      pass,
      status: "PASS",
      maxWidth: Math.max(...widths),
      frames: widths.length,
      errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
