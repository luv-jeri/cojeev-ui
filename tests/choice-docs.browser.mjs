import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.DOCS_BASE_URL??'http://127.0.0.1:4320/cojeev-ui',output='output/playwright/choice-foundations';await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const routes=process.env.CHOICE_ROUTES?.split(',') ?? ['checkbox','radio-group','switch'];
try{const page=await browser.newPage({viewport:{width:1280,height:1000}});
for(const route of routes){
 await page.goto(`${base}/docs/${route}/`,{waitUntil:'domcontentloaded'});
 const preview=page.locator('.docs-playground [data-slot="preview"]').first();const example=preview.locator('[data-example-role="interactive"]');
 await example.locator('.v-choice-example').waitFor();
 if(route!=='switch') await example.locator('.v-morph-live').first().waitFor();
 await preview.locator('[data-slot="select-trigger"].v-morph-live').first().waitFor();
 const modes=route==='switch'?['Capsule','Rocker','Latch']:['Row','Card','Chip'];
 const choose=async mode=>{await preview.getByRole('combobox',{name:'Example approach'}).click();await page.getByRole('option',{name:mode,exact:true}).click();};
 for(const mode of modes){await choose(mode);const control=example.getByRole(route==='checkbox'?'checkbox':route==='switch'?'switch':'radio').first();await control.scrollIntoViewIfNeeded();const rect=await control.boundingBox();assert.ok(rect.height>=44,'minimum target height');await control.click();await control.press('Space');assert.deepEqual(await control.boundingBox(),rect,'pointer ownership stable');assert.ok((await example.getByRole('status').innerText()).length>10);}
 for(const width of [390,1280])for(const theme of ['light','dark'])for(const mode of modes){await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.dataset.mode=theme,theme);await choose(mode);await example.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(250);await example.screenshot({path:`${output}/${route}-${mode.toLowerCase()}-${width}-${theme}.png`});assert.ok(await example.evaluate(root=>{const box=root.getBoundingClientRect();return [...root.querySelectorAll('[role="checkbox"],[role="radio"],[role="switch"]')].every(e=>{const b=e.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.left>=box.left-1&&b.right<=box.right+1;});}),'controls fit their specimen');}
 await page.emulateMedia({reducedMotion:'reduce'});if(route==='switch'){await choose('Latch');const toggle=example.getByRole('switch');await toggle.click();assert.equal(await toggle.getAttribute('data-motion-quiet'),'true');assert.equal(await toggle.evaluate(e=>getComputedStyle(e.querySelector('[data-slot="switch-latch"] span')).transitionDuration),'0s');}await page.emulateMedia({reducedMotion:'no-preference'});
}
console.log(`PASS ${routes.length*12} real docs captures (${routes.join(', ')}): three approaches each, 390/1280 light/dark; interactive result, Space/pointer, 44px targets, stable bounds, quiet latch`);
}finally{await browser.close();}
