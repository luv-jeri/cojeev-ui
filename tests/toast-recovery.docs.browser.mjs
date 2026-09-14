import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/toast-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/docs/toast/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  const save = example.getByRole("button", {
    name: "Save example note",
    exact: true,
  });
  assert.ok(
    (await save.boundingBox()).width <
      (await example.boundingBox()).width * 0.7,
    "the toast trigger must not stretch across the entire workbench",
  );
  for (const mode of ["Compact", "Actionable", "Receipt"]) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: mode, exact: true }).click();
    await save.click();
    const toast = example.locator('[data-slot="toast"][data-state="open"]');
    await toast.waitFor();
    assert.equal(
      await toast.getAttribute("data-appearance"),
      mode.toLowerCase(),
    );
    assert.ok(
      await save.evaluate((el) => el === document.activeElement),
      "showing a toast must not steal focus",
    );
    assert.match(await example.getByRole("status").innerText(), /saved/i);
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await example.scrollIntoViewIfNeeded();
        assert.ok(
          await toast.evaluate(
            (root) => root.scrollWidth <= root.clientWidth + 1,
          ),
          "toast content stays inside its surface",
        );
        const dismiss = toast.getByRole("button", {
          name: "Dismiss notification",
        });
        const bounds = await dismiss.boundingBox();
        assert.ok(
          bounds.width >= 44 && bounds.height >= 44,
          "dismiss target is touch reachable",
        );
        await example.screenshot({
          path: `${output}/${mode.toLowerCase()}-${width}-${theme}.png`,
          style: ".report-launcher,nextjs-portal{visibility:hidden!important}",
        });
      }
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (mode === "Receipt") {
      const palettes = await toast.evaluate((root) => {
        const result = [];
        for (const variant of ["default", "danger", "cream"]) {
          root.classList.remove("-cream", "-danger");
          if (variant !== "default") root.classList.add(`-${variant}`);
          const probe = document.createElement("span");
          probe.style.color = `var(${variant === "danger" ? "--destructive-foreground" : variant === "cream" ? "--v-text" : "--v-on-ink"})`;
          root.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          result.push({
            variant,
            expected,
            primary: getComputedStyle(
              root.querySelector(".v-toast__receipt strong"),
            ).color,
          });
        }
        return result;
      });
      for (const result of palettes)
        assert.equal(
          result.primary,
          result.expected,
          `${result.variant}: receipt values retain their semantic ink`,
        );
    }
    if (mode === "Actionable") {
      await toast.getByRole("button", { name: "Undo", exact: true }).click();
      assert.match(await example.getByRole("status").innerText(), /undone/i);
      await save.click();
      await toast.waitFor();
    }
    await toast.getByRole("button", { name: "Dismiss notification" }).click();
    await toast.waitFor({ state: "hidden" });
    await save.click();
    await toast.waitFor();
    await toast
      .getByRole("button", { name: "Dismiss notification" })
      .press("Space");
    await toast.waitFor({ state: "hidden" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS toast recovery: three visible arrangements, non-stretched trigger, local save/undo, focus retention, 44px dismiss, keyboard/reopen and 12 responsive/theme captures",
  );
} finally {
  await browser.close();
}
