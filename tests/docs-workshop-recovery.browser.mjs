import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.POLISH_URL??'http://127.0.0.1:4321/cojeev-ui';
const out='output/playwright/docs-workshop-recovery';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/docs/','/requests/']) {
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
    const surface=page.locator(route==='/docs/'?'[data-setup-workbench]':'[data-request-workshop]');
    assert.equal(await surface.count(),1,'deliberate workshop layout is present on '+route);
    if(route==='/docs/') {
      assert.equal(await surface.locator('[data-setup-step]').count(),4);
      assert.equal(await surface.getByRole('link',{name:/Shape studio/}).count(),1);
      assert.equal(await surface.getByRole('link',{name:/Icon library/}).count(),1);
      assert.equal(await surface.getByRole('link',{name:/Bento studio/}).count(),1);
      assert.equal(await surface.getByRole('link',{name:/Request board/}).count(),1);
      assert.match(await surface.innerText(),/Reduced motion takes priority/);
      const copy=surface.locator('[data-setup-step]').first().getByRole('button',{name:/Copy/}).first();
      await copy.click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/shadcn@latest init/);
    } else {
      assert.equal(await surface.getByRole('heading',{name:'The board is being connected.'}).count(),1);
      await surface.getByRole('button',{name:'Prepare a request',exact:true}).click();
      const dialog=page.getByRole('dialog').first();await dialog.waitFor();
      await dialog.getByLabel('Component title',{exact:true}).fill('A useful workshop idea');
      await dialog.getByLabel('Details, inspiration & links',{exact:true}).fill('A local preview of the complete request journey.');
      await dialog.getByLabel('Your email',{exact:true}).fill('local-check@example.com');
      await dialog.getByRole('button',{name:'Review request',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:/Send request/}).isEnabled(),false,'no pretend connected submission');
      await page.keyboard.press('Escape');
    }
    for(const width of [1280,390]) for(const mode of ['light','dark']) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(m=>document.documentElement.dataset.mode=m,mode);
      await page.evaluate(()=>window.scrollTo(0,0));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal page overflow');
      assert.equal(await surface.locator('a,button,input').evaluateAll(items=>items.every(e=>{const b=e.getBoundingClientRect();return !b.width || (b.left>=-1&&b.right<=innerWidth+1)})),true,'native action bounds stay inside the viewport');
      await page.screenshot({path:`${out}/${route.split('/')[1]}-${width}-${mode}.png`,fullPage:true});
    }
    await page.setViewportSize({width:1280,height:1000});
  }
  assert.deepEqual(errors,[]);console.log('PASS setup commands/studio doors; request workshop honest offline action;8 responsive-theme captures');
} finally {await browser.close();}
