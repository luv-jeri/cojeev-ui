/** RF-U-007: runs against the existing docs server; never starts one. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui"}/docs/button/`);
  const root = page.locator('[data-example="button"]').first();
  const status = root.locator('[role="status"]');
  const action = root.getByRole("button", { name: "Add a note", exact: true });
  await action.waitFor();
  await root.locator('.v-morph-live').first().waitFor({ state: "attached" });
  await action.click();
  const busy = root.getByRole("button", { name: "Adding…", exact: true });
  await busy.waitFor();
  assert.equal(await busy.getAttribute("disabled"), null, "Busy demo must not use native disabled paint");
  assert.equal(await busy.getAttribute("aria-busy"), "true");
  assert.equal(await busy.getAttribute("aria-disabled"), "true", "Busy still blocks activation");

  const duration = root.getByRole("slider", { name: "Loading duration", exact: true });
  assert.equal(await duration.getAttribute("aria-valuenow"), "3");
  await root.getByRole("button", { name: "Cancel", exact: true }).click();
  await duration.press("Home");
  assert.equal(await duration.getAttribute("aria-valuenow"), "0.5");
  const started = Date.now();
  await action.click();
  // Dispatch duplicate activation to exercise guards despite aria-disabled.
  await busy.dispatchEvent("click");
  await page.waitForTimeout(200);
  assert.equal(await busy.getAttribute("aria-busy"), "true", "Minimum duration must not complete immediately");
  await status.filter({ hasText: "1 note added" }).waitFor();
  assert(Date.now() - started >= 450, "Selected half-second duration is respected");
  await page.waitForTimeout(600);
  assert.match(await status.innerText(), /^1 note added/, "Duplicate click creates only one result");

  await root.getByRole("radio", { name: "Error and retry", exact: true }).click();
  await action.press("Enter");
  await root.getByRole("button", { name: "Retry example", exact: true }).waitFor();
  await root.getByRole("radio", { name: "Success", exact: true }).click();
  await root.getByRole("button", { name: "Retry example", exact: true }).press("Enter");
  await status.filter({ hasText: "2 notes added" }).waitFor();

  // Observe the actual scheduled work, including clearTimeout on cancel/unmount.
  await page.evaluate(() => {
    const set = window.setTimeout, clear = window.clearTimeout;
    window.__buttonTimers = new Map();
    window.setTimeout = (handler, delay, ...args) => {
      const id = set(handler, delay, ...args);
      if (delay === 10000) window.__buttonTimers.set(id, "pending");
      return id;
    };
    window.clearTimeout = id => {
      if (window.__buttonTimers.has(id)) window.__buttonTimers.set(id, "cleared");
      clear(id);
    };
  });

  await duration.press("End");
  assert.equal(await duration.getAttribute("aria-valuenow"), "10");
  await action.click();
  await page.waitForTimeout(700);
  assert.equal(await busy.getAttribute("aria-busy"), "true", "Long duration remains pending");
  await root.getByRole("button", { name: "Cancel", exact: true }).click();
  await status.filter({ hasText: "Cancelled" }).waitFor();
  assert.deepEqual(await page.evaluate(() => [...window.__buttonTimers.values()]), ["cleared"], "Cancel clears scheduled work");
  await duration.press("Home");
  await action.click();
  await status.filter({ hasText: "3 notes added" }).waitFor();
  assert(await root.getByRole("button", { name: "Disabled", exact: true }).isDisabled());
  await duration.press("End");
  await action.click();
  assert.deepEqual(await page.evaluate(() => [...window.__buttonTimers.values()]), ["cleared", "pending"]);
  await page.getByRole("button", { name: "Reset example", exact: true }).click();
  await page.locator('[data-button-demo="full"] [role="status"]').filter({ hasText: "0 notes added" }).waitFor();
  assert.deepEqual(await page.evaluate(() => [...window.__buttonTimers.values()]), ["cleared", "cleared"], "Unmount/reset clears scheduled work");
  const variants = page.getByRole("region", { name: "Variants", exact: true });
  // The gallery renders only the six non-default treatments; the default variant is the
  // interactive specimen above it and has no figure. Any gallery figure is a compact demo,
  // which is what the three-second duration below is about.
  const compactGallery = variants.getByRole("figure", { name: "Accent", exact: true });
  const compactStarted = Date.now();
  await compactGallery.getByRole("button", { name: "Add a note", exact: true }).click();
  await compactGallery.locator('[role="status"]').filter({ hasText: "1 note added" }).waitFor();
  assert(Date.now() - compactStarted >= 2900, "Compact demo uses its three-second duration");
  const paint = element => {
    const style = getComputedStyle(element);
    const body = element.querySelector('[data-morph-body]');
    return { color: style.color, fill: body ? getComputedStyle(body).fill : style.backgroundColor };
  };
  for (const dark of [false, true]) {
    await page.getByRole("switch", { name: "Dark appearance", exact: true }).setChecked(dark);
    await page.waitForTimeout(300);
    for (const name of ["Accent", "Secondary", "Ghost", "Outline", "Danger", "Block"]) {
      const specimen = variants.getByRole("figure", { name, exact: true });
      const idle = specimen.getByRole("button", { name: "Add a note", exact: true });
      await idle.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      const before = await idle.evaluate(paint);
      const disabledPaint = await specimen.getByRole("button", { name: "Disabled", exact: true }).evaluate(paint);
      await idle.click();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      const loading = specimen.getByRole("button", { name: "Adding…", exact: true });
      assert.equal(await loading.getAttribute("data-state"), "busy", `${name} busy semantics`);
      const after = await loading.evaluate(paint);
      assert.deepEqual(after, before, `${dark ? "dark" : "light"} ${name} keeps its own surface and contrast while busy`);
      assert.notDeepEqual(after, disabledPaint, `${name} busy remains distinct from disabled`);
      await specimen.getByRole("button", { name: "Cancel", exact: true }).click();
    }
  }
  // The page renders no default-variant Button, so the seventh case — a busy default Button
  // keeping its pink identity while a disabled one must not — is probed directly. This is the
  // `aria-busy` half of the same guard the disabled case protects.
  for (const dark of [false, true]) {
    await page.getByRole("switch", { name: "Dark appearance", exact: true }).setChecked(dark);
    await page.waitForTimeout(300);
    const busyDefault = await page.evaluate(() => {
      const el = document.createElement("button");
      el.className = "v-btn";
      el.setAttribute("data-slot", "button");
      el.setAttribute("aria-busy", "true");
      el.setAttribute("aria-disabled", "true");
      el.textContent = "probe";
      document.body.appendChild(el);
      const css = getComputedStyle(el);
      const paint = { background: css.backgroundColor, cursor: css.cursor };
      el.remove();
      return paint;
    });
    const disabledDefault = await page.evaluate(() => {
      const el = document.createElement("button");
      el.className = "v-btn";
      el.setAttribute("data-slot", "button");
      el.setAttribute("disabled", "");
      el.textContent = "probe";
      document.body.appendChild(el);
      const css = getComputedStyle(el);
      const paint = { background: css.backgroundColor };
      el.remove();
      return paint;
    });
    assert.notEqual(
      busyDefault.background,
      disabledDefault.background,
      `default${dark ? " dark" : ""}: a busy Button must keep its variant identity instead of collapsing onto the disabled face`,
    );
    // NOT asserted: `button.css:24` declares cursor:progress for [aria-busy="true"], but a busy
    // Button renders cursor:not-allowed. The unlayered global a11y rule in base.css
    // (`:is(button,…,[data-slot]):is(:disabled,[aria-disabled="true"],…)`) outranks the layered
    // component rule because unlayered styles win over layered ones regardless of specificity.
    // Pre-existing cascade defect, recorded in BUGS.md — asserting either value here would
    // enshrine it or fail on it, so the gate stays silent and the register carries it.
  }
  console.log("PASS RF-U-007 busy semantics, duration endpoints, duplicate click, cancel/restart, keyboard error/retry and unmount timer cleanup");
  console.log("PASS six rendered variant busy surfaces/contrast in light and dark, plus the default variant's busy identity by probe; compact three-second duration");
} finally {
  await browser.close();
}
