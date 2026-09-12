import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
const output = 'output/playwright/context-menu-ghost';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const menu = page.locator('[data-slot="context-menu-content"]');

async function ghostIsClear(message) {
  const cleared = await page.waitForFunction(() => {
    const group = document.querySelector('[data-slot="context-menu-content"]');
    return ['o', 'w', 'h'].every(axis =>
      parseFloat(group?.style.getPropertyValue(`--hov-${axis}`) || '0') === 0);
  }, null, { timeout: 2500 }).then(() => true, () => false);
  assert(cleared, `${message}: ${JSON.stringify(await menu.evaluate(group => ({
    opacity: group.style.getPropertyValue('--hov-o'),
    y: group.style.getPropertyValue('--hov-y'),
    height: group.style.getPropertyValue('--hov-h'),
    active: group.querySelector('[data-glide-active]')?.textContent,
  })))}`);
}

try {
  await page.addInitScript(() => localStorage.setItem('v-flow-v1', JSON.stringify({
    variant: 'glide', hover: true, hoverStrength: 1, speed: 1, intensity: 1,
  })));
  await page.goto(`${base}/docs/context-menu/`, { waitUntil: 'domcontentloaded' });
  await page.locator('button.v-morph-live').filter({ hasText: 'Motion settings' }).first().waitFor();
  const trigger = page.getByLabel('Example note context menu', { exact: true }).first();
  const duplicate = menu.getByRole('menuitem', { name: 'Duplicate', exact: true });
  const pin = menu.getByRole('menuitemcheckbox', { name: 'Pin note', exact: true });
  for (const width of [1440, 390]) for (const mode of ['dark', 'light']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(mode => document.documentElement.dataset.mode = mode, mode);
    await trigger.click({ button: 'right' });
    await menu.locator('.v-glide__hover').waitFor({ state: 'attached' });
    for (const variant of ['glide', 'drop', 'rubber']) {
      // Exercise the public, component-local Flow override without changing
      // the user's stored global settings or opening another modal.
      await menu.evaluate((group, variant) => group.dataset.flow = variant, variant);
      await page.waitForFunction(variant =>
        document.querySelector('[data-slot="context-menu-content"]')?.dataset.flowV === variant, variant);
      for (const item of [duplicate, pin, duplicate, pin]) await item.hover();
      await ghostIsClear(`${variant}: selecting the next row must finish the ghost fade`);
      assert.equal(await menu.locator('[data-glide-active]').innerText(), 'Pin note');
      await menu.locator('[data-slot="context-menu-label"]').hover();
      await ghostIsClear(`${variant}: moving onto the heading must clear the ghost`);
      await page.waitForFunction(() => {
        const group = document.querySelector('[data-slot="context-menu-content"]');
        return group.style.getPropertyValue('--glide-o') === '0';
      });
      await duplicate.hover();
      const bounds = await menu.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 10);
      await ghostIsClear(`${variant}: leaving the whole menu must clear the ghost`);
    }

    await menu.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Duplicate');
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Pin note');
    await ghostIsClear('Keyboard selection must not leave an extra ghost');
    await menu.screenshot({ path: `${output}/${width}-${mode}.png` });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await duplicate.hover();
    await pin.hover();
    await ghostIsClear('Reduced motion must settle without a lingering ghost');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Interrupt a preview, then let enough frames pass to catch a cancelled
    // cleanup writing its old styles back after Flow has been detached.
    await duplicate.hover();
    await menu.evaluate(group => group.dataset.flow = 'off');
    await menu.locator('.v-glide__hover').waitFor({ state: 'detached' });
    await page.evaluate(() => new Promise(resolve => {
      let frames = 0;
      const tick = () => ++frames === 20 ? resolve() : requestAnimationFrame(tick);
      requestAnimationFrame(tick);
    }));
    assert.equal(await menu.evaluate(group => group.style.getPropertyValue('--hov-o')), '');
    await menu.evaluate(group => group.dataset.flow = 'glide');
    await menu.locator('.v-glide__hover').waitFor({ state: 'attached' });
    await pin.hover();
    await ghostIsClear('Re-enabling Flow must not restore stale ghost paint');
    await pin.click();
    await menu.waitFor({ state: 'detached' });
    // Do not create a new, legitimate pointer preview as the keyboard-opened
    // menu appears underneath the cursor's previous row position.
    await page.mouse.move(0, 0);
    await trigger.focus();
    await page.keyboard.press('Shift+F10');
    await menu.waitFor();
    await ghostIsClear('Reopening must not inherit a ghost from the previous menu');
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'detached' });
    console.log(`PASS: ${width}px ${mode}, Glide/Ink Drop/Rubber, rapid pointer travel, keyboard, quiet, Flow Off and reopen.`);
  }

  // A pointer preview still belongs on an unselected tab; fixing menu cleanup
  // must not simply disable ghosts across the library.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Motion settings', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  const preview = dialog.getByRole('tablist', { name: 'Motion preview', exact: true });
  await preview.getByRole('tab', { name: 'Activity', exact: true }).hover();
  await page.waitForFunction(() => {
    const ghost = document.querySelector('.v-motion-controls .v-glide__hover');
    return ghost && Number(getComputedStyle(ghost).opacity) > 0 && ghost.getBoundingClientRect().width > 30;
  });
  await dialog.getByRole('button', { name: 'Replay selection motion', exact: true }).click();
  await page.waitForFunction(() => {
    const group = document.querySelector('.v-motion-controls [role="tablist"]');
    return group?.style.getPropertyValue('--hov-o') === '0'
      && group.style.getPropertyValue('--hov-h') === '0px';
  });
  await page.keyboard.press('Escape');
  console.log('PASS: the shared tab ghost remains visible on hover and clears when selection takes over.');
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
