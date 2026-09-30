import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview as previewServer } from "vite";

const server = process.env.SHARE_URL
  ? null
  : await previewServer({
      configFile: false,
      base: "/cojeev-ui/",
      build: { outDir: process.env.SHARE_OUT_DIR ?? "out" },
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    });
const base = (process.env.SHARE_URL ?? `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`).replace(/\/$/, "");
const origin = new URL(base).origin;
const browser = await chromium.launch();

async function assertFits(locator, width) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.width > 0,
    `Share fits the ${width}px header/rail`);
}

try {
  for (const path of ["/docs/button/", "/", "/requests/"]) {
    const url = `${base}${path}`;
    const expected = `${origin}${new URL(url).pathname}?utm_medium=share`;
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
      await context.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
      const page = await context.newPage();
      await page.goto(`${url}?private=drop#section`, { waitUntil: "networkidle" });
      const chrome = path.startsWith("/docs")
        ? page.locator(width === 390 ? ".docs-mobile-actions" : ".docs-sidebar .docs-persistent-links")
        : page.locator(path === "/requests/" ? ".requests-nav" : ".story-header-tools");
      const share = chrome.getByRole("button", { name: "Share this page", exact: true });
      await assertFits(share, width);
      if (path === "/requests/") await assertFits(chrome.getByRole("link").last(), width);
      assert.equal(await share.locator(".share-label").isVisible(), width !== 390, "label follows the viewport width");
      const idleWidth = (await share.boundingBox()).width;
      await page.evaluate(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = text => new Promise((resolve, reject) => {
          window.finishShareCopy = () => write(text).then(resolve, reject);
        });
      });
      await share.click();
      await chrome.locator('button[data-share-state="working"]').waitFor();
      assert.equal(await share.locator('[data-slot="button-loading"]').isVisible(), false, "Share supplies its own pending icon");
      assert.equal((await share.boundingBox()).width, idleWidth, "pending preserves the button size");
      await page.evaluate(() => window.finishShareCopy());
      await page.getByRole("status").filter({ hasText: "Link copied" }).waitFor({ state: "attached" });
      await share.getByText("Link copied", { exact: true }).filter({ visible: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected, `${path} at ${width}px`);
      await assertFits(share, width);
      if (width === 390) assert.equal((await share.boundingBox()).width, idleWidth, "copy feedback preserves the icon-only button size");

      // Prove the real selection-copy fallback restores selection, focus and scroll.
      await page.evaluate(() => {
        navigator.clipboard.writeText = async () => { throw new Error("Clipboard API denied by test"); };
        const copy = document.execCommand.bind(document);
        document.execCommand = command => {
          const fallback = document.querySelector("[data-copy-fallback]");
          window.shareFallbackInsideScope = fallback?.parentElement === window.shareCopyTrigger.parentElement
            && document.activeElement === fallback
            && (!window.shareCopyTrigger.closest('[role="dialog"]') || window.shareCopyTrigger.closest('[role="dialog"]').contains(fallback));
          return copy(command);
        };
        const title = document.querySelector("main h1");
        const range = document.createRange();
        range.selectNodeContents(title);
        const selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await share.evaluate(node => { window.shareCopyTrigger = node; window.shareFallbackInsideScope = false; });
      await share.focus();
      const before = await page.evaluate(() => ({ selection: getSelection().toString(), x: scrollX, y: scrollY }));
      await share.press("Enter");
      assert.equal(await share.getAttribute("data-share-state"), "copied");
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected, "fallback copies the same link");
      assert.deepEqual(await page.evaluate(() => ({ selection: getSelection().toString(), x: scrollX, y: scrollY })), before);
      assert.equal(await share.evaluate(node => node === document.activeElement), true);
      assert.equal(await page.evaluate(() => window.shareFallbackInsideScope), true, "fallback stays next to the trigger and owns focus");
      assert.equal(await page.locator("[data-copy-fallback]").count(), 0, "temporary field is removed");

      if (path.startsWith("/docs") && width === 390) {
        await page.getByRole("button", { name: "Browse", exact: true }).click();
        const drawer = page.getByRole("dialog", { name: "Browse components", exact: true });
        const drawerShare = drawer.getByRole("button", { name: "Share this page", exact: true });
        await drawerShare.waitFor();
        await drawerShare.evaluate(node => { window.shareCopyTrigger = node; window.shareFallbackInsideScope = false; });
        await drawerShare.focus();
        const selectionBefore = await page.evaluate(() => getSelection().toString());
        await drawerShare.press("Enter");
        await drawer.locator('[role="status"]').filter({ hasText: "Link copied" }).waitFor({ state: "attached" });
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected, "drawer fallback copies the link");
        assert.equal(await page.evaluate(() => window.shareFallbackInsideScope), true, "fallback remains inside the drawer focus scope");
        assert.equal(await drawerShare.evaluate(node => node === document.activeElement), true, "drawer trigger regains focus");
        assert.equal(await page.evaluate(() => getSelection().toString()), selectionBefore, "drawer copy restores selection");
        assert.equal(await page.locator("[data-copy-fallback]").count(), 0);
      }

      if (path.startsWith("/docs") && width === 1280) {
        await page.getByRole("button", { name: "Collapse navigation", exact: true }).click();
        await page.locator('.docs-sidebar[data-state="collapsed"]').waitFor();
        await assertFits(share, width);
        assert.equal(await share.locator(".share-label").isVisible(), false, "collapsed rail is icon-only");
      }
      await context.close();
    }
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of ["/track/", "/feedback-admin/", "/workspace/"]) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    assert.equal(await page.getByRole("button", { name: "Share this page", exact: true }).count(), 0, `${path} has no Share control`);
  }
  await context.close();
  console.log("PASS: clean share links, real clipboard fallback, copy feedback, desktop/collapsed chrome, 390px headers and private-page exclusions.");
} finally {
  await browser.close();
  await server?.close();
}
