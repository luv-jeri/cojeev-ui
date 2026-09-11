import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
const output = 'output/playwright/round-11';
await mkdir(output, {recursive:true});
const browser = await chromium.launch();
try {
  for (const width of [1440,390]) for (const mode of ['light','dark']) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    await page.addInitScript(mode=>localStorage.setItem('cojeev-docs-theme',mode),mode);
    await page.goto(`${base}/docs/slider/`, {waitUntil:'domcontentloaded'});
    const canvas = page.locator('.docs-preview-stack');
    await page.waitForFunction(()=>document.querySelector('.report-launcher')?.disabled===false);
    await page.evaluate(()=>document.fonts.ready);
    const primary = canvas.locator('[data-example-role="interactive"]');
    const focus = primary.getByRole('slider',{name:'Focus duration',exact:true});
    await focus.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await focus.getAttribute('aria-valuenow'),'50');
    for (const variant of ['organic','line','segmented','range','vertical']) {
      const specimen = canvas.locator(`[data-example-role="gallery"][data-variant="${variant}"]`);
      assert.equal(await specimen.getByRole('slider').count(), variant==='range'?2:1, 'one focused specimen per variant');
      const thumb = specimen.getByRole('slider').first();
      await thumb.focus(); await page.keyboard.press(variant==='vertical'?'ArrowUp':'ArrowRight');
      assert.equal(await thumb.getAttribute('aria-valuenow'), {organic:'50',line:'50',segmented:'75',range:'21',vertical:'69'}[variant]);
      assert(await specimen.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'example fits its surface');
    }
    await page.mouse.move(0,0);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
    await canvas.screenshot({path:`${output}/slider-${width}-${mode}.png`});
    assert.deepEqual(errors,[],'no browser exceptions');
    await page.close();
  }
  console.log('PASS: all five slider examples, working keyboard values, bounded layouts and light/dark desktop/mobile captures.');
} finally { await browser.close(); }
