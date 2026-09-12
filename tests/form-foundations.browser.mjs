import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";

const bundle = await build({ stdin: { contents: `
  import React from "react";
  import {createRoot} from "react-dom/client";
  import {flushSync} from "react-dom";
  import {InputExample, FieldExample, InputGroupExample, TextareaExample} from "./components/examples/form-foundations";
  import {Button} from "./registry/cojeev/ui/button";
  const root=createRoot(document.getElementById("root"));
  window.renderFields=(variant="contour",radius="8px")=>flushSync(()=>root.render(<div id="owner" style={{"--v-control-radius":radius}}>
    <Button id="radius-subject">Corners</Button>
    <InputExample variant={variant}/><FieldExample variant={variant}/><InputGroupExample variant={variant}/><TextareaExample variant={variant}/>
  </div>));
  window.renderFields();
`, loader:"tsx",resolveDir:process.cwd() }, bundle:true,write:false,format:"iife",platform:"browser",define:{"process.env.NODE_ENV":'"production"'} });
// Reuse the real docs' compiled utility stylesheet, avoiding a second CSS compiler.
const origin=process.env.DOCS_ORIGIN??"http://127.0.0.1:4320";
const html=await (await fetch(`${origin}/cojeev-ui/docs/input/`)).text();
const links=[...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(match=>match[1]);
const css=(await Promise.all(links.map(async href=>(await fetch(new URL(href,origin))).text()))).join("\n")+"\n@layer cojeev-states {"+await readFile("registry/cojeev/styles/control-appearance.css","utf8")+"}";
const browser=await chromium.launch();
const output="output/playwright/form-foundations";
await mkdir(output,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:"reduce"});
 await page.setContent('<style>body{padding:24px;background:var(--v-canvas);color:var(--v-text)}#owner{display:grid;gap:36px;max-width:480px;margin:auto}</style><div id="root"></div>');
 await page.addStyleTag({content:css}); await page.addScriptTag({content:bundle.outputFiles[0].text});
 const subject=page.locator("#radius-subject");
 await subject.locator("[data-morph-body]").waitFor({state:"attached"});
 const radius=()=>subject.locator("[data-morph-body]").evaluate(path=>Number(path.getAttribute("d").match(/^M([\d.]+) /)?.[1]));
 assert.equal(await radius(),8,"initial inherited corners reach the painter");
 const box=await subject.boundingBox();
 await page.evaluate(()=>window.renderFields("contour","0px"));
 await page.waitForTimeout(100);
 assert.equal((await subject.boundingBox()).width,box.width,"corner-only update keeps dimensions");
 assert.equal(await radius(),0,"changing inherited radius updates the existing painter without resizing");
 const search=page.locator('[data-form-example="input"] input[name="note"]');
 await search.fill("A draft worth preserving");
 for(const approach of ["editorial","inset","contour"]) {
  await page.evaluate(approach=>window.renderFields(approach,"20px"),approach);
  assert.equal(await search.inputValue(),"A draft worth preserving");
  const title=await search.getAttribute("id");
  assert.ok(await page.locator(`label[for="${title}"]`).count());
  const described=await search.getAttribute("aria-describedby");
  assert.ok(described && await page.locator(`[id="${described}"]`).count(),"help remains associated");
 }
 await page.locator('[data-form-example="input"] [data-slot="input-clear"]').click();
 assert.equal(await search.inputValue(),""); assert.equal(await search.evaluate(el=>document.activeElement===el),true);
 assert.equal(await page.locator('[data-form-example="input"] input:disabled').count(),1);
 const name=page.locator('[data-form-example="field"] input');
 await name.fill("ab"); await page.locator('[data-form-example="field"] button').click();
 assert.equal(await name.getAttribute("aria-invalid"),"true");
 assert.equal(await page.locator('[data-form-example="field"] [role="alert"]').count(),1);
 await name.fill("Personal space"); await page.locator('[data-form-example="field"] button').click();
 assert.equal(await name.getAttribute("aria-invalid"),null);
 const note=page.locator("textarea"); await note.fill("Line one\nLine two"); assert.equal(await note.inputValue(),"Line one\nLine two");
 for(const width of [390,1280]) for(const mode of ["light","dark"]) for(const approach of ["contour","editorial","inset"]) {
  await page.setViewportSize({width,height:1100});
  await page.evaluate(({mode,approach})=>{document.documentElement.dataset.mode=mode;window.renderFields(approach,"8px");},{mode,approach});
  await page.screenshot({path:`${output}/${approach}-${width}-${mode}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no horizontal overflow");
 }
 const docs=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:"reduce"});
 await docs.goto(`${origin}/cojeev-ui/docs/input/`,{waitUntil:"domcontentloaded"});
 await docs.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
 await docs.locator('[data-form-example="input"]').first().waitFor();
 const preview=docs.locator('.docs-playground [data-slot="preview"]').first();
 const liveInput=preview.locator('[data-example-role="interactive"] input[name="note"]');
 await liveInput.fill("Kept through appearance changes");
 for(const width of [390,1280]) for(const mode of ["light","dark"]) for(const approach of ["Contour","Editorial","Inset"]) {
  await docs.setViewportSize({width,height:1000}); await docs.evaluate(mode=>document.documentElement.dataset.mode=mode,mode);
  await preview.getByRole('combobox',{name:'Example approach'}).click();
  await docs.getByRole('option',{name:approach,exact:true}).click();
  assert.equal(await liveInput.inputValue(),"Kept through appearance changes");
  await docs.locator('[data-form-example="input"]').first().scrollIntoViewIfNeeded();
  await preview.locator('.v-preview__frame').screenshot({path:`${output}/docs-input-${approach.toLowerCase()}-${width}-${mode}.png`});
 }
 for(const route of ['field','input-group','textarea']) {
  await docs.goto(`${origin}/cojeev-ui/docs/${route}/`,{waitUntil:'domcontentloaded'});
  await docs.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
  const example=docs.locator('.docs-playground [data-example-role="interactive"]');
  await example.locator('.v-morph-live').first().waitFor({state:'attached'});
  const entry=example.locator('input,textarea').first(); await entry.fill('A preserved entry');
  await preview.getByRole('combobox',{name:'Example field surface'}).click(); await docs.getByRole('option',{name:'Inset',exact:true}).click();
  assert.equal(await entry.inputValue(),'A preserved entry',`${route} retains edits through cosmetic change`);
  await example.getByRole('button').last().click();
  assert.ok((await example.getByRole('status').innerText()).length>0,`${route} action provides local feedback`);
 }
 console.log("PASS inherited/live painted corners; native edits, clear/focus, labels/help, validation; twelve fixture and twelve real-docs approach/theme/width captures; all four real docs retain edits and actions");
} finally {await browser.close();}
