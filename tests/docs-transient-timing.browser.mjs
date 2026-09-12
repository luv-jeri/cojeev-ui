/** Run the actual catalogue cases with delayed driver calls or broken browser paint/cleanup. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const negative = process.argv.includes("--negative");
function requireInterventions(observed, isNegative) {
  const expected = isNegative
    ? ["retain-cancelled-timer", "hide-ring", "opaque-reveal"]
    : ["clock-setup", "stop-generation", "next-moment", "replay-reveal"];
  assert.deepEqual([...new Set(observed)].sort(), expected.sort(), "Every expected intervention must run");
}
if (process.argv.includes("--check-intervention-guard")) {
  let rejected = 0;
  for (const [mode, ids] of [
    [false, ["clock-setup", "stop-generation", "next-moment", "replay-reveal"]],
    [true, ["retain-cancelled-timer", "hide-ring", "opaque-reveal"]],
  ]) {
    requireInterventions(ids, mode);
    for (const missing of ids) {
      assert.throws(() => requireInterventions(ids.filter(id => id !== missing), mode), { code: "ERR_ASSERTION" }, `Missing ${missing} must be rejected`);
      rejected++;
    }
  }
  console.log(JSON.stringify({ guard: "pass", completeModes: 2, missingIdsRejected: rejected }));
  process.exit(0);
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = path.resolve(process.argv.find(arg => arg.startsWith("--output="))?.slice(9) ?? (negative ? "output/playwright/transient-negative" : "output/playwright/transient-delayed"));
process.argv = [process.argv[0], "scripts/check-docs.mjs", "--serve", "--ids=agent-chat,guided-pointer,text-reveal", "--widths=1440", "--themes=light", `--output=${output}`];

// Intercept only test-driver boundaries; all interactions still call Playwright's
// real native click. Nothing in the shipped app or its timings is modified.
const probeBrowser = await chromium.launch();
const probePage = await probeBrowser.newPage();
const locatorPrototype = Object.getPrototypeOf(probePage.locator("body"));
const pagePrototype = Object.getPrototypeOf(probePage);
const clockPrototype = Object.getPrototypeOf(probePage.clock);
const realClick = locatorPrototype.click;
const realGoto = pagePrototype.goto;
const realPauseAt = clockPrototype.pauseAt;
await probeBrowser.close();
const injected = [];
clockPrototype.pauseAt = async function (...args) {
  if (!negative) { injected.push("clock-setup"); await delay(2500); }
  return realPauseAt.apply(this, args);
};
locatorPrototype.click = async function (options) {
  const description = this.toString();
  const named = name => description.includes(`name: '${name}'`);
  let clearTimeout;
  if (negative && named("Stop generation")) {
    clearTimeout = await this.page().evaluateHandle(() => window.clearTimeout);
    await this.page().evaluate(() => { window.clearTimeout = () => {}; });
    injected.push("retain-cancelled-timer");
  }
  try {
    if (!negative && named("Stop generation")) {
      injected.push("stop-generation");
      await delay(2500);
    }
    const result = await realClick.call(this, options);
    if (!negative && ["Replay reveal", "Next moment"].some(named)) {
      injected.push(named("Replay reveal") ? "replay-reveal" : "next-moment");
      await delay(2500);
    }
    return result;
  } finally {
    if (clearTimeout) {
      await this.page().evaluate(original => { window.clearTimeout = original; }, clearTimeout);
      await clearTimeout.dispose();
    }
  }
};
pagePrototype.goto = async function (...args) {
  const response = await realGoto.apply(this, args);
  if (negative) {
    if (new URL(this.url()).pathname.endsWith("/text-reveal/")) {
      await this.addStyleTag({ content: '[data-reveal-word] { opacity: 1 !important; }' });
      injected.push("opaque-reveal");
    }
    if (new URL(this.url()).pathname.endsWith("/guided-pointer/")) {
      await this.addStyleTag({ content: '[data-slot="guided-pointer-ring"] { opacity: 0 !important; }' });
      injected.push("hide-ring");
    }
  }
  return response;
};
try {
  await import("../scripts/check-docs.mjs");
} finally {
  locatorPrototype.click = realClick;
  pagePrototype.goto = realGoto;
  clockPrototype.pauseAt = realPauseAt;
}
const results = JSON.parse(fs.readFileSync(path.join(output, "results.json"), "utf8"));
assert.deepEqual(results.revisionEnd, results.revisionStart, "Source provenance must remain stable, including negative runs");
assert.equal(results.harnessEndSha256, results.harnessSha256, "The gate must not change during verification");
assert.equal(results.entries.length, 3);
requireInterventions(injected, negative);
for (const entry of results.entries) {
  assert(entry.layouts.every(layout => layout.status === "pass"), `${entry.id} layouts`);
  assert.equal(entry.preview.status, "pass", `${entry.id} shared preview`);
  assert.equal(entry.runtimeErrors.length, 0, `${entry.id} runtime errors`);
  if (!negative) assert.equal(entry.behavior.status, "pass", `${entry.id}: ${entry.behavior.detail}`);
  else {
    const expected = {
      "agent-chat": "Cancelled timer must not reopen permission",
      "guided-pointer": "Arrival produces a finite visible ring",
      "text-reveal": "Replay produces a visible intermediate word opacity",
    };
    assert.equal(entry.behavior.status, "failed", `${entry.id} must reject broken behavior`);
    assert(entry.behavior.detail.includes(expected[entry.id]), `${entry.id} failed for the intended reason: ${entry.behavior.detail}`);
  }
}
assert(results.chrome.every(check => check.status === "pass"));
if (negative) process.exitCode = 0; // The exact three substantive rejections above are the expected result.
console.log(JSON.stringify({ mode: negative ? "negative" : "delayed", injected, output, pass: true }));
