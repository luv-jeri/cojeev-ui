/** Local-dev native paint and pointer proof. No build or generated registry steps. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL??'http://127.0.0.1:4320/cojeev-ui';
const out=path.resolve(process.env.OUTPUT_DIR??'output/playwright/review-assembly-colour-flow');
const browser=await chromium.launch(),results=[];
try {
 for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width:390,height:1050},colorScheme:theme});
  await page.addInitScript(theme=>{localStorage.setItem('cojeev-docs-theme',theme);localStorage.setItem('v-motion',JSON.stringify({v:3,mode:'subtle'}));localStorage.setItem('v-flow-v1',JSON.stringify({variant:'glide'}))},theme);
  await page.goto(base+'/docs/organism-assembly/');const studio=page.locator('[data-example-role="interactive"] [data-slot=organism-assembly]');await studio.waitFor();await studio.scrollIntoViewIfNeeded();await page.waitForTimeout(180);
  const captures=[],pointers=[],quiet=[];results.push({theme,captures,pointers,quiet});
  const startCapture=()=>page.evaluate(()=>{
    window.__paintFrames=[];window.__paintStop=false;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');
    const rgba=color=>{context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);return Array.from(context.getImageData(0,0,1,1).data)};
    const frame=()=>{window.__paintFrames.push(Array.from(document.querySelectorAll('[data-example-role="interactive"] [data-assembly-part]'),node=>{
      const style=getComputedStyle(node),body=node.querySelector(':scope > svg.v-morph [data-morph-body]');
      const root=rgba(style.backgroundColor),nativeFill=body?rgba(getComputedStyle(body).fill):root;
      const pill=node.hasAttribute('data-glide-active')?node.parentElement.querySelector(':scope > .v-glide__pill'):null;
      let fill=root[3]?root:nativeFill;
      // A selected native control yields paint to the real Glide underneath it.
      // Compare that visible stack, including a host's last alpha-transition frames.
      if(pill&&Number(getComputedStyle(pill).opacity)>0){
       context.clearRect(0,0,1,1);context.globalAlpha=Number(getComputedStyle(pill).opacity);context.fillStyle=getComputedStyle(pill.firstElementChild).backgroundColor;context.fillRect(0,0,1,1);context.globalAlpha=1;
       context.fillStyle=`rgba(${fill[0]},${fill[1]},${fill[2]},${fill[3]/255})`;context.fillRect(0,0,1,1);fill=Array.from(context.getImageData(0,0,1,1).data);
      }
      return {id:node.dataset.assemblyPart,released:node.dataset.assemblyReleased,background:root,fill,ink:rgba(style.color),progress:style.getPropertyValue('--assembly-paint-progress')};
    }));if(!window.__paintStop)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  });
  const ready=kind=>page.waitForFunction(kind=>{const node=document.querySelector('[data-example-role="interactive"] [data-slot=organism-composition]');return node?.dataset.kind===kind&&node.dataset.settled==='true'&&node.dataset.assembled==='true'},kind);
  const finishCapture=async(label,kind)=>{
   await ready(kind);await page.waitForTimeout(180);
   const frames=await page.evaluate(()=>{window.__paintStop=true;return window.__paintFrames});
   const handoffs=[];
   for(const final of frames.at(-1)??[]){
    const samples=frames.map(frame=>frame.find(part=>part.id===final.id)).filter(Boolean),index=samples.findLastIndex((part,i)=>i>0&&part.released==='true'&&samples[i-1].released==='false');
    if(index<0)continue;
    const before=samples[index-1],after=samples[index];
    handoffs.push({id:final.id,before,after,final,maxJump:Math.max(...before.fill.map((channel,i)=>Math.abs(channel-after.fill[i]))),steadyJump:Math.max(...before.fill.map((channel,i)=>Math.abs(channel-final.fill[i]))),distinct:new Set(samples.filter(part=>part.released==='false').map(part=>part.fill.join(','))).size});
   }
   captures.push({label,kind,handoffs});
  };
  const pulse=async(control,kind)=>{
   const recording=control.evaluate(node=>new Promise(resolve=>{const samples=[],end=performance.now()+420;const read=()=>{samples.push({scale:getComputedStyle(node).scale,pressed:node.getAttribute('aria-pressed'),disabled:node.matches(':disabled'),inert:node.inert});if(performance.now()<end)requestAnimationFrame(read);else resolve(samples)};requestAnimationFrame(read)}));
   await control.click();const samples=await recording;pointers.push({kind,samples});
   assert(samples.some(sample=>{const n=parseFloat(sample.scale);return n>0&&n<.999}),`${kind} native control has shared release feedback`);
  };
  for(const [label,kind] of [['Profile','profile'],['Panel','side-panel'],['Dock','dock'],['Chat','chat'],['Focus','focus'],['Invite','invite']]){
   await startCapture();
   await studio.getByRole('button',{name:label,exact:true}).click();
   await finishCapture(label,kind);
   if(kind==='profile'){await pulse(studio.locator('[data-assembly-part=primary]'),kind);assert.equal(await studio.locator('[data-assembly-part=primary]').getAttribute('aria-pressed'),'true')}
   if(kind==='side-panel'){const control=studio.locator('[data-assembly-part=task-0]'),pressed=await control.getAttribute('aria-pressed');await pulse(control,kind);assert.notEqual(await control.getAttribute('aria-pressed'),pressed)}
   if(kind==='dock'){
    const group=studio.locator('[data-slot=organism-composition]'),pill=group.locator(':scope > .v-glide__pill');
    const before=await pill.evaluate(node=>getComputedStyle(node).transform);
    await studio.locator('[data-assembly-part=tool-1]').click();await page.waitForTimeout(60);
    const middle=await pill.evaluate(node=>getComputedStyle(node).transform);await page.waitForTimeout(420);
    const end=await pill.evaluate(node=>({transform:getComputedStyle(node).transform,z:getComputedStyle(node).zIndex,fill:getComputedStyle(node.firstElementChild).backgroundColor}));
    assert.notEqual(before,end.transform);assert.notEqual(middle,before);assert.equal(end.z,'1');assert.equal(await studio.locator('[data-assembly-part=tool-1]').getAttribute('aria-pressed'),'true');pointers.push({kind,before,middle,end});
   }
   if(kind==='chat'){await studio.getByRole('textbox',{name:'Your message'}).fill('A small local note.');await studio.getByRole('button',{name:'Send message',exact:true}).click();await studio.getByText('A small local note.',{exact:false}).waitFor();pointers.push({kind,sent:true,disabled:await studio.getByRole('button',{name:'Send message',exact:true}).isDisabled()})}
   if(kind==='focus'){await pulse(studio.locator('[data-assembly-part=primary]'),kind);assert.match(await studio.locator('[data-assembly-part=primary]').innerText(),/Pause/);await studio.locator('[data-assembly-part=primary]').click()}
   if(kind==='invite'){await pulse(studio.locator('[data-assembly-part=primary]'),kind);assert.equal(await studio.locator('[data-assembly-part=primary]').getAttribute('aria-pressed'),'true')}
  }
  // The chooser is a real travelling selection, including the two-row narrow arrangement.
  const choices=studio.locator('.v-organism-assembly__choices'),selection=choices.locator(':scope > .v-glide__pill');
  const before=await selection.evaluate(node=>getComputedStyle(node).transform);
  await studio.getByRole('button',{name:'Profile',exact:true}).click();await page.waitForTimeout(70);
  const middle=await selection.evaluate(node=>getComputedStyle(node).transform);await page.waitForTimeout(400);
  const end=await selection.evaluate(node=>({transform:getComputedStyle(node).transform,fill:getComputedStyle(node.firstElementChild).backgroundColor}));
  assert.notEqual(before,end.transform);assert.notEqual(middle,before);pointers.push({kind:'chooser',before,middle,end});
  await ready('profile');
  await page.setViewportSize({width:320,height:1050});await page.waitForTimeout(250);
  assert(await choices.evaluate(node=>Array.from(node.querySelectorAll('button')).every(child=>{const r=child.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth})), 'All six choices fit at320');
  fs.mkdirSync(out,{recursive:true});await choices.screenshot({path:path.join(out,`chooser-320-${theme}.png`)});
  await page.setViewportSize({width:390,height:1050});await page.waitForTimeout(200);
  await startCapture();await studio.getByRole('button',{name:'Replay assembly'}).click();await page.waitForTimeout(120);await studio.getByRole('button',{name:'Chat',exact:true}).click();await page.waitForTimeout(220);
  await page.evaluate(()=>{document.documentElement.dataset.mode=document.documentElement.dataset.mode==='dark'?'light':'dark'});await page.waitForTimeout(170);
  await page.evaluate(()=>{localStorage.setItem('cojeev-appearance',JSON.stringify({palette:'tide',contrast:60}));window.dispatchEvent(new StorageEvent('storage',{key:'cojeev-appearance'}))});
  await finishCapture('Rapid replay / theme / palette','chat');
  for(const mode of ['off','reduced']){
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{localStorage.setItem('v-motion',JSON.stringify({v:3,mode:'subtle'}));window.dispatchEvent(new Event('v-motion-change'))});
   await studio.getByRole('button',{name:'Profile',exact:true}).click();await page.waitForTimeout(120);await studio.getByRole('button',{name:'Chat',exact:true}).click();await page.waitForTimeout(100);
   if(mode==='off')await page.evaluate(()=>{localStorage.setItem('v-motion',JSON.stringify({v:3,mode:'off'}));window.dispatchEvent(new Event('v-motion-change'))});
   else await page.emulateMedia({reducedMotion:'reduce'});
   await ready('chat');
   for(const delay of [0,260,900]){
    if(delay)await page.waitForTimeout(delay);
    const parts=await studio.locator('[data-assembly-part]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.assemblyPart,clip:node.style.clipPath,flow:node.getAttribute('data-flow'),motion:node.getAttribute('data-motion'),progress:getComputedStyle(node).getPropertyValue('--assembly-paint-progress'),background:getComputedStyle(node).backgroundColor})));
    assert(parts.every(part=>part.clip===''&&part.flow===null&&part.motion===null&&part.progress==='1'));quiet.push({mode,delay,parts});
   }
  }
  await page.close();
 }
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'paint.json'),JSON.stringify(results,null,2));
 const worst=results.flatMap(result=>result.captures.flatMap(capture=>capture.handoffs.map(part=>({theme:result.theme,kind:capture.kind,id:part.id,jump:part.maxJump,steadyJump:part.steadyJump,inkJump:Math.max(...part.before.ink.map((channel,i)=>Math.abs(channel-part.after.ink[i]))),distinct:part.distinct})))).sort((a,b)=>Math.max(b.jump,b.steadyJump)-Math.max(a.jump,a.steadyJump));
 console.log(JSON.stringify({handoffs:worst.length,pointerWorkflows:results.reduce((count,result)=>count+result.pointers.length,0),quietSamples:results.reduce((count,result)=>count+result.quiet.length,0),worst:worst.slice(0,6)},null,2));
 if(!process.env.BASELINE)assert(worst.every(part=>part.jump<=12&&part.steadyJump<=12&&part.inkJump<=12),'Paint should converge before native release and keep its endpoint');
}finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'paint.json'),JSON.stringify(results,null,2));await browser.close()}
