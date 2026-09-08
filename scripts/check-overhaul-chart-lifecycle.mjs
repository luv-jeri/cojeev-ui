import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...value]=arg.replace(/^--/,"").split("=");return [key,value.join("=")]}));
const base=args.url??"http://127.0.0.1:4320/sahajiv-ui",output=args.output??"output/playwright/overhaul-chart-lifecycle";
fs.mkdirSync(output,{recursive:true});
const fixture=await build({stdin:{sourcefile:"chart-lifecycle-fixture.tsx",loader:"tsx",resolveDir:process.cwd(),contents:`import React from "react";import {createRoot} from "react-dom/client";import {BarChart} from "./registry/sahajiv/ui/bar-chart";import {RadarChart} from "./registry/sahajiv/ui/radar-chart";import {AreaChart} from "./registry/sahajiv/ui/area-chart";import {setMotionMode} from "./registry/sahajiv/motion/settings";const points=[{label:"A",one:30,two:20},{label:"B",one:50,two:40},{label:"C",one:70,two:60},{label:"D",one:40,two:30},{label:"E",one:60,two:50}],series=[{key:"one",label:"One",color:"pink"},{key:"two",label:"Two",color:"blue"}];function Fixture(){const [count,setCount]=React.useState(5);React.useEffect(()=>{window.__chartSet=setCount;window.__chartMode=setMotionMode},[]);return <main style={{maxWidth:680,margin:"0 auto",padding:16}}><section data-case="bar"><BarChart caption="Bar membership" data={points.slice(0,count)} series={series} showTable={false}/></section><section data-case="radar"><RadarChart caption="Radar membership" data={points.slice(0,count)} series={series} showTable={false}/></section><section data-case="area"><AreaChart caption="Inspection lifecycle" data={points} series={series} showTable={false}/></section></main>}createRoot(document.getElementById("fixture")).render(<Fixture/>);`},bundle:true,write:false,format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent"});
const browser=await chromium.launch({headless:true}),results=[];
try{
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto(`${base}/docs/bar-chart/`);await page.locator('[data-slot="chart-svg"]').waitFor();
 const css=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.href));errors.length=0;
 await page.route("**/__chart-lifecycle",route=>route.fulfill({contentType:"text/html",body:`<!doctype html><html data-mode="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1">${css.map(href=>`<link rel="stylesheet" href="${href}">`).join("")}</head><body><div id="fixture"></div></body></html>`}));
 await page.goto(`${new URL(base).origin}/__chart-lifecycle`);await page.addScriptTag({content:fixture.outputFiles[0].text});await page.waitForFunction(()=>window.__chartSet);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);
 for(const mode of ["active","off","reduced"]){
  const record={width,mode};results.push(record);
  try{
   await page.emulateMedia({reducedMotion:mode==="reduced"?"reduce":"no-preference"});await page.evaluate(mode=>{window.__chartMode(mode==="off"?"off":"subtle");window.__chartSet(5)},mode);await page.waitForTimeout(500);
   const sample=await page.evaluate(async()=>{window.__chartSet(3);await new Promise(resolve=>setTimeout(resolve,35));return Object.fromEntries([['bar','rect[data-slot="chart-mark"]'],['radar','circle']].map(([id,selector])=>[id,[...document.querySelectorAll(`[data-case="${id}"] [data-slot="chart-svg"] ${selector}`)].map(node=>Number(getComputedStyle(node).opacity))]));});
   for(const id of ["bar","radar"]){assert.equal(sample[id].length,mode==="active"?10:6,`${id} retained membership in ${mode}`);if(mode==="active")assert(sample[id].some(opacity=>opacity>0&&opacity<.98),`${id} has an actual exit midpoint`);}
   await page.waitForTimeout(600);assert.equal(await page.locator('[data-case="bar"] rect[data-slot="chart-mark"]').count(),6);assert.equal(await page.locator('[data-case="radar"] [data-slot="chart-svg"] circle').count(),6);
   await page.evaluate(async()=>{window.__chartSet(5);await new Promise(resolve=>setTimeout(resolve,15));window.__chartSet(3);await new Promise(resolve=>setTimeout(resolve,15));window.__chartSet(5)});await page.waitForTimeout(600);assert.equal(await page.locator('[data-case="bar"] rect[data-slot="chart-mark"]').count(),10);assert.equal(await page.locator('[data-case="radar"] [data-slot="chart-svg"] circle').count(),10);
   const plot=page.locator('[data-case="area"] [data-slot="chart-svg"]');await plot.scrollIntoViewIfNeeded();await plot.focus();await page.waitForTimeout(350);
   const inspection=await plot.evaluate(async node=>{node.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(resolve=>setTimeout(resolve,35));return {crosshairs:node.querySelectorAll('.v-chart-crosshair').length,dots:node.querySelectorAll('circle').length,opacity:node.querySelector('.v-chart-crosshair')?Number(getComputedStyle(node.querySelector('.v-chart-crosshair')).opacity):null}});
   assert.equal(inspection.crosshairs,mode==="active"?1:0);assert.equal(inspection.dots,mode==="active"?2:0);if(mode==="active")assert(inspection.opacity>0&&inspection.opacity<1);await page.waitForTimeout(600);assert.equal(await plot.locator('.v-chart-crosshair,circle').count(),0);
   const invalid=await page.locator('svg path,svg circle,svg rect,svg line').evaluateAll(nodes=>nodes.flatMap(node=>[...node.attributes].filter(attr=>/^(d|r|width|height|cx|cy|x1|x2|y1|y2)$/.test(attr.name)&&(/undefined|NaN|Infinity/.test(attr.value)||/^(r|width|height)$/.test(attr.name)&&parseFloat(attr.value)<0)).map(attr=>`${node.tagName}.${attr.name}=${attr.value}`)));
   assert.deepEqual(invalid,[]);assert.deepEqual(errors,[]);record.status="pass";record.membership=sample;record.inspection=inspection;
  }catch(error){record.status="failed";record.error=error.message;}
 }
 await page.screenshot({path:path.join(output,`charts-${width}.png`),fullPage:true});await context.close();
}
}finally{await browser.close();fs.writeFileSync(path.join(output,"results.json"),JSON.stringify({base,scope:"Bar/radar membership and rapid reversal; crosshair/dot actual exits; active/Off/reduced at two widths",results},null,2));}
console.log(JSON.stringify(results.map(({width,mode,status,error})=>({width,mode,status,error}))));if(results.some(r=>r.status!=="pass"))process.exitCode=1;
