import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Prevent repaint from detaching the live body, and animated artwork from
// becoming a changing hit target within its stable native control.
const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`${base}/docs/button/`, { waitUntil: 'domcontentloaded' });
  const demo = page.locator('[data-example=button]').first();
  const button = demo.getByRole('button', { name: 'Add a note', exact: true }).first();
  await button.locator('svg.v-morph').waitFor({ state: 'attached' });
  await button.evaluate(el => {
    window.hoverRemovedBodies = 0;
    window.hoverObserver = new MutationObserver(records => {
      for (const record of records) for (const node of record.removedNodes)
        if (node.nodeType === 1 && node.matches('svg.v-morph')) window.hoverRemovedBodies++;
    });
    window.hoverObserver.observe(el, { childList: true });
  });
  await button.hover();
  await page.mouse.move(320, 40);
  await button.hover();
  const removed = await page.evaluate(() => { window.hoverObserver.disconnect(); return window.hoverRemovedBodies; });
  assert.equal(removed, 0, 'Hover paint must keep its SVG attached throughout the interaction');

  const targets = [
    button,
    page.getByRole('button', { name: 'Collapse navigation', exact: true }),
    page.locator('.docs-navigation').getByRole('link', { name: 'Button', exact: true }),
    page.locator('.docs-navigation').getByRole('link', { name: 'Button Group', exact: true }),
    page.getByRole('button', { name: 'Copy code', exact: true }).first(),
  ];
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    const rect = await target.boundingBox();
    for (let i = 2; i < rect.width - 2; i += 3) {
      const point = { x: rect.x + i, y: rect.y + rect.height / 2 };
      await page.mouse.move(point.x, point.y);
      const sample = await target.evaluate((el, p) => {
        const hit = document.elementFromPoint(p.x, p.y);
        return { inside: el.contains(hit), cursor: getComputedStyle(hit).cursor,
          artwork: !!hit.closest('[data-slot=icon],[data-slot=animated-icon],[data-slot=shape]') };
      }, point);
      assert(sample.inside && sample.cursor === 'pointer', `Moving across ${await target.getAttribute('aria-label')} retains its native pointer`);
      assert.equal(sample.artwork, false, 'Decorative glyph geometry cannot become a pointer target');
    }
  }
  console.log('PASS: attached hover paint and stable targets while moving across buttons, links, labels and icons.');
} finally { await browser.close(); }
