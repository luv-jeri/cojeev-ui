/** Real native controls, interruption continuity, outgoing presence, and quiet-mode proof. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.env.BASE_URL || "http://127.0.0.1:4335/cojeev-ui").replace(/\/$/, "");
const output = "output/playwright/000h-assembly";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
// The assembly now lives on its own documentation page; that is the real consumer to drive.
const docsSelector = '[data-example-role="interactive"] [data-slot="organism-assembly"]';
let selector = docsSelector;
const assembly = () => page.locator(selector).first();
const composition = () => assembly().locator('[data-slot="organism-composition"]');
async function ready(kind) {
  await composition().evaluate((node, expected) => new Promise((resolve, reject) => {
    const start = performance.now();
    function check() {
      if (node.dataset.kind === expected && node.dataset.assembled === "true" && node.dataset.settled === "true") resolve(true);
      else if (performance.now() - start > 12000) reject(new Error(`Did not settle: ${expected}`));
      else requestAnimationFrame(check);
    }
    check();
  }), kind);
}
const choose = async (label, kind) => { await assembly().getByRole("button", { name: label, exact: true }).click(); await ready(kind); };
function mark(check, evidence = {}) { results.push({ check, ...evidence }); console.log(`Verified: ${check}`); }
try {
  await page.goto(`${base}/docs/organism-assembly/`, { waitUntil: "domcontentloaded" });
  await assembly().waitFor();
  await assembly().evaluate(node => node.scrollIntoView({ block: "center" }));
  await assembly().locator(".v-morph-live").first().waitFor();
  assert.equal(await assembly().locator("[data-assembly-choice]").count(), 6);
  const opening = assembly().getByRole("button", { name: "Assemble", exact: true });
  if (await opening.count() && await opening.isEnabled()) await opening.click();
  await choose("Focus", "focus");
  await composition().getByRole("button", { name: "Start focusing", exact: true }).click();
  await composition().getByRole("button", { name: "Pause", exact: true }).waitFor();
  const reversal = await assembly().evaluate(async root => {
    const part = root.querySelector('[data-assembly-part="primary"]');
    const sample = () => ({ x: parseFloat(part.style.left), y: parseFloat(part.style.top), width: parseFloat(part.style.width), opacity: parseFloat(getComputedStyle(part).getPropertyValue("--assembly-content-opacity")), released: part.dataset.assemblyReleased, inert: part.inert });
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const press = label => [...root.querySelectorAll(".v-organism-assembly__transport button")].find(button => button.textContent.trim() === label).click();
    const origin = sample();
    press("Scatter");
    const start = performance.now();
    while (performance.now() - start < 150) await frame();
    const before = sample();
    press("Assemble");
    await frame();
    const after = sample();
    const frames = [];
    for (let index = 0; index < 24; index++) { await frame(); frames.push(sample()); }
    return { origin, before, after, frames, sameRoot: part === root.querySelector('[data-assembly-part="primary"]') };
  });
  assert(reversal.sameRoot, "Reversal retains the live native button");
  assert.equal(reversal.after.released, "false", "Returning to an old destination must not reuse its finished state");
  assert(Math.hypot(reversal.after.x - reversal.before.x, reversal.after.y - reversal.before.y) < 30, "Reversal continues from the displayed position");
  assert(Math.abs(reversal.after.opacity - reversal.before.opacity) < .2, "Visible labels do not reset on reversal");
  assert(reversal.frames.some(frame => frame.opacity > .1 && frame.opacity < .95), "Text fades continuously into the gathered control");
  await ready("focus");
  await composition().getByRole("button", { name: "Pause", exact: true }).click();
  await composition().getByRole("button", { name: "Resume", exact: true }).waitFor();
  mark("rapid reversal preserves geometry, text fade, native identity, and running timer state", { reversal });

  await assembly().getByRole("button", { name: "Replay assembly" }).click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1800);
  await assembly().scrollIntoViewIfNeeded();
  await ready("focus");
  mark("replay completes after scrolling away and returning");

  await choose("Chat", "chat");
  await composition().getByRole("textbox", { name: "Your message" }).fill("A thought worth keeping.");
  await composition().getByRole("button", { name: "Send message", exact: true }).click();
  await composition().getByRole("log").getByText("A thought worth keeping.", { exact: false }).waitFor();
  await assembly().getByRole("button", { name: "Focus", exact: true }).click();
  await composition().locator('[data-assembly-part="thread"][data-assembly-exiting="true"]').waitFor();
  await ready("focus");
  await composition().locator('[data-assembly-exiting="true"]').waitFor({ state: "hidden" });
  await choose("Chat", "chat");
  await composition().getByRole("log").getByText("A thought worth keeping.", { exact: false }).waitFor();
  mark("outgoing pieces travel away before removal and chat state survives composition changes");

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 1000 : 1050 });
    await assembly().scrollIntoViewIfNeeded();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => { document.documentElement.dataset.mode = value; }, theme);
      for (const [label, kind] of [["Focus", "focus"], ["Panel", "side-panel"], ["Chat", "chat"]]) {
        await choose(label, kind);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await assembly().screenshot({ path: `${output}/${width}-${theme}-${kind}.png` });
      }
    }
  }
  await assembly().getByRole("button", { name: "Scatter", exact: true }).click();
  await page.waitForTimeout(550);
  await assembly().screenshot({ path: `${output}/390-dark-scattered.png` });
  const pixels = await composition().locator("canvas").evaluate(canvas => [...canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data].filter((_, i) => i % 4 === 3).filter(alpha => alpha > 0).length);
  assert(pixels > 100, "The decorative particle layer renders visible seeds during travel");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready("chat");
  assert(await assembly().getByRole("button", { name: "Replay assembly" }).isDisabled());
  assert(await composition().locator("[data-assembly-part]").evaluateAll(parts => parts.every(part => part.style.clipPath === "")));
  const quietPixels = await composition().locator("canvas").evaluate(canvas => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((alpha, index) => index % 4 === 3 && alpha > 0));
  assert.equal(quietPixels, false, "Reduced motion clears the particle scene");
  await composition().getByRole("textbox", { name: "Your message" }).fill("Still useful when quiet.");
  await composition().getByRole("textbox", { name: "Your message" }).press("Enter");
  await composition().getByRole("log").getByText("Still useful when quiet.", { exact: false }).waitFor();
  mark("all documented compositions fit mobile and desktop in both themes; reduced motion clears particles and retains controls", { renderedParticlePixels: pixels });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto(`${base}/docs/organism-assembly/`, { waitUntil: "domcontentloaded" });
  await assembly().scrollIntoViewIfNeeded();
  await assembly().locator(".v-morph-live").first().waitFor();
  assert.equal(await assembly().locator("[data-assembly-choice]").count(), 6);
  await assembly().getByRole("button", { name: "Assemble", exact: true }).click();
  await ready("profile");
  await composition().getByRole("button", { name: "Message", exact: true }).click();
  await ready("profile");
  const input = composition().getByRole("textbox", { name: "Write a note" });
  await input.waitFor();
  assert(await input.evaluate(node => node === document.activeElement), "Expanding geometry settles before focusing its real input");
  await input.fill("Keep this draft.");
  await assembly().getByRole("button", { name: "Replay assembly" }).click();
  await ready("profile");
  assert.equal(await input.inputValue(), "Keep this draft.");
  await choose("Dock", "dock");
  await composition().getByRole("button", { name: "Files", exact: true }).click();
  assert.equal(await composition().getByRole("button", { name: "Files", exact: true }).getAttribute("aria-pressed"), "true");
  await choose("Invite", "invite");
  await composition().getByRole("button", { name: "I'll be there", exact: true }).click();
  await composition().getByRole("button", { name: "Count me in", exact: true }).waitFor();
  mark("full six-composition documentation retains profile expansion, input drafts, dock selection, and RSVP");
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ base, passed: true, results, errors }, null, 2));
} finally { await browser.close(); }
