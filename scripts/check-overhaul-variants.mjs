import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [name, ...value] = arg.replace(/^--/, "").split("=");
  return [name, value.join("=") || "true"];
}));
const registry = JSON.parse(fs.readFileSync("registry.json", "utf8"));
const requested = JSON.parse(fs.readFileSync("verification/overhaul-scope.json", "utf8")).components;
const ids = args.ids ? args.ids.split(",") : requested;
const entries = ids.map((id) => {
  const entry = registry.items.find((item) => item.name === id);
  assert(entry && requested.includes(id), `Unknown requested entry: ${id}`);
  return {
    id,
    variants: [...new Set(["default", ...entry.meta.source.variants])],
    selectedVariants: [...new Set(["default", ...entry.meta.source.variants])].filter((value) => !args.variants || args.variants.split(",").includes(value)),
    sizes: [...new Set(["default", ...entry.meta.source.sizes])],
  };
});
for (const entry of entries) assert(entry.selectedVariants.length, `No selected variants for ${entry.id}`);
const output = path.resolve(args.output || "output/playwright/overhaul-variants");
const base = (args.url || "http://127.0.0.1:4320/sahajiv-ui").replace(/\/$/, "");
fs.mkdirSync(output, { recursive: true });
const run = {
  started: new Date().toISOString(), url: base,
  scope: { entries: ids, contexts: [{ width: 390, theme: "dark" }, { width: 1440, theme: "light" }], coverage: args.variants ? `Targeted variants ${args.variants} x all documented sizes in both contexts.` : "Full documented variant x size cross-product in both contexts. Existing examples only; no synthetic content or controls." },
  expectedCases: entries.reduce((n, entry) => n + entry.selectedVariants.length * entry.sizes.length * 2, 0),
  entries: [],
};
const save = () => fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(run, null, 2));
const browser = await chromium.launch({ headless: true });
const surfaces = [];
for (const contextInfo of run.scope.contexts) {
  const context = await browser.newContext({ viewport: { width: contextInfo.width, height: 1000 }, colorScheme: contextInfo.theme });
  await context.addInitScript((theme) => localStorage.setItem("sahajiv-docs-theme", theme), contextInfo.theme);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  surfaces.push({ ...contextInfo, context, page, errors });
}

async function ready(page, entry, variant, size) {
  const specimen = page.locator(`[data-example="${entry.id}"][data-variant="${variant}"][data-size="${size}"]:not([data-motion-exiting="true"])`);
  await specimen.waitFor({ state: "visible", timeout: 30000 });
  await specimen.locator("[data-slot]").first().waitFor({ state: "attached", timeout: 30000 });
  await specimen.getByText("Loading preview…", { exact: true }).waitFor({ state: "hidden", timeout: 30000 });
  await page.locator(`[data-example="${entry.id}"][data-motion-exiting="true"]`).waitFor({ state: "detached", timeout: 5000 });
  await page.waitForFunction(({ id, variant, size }) => {
    const nodes = [...document.querySelectorAll(`[data-example="${id}"]`)];
    const el = nodes[0];
    return nodes.length === 1 && el.dataset.variant === variant && el.dataset.size === size && !el.inert && getComputedStyle(el).opacity === "1";
  }, { id: entry.id, variant, size }, { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return specimen;
}

async function navigate(surface, entry) {
  const { page } = surface;
  const attempts = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await page.goto(`${base}/docs/${entry.id}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
      assert.equal(response.status(), 200);
      const preview = page.locator('[data-slot="preview"]').first();
      await preview.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
      await preview.getByRole("tab", { name: "Code", exact: true }).first().click();
      await preview.locator("pre").first().waitFor();
      await preview.getByRole("tab", { name: "Preview", exact: true }).first().click();
      await ready(page, entry, "default", "default");
      await page.waitForFunction((theme) => document.documentElement.dataset.mode === theme, surface.theme);
      for (const [label, values] of [["Variant", entry.variants], ["Size", entry.sizes]]) {
        const select = page.locator(".docs-playground-controls").getByLabel(label, { exact: true });
        if (values.length > 1) assert.deepEqual(await select.locator("option").evaluateAll((options) => options.map((option) => option.value)), values);
        else assert.equal(await select.count(), 0, `${label}: unexpected control`);
      }
      return attempts;
    } catch (error) {
      attempts.push({ attempt: attempt + 1, error: error.message, reason: "Navigation/readiness retry during shared development; original failure preserved" });
      if (attempt === 1) throw Object.assign(error, { attempts });
      await page.goto("about:blank");
    }
  }
}

async function measure(specimen) {
  return specimen.evaluate((root) => {
    const visible = (e) => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !e.closest('[hidden],[aria-hidden="true"],[inert]');
    };
    const selector = 'button,input:not([type="hidden"]),textarea,select,a[href],[role="button"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="combobox"],[role="tab"],[role="menuitem"],[tabindex="0"]';
    const controls = [...root.querySelectorAll(selector)].filter(visible).map((e) => {
      const r = e.getBoundingClientRect();
      const labels = e.labels ? [...e.labels].map((label) => label.textContent.trim()).join(" ") : "";
      const labelled = (e.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => document.getElementById(id)?.textContent.trim() || "").join(" ").trim();
      const name = e.getAttribute("aria-label") || labelled || labels || e.getAttribute("alt") || e.textContent.trim() || e.getAttribute("title") || "";
      let clipping = null;
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p), pr = p.getBoundingClientRect();
        if (/auto|scroll/.test(s.overflowX) && (r.left < pr.left - 1 || r.right > pr.right + 1)) { clipping = p.getAttribute("data-slot") || p.tagName; break; }
      }
      return { tag: e.tagName, slot: e.getAttribute("data-slot"), role: e.getAttribute("role"), type: e.getAttribute("type"), name: name.slice(0, 120), disabled: e.matches(":disabled") || e.getAttribute("aria-disabled") === "true", rect: { x: r.x, y: r.y, width: r.width, height: r.height }, pageOverflow: r.left < -1 || r.right > innerWidth + 1, scrollContainer: clipping };
    });
    const r = root.getBoundingClientRect();
    const texts = [...root.querySelectorAll('p,small,label,[data-slot$="description"],[data-slot$="body"]')].filter(visible).map((e) => e.textContent.trim()).filter(Boolean);
    return {
      documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      specimen: { x: r.x, width: r.width, height: r.height, clientWidth: root.clientWidth, scrollWidth: root.scrollWidth },
      controls, emptyNames: controls.filter((control) => !control.name),
      escapedControls: controls.filter((control) => control.pageOverflow && !control.scrollContainer),
      scrollableControls: controls.filter((control) => control.pageOverflow && control.scrollContainer),
      disabledControls: controls.filter((control) => control.disabled).length,
      longContent: texts.filter((text) => text.length > 120).map((text) => ({ length: text.length, sample: text.slice(0, 140) })),
      visibleText: root.innerText.trim(),
    };
  });
}

async function inspectCase(surface, entry, variant, size) {
  const { page, width, theme, errors } = surface;
  errors.length = 0;
  const record = { variant, size, width, theme, status: "pending" };
  try {
    if (entry.variants.length > 1) await page.locator(".docs-playground-controls").getByLabel("Variant", { exact: true }).selectOption(variant);
    if (entry.sizes.length > 1) await page.locator(".docs-playground-controls").getByLabel("Size", { exact: true }).selectOption(size);
    const specimen = await ready(page, entry, variant, size);
    await specimen.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    record.metrics = await measure(specimen);
    record.accessibility = await specimen.ariaSnapshot();
    const enabled = specimen.locator('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[role="slider"],[role="tab"]').filter({ visible: true }).first();
    if (await enabled.count()) {
      await enabled.hover();
      await enabled.focus();
      record.focusedControl = { tag: await enabled.evaluate((e) => e.tagName), focused: await enabled.evaluate((e) => e === document.activeElement), name: (await enabled.ariaSnapshot()).slice(0, 160) };
      const focusMetrics = await measure(specimen);
      record.focusEscapedControls = focusMetrics.escapedControls;
      await page.mouse.move(1, 1);
      await enabled.blur();
    }
    // Exercise a real native disabled control through pointer input. Never dispatch synthetic events.
    const disabled = specimen.locator('button:disabled,input:disabled,select:disabled,textarea:disabled').filter({ visible: true }).first();
    if (await disabled.count()) {
      await disabled.scrollIntoViewIfNeeded();
      const before = await specimen.innerText();
      const box = await disabled.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      record.disabledPointer = { nativeDisabled: await disabled.isDisabled(), textUnchanged: before === await specimen.innerText() };
    }
    await page.mouse.move(1, 1);
    // A focus-open popup may remain open after native blur. Restore its real
    // resting state so a specimen crop is not mistaken for portal clipping.
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    // The selected preview may be settled while a focused child is still exiting.
    await page.waitForTimeout(550);
    record.screenshot = `${entry.id}--${variant}--${size}--${width}-${theme}.png`;
    await specimen.screenshot({ path: path.join(output, record.screenshot), caret: "hide" });
    record.errors = [...errors];
    record.status = record.metrics.documentWidth > width + 1 || record.metrics.escapedControls.length || record.metrics.emptyNames.length || record.focusEscapedControls?.length || record.disabledPointer?.textUnchanged === false || errors.length ? "issue" : "pass";
  } catch (error) {
    record.status = "failed";
    record.error = error.message;
    record.errors = [...errors];
    record.screenshot = `${entry.id}--${variant}--${size}--${width}-${theme}--failed.png`;
    await page.screenshot({ path: path.join(output, record.screenshot) }).catch(() => {});
  }
  return record;
}

try {
  for (const entry of entries) {
    const record = { ...entry, expectedCases: entry.selectedVariants.length * entry.sizes.length * 2, cases: [] };
    run.entries.push(record);
    await Promise.all(surfaces.map(async (surface) => {
      let navigation;
      try { navigation = await navigate(surface, entry); }
      catch (error) {
        for (const variant of entry.selectedVariants) for (const size of entry.sizes) record.cases.push({ variant, size, width: surface.width, theme: surface.theme, status: "failed", error: error.message, navigationRetries: error.attempts });
        return;
      }
      for (const variant of entry.selectedVariants) for (const size of entry.sizes) {
        const result = await inspectCase(surface, entry, variant, size);
        if (navigation.length) result.navigationRetries = navigation;
        record.cases.push(result);
        save();
        if (result.status !== "pass") console.log(JSON.stringify({ id: entry.id, variant, size, width: surface.width, status: result.status, error: result.error, emptyNames: result.metrics?.emptyNames, escaped: result.metrics?.escapedControls }));
      }
      await surface.page.goto("about:blank");
    }));
    console.log(JSON.stringify({ id: entry.id, cases: record.cases.length, expected: record.expectedCases, issues: record.cases.filter((item) => item.status !== "pass").length }));
    save();
  }
} finally {
  await browser.close();
  run.finished = new Date().toISOString();
  run.counts = { expected: run.expectedCases, captured: run.entries.flatMap((entry) => entry.cases).length, pass: run.entries.flatMap((entry) => entry.cases).filter((item) => item.status === "pass").length, issues: run.entries.flatMap((entry) => entry.cases).filter((item) => item.status === "issue").length, failed: run.entries.flatMap((entry) => entry.cases).filter((item) => item.status === "failed").length };
  save();
}
console.log(JSON.stringify(run.counts));
process.exitCode = run.counts.issues || run.counts.failed ? 1 : 0;
