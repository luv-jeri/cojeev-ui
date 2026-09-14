import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch();
const base=process.env.POLISH_URL??'http://127.0.0.1:4320/cojeev-ui';
await mkdir('output/playwright/overhaul-workbench',{recursive:true});
try {
 for(const width of [390,760,1280]) for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write']});
  await page.addInitScript(mode=>localStorage.setItem('cojeev-docs-theme',mode),mode);
  await page.goto(`${base}/docs/slider/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
  assert.equal(await page.locator('html').getAttribute('data-mode'),mode,'Stored appearance must apply even while mobile navigation is closed');
  const preview=page.locator('.docs-playground [data-slot="preview"]').first();
  const thumb=preview.locator('[data-example-role="interactive"]').getByRole('slider').first();
  await thumb.focus();await thumb.press('End');
  const value=await thumb.getAttribute('aria-valuenow');
  await preview.getByRole('tab',{name:'Code',exact:true}).click();
  assert.equal(await thumb.isVisible(),false,'inactive specimen must not remain focusable/visible');
  await preview.getByRole('tab',{name:'Preview',exact:true}).click();
  assert.equal(await thumb.getAttribute('aria-valuenow'),value,'Switching to code must not throw away specimen values');
  const choice=preview.getByRole('combobox',{name:'Example approach'});
  await choice.click();await page.getByRole('option',{name:'Rubber',exact:true}).click();
  await preview.getByRole('tab',{name:'Code',exact:true}).click();
  assert.match(await preview.locator('pre code').innerText(),/variant="rubber"/,'Configured copy source must use selected approach');
  await preview.getByRole('tab',{name:'Preview',exact:true}).click();
  const toolbar=preview.locator('.v-preview__toolbar');
  const hitBoxes=await toolbar.evaluate(node=>{
   const host=node.getBoundingClientRect();
   return [...node.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent,x:r.x,y:r.y,left:r.left-host.left,right:r.right-host.right,top:r.top-host.top,bottom:r.bottom-host.bottom,width:r.width,height:r.height}});
  });
  for(const box of hitBoxes)assert.ok(box.left>=-1&&box.right<=1&&box.top>=-1&&box.bottom<=1,JSON.stringify({width,box}));
  for(let i=0;i<hitBoxes.length;i++)for(let j=i+1;j<hitBoxes.length;j++){
   const a=hitBoxes[i],b=hitBoxes[j];
   assert.ok(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<1||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<1,`Toolbar controls overlap at ${width}: ${a.label}, ${b.label}`);
  }
  if(width===390){
   const boxes=await preview.getByRole('group',{name:'Example tools'}).locator('button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height}}));
   assert.equal(boxes.length,3);
   assert.ok(Math.abs(boxes[0].y-boxes[1].y)<1&&Math.abs(boxes[1].y-boxes[2].y)<1,'Mobile tools need one aligned row, not a nested wrapping column');
   assert.ok(boxes.every(box=>box.height>=56),'Tool labels and icons need sufficient space');
  }
  assert.equal(await preview.getByRole('group',{name:'Example tools'}).count(),1);
  await preview.locator('.v-preview__frame').screenshot({path:`output/playwright/overhaul-workbench/${mode}-${width}.png`});
  // Verify the actual clipboard, and preserve a real draft through every cosmetic control.
  await page.goto(`${base}/docs/input/`,{waitUntil:'domcontentloaded'});
  const inputPreview=page.locator('.docs-playground [data-slot="preview"]').first();
  const example=inputPreview.locator('[data-example-role="interactive"]');
  const entry=example.locator('input[name="note"]');
  await entry.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
  await example.getByRole('button',{name:'Clear input',exact:true}).click();
  assert.equal(await entry.inputValue(),'','Example clear action confirms its own interactive mount');
  await entry.fill('A thought worth preserving');
  await inputPreview.getByRole('combobox',{name:'Example approach'}).click();
  await page.getByRole('option',{name:'Editorial',exact:true}).click();
  assert.equal(await inputPreview.getByRole('combobox',{name:'Example corners'}).count(),0,'The open editorial underline has no misleading corner control');
  for(const [name,value] of [['Approach','Inset'],['Size','Sm'],['Corners','Square']]){
   await inputPreview.getByRole('combobox',{name:`Example ${name.toLowerCase()}`}).click();
   await page.getByRole('option',{name:value,exact:true}).click();
   assert.equal(await entry.inputValue(),'A thought worth preserving',`${name} must not reset the draft`);
  }
  await inputPreview.getByRole('button',{name:'Background',exact:true}).click();
  await page.getByRole('dialog',{name:'Choose preview background'}).getByRole('button',{name:'Pollen',exact:true}).click();
  assert.equal(await entry.inputValue(),'A thought worth preserving');
  await inputPreview.getByRole('tab',{name:'Code',exact:true}).click();
  await inputPreview.getByRole('button',{name:'Copy code',exact:true}).click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(copied,/variant="inset"/);
  assert.match(copied,/size="sm"/);
  assert.match(copied,/--v-control-radius.*0px/);
  assert.ok(!copied.includes('A thought worth preserving'),'Copy is honest about serializing configuration, not inner draft data');
  await inputPreview.getByRole('tab',{name:'Preview',exact:true}).click();
  assert.equal(await entry.inputValue(),'A thought worth preserving');
  await inputPreview.getByRole('button',{name:'Reset example',exact:true}).click();
  assert.equal(await entry.inputValue(),'Morning ideas','Explicit Reset restarts the specimen');
  assert.equal(await inputPreview.getByRole('combobox',{name:'Example corners'}).innerText(),'Square','Reset retains chosen configuration');
  assert.equal(await inputPreview.locator('[data-preview-background="pollen"]').count(),1);
  await page.close();
 }
 console.log('PASS: six 390/760/1280 theme states, non-overlapping tools, retained drafts through view/settings/background, actual configured clipboard and explicit reset.');
} finally {await browser.close()}
