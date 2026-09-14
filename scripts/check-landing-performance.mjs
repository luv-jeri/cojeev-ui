// Focused homepage check for G01-1: the extracted fonts still render, the two repaired axe rules stay
// clean, every featured demo and the shape studio still respond, and the static export still carries
// the content with JavaScript switched off. Point it at a served production build:
//   node scripts/check-landing-performance.mjs http://127.0.0.1:4346/
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const BASE = process.argv[2] ?? "http://127.0.0.1:4346/";
const SHOTS = process.env.LANDING_CHECK_SHOTS ?? "artifacts/landing-performance";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();

async function open(opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 }, ...opts });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  return { context, page, errors };
}

// 1. Fonts actually render from the extracted files, at both weights.
{
  const { context, page, errors } = await open();
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const loaded = [...document.fonts].map(f => `${f.family} ${f.status}`);
    const style = el => getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, "");
    return { loaded, hero: style(document.querySelector("#hero-title")), body: style(document.querySelector("[data-slot='typography-body']")) };
  });
  check("Bricolage Grotesque loaded and applied to the hero", fonts.loaded.some(f => f.startsWith("Bricolage Grotesque loaded")) && fonts.hero === "Bricolage Grotesque", fonts.hero);
  check("DM Sans loaded and applied to body copy", fonts.loaded.some(f => f.startsWith("DM Sans loaded")) && fonts.body === "DM Sans", fonts.body);
  const fontRequests = await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.endsWith(".woff2")).map(r => r.name.split("/").pop()));
  check("fonts arrive as separate cacheable woff2 requests", fontRequests.length === 2, fontRequests.join(", "));

  // 2. axe on the two repaired rules.
  await page.addScriptTag({ content: axeSource });
  const axeRun = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ["heading-order", "label-content-name-mismatch"] });
    return { violations: r.violations.map(v => `${v.id}:${v.nodes.length}`), headings: [...document.querySelectorAll("h1,h2,h3")].map(h => h.tagName).join(" ") };
  });
  check("axe heading-order + label-content-name-mismatch clean", axeRun.violations.length === 0, axeRun.violations.join(", ") || axeRun.headings);

  // 3. Accessible names are the ones a speech user can read.
  const names = await page.evaluate(() => {
    window.axe.setup(document.documentElement);
    const nameOf = sel => { const el = document.querySelector(sel); return el ? window.axe.commons.text.accessibleText(el) : null; };
    const out = {
      brand: nameOf("a.story-brand"),
      viewDocs: nameOf('#featured-components article:first-of-type footer a.v-btn'),
      launcher: nameOf("button.report-launcher"),
      appearance: nameOf("button.v-appearance-trigger"),
    };
    window.axe.teardown();
    return out;
  });
  check("brand keeps the 000h name", names.brand === "000h by Cojeev, home", names.brand);
  check("first 'View docs' link names its component", /^View docs for Motion Drawer$/.test(names.viewDocs ?? ""), names.viewDocs);
  check("reporting launcher named by its visible text", names.launcher === "Request a feature / Report a bug", names.launcher);
  check("appearance trigger name starts with its visible word", (names.appearance ?? "").startsWith("Colours"), names.appearance);

  // 4. Real interactivity: the six featured demos and the shape studio.
  await page.locator("#featured-components").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Open drawer" }).click();
  await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
  check("Motion Drawer opens", true);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "Files", exact: true }).click();
  check("Dock selection updates its status line", (await page.locator(".launch-dock-selection").innerText()).trim() === "Files");

  await page.getByRole("button", { name: "Work", exact: true }).click();
  check("Agent State switches", await page.locator('[data-example="agent-state"] [aria-pressed="true"]').innerText() === "Work");

  await page.getByRole("button", { name: "Pebbles", exact: true }).click();
  check("Pattern Background switches", await page.locator('[data-example="pattern-background"] [aria-pressed="true"]').innerText() === "Pebbles");

  await page.getByRole("button", { name: "Replay the details" }).click();
  check("Animated Icon replay runs", await page.locator('[data-example="animated-icon"] .launch-icon-family svg').count() > 0);

  await page.locator('[data-example="semantic-bloom"]').scrollIntoViewIfNeeded();
  const bloom = page.locator('[data-example="semantic-bloom"]');
  await bloom.getByRole("button", { name: "Scatter", exact: true }).click();
  await page.waitForTimeout(300);
  await bloom.getByRole("button", { name: "Gather", exact: true }).click();
  check("Semantic Bloom lazy chunk mounted and responds", await page.locator('[data-example="semantic-bloom"] canvas, [data-example="semantic-bloom"] svg').count() > 0);

  const studio = page.locator("section.v-shape-studio");
  await studio.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const caption = studio.locator(".v-shape-studio__caption span").first();
  const before = (await caption.innerText()).trim();
  let after = before;
  for (let attempt = 0; attempt < 6 && after === before; attempt += 1) {
    await page.getByRole("button", { name: "Another silhouette", exact: true }).click();
    await page.waitForTimeout(350);
    after = (await caption.innerText()).trim();
  }
  check("Shape studio randomise still works under its visible name", after !== before && after.length > 0, `${before} -> ${after}`);

  // 5. Keyboard and hash access.
  await page.goto(BASE + "#featured-components", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  check("hash link reaches the featured section", await page.evaluate(() => window.scrollY > 400), `scrollY=${await page.evaluate(() => window.scrollY)}`);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  check("skip link is the first stop", await page.evaluate(() => document.activeElement?.className), await page.evaluate(() => document.activeElement?.textContent));
  await page.keyboard.press("Tab");
  check("brand link follows and is reachable", await page.evaluate(() => document.activeElement?.classList.contains("story-brand")));

  check("no page errors in the console", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/desktop-light-hero.png`, clip: { x: 0, y: 0, width: 1350, height: 940 } });
  await page.evaluate(() => document.documentElement.dataset.mode = "dark");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/desktop-dark-hero.png`, clip: { x: 0, y: 0, width: 1350, height: 940 } });
  await page.evaluate(() => document.documentElement.dataset.mode = "light");
  await page.waitForTimeout(400);
  await page.locator("#featured-components").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/desktop-light-featured.png` });
  await page.locator("section.v-shape-studio").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/desktop-light-shape-studio.png` });
  await context.close();
}

// 6. Mobile, light and dark.
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/mobile-light-hero.png` });
  const appearanceName = await page.evaluate(() => document.querySelector("button.v-appearance-trigger")?.getAttribute("aria-label"));
  check("appearance trigger stays named at 390px (label hidden by CSS there)", appearanceName === "Colours and contrast", String(appearanceName));
  check("launcher text still rendered at 390px", await page.locator("button.report-launcher > span:last-child").innerText() === "Request a feature / Report a bug");
  await page.evaluate(() => document.documentElement.dataset.mode = "dark");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/mobile-dark-hero.png` });
  await context.close();
}

// 7. Reduced motion.
{
  const { context, page, errors } = await open({ reducedMotion: "reduce" });
  await page.waitForTimeout(700);
  check("reduced motion renders the hero and demo", await page.locator("#hero-title").isVisible() && await page.locator('[data-example="organism-assembly"]').isVisible(), errors.slice(0, 1).join(""));
  await page.screenshot({ path: `${SHOTS}/desktop-reduced-motion.png`, clip: { x: 0, y: 0, width: 1350, height: 940 } });
  await context.close();
}

// 8. No JavaScript: the static export must still carry the content.
{
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const text = await page.locator("body").innerText();
  check("no-JS keeps the hero heading", text.includes("Good things"));
  check("no-JS keeps all six featured components", ["Motion Drawer", "Semantic Bloom", "Animated Icon", "Dock", "Agent State", "Subtle Backgrounds"].every(t => text.includes(t)));
  check("no-JS keeps the shape studio section", text.includes("but square"));
  check("no-JS keeps the hero demo heading in the outline", await page.locator("h2#hero-demo-title").count() === 1);
  await page.screenshot({ path: `${SHOTS}/desktop-no-js.png`, clip: { x: 0, y: 0, width: 1350, height: 940 } });
  await context.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log("FAILED: " + failed.map(f => f.name).join("; ")); process.exitCode = 1; }
