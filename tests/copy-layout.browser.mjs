/** RF-U-010: copy feedback must not resize controls or move following content. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const results = [];
await mkdir("output/playwright/round-4-copy-layout", { recursive: true });
try {
  for (const width of [360, 1440]) {
    for (const colorScheme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
      const page = await context.newPage();
      await page.goto(`${base}/docs/dropdown-menu/`);
      await page.locator(".v-morph-live").first().waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(mode => { document.documentElement.dataset.mode = mode; }, colorScheme);
      // Hold the actual browser API at its boundary to inspect the pending state.
      await page.evaluate(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = text => new Promise((resolve, reject) => {
          window.finishCopy = () => write(text).then(resolve, reject);
        });
      });
      for (const selector of ['.docs-command [data-slot="copy-control"]', '.docs-handoff [data-slot="copy-control"]', '.v-preview__actions [data-slot="copy-control"]']) {
        const control = page.locator(selector).first();
        assert.equal(await control.count(), 1, `Missing expected copy surface: ${selector}`);
        const button = control.locator('[data-slot="copy-button"]');
        await button.scrollIntoViewIfNeeded();
        const measure = () => control.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const figure = element.closest('[data-slot="code-block"]');
          const frame = figure?.getBoundingClientRect();
          return { width: rect.width, height: rect.height, frameHeight: frame?.height ?? 0, nextOffset: figure?.nextElementSibling ? figure.nextElementSibling.getBoundingClientRect().top - frame.top : 0 };
        });
        const before = await measure();
        const label = await button.innerText();
        await button.click();
        await control.locator('[data-copy-state="copying"]').waitFor({ state: "attached" });
        assert.deepEqual(await measure(), before, `${width}/${colorScheme} ${selector}: pending shifts layout`);
        await page.evaluate(() => window.finishCopy());
        await control.locator('[data-copy-state="copied"]').waitFor({ state: "attached" });
        assert.deepEqual(await measure(), before, `${width}/${colorScheme} ${selector}: success shifts layout`);
        assert.equal(await button.innerText(), label, "Copy label stays stable; icon conveys success");
        assert.equal(await control.locator('[data-icon-name="check"]').count(), 1);
        assert.match(await control.locator('[role="status"]').textContent(), /Copied/);
        assert.equal(await control.locator('[role="status"]').getAttribute("aria-hidden"), null);
        if (selector.startsWith(".docs-command")) {
          const code = await control.locator('xpath=ancestor::figure').locator("pre > code").textContent();
          assert.equal(await page.evaluate(() => navigator.clipboard.readText()), code);
        }
        results.push({ width, colorScheme, selector, before });
      }
      // A genuine clipboard failure stays visible but must not grow the terminal.
      await page.evaluate(() => {
        navigator.clipboard.writeText = async () => { throw new Error("Denied by test browser"); };
        document.execCommand = () => false;
      });
      const terminal = page.locator('.docs-command').first();
      const height = await terminal.evaluate(element => element.getBoundingClientRect().height);
      await terminal.getByRole("button", { name: "Copy command", exact: true }).click();
      await terminal.locator('[data-copy-state="error"]').waitFor({ state: "attached" });
      assert.equal(await terminal.evaluate(element => element.getBoundingClientRect().height), height, "Failure feedback must not resize terminal");
      assert(await terminal.locator('[role="status"]').isVisible(), "Manual-copy guidance stays visible on failure");
      assert.match(await terminal.locator('[role="status"]').textContent(), /copy it manually/);
      assert(await terminal.evaluate(element => {
        const frame = element.getBoundingClientRect();
        const receipt = element.querySelector('[role="status"]').getBoundingClientRect();
        return receipt.left >= frame.left && receipt.right <= frame.right && receipt.bottom <= frame.bottom;
      }), "Failure guidance must stay inside the clipped terminal");
      if (width === 360 && colorScheme === "light") await terminal.screenshot({ path: "output/playwright/round-4-copy-layout/failure-mobile.png" });
      await page.goto(`${base}/docs/code-block/`);
      await page.locator('.v-morph-live').first().waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(mode => { document.documentElement.dataset.mode = mode; }, colorScheme);
      const defaultCopy = page.locator('[data-example="code-block"] [data-slot="copy-control"]').first();
      const defaultButton = defaultCopy.getByRole("button", { name: "Copy", exact: true });
      await defaultButton.scrollIntoViewIfNeeded();
      const defaultBefore = await defaultCopy.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight }));
      await defaultButton.click();
      await defaultCopy.locator('[data-copy-state="copied"]').waitFor({ state: "attached" });
      assert.deepEqual(await defaultCopy.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight })), defaultBefore, "Default Copy action must keep its dimensions");
      assert.equal(await defaultButton.innerText(), "Copy");
      await context.close();
    }
  }
  console.log(JSON.stringify({ cases: results, failures: [] }, null, 2));
} finally {
  await browser.close();
}
