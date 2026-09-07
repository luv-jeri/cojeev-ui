import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out = 'artifacts/navigation-contrast';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [], rows = [];
page.on('pageerror', error => errors.push(error.message));
const rgba = value => [...value.matchAll(/[\d.]+/g)].map(v => Number(v[0]));
function contrast(color, background) {
  const fg = rgba(color), bg = rgba(background), a = fg[3] ?? 1;
  const lum = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const levels = [lum(fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a))), lum(bg)].sort((a, b) => a - b);
  return Number(((levels[1] + .05) / (levels[0] + .05)).toFixed(2));
}
async function snapshot(id) {
  return page.evaluate(id => {
    const scope = document.querySelector(id === 'sidebar' ? '[data-slot="sidebar"]:has([data-slot="sidebar-trigger"])' : '[data-slot="navigation-menu"]');
    const color = e => ({ text: e.textContent, color: getComputedStyle(e).color });
    const targets = [...scope.querySelectorAll(id === 'sidebar' ? '[data-slot="sidebar-trigger"] .v-icon' : '[data-slot="navigation-menu-count"]')].map(e => {
      let surface = e;
      while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
      return { ...color(e), background: getComputedStyle(surface).backgroundColor };
    });
    const items = [...scope.querySelectorAll(id === 'sidebar' ? '[data-slot="sidebar-menu-button"]' : '[data-slot="navigation-menu-link"]')].map(e => ({ current: e.getAttribute('aria-current'), color: getComputedStyle(e).color, label: color(e.querySelector(id === 'sidebar' ? '[data-slot="sidebar-menu-label"]' : '[data-slot="navigation-menu-label"]')), icon: getComputedStyle(e.querySelector('.v-icon')).color }));
    const muted = [...scope.querySelectorAll('[data-slot="sidebar-group-label"], [data-slot="navigation-menu-group"]')].map(color);
    return { targets, items, muted, expanded: scope.querySelector('[data-slot="sidebar-trigger"]')?.getAttribute('aria-expanded') };
  }, id);
}
async function states(id) {
  const result = [];
  const scope = id === 'sidebar' ? page.locator('[data-slot="sidebar"]:has([data-slot="sidebar-trigger"])') : page.locator('[data-slot="navigation-menu"]');
  const item = text => scope.locator(id === 'sidebar' ? '[data-slot="sidebar-menu-button"]' : '[data-slot="navigation-menu-link"]').filter({ hasText: text });
  if (id === 'sidebar' && await scope.locator('[data-slot="sidebar-trigger"]').getAttribute('aria-expanded') === 'false') await scope.locator('[data-slot="sidebar-trigger"]').click();
  await item('Notes').click(); await page.mouse.move(1400, 20); await page.waitForTimeout(350);
  result.push({ state: 'notes-selected', ...await snapshot(id) });
  await item('Ideas').click(); await page.mouse.move(1400, 20); await page.waitForTimeout(350);
  result.push({ state: 'ideas-selected', ...await snapshot(id) });
  if (id === 'sidebar') {
    await item('Archive').hover(); await page.waitForTimeout(350);
    result.push({ state: 'inactive-hover', ...await snapshot(id) });
    await scope.locator('[data-slot="sidebar-trigger"]').click(); await page.mouse.move(1400, 20); await page.waitForTimeout(350);
    assert.equal(await scope.locator('[data-slot="sidebar-trigger"]').getAttribute('aria-expanded'), 'false');
    result.push({ state: 'collapsed', ...await snapshot(id) });
  }
  return result;
}
try {
  for (const id of ['navigation-menu', 'sidebar']) for (const mode of ['light', 'dark']) {
    await page.goto(`http://127.0.0.1:4320/sahajiv-ui/docs/${id}`);
    await page.waitForSelector(id === 'sidebar' ? '[data-slot="sidebar-trigger"]' : '[data-slot="navigation-menu-count"]');
    await page.locator('select:has(option[value="dark"])').selectOption(mode);
    const before = await states(id);
    await page.addStyleTag({ content: '@layer sahajiv-states {' + fs.readFileSync(`registry/sahajiv/styles/${id}.css`, 'utf8') + '}' });
    const after = await states(id);
    for (let i = 0; i < before.length; i++) {
      assert.deepEqual(after[i].items, before[i].items, `Preserve ${id}/${mode}/${after[i].state} navigation colors`);
      assert.deepEqual(after[i].muted, before[i].muted, `Preserve ${id}/${mode} muted colors`);
      const targets = after[i].targets.map((target, j) => ({ ...target, beforeColor: before[i].targets[j].color, beforeContrast: contrast(before[i].targets[j].color, before[i].targets[j].background), contrast: contrast(target.color, target.background) }));
      for (const target of targets) assert.ok(target.contrast >= 4.5, JSON.stringify({ id, mode, state: after[i].state, target }));
      rows.push({ id, mode, state: after[i].state, targets, navigationAndMutedUnchanged: true, items: after[i].items, muted: after[i].muted, expanded: after[i].expanded });
    }
    if (id === 'sidebar') { await page.locator('[data-slot="sidebar-trigger"]').click(); await page.waitForTimeout(350); }
    await page.screenshot({ path: `${out}/${id}-${mode}.png` });
  }
  assert.deepEqual(errors, []);
  const receipt = { basis: 'Existing main docs4320, isolated Chromium1440x1100; actual theme, selection, hover and collapse controls. Candidate whole scoped CSS appended in same sahajiv-states layer. No server file or process changes.', rows, errors };
  fs.writeFileSync('.work/navigation-contrast-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ rows: rows.length, targetSamples: rows.flatMap(r => r.targets).length, minimumContrast: Math.min(...rows.flatMap(r => r.targets.map(t => t.contrast))), errors }, null, 2));
} finally { await browser.close(); }
