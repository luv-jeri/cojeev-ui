import assert from "node:assert/strict";
import { test } from "node:test";
import { boundDetail, checkWithOneRetry, docsDetailLimit, docsEntryFailed, docsEntrySummary, docsFailureReasons } from "../scripts/lib/docs-summary.mjs";

const layout = (width, theme, extra = {}) => ({ width, theme, status: "pass", ...extra });
const passing = {
  id: "button",
  layouts: [layout(360, "light"), layout(1440, "dark")],
  preview: { status: "pass", detail: "Exact clipboard, preview/code keyboard controls" },
  behavior: { status: "pass", detail: "Pointer loading preserves busy styling" },
};

// The real message this checkpoint exists for: the click completed and the wait that
// followed it timed out. Whether that barrier is the cause is not settled here; the point
// is only that the stage the run reached must survive into the console line.
const barrier = `locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-slot="preview"]').first().getByRole('tab', { name: 'Preview', exact: true }).first()
    - locator resolved to <button role="tab" type="button" class="${"v-tab shrink-0 ".repeat(40)}">…</button>
  - attempting click action
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish`;

test("a passing entry keeps exactly the fields it had before", () => {
  assert.deepEqual(docsEntrySummary(passing), {
    id: "button",
    layouts: ["360/light:pass", "1440/dark:pass"],
    preview: "pass",
    behavior: "pass",
    detail: "Pointer loading preserves busy styling",
  });
});

test("a failed record carries its layout and preview reasons", () => {
  const summary = docsEntrySummary({
    ...passing,
    id: "shape-scene",
    layouts: [layout(1440, "light"), layout(1440, "dark", { status: "failed", error: "no such tab" })],
    preview: { status: "failed", detail: "Copy code never settled" },
  });
  assert.deepEqual(summary.layoutFailures, { "1440/dark": "no such tab" });
  assert.equal(summary.previewDetail, "Copy code never settled");
  // The pre-existing fields keep their names and meanings.
  assert.deepEqual(summary.layouts, ["1440/light:pass", "1440/dark:failed"]);
  assert.equal(summary.preview, "failed");
  assert.equal(summary.detail, "Pointer loading preserves busy styling");
});

test("a layout recorded as an issue adds no reason it does not have", () => {
  const summary = docsEntrySummary({ ...passing, layouts: [layout(360, "light", { status: "issue" })] });
  assert.equal("layoutFailures" in summary, false);
  assert.equal("previewDetail" in summary, false);
});

test("truncation is bounded and keeps the stage the run reached", () => {
  const bounded = boundDetail(barrier);
  assert(barrier.length > docsDetailLimit, "the fixture must be long enough to truncate");
  assert(bounded.length <= docsDetailLimit, `bounded to ${docsDetailLimit}, got ${bounded.length}`);
  assert(bounded.startsWith("locator.click: Timeout 10000ms exceeded."));
  assert(bounded.endsWith("waiting for scheduled navigations to finish"));
  // In this particular message the element markup happens to sit in the middle, so it does
  // not survive. That is a property of this fixture's shape, not a guarantee the helper
  // makes: it bounds length and does not redact.
  assert(!bounded.includes("<button"), "this fixture's markup sits in the discarded middle");
  assert.equal(boundDetail("short"), "short", "a short message is passed through unchanged");
  const inlineMarkup = `<button class="${"x".repeat(20)}">…</button>`;
  assert.equal(boundDetail(inlineMarkup), inlineMarkup, "a message within the limit is never altered");
});

const recorded = (extra = {}) => ({ ...passing, runtimeErrors: [], ...extra });
const flake = { status: "failed", detail: "locator.click: Timeout 10000ms exceeded." };

test("one verdict covers every way an entry can fail, and nothing else", () => {
  assert.equal(docsEntryFailed(recorded()), false);
  assert.equal(docsEntryFailed(recorded({ behavior: { status: "passive", detail: "No direct action" } })), false);
  assert.equal(docsEntryFailed(recorded({ layouts: [layout(360, "light", { status: "issue" })] })), true);
  assert.equal(docsEntryFailed(recorded({ layouts: [layout(360, "light", { status: "failed" })] })), true);
  assert.equal(docsEntryFailed(recorded({ preview: { status: "failed", detail: "x" } })), true);
  assert.equal(docsEntryFailed(recorded({ behavior: flake })), true);
  assert.equal(docsEntryFailed(recorded({ runtimeErrors: [{ type: "pageerror", message: "boom" }] })), true);
});

test("the failure reasons name every failing part and nothing that passed", () => {
  assert.deepEqual(docsFailureReasons(recorded()), []);
  assert.deepEqual(docsFailureReasons(recorded({ behavior: { status: "passive", detail: "No direct action" } })), []);
  assert.deepEqual(
    docsFailureReasons(recorded({
      layouts: [layout(360, "light"), layout(768, "dark", { status: "issue" }), layout(1440, "dark", { status: "failed", error: "no such tab" })],
      preview: { status: "failed", detail: "Copy code never settled" },
      behavior: flake,
      runtimeErrors: [{ type: "pageerror", message: "boom" }, { type: "console", message: "bang" }],
    })),
    [
      "layout 768/dark issue",
      "layout 1440/dark failed: no such tab",
      "preview failed: Copy code never settled",
      `behavior failed: ${flake.detail}`,
      "runtime errors (2): pageerror boom | console bang",
    ],
  );
});

test("a runtime-only failure is visible on the console line", () => {
  const summary = docsEntrySummary(recorded({ runtimeErrors: [{ type: "pageerror", message: "boom" }] }));
  assert.equal(summary.runtimeErrors, "pageerror boom");
  assert.equal("runtimeErrors" in docsEntrySummary(recorded()), false, "a clean entry keeps its old fields");
});

test("a passing entry is checked once and carries no retry record", async () => {
  const received = [];
  const record = await checkWithOneRetry(async (firstAttempt) => (received.push(firstAttempt), recorded()));
  assert.deepEqual(received, [undefined]);
  assert.equal("firstAttempt" in record, false);
  assert.equal("attempt" in docsEntrySummary(record), false);
});

test("a failed entry is checked once more, given its complete first record", async () => {
  // The first failure is runtime-only: every status passes, so a summary would lose it.
  const first = recorded({ runtimeErrors: [{ type: "pageerror", message: "boom" }] });
  const received = [];
  const record = await checkWithOneRetry(async (firstAttempt) => {
    received.push(firstAttempt);
    return firstAttempt ? recorded({ firstAttempt }) : first;
  });
  assert.deepEqual(received, [undefined, first], "the second check receives the first record itself");
  assert.equal(docsEntryFailed(record), false, "the second attempt decides the verdict");
  assert.equal(record.firstAttempt, first);
  assert.equal(docsEntrySummary(record).attempt, 2, "the console line says which attempt it reports");
});

test("an entry that fails twice stays failed and is never tried a third time", async () => {
  let calls = 0;
  const record = await checkWithOneRetry(async (firstAttempt) => (calls++, recorded({ behavior: flake, ...(firstAttempt && { firstAttempt }) })));
  assert.equal(calls, 2);
  assert.equal(docsEntryFailed(record), true);
  assert.equal(record.firstAttempt.behavior, flake);
});
