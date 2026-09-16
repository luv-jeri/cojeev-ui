import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview as startPreview } from 'vite';

// F01-1. The docs sidebar thumb must follow the viewport for the whole of a gesture, and a
// cold load must never paint the native document scrollbar before the overlay arrives.
// Both defects only appear in a minified production artifact, so this serves `out/`.
// Scope is the docs sidebar's two list states; it is not a catalogue sweep.
const url = process.argv.find(arg => arg.startsWith('--url='))?.slice(6) ?? process.env.POLISH_URL;
const output = 'output/playwright/docs-sidebar-scrollbar-tracking';
const failures = [];
const check = (label, condition, detail) => {
  if (condition) console.log(`PASS: ${label}`);
  else { failures.push(`${label} — ${detail}`); console.log(`FAIL: ${label} — ${detail}`); }
};

/** Repeat the scrollbar's own geometry from the DOM, so drift is measured rather than assumed. */
const READING = `() => {
  const root = document.querySelector('.docs-navigation-scroll');
  const viewport = root && root.querySelector('[data-slot="scroll-area-viewport"]');
  const rail = root && root.querySelector('[data-slot="scroll-area-scrollbar"]');
  const thumb = root && root.querySelector('[data-slot="scroll-area-thumb"]');
  if (!viewport || !rail || !thumb) return null;
  const painted = /translate3d\\(\\s*0(?:px)?\\s*,\\s*([-\\d.]+)px/.exec(thumb.style.transform);
  const style = getComputedStyle(rail);
  const travel = Math.max(0, rail.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - thumb.offsetHeight);
  const maxScroll = Math.max(0, viewport.scrollHeight - viewport.offsetHeight);
  const expected = maxScroll > 0 ? Math.min(maxScroll, Math.max(0, viewport.scrollTop)) / maxScroll * travel : 0;
  const value = painted ? Number(painted[1]) : null;
  return {
    scrollTop: Math.round(viewport.scrollTop), maxScroll: Math.round(maxScroll), travel: Number(travel.toFixed(1)),
    painted: value === null ? null : Number(value.toFixed(1)), expected: Number(expected.toFixed(1)),
    drift: value === null ? null : Number((value - expected).toFixed(1)),
  };
}`;
const reading = page => page.evaluate(`(${READING})()`);
const settled = async (page, gesture, label) => {
  await gesture();
  await page.waitForTimeout(900);
  const state = await reading(page);
  check(label, Number.isFinite(state?.drift) && Math.abs(state.drift) <= 1, JSON.stringify(state));
  return state;
};

/** Sample every frame across one gesture: a frozen thumb repeats a single painted value. */
const duringGesture = async (page, gesture, label) => {
  await page.evaluate(`(() => {
    window.__series = [];
    const read = ${READING};
    const sample = () => {
      const state = read();
      if (state) window.__series.push(state);
      if (window.__series.length < 240) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })()`);
  await gesture();
  await page.waitForTimeout(900);
  const series = await page.evaluate('window.__series');
  const moving = series.filter((state, index) => index > 0 && state.scrollTop !== series[index - 1].scrollTop);
  const painted = new Set(moving.map(state => state.painted));
  const worst = moving.reduce((max, state) => Number.isFinite(state.drift) ? Math.max(max, Math.abs(state.drift)) : Infinity, 0);
  const travel = series.at(-1)?.travel ?? 0;
  check(`${label}: the thumb is repainted while the viewport is still moving`,
    moving.length >= 4 && painted.size >= 4,
    `${moving.length} moving frame(s), ${painted.size} distinct thumb position(s): ${[...painted].slice(0, 6).join(', ')}`);
  check(`${label}: the thumb never falls far behind mid-gesture`,
    Number.isFinite(worst) && worst <= Math.max(24, travel * 0.25),
    `worst mid-gesture drift ${worst} px of ${travel} px travel`);
  return { moving: moving.length, distinct: painted.size, worst, travel };
};

const server = url ? null : await startPreview({
  configFile: false,
  base: '/cojeev-ui/',
  build: { outDir: 'out' },
  // Prefer 4345 but step aside rather than fight another process for it.
  preview: { host: '127.0.0.1', port: 4345, strictPort: false },
});
const base = url ?? `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  // 1. Cold load: the native document scrollbar must never be the visible one.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => {
      window.__cold = [];
      const sample = () => {
        const root = document.documentElement;
        window.__cold.push({
          scrollable: root.scrollHeight > root.clientHeight,
          native: getComputedStyle(root).scrollbarWidth,
          mounted: root.getAttribute('data-page-scrollbar'),
        });
        if (window.__cold.length < 600) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(`${base}/docs/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-page-scrollbar') === 'mounted');
    const exposed = await page.evaluate(() => window.__cold.filter(state => state.scrollable && state.native !== 'none'));
    check('a cold load never paints the native document scrollbar', exposed.length === 0,
      `${exposed.length} frame(s) with a native bar, first ${JSON.stringify(exposed[0] ?? null)}`);
    await page.close();
  }

  // 2. Scripting disabled: the native scrollbar has to stay, because no overlay will mount.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${base}/docs/`, { waitUntil: 'load' });
    const fallback = await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth);
    check('a document without scripting keeps its native scrollbar', fallback !== 'none', `scrollbar-width: ${fallback}`);
    await context.close();
  }

  // 2b. The bundle never arrives: the head bootstrap still suppresses the native bar, but
  // only for its bounded window, after which the document must get its scrollbar back and
  // still scroll by wheel and keyboard. Only hydration chunks are blocked; the inline
  // bootstrap is left alone, exactly as a failed or very slow chunk load would behave.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => {
      window.__handoff = [];
      const start = performance.now();
      const sample = () => {
        const root = document.documentElement;
        // An init script runs before the root element exists; wait for it rather than throwing.
        if (!root) { requestAnimationFrame(sample); return; }
        window.__handoff.push({
          t: Math.round(performance.now() - start),
          pending: root.hasAttribute('data-page-scrollbar-pending'),
          mounted: root.getAttribute('data-page-scrollbar'),
          native: getComputedStyle(root).scrollbarWidth,
          scrollable: root.scrollHeight > root.clientHeight,
        });
        if (window.__handoff.length < 90) setTimeout(sample, 100);
      };
      requestAnimationFrame(sample);
    });
    await page.route('**/_next/static/**/*.js', route => route.abort());
    await page.goto(`${base}/docs/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-scrollbar-pending'), null, { timeout: 20000 });
    await page.waitForTimeout(400);
    const samples = await page.evaluate(() => window.__handoff);
    const pending = samples.filter(state => state.pending);
    const released = samples.filter(state => !state.pending);
    check('a blocked bundle still suppresses the native scrollbar inside the bootstrap window',
      pending.length > 0 && pending.every(state => state.native === 'none') && pending.some(state => state.scrollable),
      `${pending.length} pending sample(s), first ${JSON.stringify(pending[0] ?? null)}`);
    check('a bundle that never mounts hands the native scrollbar back',
      released.length > 0 && released.every(state => state.native !== 'none' && state.mounted === null),
      `released after ${pending.at(-1)?.t ?? '?'} ms, first ${JSON.stringify(released[0] ?? null)}`);

    const scrollTop = () => page.evaluate(() => Math.round(document.scrollingElement.scrollTop));
    const resting = await scrollTop();
    await page.mouse.move(900, 500);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    const wheeled = await scrollTop();
    check('the document still scrolls by wheel without the bundle', wheeled > resting, `${resting} -> ${wheeled}`);
    await page.keyboard.press('Home');
    await page.waitForTimeout(400);
    const homed = await scrollTop();
    check('the document still scrolls by keyboard without the bundle', homed < wheeled, `${wheeled} -> ${homed}`);
    await page.close();
  }

  // 3. Expanded list, then the compact expanded index: the thumb tracks every gesture.
  for (const layout of ['expanded', 'compact']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const thumb = page.locator('.docs-navigation-scroll [data-slot="scroll-area-thumb"]');
    await page.goto(`${base}/docs/`, { waitUntil: 'load' });
    await thumb.waitFor({ state: 'visible' });
    if (layout === 'compact') {
      await page.getByRole('button', { name: 'Collapse navigation' }).click();
      await page.getByRole('button', { name: /compact component index/i }).click();
      await thumb.waitFor({ state: 'visible' });
      await page.waitForTimeout(600);
    }
    const viewport = page.locator('.docs-navigation-viewport');
    await viewport.focus();

    // An open component preview must sit beside the scroll rail, never over it: while it
    // covers the thumb, every pointer aiming for the thumb lands on the preview instead.
    {
      await page.locator('.docs-navigation [data-component-link]').first().hover();
      // Require the preview to actually open. This assertion is the only coverage the
      // rail-clearance repair has, so treating an absent preview as a pass would report
      // an untested requirement as satisfied.
      const opened = await page.locator('.docs-component-peek')
        .waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
      await page.waitForTimeout(300);
      const peek = await page.evaluate(() => {
        const rail = document.querySelector('.docs-navigation-scroll [data-slot="scroll-area-scrollbar"]');
        const thumb = document.querySelector('.docs-navigation-scroll [data-slot="scroll-area-thumb"]');
        const preview = document.querySelector('.docs-component-peek');
        if (!preview) return { open: false };
        const railBox = rail.getBoundingClientRect(), thumbBox = thumb.getBoundingClientRect();
        const hit = document.elementFromPoint(thumbBox.left + thumbBox.width / 2, thumbBox.top + thumbBox.height / 2);
        return {
          open: true, railRight: Math.round(railBox.right), previewLeft: Math.round(preview.getBoundingClientRect().left),
          hit: hit && (hit.getAttribute('data-slot') ?? hit.className.toString().slice(0, 40)),
        };
      });
      check(`${layout}: an open component preview leaves the scroll rail grabbable`,
        opened && peek.open === true && peek.previewLeft >= peek.railRight && peek.hit === 'scroll-area-thumb',
        JSON.stringify({ opened, ...peek }));
      await viewport.focus();
    }

    console.log(`  ${layout} End:`, JSON.stringify(await duringGesture(page, () => page.keyboard.press('End'), `${layout}: keyboard End`)));
    const end = await reading(page);
    check(`${layout}: keyboard End settles at the bottom of the track`,
      Number.isFinite(end?.drift) && Math.abs(end.drift) <= 1 && Math.abs(end.painted - end.travel) <= 1, JSON.stringify(end));
    await settled(page, () => page.keyboard.press('Home'), `${layout}: keyboard Home returns to the top`);
    for (const step of [1, 2, 3]) await settled(page, () => page.keyboard.press('PageDown'), `${layout}: keyboard PageDown ${step} tracks`);

    const box = await viewport.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    console.log(`  ${layout} wheel:`, JSON.stringify(await duringGesture(page, async () => {
      for (let notch = 0; notch < 6; notch++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(30); }
    }, `${layout}: continuous wheel`)));

    // Thumb drag must still own the scroll, using Radix's own drag geometry.
    const before = await reading(page);
    const rect = await thumb.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 - 120, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const dragged = await reading(page);
    check(`${layout}: dragging the thumb moves the viewport`, dragged.scrollTop < before.scrollTop, `${before.scrollTop} -> ${dragged.scrollTop}`);
    check(`${layout}: the thumb stays under the drag`, Number.isFinite(dragged?.drift) && Math.abs(dragged.drift) <= 1, JSON.stringify(dragged));

    // A resize changes the range without any scrolling of its own.
    await page.setViewportSize({ width: 1440, height: 620 });
    await page.waitForTimeout(700);
    const resized = await reading(page);
    check(`${layout}: the thumb re-fits after a resize`, Number.isFinite(resized?.drift) && Math.abs(resized.drift) <= 1, JSON.stringify(resized));
    await page.locator('.docs-sidebar').screenshot({ path: `${output}/${layout}.png` });
    await page.close();
  }
} finally {
  await browser.close();
  await server?.close();
}
if (failures.length) { console.error(`\n${failures.length} failure(s):\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('\nAll docs sidebar scrollbar tracking checks passed.');
