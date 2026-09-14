/**
 * A behavior case that installs a Playwright clock must not disturb the cases that
 * follow it in the same worker. `page.clock` is the browser context's clock: each
 * call is kept as a context init script and replayed into every page opened later,
 * and the client API has no uninstall, so closing the page leaves fake `Date`,
 * `setTimeout` and `requestAnimationFrame` behind. The catalogue order below runs
 * agent-chat ahead of attachment and bar-chart, and button ahead of empty;
 * those later cases need a real exit animation to finish.
 *
 * `--negative` restores the previous lifetime — one behavior context kept for the
 * whole worker — and requires those three cases to fail for their own stated
 * reasons. `--probe` records the leak itself, without the catalogue.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const negative = process.argv.includes("--negative");
// The release job serves the static export itself; --url= only lets a local run
// reuse an already-served build instead of starting a second preview server.
const url = process.argv.find(arg => arg.startsWith("--url="));

// Evidence for the cause, independent of the catalogue: a clock installed through
// one page is still installed for the next page of the same context, and is gone
// in a fresh context. This is what makes retiring the page alone insufficient.
if (process.argv.includes("--probe")) {
  const browser = await chromium.launch();
  const timers = page => page.evaluate(() => ({
    date: String(Date.now).includes("[native code]"),
    timeout: String(setTimeout).includes("[native code]"),
    frame: String(requestAnimationFrame).includes("[native code]"),
  }));
  const native = state => state.date && state.timeout && state.frame;
  try {
    const context = await browser.newContext();
    const owner = await context.newPage();
    assert(native(await timers(owner)), "A new context starts with the real browser clock");
    const instant = new Date("2020-01-01T00:00:00Z");
    await owner.clock.install({ time: instant });
    try {
      await owner.clock.setFixedTime(instant);
      await owner.clock.pauseAt(instant);
      await owner.clock.runFor(1000);
    } finally {
      try { await owner.clock.setSystemTime(new Date()); } finally { await owner.clock.resume(); }
    }
    assert(!native(await timers(owner)), "The owning page holds the fake clock");
    await owner.close();
    const successor = await context.newPage();
    assert(!native(await timers(successor)), "A clock installed through one page outlives that page");
    await context.close();
    const clean = await browser.newContext();
    assert(native(await timers(await clean.newPage())), "A fresh context is the only clean state available");
    await clean.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ probe: "pass", scope: "clock outlives its page, not its context" }));
  process.exit(0);
}

const output = path.resolve(
  process.argv.find(arg => arg.startsWith("--output="))?.slice(9)
    ?? (negative ? "output/playwright/clock-isolation-negative" : "output/playwright/clock-isolation"),
);
const ids = ["agent-chat", "attachment", "bar-chart", "button", "empty"];
process.argv = [
  process.argv[0],
  "scripts/check-docs.mjs",
  url ?? "--serve",
  `--ids=${ids.join(",")}`,
  "--widths=1440",
  "--themes=light",
  `--output=${output}`,
];

const probeBrowser = await chromium.launch();
const probePage = await probeBrowser.newPage();
const browserPrototype = Object.getPrototypeOf(probeBrowser);
const contextPrototype = Object.getPrototypeOf(probePage.context());
await probeBrowser.close();
const realNewContext = browserPrototype.newContext;
const realContextClose = contextPrototype.close;
let reusedContexts = 0;
let suppressedCloses = 0;
if (negative) {
  // Hand back the first behavior context for the rest of the run and keep it
  // open, which is exactly the lifetime the harness had before this repair.
  // Nothing in the application, the cases or their timings is modified.
  let retained = null;
  browserPrototype.newContext = async function (options) {
    if (retained) { reusedContexts++; return retained; }
    retained = await realNewContext.call(this, options);
    return retained;
  };
  contextPrototype.close = async function (...args) {
    if (this === retained) { suppressedCloses++; return; }
    return realContextClose.call(this, ...args);
  };
}
try {
  await import("../scripts/check-docs.mjs");
} finally {
  browserPrototype.newContext = realNewContext;
  contextPrototype.close = realContextClose;
}

const results = JSON.parse(fs.readFileSync(path.join(output, "results.json"), "utf8"));
assert.deepEqual(results.revisionEnd, results.revisionStart, "Source provenance must remain stable, including negative runs");
assert.equal(results.harnessEndSha256, results.harnessSha256, "The gate must not change during verification");
assert.deepEqual(results.entries.map(entry => entry.id), ids, "Both clock owners must run before the cases that depend on finished exits");
assert.equal(reusedContexts, negative ? ids.length : 0, "The negative control must reuse one behavior context for every entry");
assert.equal(suppressedCloses, negative ? ids.length : 0, "The negative control must keep that context open across entries");

// Failing for the wrong reason is not a negative control: name the assertion each
// leaked clock actually breaks, so an unrelated defect cannot satisfy this.
const leakSignature = {
  attachment: "Restore attachment",
  "bar-chart": "to be hidden",
  empty: "Your first note",
};
for (const entry of results.entries) {
  assert(entry.layouts.every(layout => layout.status === "pass"), `${entry.id} layouts`);
  assert.equal(entry.preview.status, "pass", `${entry.id} shared preview`);
  assert.equal(entry.runtimeErrors.length, 0, `${entry.id} runtime errors`);
  if (!negative || !leakSignature[entry.id]) {
    assert.equal(entry.behavior.status, "pass", `${entry.id}: ${entry.behavior.detail}`);
    continue;
  }
  assert.equal(entry.behavior.status, "failed", `${entry.id} must reject a leaked context clock`);
  assert(
    entry.behavior.detail.includes(leakSignature[entry.id]),
    `${entry.id} failed for the intended reason: ${entry.behavior.detail}`,
  );
}
assert(results.chrome.every(check => check.status === "pass"));
if (negative) process.exitCode = 0; // The three substantive rejections above are the expected result.
console.log(JSON.stringify({ mode: negative ? "negative" : "isolated", ids, reusedContexts, output, pass: true }));
