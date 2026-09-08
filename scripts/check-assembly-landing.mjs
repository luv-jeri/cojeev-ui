/** Local-dev landing proof. Run once with the coordinated screenshot batch; never builds or starts a server. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL??'http://127.0.0.1:4320/sahajiv-ui';
const output=path.resolve(process.env.OUTPUT_DIR??'output/playwright/review-assembly-redesign');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch(),results={checks:[],errors:[]};
try{
 for(const width of [360,390,1440].filter(width=>!process.env.WIDTH||width===Number(process.env.WIDTH)))for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1050},colorScheme:theme});
  await context.addInitScript(theme=>{localStorage.setItem('sahajiv-docs-theme',theme);localStorage.removeItem('v-motion');localStorage.removeItem('v-flow-v1')},theme);
  const page=await context.newPage();page.on('pageerror',error=>results.errors.push(error.message));
  await page.goto(base+'/');
  const assembly=page.locator('#assembly [data-slot="organism-assembly"]'),organism=assembly.locator('[data-slot="organism-composition"]');
  await assembly.waitFor();await assembly.scrollIntoViewIfNeeded();
  const ready=async kind=>{await page.waitForFunction(kind=>{const node=document.querySelector('#assembly [data-slot="organism-composition"]');return node?.getAttribute('data-kind')===kind&&node.getAttribute('data-settled')==='true'&&node.getAttribute('data-assembled')==='true'},kind);await page.waitForTimeout(120)};
  const shot=label=>page.locator('#assembly').screenshot({path:path.join(output,`${width}-${theme}-${label}.png`)});
  const part=id=>organism.locator(`[data-assembly-part="${id}"]`);
  const release=async()=>{
   const evidence=await organism.locator('[data-assembly-part]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.assemblyPart,slot:node.dataset.slot,clip:node.style.clipPath,motion:node.getAttribute('data-motion'),flow:node.getAttribute('data-flow'),left:node.style.left,inert:node.inert})));
   assert(evidence.every(node=>node.clip===''&&node.motion===null&&node.flow===null),JSON.stringify(evidence.map(node=>({...node,clip:node.clip.slice(0,60)}))));return evidence;
  };
  await shot('floating');
  await assembly.getByRole('button',{name:'Assemble',exact:true}).click();
  await page.waitForTimeout(250);
  const travelling=await part('primary').evaluate(node=>({clip:node.style.clipPath,inert:node.inert}));
  assert(travelling.clip.startsWith('polygon(')&&travelling.inert);
  await shot('travelling');await ready('profile');
  const native={profile:await release()};await shot('profile');
  await part('primary').focus();await part('primary').press('Enter');assert.equal(await part('primary').getAttribute('aria-pressed'),'true');
  await part('secondary').click();await ready('profile');
  const input=organism.getByRole('textbox',{name:'Write a note'});await input.fill('A little hello.');await input.press('Enter');assert.equal(await input.inputValue(),'');
  await page.evaluate(()=>{window.__assemblyProfileRoots=[...document.querySelectorAll('#assembly [data-assembly-part]')]});
  await assembly.getByRole('button',{name:'Replay assembly'}).click();await page.waitForTimeout(150);assert(await part('primary').evaluate(node=>node.inert));
  await ready('profile');
  assert(await page.evaluate(()=>window.__assemblyProfileRoots.every((node,index)=>node===document.querySelectorAll('#assembly [data-assembly-part]')[index])),'Replay retains native roots');
  assert.equal(await part('primary').getAttribute('aria-pressed'),'true');
  async function choose(label,kind){await assembly.getByRole('button',{name:label,exact:true}).click();await ready(kind)}
  await choose('Panel','side-panel');await part('task-1').click();await part('task-2').focus();await part('task-2').press('Enter');assert.equal(await organism.getByRole('progressbar').getAttribute('aria-valuenow'),'100');native.panel=await release();await shot('panel');
  await choose('Dock','dock');await organism.getByRole('button',{name:'Files',exact:true}).click();assert.equal(await organism.getByRole('button',{name:'Files',exact:true}).getAttribute('aria-pressed'),'true');native.dock=await release();await shot('dock');
  await assembly.getByRole('button',{name:'Dock',exact:true}).focus();await page.keyboard.press('ArrowRight');await ready('chat');
  assert(await organism.locator('[data-slot="bubble-content"]').count()>=3);
  await organism.getByRole('textbox',{name:'Your message'}).fill('One more useful thought.');await organism.getByRole('button',{name:'Send message'}).click();await organism.getByText('One more useful thought.',{exact:true}).waitFor();native.chat=await release();await shot('chat');
  await organism.getByRole('button',{name:'Clear conversation'}).click();await organism.getByText('Room for a fresh thought.').waitFor();
  await assembly.getByRole('button',{name:'Profile',exact:true}).click();await page.waitForTimeout(90);await assembly.getByRole('button',{name:'Replay assembly'}).click();await page.waitForTimeout(90);await choose('Chat','chat');await page.waitForTimeout(1100);assert.equal(await organism.getAttribute('data-kind'),'chat');
  const quiet=[];
  for(const mode of ['off','reduced']){
   await page.evaluate(mode=>{localStorage.setItem('v-motion',JSON.stringify({v:3,mode:mode==='off'?'off':'subtle'}));window.dispatchEvent(new Event('v-motion-change'))},mode);
   await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});await choose('Profile','profile');
   assert(await assembly.getByRole('button',{name:'Replay assembly'}).isDisabled());assert.equal(await part('primary').evaluate(node=>node.inert),false);await release();quiet.push(mode);
  }
  const bounds=await assembly.evaluate(root=>({width:root.clientWidth,scroll:root.scrollWidth,pageWidth:document.documentElement.clientWidth,pageScroll:document.documentElement.scrollWidth}));
  assert(bounds.scroll<=bounds.width+1);assert(bounds.pageScroll<=bounds.pageWidth+1);
  results.checks.push({width,theme,travelling,native,replayIdentity:true,keyboard:true,rapidReversal:true,quiet,bounds});await context.close();
 }
 assert.equal(results.errors.length,0);results.status='pass';
}catch(error){results.status='failed';results.error=error.stack;throw error}
finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');await browser.close()}
console.log(JSON.stringify({status:results.status,contexts:results.checks.length,errors:results.errors}));
