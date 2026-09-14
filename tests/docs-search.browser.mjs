import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
await mkdir('output/playwright/docs-search',{recursive:true});
const browser=await chromium.launch();
try {
 for(const width of [390,1280])for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.addInitScript(mode=>{localStorage.setItem('cojeev-docs-theme',mode);localStorage.setItem('cojeev-docs-navigation','collapsed')},mode);
  await page.goto(`${process.env.POLISH_URL ?? 'http://127.0.0.1:4321/cojeev-ui'}/docs/`,{waitUntil:'domcontentloaded'});
  await page.locator('.report-launcher:not(:disabled)').waitFor();
  if(width===390)await page.getByRole('button',{name:'Browse',exact:true}).click();
  const nav=page.locator('#docs-navigation');
  assert.equal(await nav.getByRole('link',{name:'Work with me',exact:true}).count(),1,'Work invitation remains reachable in compact navigation');
  assert.equal(await nav.getByRole('link',{name:'GitHub',exact:true}).count(),1);
  assert.equal(await page.getByText('Components for everyday work.',{exact:true}).count(),0);
  await nav.getByRole('button',{name:'Search components',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Explore Cojeev UI',exact:true});
  await dialog.waitFor();
  assert.equal(await dialog.locator('[data-slot="command"]').count(),1);
  const input=dialog.getByRole('combobox',{name:'Search documentation',exact:true});
  await input.fill('rubber');
  await dialog.getByRole('option').filter({hasText:'Slider'}).first().waitFor();
  assert.equal(await page.locator('html').getAttribute('data-mode'),mode);
  await dialog.screenshot({path:`output/playwright/docs-search/${mode}-${width}.png`});
  const b=await dialog.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=901);
  await input.press('Escape');await dialog.waitFor({state:'hidden'});
  if(width>900)assert.equal(await page.locator('.docs-shell').first().getAttribute('data-navigation'),'collapsed');
  await page.keyboard.press('Control+k');await dialog.waitFor();
  assert.equal(await input.inputValue(),'rubber','Search persists independently of sidebar presentation');
  await input.fill('zzqnotacomponentzzq');
  await dialog.getByText('No matches yet.',{exact:true}).waitFor();
  await input.fill('rubber');await dialog.getByRole('option').filter({hasText:'Slider'}).first().waitFor();
  await input.press('ArrowDown');await input.press('Enter');
  await page.waitForURL('**/docs/slider/');await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.id==='docs-main');
  await page.close();
 }
 console.log('PASS: Fumadocs-backed Command search, persistent invitations/query, responsive themes, keyboard navigation and focus return.');
}finally{await browser.close()}
