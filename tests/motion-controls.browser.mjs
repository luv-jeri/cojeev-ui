import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem('v-flow-v1', JSON.stringify({variant:'off',hover:true,hoverStrength:0,speed:1,intensity:1})));
  await page.goto(`${base}/docs/slider/`, {waitUntil:'domcontentloaded'});
  // The server-rendered button exists before its client click handler is ready.
  await page.locator('button.v-morph-live').filter({hasText:'Motion settings'}).first().waitFor();
  await page.getByRole('button',{name:'Motion settings',exact:true}).first().click();
  const dialog = page.getByRole('dialog');
  const enabled = dialog.getByRole('switch',{name:'Enable motion',exact:true});
  assert.equal(await enabled.getAttribute('aria-checked'), 'false', 'Enable motion must reflect saved Flow Off, not just the global mode');
  await enabled.click();
  await page.waitForFunction(() => document.documentElement.dataset.flow === 'glide');
  const strength = dialog.getByRole('slider',{name:'Pointer preview strength',exact:true});
  assert.equal(await strength.getAttribute('aria-valuenow'),'0','zero saved strength is visible and editable');
  await strength.focus();
  await page.keyboard.press('End');
  assert(Number(await strength.getAttribute('aria-valuenow')) > 0, 'ghost strength can be restored');
  const list = dialog.getByRole('tablist',{name:'Motion preview',exact:true});
  await list.getByRole('tab',{name:'Activity',exact:true}).hover();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.v-motion-controls .v-glide__hover')).opacity) > 0);
  const ghost = await list.locator('.v-glide__hover').boundingBox();
  assert(ghost.width > 30 && ghost.height > 10, 'pointer ghost has visible geometry');
  const before = await list.getByRole('tab',{selected:true}).innerText();
  await page.evaluate(() => {
    window.glideSamples = [];
    const group = document.querySelector('.v-motion-controls [role=tablist]');
    let frames = 0;
    function sample() {
      const layer = group.querySelector('.v-glide__pill');
      window.glideSamples.push(layer.getBoundingClientRect().x);
      if (++frames < 70) requestAnimationFrame(sample);
    }
    sample();
  });
  await dialog.getByRole('button',{name:'Replay selection motion',exact:true}).click();
  await page.waitForFunction(previous => document.querySelector('.v-motion-controls [role=tab][aria-selected=true]').textContent !== previous, before);
  await page.waitForFunction(() => window.glideSamples.length === 70);
  const glide = await page.evaluate(() => window.glideSamples);
  const start = glide[0], finish = glide.at(-1);
  assert(Math.abs(start-finish)>40 && glide.some(x=>x>Math.min(start,finish)+5 && x<Math.max(start,finish)-5), 'Glide visibly travels between choices rather than teleporting');
  await dialog.getByRole('button',{name:'Ink drop',exact:true}).click();
  await page.evaluate(() => {
    window.motionSamples = [];
    const list = document.querySelector('.v-motion-controls [role=tablist]');
    let frames = 0;
    function sample() {
      const layer = list.querySelector('.v-glide__pill');
      window.motionSamples.push({phase:layer.className,width:layer.getBoundingClientRect().width});
      if (++frames < 100) requestAnimationFrame(sample);
    }
    sample();
  });
  await dialog.getByRole('button',{name:'Replay selection motion',exact:true}).click();
  await page.waitForFunction(() => window.motionSamples.length === 100);
  const frames = await page.evaluate(() => window.motionSamples);
  assert(frames.some(frame => frame.phase.includes('-gather')), 'Ink Drop gathers before travel');
  assert(frames.some(frame => frame.phase.includes('-shoot')), 'Ink Drop travels as a gathered mark');
  assert(Math.min(...frames.map(frame => frame.width)) < 24, 'Ink Drop visibly changes shape, not only its setting');
  assert(frames.at(-1).width > 60, 'Ink Drop returns to a full selection surface');
  await page.emulateMedia({reducedMotion:'reduce'});
  await dialog.getByRole('button',{name:'Replay selection motion',exact:true}).click();
  assert.equal(await list.locator('.v-glide__pill').evaluate(n=>n.classList.contains('-gather')),false,'quiet mode changes selection without gathering');
  await mkdir('output/playwright/round-11', {recursive:true});
  for (const width of [1440,390]) for (const mode of ['light','dark']) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(mode=>document.documentElement.dataset.mode=mode,mode);
    assert(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth),'settings do not overflow horizontally');
    await dialog.screenshot({path:`output/playwright/round-11/motion-${width}-${mode}.png`});
  }
  await page.close();
  console.log('PASS: effective saved motion state, editable pointer strength, Glide travel, Ink Drop phases, quiet behavior and responsive settings.');
} finally { await browser.close(); }
