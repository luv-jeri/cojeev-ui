/** Focused local-dev choreography/quiet proof; no screenshots or build steps. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.BASE_URL??'http://127.0.0.1:4320/sahajiv-ui';
const output=path.resolve(process.env.OUTPUT_DIR??'output/playwright/review-assembly-redesign');
const browser=await chromium.launch(),results=[];
try{for(const theme of ['light','dark']){
 const page=await browser.newPage({viewport:{width:390,height:1050},colorScheme:theme});
 await page.addInitScript(theme=>{localStorage.setItem('sahajiv-docs-theme',theme);localStorage.removeItem('v-motion')},theme);
 await page.goto(base+'/');
 const a=page.locator('#assembly [data-slot=organism-assembly]');await a.waitFor();await a.scrollIntoViewIfNeeded();await page.waitForTimeout(120);
 const ready=kind=>page.waitForFunction(kind=>{const o=document.querySelector('#assembly [data-slot=organism-composition]');return o?.dataset.kind===kind&&o.dataset.settled==='true'&&o.dataset.assembled==='true'},kind);
 const choose=label=>a.getByRole('button',{name:label,exact:true}).click();
 const read=()=>a.locator('[data-assembly-part=avatar]').evaluate(node=>({x:parseFloat(node.style.left),y:parseFloat(node.style.top),width:parseFloat(node.style.width),opacity:parseFloat(getComputedStyle(node).getPropertyValue('--assembly-content-opacity')),inert:node.inert,released:node.dataset.assemblyReleased,clip:node.style.clipPath.slice(0,20),rotate:getComputedStyle(node).rotate,transform:node.style.transform}));
 const travel=[await read()];await a.getByRole('button',{name:'Assemble',exact:true}).click();
 for(const delay of [250,450,350,450]){await page.waitForTimeout(delay);travel.push(await read())}
 await ready('profile');travel.push(await read());
 assert(travel.some(part=>part.opacity>0&&part.opacity<1&&part.inert),'Content gradually appears while controls remain inert');
 assert(travel.some(part=>part.released==='false'&&Math.abs(part.width-travel[0].width)>1),'Native geometry changes before release');
 const start=travel[0],end=travel.at(-1);
 assert(travel.slice(1,-1).some(part=>Math.abs((part.x-start.x)*(end.y-start.y)-(part.y-start.y)*(end.x-start.x))>10),'Travel follows a curved path');
 const samples=[];
 for(const mode of ['off','reduced']){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{localStorage.setItem('v-motion',JSON.stringify({v:3,mode:'subtle'}));window.dispatchEvent(new Event('v-motion-change'))});
  await choose('Profile');await page.waitForTimeout(90);await a.getByRole('button',{name:'Replay assembly'}).click();await page.waitForTimeout(90);await page.evaluate(()=>{
   window.__assemblyEntrySamples=[];const node=document.querySelector('#assembly [data-assembly-part=identity]');
   window.__assemblyEntryObserver=new MutationObserver(()=>{if(node.dataset.assemblyReleased!=='true')window.__assemblyEntrySamples.push({revealing:node.dataset.assemblyRevealing,opacity:getComputedStyle(node.querySelector('.v-assembly-content')).opacity})});
   window.__assemblyEntryObserver.observe(node,{attributes:true,attributeFilter:['data-assembly-revealing']});
  });
  await choose('Chat');await page.waitForTimeout(70);
  const entry=await page.evaluate(()=>{window.__assemblyEntryObserver.disconnect();const node=document.querySelector('#assembly [data-assembly-part=identity]');return{samples:window.__assemblyEntrySamples,released:node.dataset.assemblyReleased,opacity:getComputedStyle(node.querySelector('.v-assembly-content')).opacity}});
  assert(entry.released==='true'||entry.opacity==='0'||entry.samples.some(sample=>sample.revealing==='false'&&sample.opacity==='0'),JSON.stringify(entry));
  await page.evaluate(mode=>{localStorage.setItem('v-motion',JSON.stringify({v:3,mode:mode==='off'?'off':'subtle'}));window.dispatchEvent(new Event('v-motion-change'))},mode);
  await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  for(const label of ['Chat','Profile']){
   await choose(label);await ready(label.toLowerCase());await page.waitForTimeout(120);
   for(const delay of [0,240,1000]){
    if(delay)await page.waitForTimeout(delay);
    const parts=await a.locator('[data-assembly-part]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.assemblyPart,clip:node.style.clipPath,motion:node.getAttribute('data-motion'),flow:node.getAttribute('data-flow'),released:node.dataset.assemblyReleased,rotate:getComputedStyle(node).rotate,transform:node.style.transform})));
    assert(parts.every(node=>node.clip===''&&node.motion===null&&node.flow===null&&(node.rotate===''||node.rotate==='none'||node.rotate==='0deg')&&(node.transform===''||node.transform==='none')),JSON.stringify({mode,label,delay,parts}));samples.push({mode,label,delay,parts});
   }
  }
 }
 results.push({theme,travel,samples});await page.close();
}fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'transition-interruption.json'),JSON.stringify({status:'pass',width:390,results},null,2));console.log(JSON.stringify({status:'pass',themes:results.map(x=>x.theme),quietSamples:results.reduce((sum,x)=>sum+x.samples.length,0)}));}
finally{await browser.close()}
