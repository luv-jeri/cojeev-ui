import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const url=process.argv[2]||'http://127.0.0.1:4347/';
const browser=await chromium.launch({channel:'chrome'});
const errors=[],checks=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const start=Date.now();
try {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 let release;const gate=new Promise(resolve=>{release=resolve;});
 let requested;const loaded=new Promise(resolve=>{requested=resolve;});
 await page.route('**/assets/bond-demo-*.js',async route=>{requested();await gate;await route.continue();});
 await page.goto(url,{waitUntil:'domcontentloaded'});await loaded;
 const input=page.getByRole('textbox',{name:'Your prompt'});
 await input.fill('Keep this exact early thought.');await input.press('Enter');release();
 await page.waitForFunction(()=>Number(document.querySelector('.prompt-story')?.dataset.beat)>=1);
 check('early Enter retains the exact typed prompt through hydration',await page.locator('.prompt-story').textContent().then(t=>t.includes('Keep this exact early thought.')));
 await page.close();
 for (const mode of ['light','dark']) {
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,colorScheme:mode});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.locator('.v-shader-background canvas').waitFor();
  check(mode+' background canvas mounts',await p.locator('.v-shader-background canvas').count()===1);
  check(mode+' phone uses compact lanes',await p.locator('.prompt-story').getAttribute('data-compact')==='true');
  check(mode+' phone has no horizontal scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.getByRole('button',{name:/what.s coming/i}).click();
  await p.locator('[role=dialog]').waitFor();
  check(mode+' feature drawer opens',await p.locator('[role=dialog]').isVisible());
  await p.close();
 }
 const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{delete HTMLCanvasElement.prototype.transferControlToOffscreen;});
 await p.goto(url);await p.locator('.v-shader-background canvas').waitFor();
 check('unsupported OffscreenCanvas uses the original scene',await p.locator('.v-shader-background [data-renderer=worker]').count()===0);
 await p.close();
 check('no browser errors',errors.length===0);
} finally {await browser.close();writeFileSync(new URL('../verification/publication-browser-checks.json',import.meta.url),JSON.stringify({url,checks,errors,seconds:(Date.now()-start)/1000},null,2)+'\n');}
console.log(checks.join('\n'));
