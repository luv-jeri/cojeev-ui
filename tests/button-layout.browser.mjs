/** RF-U-011: ButtonExample action feedback must not move neighboring controls. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  for (const width of [360, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(`${process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui"}/docs/button/`);
    const demo = page.locator('[data-example="button"] [data-button-demo="full"]').first();
    const action = demo.getByRole("button", { name: "Add a note", exact: true });
    const disabled = demo.getByRole("button", { name: "Disabled", exact: true });
    const status = demo.locator('[data-slot="typography-meta"][role="status"]');
    await action.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await demo.locator('.v-morph-live').first().waitFor({ state: "attached" });

    const measure = async () => {
      const demoBox = await demo.boundingBox();
      const disabledBox = await disabled.boundingBox();
      const statusBox = await status.boundingBox();
      return {
        demo: demoBox,
        disabled: disabledBox && demoBox && { x: disabledBox.x - demoBox.x, y: disabledBox.y - demoBox.y },
        status: statusBox,
      };
    };
    const idle = await measure();
    await action.click();
    await demo.getByRole("button", { name: "Adding…", exact: true }).waitFor();
    const pending = await measure();
    await demo.getByRole("button", { name: "Cancel", exact: true }).click();
    await status.filter({ hasText: "Cancelled" }).waitFor();
    const cancelled = await measure();
    await demo.getByRole("radio", { name: "Error and retry", exact: true }).click();
    await action.click();
    await demo.getByRole("button", { name: "Retry example", exact: true }).waitFor();
    const error = await measure();

    for (const [state, box] of Object.entries({ pending, cancelled, error })) {
      assert.equal(box.disabled?.x, idle.disabled?.x, `${width}px ${state} keeps disabled sibling x`);
      assert.equal(box.disabled?.y, idle.disabled?.y, `${width}px ${state} keeps disabled sibling y`);
      assert.equal(box.demo?.height, idle.demo?.height, `${width}px ${state} keeps demo height`);
      assert.equal(box.status?.height, idle.status?.height, `${width}px ${state} keeps readable status slot height`);
    }
    await page.close();
  }
  console.log("PASS RF-U-011 ButtonExample action and status geometry stay stable at 360px and 1440px");
} finally {
  await browser.close();
}
