import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const bundle = await build({ stdin: { contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {AreaChart} from './registry/cojeev/ui/area-chart';
createRoot(document.getElementById('root')).render(<AreaChart data={[{label:'Mon',notes:3},{label:'Tue',notes:5}]} series={[{key:'notes',label:'Notes'}]} />);
`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } });
const browser = await chromium.launch();
try {
  const page = await browser.newPage(), errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent('<div id="root" style="display:none;width:480px"></div>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const width of [480, 24, 640]) {
    await page.evaluate(width => { const root = document.getElementById("root"); root.style.display = "block"; root.style.width = width + "px"; }, width);
    await page.waitForTimeout(120);
    assert.ok(await page.locator("svg rect").evaluateAll(nodes => nodes.every(node => Number(node.getAttribute("width") ?? 0) >= 0 && Number(node.getAttribute("height") ?? 0) >= 0)), "No negative plot rectangle after measurement");
    await page.evaluate(() => document.getElementById("root").style.display = "none");
    await page.waitForTimeout(120);
  }
  assert.deepEqual(errors, [], "Hidden/visible preview transitions never submit invalid SVG geometry");
  console.log("PASS chart initially hidden, reveal,24px container, re-hide and restore without negative SVG geometry or console errors");
} finally { await browser.close(); }
