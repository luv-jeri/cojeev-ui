import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({configFile:'apps/gate/vite.config.ts'});await server.listen();
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:800,height:700},reducedMotion:'no-preference'});
const evidence=[];
try{
 await page.goto('http://127.0.0.1:4317/apps/gate/lifecycle.html');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800);
 const initial=await page.evaluate(()=>{const el=document.querySelector('button');window.__body=el.querySelector('svg.v-morph');return {focused:document.activeElement===el,d:window.__body.querySelector('path').getAttribute('d'),foreignTransition:getComputedStyle(document.getElementById('foreign')).transitionDuration}});
 assert.equal(initial.focused,true);assert.equal(initial.foreignTransition,'2s');
 const focused=await page.evaluate(()=>{for(let t=100016;t<=100800;t+=16)window.__lifecycle.clock(t);return window.__body.querySelector('path').getAttribute('d')});
 assert.notEqual(focused,initial.d,'Initially focused host must develop focus hold without another focus event');
 await page.evaluate(()=>window.__lifecycle.render());
 assert.equal(await page.evaluate(()=>document.querySelector('button svg.v-morph')===window.__body),true,'Ordinary rerender retains body identity');
 assert.equal(await page.evaluate(()=>window.__body.querySelector('path').getAttribute('d')),focused,'Rerender must retain focused spring geometry');
 const rect=await page.locator('button').boundingBox();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.5);await page.mouse.down();
 const held=await page.evaluate(()=>{for(let t=100816;t<=100960;t+=16)window.__lifecycle.clock(t);return {d:window.__body.querySelector('path').getAttribute('d'),transform:document.querySelector('button').style.transform}});
 await page.evaluate(()=>window.__lifecycle.render('Press us'));
 assert.equal(await page.evaluate(()=>document.querySelector('button svg.v-morph')===window.__body),true,'Text replacement repairs the same SVG');
 assert.deepEqual(await page.evaluate(()=>({d:window.__body.querySelector('path').getAttribute('d'),transform:document.querySelector('button').style.transform})),held,'Text rerender retains held spring');
 const retuned=await page.evaluate(()=>{window.__lifecycle.render('Press us','accent');return {transform:document.querySelector('button').style.transform,fill:document.querySelector('button').style.getPropertyValue('--mfill'),count:document.querySelectorAll('button svg.v-morph').length}});
 assert.equal(retuned.transform,held.transform,'Variant retune preserves held press depth');assert.equal(retuned.count,1);assert.notEqual(retuned.fill,'');
 await page.mouse.up();
 await page.evaluate(()=>{window.__lifecycle.render('Press us','outline');document.documentElement.dataset.mode='dark'});
 await page.waitForTimeout(0);
 const outline=await page.evaluate(()=>{const el=document.querySelector('button');return {fill:getComputedStyle(el.querySelector('svg.v-morph path')).fill,stroke:el.style.getPropertyValue('--mstroke'),count:el.querySelectorAll('svg.v-morph').length}});
 assert.equal(outline.fill,'none');assert.equal(outline.count,1);assert.notEqual(outline.stroke,'');
 const masks=await page.locator('[data-slot=card-watermark]').evaluateAll(els=>els.map(el=>{const cs=getComputedStyle(el);return {mask:cs.maskImage,background:cs.backgroundColor,width:el.getBoundingClientRect().width}}));
 assert.equal(masks.length,2);for(const mask of masks){assert.match(mask.mask,/data:image\/svg\+xml/);assert.notEqual(mask.background,'rgba(0, 0, 0, 0)');assert.ok(mask.width>0)}
 const detached=await page.evaluate(()=>{const el=document.querySelector('button'),svg=el.querySelector('svg.v-morph');window.__lifecycle.unmount();const d=svg.querySelector('path').getAttribute('d');el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));window.__lifecycle.clock(102000);return {counts:window.__lifecycle.counts(),svgRemoved:!el.contains(svg),unchanged:svg.querySelector('path').getAttribute('d')===d}});
 assert.equal(detached.counts.attached,detached.counts.cleaned,'StrictMode/external refs balance cleanup');assert.ok(detached.svgRemoved);assert.ok(detached.unchanged);
 evidence.push({verdict:'PASS',initialFocus:true,focusedRerender:true,pressedTextRerender:true,variantRetune:retuned,outline,foreignTransition:initial.foreignTransition,masks,unmount:detached});
 console.log('PASS lifecycle: initial focus, rerender during focus/press, text replacement, variant/theme retune, StrictMode/ref cleanup, unmount; scoped CSS and both watermark masks.');
}catch(error){evidence.push({verdict:'FAIL',message:error.message});process.exitCode=1;console.error(error)}
finally{fs.mkdirSync('artifacts/gate-lifecycle',{recursive:true});fs.writeFileSync('artifacts/gate-lifecycle/results.json',JSON.stringify(evidence,null,2));await browser.close();await server.close()}
