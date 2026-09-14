import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const out = "output/playwright/recovery-finish";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const visit = async (route) => {
    await page.goto("http://127.0.0.1:4321/cojeev-ui" + route, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    await page.evaluate(() => document.fonts.ready);
  };
  await visit("/docs/shape/");
  const studio = page.locator("[data-shape-studio]").first();
  await studio.getByRole("button", { name: "Cushion", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-studio-art]")?.dataset.shape === "cushion",
  );
  await studio
    .locator(".v-shape-studio__desk")
    .screenshot({ path: out + "/shape-desk.png" });
  await studio
    .getByRole("button", { name: "Layer & motion details", exact: true })
    .click();
  await studio
    .locator(".v-shape-studio__details")
    .screenshot({ path: out + "/shape-details.png" });
  await visit("/");
  await page
    .locator("[data-shape-studio]")
    .screenshot({ path: out + "/shape-landing.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  await visit("/docs/bento-grid/");
  const bento = page.locator(
    "[data-example-role=interactive] [data-slot=bento-builder]",
  );
  await bento.getByRole("button", { name: "Interlock", exact: true }).click();
  await bento.screenshot({ path: out + "/bento-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit("/docs/");
  await page
    .locator(".docs-workshop__steps")
    .screenshot({ path: out + "/setup-steps.png" });
  console.log(
    "Captured final desk/details/landing, mobile Interlock and desktop setup steps for primary visual review",
  );
} finally {
  await browser.close();
}
