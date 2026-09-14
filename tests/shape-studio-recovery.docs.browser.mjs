import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const out = "output/playwright/shape-studio-recovery";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of ["/docs/shape/", "/docs/shape-artwork/", "/"]) {
    console.log(`Checking shared studio ${route}`);
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const studio = page.locator("[data-shape-studio]").first();
    await studio.waitFor({ timeout: 10000 });
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    await studio.scrollIntoViewIfNeeded();
    assert.equal(
      await page.locator("[data-shape-studio]").count(),
      1,
      "one complete editor per page",
    );
    assert.equal(await studio.locator("[data-studio-shape]").count(), 12);
    const art = studio.locator("[data-studio-art]");
    await studio.getByRole("button", { name: "Cushion", exact: true }).click();
    assert.equal(await art.getAttribute("data-shape"), "cushion");
    await studio.getByRole("button", { name: "Blue", exact: true }).click();
    assert.equal(await art.getAttribute("data-tone"), "blue");
    await studio
      .getByRole("switch", { name: "Cast shadow", exact: true })
      .click();
    assert.equal(await art.locator("[data-artwork-layer=shadow]").count(), 0);
    await studio.getByRole("button", { name: "Breathe", exact: true }).click();
    assert.equal(await art.getAttribute("data-ambient"), "true");
    const rest = await art
      .locator("[data-artwork-layer=fill] path")
      .getAttribute("d");
    await page.waitForTimeout(180);
    assert.equal(
      await art.locator("[data-artwork-layer=fill] path").getAttribute("d"),
      rest,
      "reduced motion still",
    );
    await studio
      .getByRole("button", { name: "Copy React snippet", exact: true })
      .click();
    let code = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(code, /ambient=\{true\}/);
    assert.match(code, /tone=\{"blue"\}/);
    assert.match(code, /shadow=\{false\}/);
    await studio
      .getByRole("button", { name: "Randomize silhouette", exact: true })
      .click();
    assert.notEqual(await art.getAttribute("data-shape"), "cushion");
    assert.equal(await art.getAttribute("data-tone"), "blue");
    assert.equal(await art.locator("[data-artwork-layer=shadow]").count(), 0);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      studio.getByRole("button", { name: "Download SVG", exact: true }).click(),
    ]);
    const svg = await readFile(await download.path(), "utf8");
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<animate|<script|var\(/);
    assert.doesNotMatch(svg, /data-artwork-layer="shadow"/);
    await studio
      .getByRole("button", { name: "Every silhouette", exact: true })
      .click();
    assert.ok((await studio.locator("[data-legacy-shape]").count()) > 30);
    await studio
      .getByRole("button", { name: "Copy star-4 shape", exact: true })
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /name="star-4"/,
    );
    await studio
      .getByRole("button", { name: "Every silhouette", exact: true })
      .click();
    await studio
      .getByRole("button", { name: "Layer & motion details", exact: true })
      .click();
    await studio
      .getByRole("slider", { name: "Rotation", exact: true })
      .press("End");
    await studio
      .getByRole("slider", { name: "Breathe cycle", exact: true })
      .press("Home");
    await studio
      .getByRole("button", { name: "Copy React snippet", exact: true })
      .click();
    code = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(code, /rotation=\{-180\}/);
    assert.match(code, /morphDuration=\{4\}/);
    await studio
      .getByRole("button", { name: "Layer & motion details", exact: true })
      .click();
    if (route !== "/")
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await studio
            .locator(".v-shape-studio__heading")
            .scrollIntoViewIfNeeded();
          assert.equal(
            await studio.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
            true,
          );
          await page.screenshot({
            path: `${out}/${route.split("/")[2]}-${width}-${mode}.png`,
          });
        }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await art.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-studio-art]")?.dataset.quiet === "false",
    );
    const first = await art
      .locator("[data-artwork-layer=fill] path")
      .getAttribute("d");
    await page.waitForTimeout(300);
    assert.notEqual(
      await art.locator("[data-artwork-layer=fill] path").getAttribute("d"),
      first,
      "breathing really changes the contour",
    );
    await studio.getByRole("button", { name: "Still", exact: true }).click();
    const stopped = await art
      .locator("[data-artwork-layer=fill] path")
      .getAttribute("d");
    await page.waitForTimeout(200);
    assert.equal(
      await art.locator("[data-artwork-layer=fill] path").getAttribute("d"),
      stopped,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS one shared studio on both docs and landing;12 contours, full legacy inventory, actual motion/quiet, settings/copy/static SVG, retained state and8 captures",
  );
} finally {
  await browser.close();
}
