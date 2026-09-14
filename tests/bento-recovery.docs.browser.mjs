import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBento,resizeBentoSeam} from '../registry/cojeev/lib/bento-layout.ts';
const base=process.env.POLISH_URL??'http://127.0.0.1:4321/cojeev-ui',out='output/playwright/bento-recovery';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000},permissions:['clipboard-read','clipboard-write']});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/docs/aspect-ratio/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);await page.getByRole('heading',{name:'Bento Grid',exact:true,level:1}).waitFor();assert.equal(await page.locator('link[rel=canonical]').getAttribute('href')?.then(x=>x.endsWith('/docs/bento-grid/')),true);
 await page.goto(base+'/docs/bento-grid/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);await page.addStyleTag({content:'.report-launcher,nextjs-portal{visibility:hidden!important}'});
 const editor=page.locator('.docs-playground [data-slot=bento-builder]'),board=editor.locator('.v-bento-builder__board');
 const typography=await editor.locator('.v-bento-builder__tile').evaluateAll(items=>items.map(e=>({width:e.getBoundingClientRect().width,font:parseFloat(getComputedStyle(e.querySelector('.v-bento__label')).fontSize)})).sort((a,b)=>a.width-b.width));
 assert.ok(typography[0].font<typography.at(-1).font,'narrow pieces use their own readable type scale, not the whole-board size');
 for(const mode of ['Classic','Interlock']){
  await page.getByRole('button',{name:'Reset example',exact:true}).click();await editor.getByRole('button',{name:mode,exact:true}).click();const original=generateBento();
  let candidate;for(const tile of original.tiles)for(const side of ['right','bottom','left','top'])for(const delta of [1,-1]){const vertical=['right','left'].includes(side);const coordinate=vertical?tile.x+(side==='right'?tile.width:0):tile.y+(side==='bottom'?tile.height:0);const edit=resizeBentoSeam(original,tile.id,side,coordinate+delta);if(!edit.error&&!candidate)candidate={tile,side,position:coordinate+delta,edit,vertical};}
  assert.ok(candidate);await editor.getByRole('button',{name:`Select ${candidate.tile.label}`,exact:true}).click();const handle=editor.getByRole('button',{name:`Resize ${candidate.side} seam`,exact:true});await handle.scrollIntoViewIfNeeded();
  const hb=await handle.boundingBox(),bb=await board.boundingBox();const point={x:candidate.vertical?bb.x+bb.width*candidate.position/original.columns:hb.x+hb.width/2,y:candidate.vertical?hb.y+hb.height/2:bb.y+bb.height*candidate.position/original.rows};
  await board.evaluate(e=>{window.bentoFrameTrace=[];window.bentoTraceActive=true;const observe=()=>{window.bentoFrameTrace.push([...e.querySelectorAll('[data-bento-tile]')].map(t=>({id:t.dataset.bentoTile,w:t.getBoundingClientRect().width,h:t.getBoundingClientRect().height,opacity:getComputedStyle(t).opacity})));if(window.bentoTraceActive)requestAnimationFrame(observe)};requestAnimationFrame(observe)});
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(point.x,point.y,{steps:10});
  const expected=candidate.edit.layout.tiles.find(t=>t.id===candidate.tile.id),tile=editor.locator(`[data-bento-tile="${expected.id}"]`);
  assert.deepEqual(await tile.evaluate(e=>[e.style.gridColumn,e.style.gridRow]),[`${expected.x+1} / span ${expected.width}`,`${expected.y+1} / span ${expected.height}`],'valid cell is visible during drag, not delayed until release');
  await page.mouse.up();const trace=await page.evaluate(()=>{window.bentoTraceActive=false;return window.bentoFrameTrace});assert.ok(trace.length>3);assert.ok(trace.every(frame=>frame.length===original.tiles.length&&frame.every(t=>t.w>0&&t.h>0&&t.opacity==='1')),'tiles never disappear/fade while changing size');
  await editor.getByRole('button',{name:'Copy layout',exact:true}).click();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,new RegExp(`variant="${mode.toLowerCase()}"`));assert.ok(copied.includes(expected.label));
  await editor.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await tile.evaluate(e=>[e.style.gridColumn,e.style.gridRow]),[`${candidate.tile.x+1} / span ${candidate.tile.width}`,`${candidate.tile.y+1} / span ${candidate.tile.height}`]);
  for(const width of [1280,390])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.mode=t,theme);await editor.locator('.v-bento-builder__heading').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${out}/${mode.toLowerCase()}-${width}-${theme}.png`});}
  await page.setViewportSize({width:1280,height:1000});
 }
 assert.deepEqual(errors,[]);console.log('PASS Bento canonical compatibility route, native live resize before release, visible consecutive frames, exact copy, Undo and8 responsive/theme captures');
}finally{await browser.close()}
