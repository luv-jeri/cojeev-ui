import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = await build({
  stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './registry/cojeev/ui/select';
import {setFlowSettings,setMotionMode} from './registry/cojeev/motion/settings';
window.quiet = mode => mode === 'flow' ? setFlowSettings({variant:'off'}) : setMotionMode('off');
createRoot(document.getElementById('root')).render(<><Select defaultValue="a"><SelectTrigger aria-label="Rhythm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="a">Daily</SelectItem><SelectItem value="b">Weekly</SelectItem></SelectContent></Select><button onClick={()=>window.outsideClicks=(window.outsideClicks??0)+1}>Outside action</button></>);
` }, bundle: true, write: false, format: "iife", platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  for (const mode of ["system", "motion", "flow"]) {
    const page = await browser.newPage({ reducedMotion: "no-preference" });
    page.setDefaultTimeout(3000);
    await page.setContent('<div id="root" style="padding:40px"></div>');
    await page.addStyleTag({ content: readFileSync("registry/cojeev/styles/flow-press.css", "utf8") });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const trigger = page.getByRole("combobox", { name: "Rhythm" });
    await trigger.click();
    await page.getByRole("option", { name: "Weekly", exact: true }).click();
    // Interrupt the real retained exit, before Radix's CSS sentinel completes.
    assert.equal(await page.locator('[data-slot="select-content"][data-state="closed"]').count(), 1);
    if (mode === "system") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.evaluate(mode => window.quiet(mode), mode);
    await page.locator('[data-slot="select-content"]').waitFor({ state: "detached" });
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).pointerEvents), "none");
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await page.getByRole("button", { name: "Outside action" }).click();
    assert.equal(await page.evaluate(() => window.outsideClicks), 1);
    await trigger.press("Enter");
    await page.getByRole("option", { name: "Daily", exact: true }).press("Enter");
    await page.locator('[data-slot="select-content"]').waitFor({ state: "detached" });
    assert.match(await trigger.innerText(), /Daily/);
    console.log(`PASS ${mode}: interrupted exit unmounts, releases pointer/accessibility locks, restores focus and reopens`);
    await page.close();
  }
} finally { await browser.close(); }
