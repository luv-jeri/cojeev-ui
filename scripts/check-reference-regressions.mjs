import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";

const ids = ["typography-vortex", "particle-text", "warp-text", "variable-proximity", "falling-text", "scroll-reveal", "word-stream", "caret-swap", "zoom-words"];
const name = id => id.split("-").map(word => word[0].toUpperCase()+word.slice(1)).join("");
const fixture = `import React from "react"; import {createRoot} from "react-dom/client";
${ids.map(id => `import {${name(id)}} from "./registry/cojeev/ui/${id}";`).join("\n")}
import {PixelSwap} from "./registry/cojeev/ui/pixel-swap";
import {createFieldPainter} from "./registry/cojeev/lib/reference-field-paint";
window.fieldPainter=createFieldPainter; window.attachedRefs={}; window.cleanedRefs={};
function App(){const[active,setActive]=React.useState(false);return <>
${ids.map(id => `<${name(id)} ref={node=>{window.attachedRefs["${id}"]=node;return()=>{window.cleanedRefs["${id}"]=true;};}} text="Made of ideas" fromText="Old phrase" toText="New phrase" style={{width:558.875}}/>`).join("\n")}
<button id="swap" onClick={()=>setActive(v=>!v)}>Swap transparent scene</button><PixelSwap duration={180} active={active} first={<div style={{height:80,background:"red"}}>Old content</div>} second={<button>Transparent next scene</button>}/></>}
const root=createRoot(document.getElementById("root"));root.render(<App/>);window.unmount=()=>root.unmount();`;
const output = await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const checks = [];
try {
  await page.route("http://reference.test/**", route=>route.fulfill({contentType:"text/html",body:'<div id="root"></div>'}));
  await page.goto("http://reference.test/");
  await page.addStyleTag({ content: ':root{--v-text:#111;--v-beige:#f5f1e8;--v-pink:#f5b8db;--v-olive:#9aab63;--v-blue:#b6caeb;--v-yellow:#f5d867}*{box-sizing:border-box}' + (await Promise.all([...ids,"pixel-swap"].map(id => fs.readFile(`registry/cojeev/styles/${id}.css`, "utf8")))).join("\n") });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.waitForFunction(() => Object.keys(window.attachedRefs).length === 9);
  assert(await page.evaluate(() => Object.entries(window.attachedRefs).every(([id,node]) => node?.dataset.slot === id)));
  checks.push("all nine typography caller refs receive their actual roots");
  const particles = page.locator('[data-slot="particle-text"]'); await particles.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-slot="particle-text"]').dataset.ready === "true");
  await page.waitForTimeout(1950);
  const mask = await particles.locator("canvas").evaluate(canvas => ({ width: canvas.width, painted: canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((value,index) => index%4===3 && value>0) }));
  assert.equal(mask.width,559); assert(mask.painted);
  checks.push("fractional width produces nonempty particle text");
  await fs.mkdir("output/playwright/reference-effects-regressions",{recursive:true});
  await particles.screenshot({path:"output/playwright/reference-effects-regressions/particle-text-fractional.png"});
  for (const [key,value,event] of [["v-flow-v1",{variant:"off"},"v-flow"],["v-motion",{v:3,mode:"off"},"v-motion-change"]]) {
    await page.evaluate(({key,value,event})=>{localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event(event));},{key,value,event});
    await page.waitForTimeout(120); assert.equal(await particles.getAttribute("data-running"),"false");
    assert.equal(await particles.locator(".v-particle-text__words").evaluate(el=>getComputedStyle(el).opacity),"1");
    await page.evaluate(({key,event})=>{localStorage.removeItem(key);window.dispatchEvent(new Event(event));},{key,event});
    checks.push(`${key} stops optional paint and preserves readable text`);
  }
  await page.locator("#swap").click(); await page.waitForTimeout(450);
  assert.equal(await particles.getAttribute("data-running"),"false");
  checks.push("offscreen typography stops its optional runtime");
  const oldScene=page.locator(".v-pixel-swap__layer").first();
  assert.equal(await oldScene.evaluate(el=>getComputedStyle(el).visibility),"hidden");
  await page.locator("#swap").click(); await page.waitForTimeout(450);
  assert.equal(await oldScene.evaluate(el=>getComputedStyle(el).visibility),"visible");
  checks.push("transparent Pixel Swap content fully replaces and restores previous scene");
  const seams=await page.evaluate(async()=>{
    const canvas=document.createElement("canvas");canvas.width=320;canvas.height=320;const ctx=canvas.getContext("2d");
    const painter=window.fieldPainter("ripple-distortion",ctx,10);painter.resize(320,320);
    const image=new Image();image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#f5b8db"/></svg>');await image.decode();painter.images=[image];
    let minAlpha=255;for(let frame=0;frame<12;frame++){if(frame===1)painter.click({x:170,y:155});painter.draw(16,true);const data=ctx.getImageData(5,5,310,310).data;for(let i=3;i<data.length;i+=4)minAlpha=Math.min(minAlpha,data[i]);}return minAlpha;
  });
  assert.equal(seams,255);checks.push("resting and deformed ripple surfaces have no transparent triangle seams");
  await page.evaluate(()=>window.unmount());
  assert.equal(await page.evaluate(()=>Object.keys(window.cleanedRefs).length),9);
  checks.push("React 19 callback-ref cleanup reaches all nine callers");
  await fs.writeFile("verification/reference-regressions.json",JSON.stringify({passed:true,checks},null,2)+"\n");
  console.log(`PASS: ${checks.length} reference regressions`);
} finally { await browser.close(); }
