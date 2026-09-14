import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, LAUNCH_DURATION_MS } from "./src/countdown.mjs";

const startedAt = "2026-10-01T12:00:00.000Z";
const start = Date.parse(startedAt);
test("local preview stays at thirty days without starting a visitor clock", () => {
  assert.deepEqual(countdown(null, start), countdown(null, start + 123456789));
  assert.deepEqual(countdown(null), { state: "preview", days: 30, hours: 0, minutes: 0, seconds: 0 });
});
test("all visitors count down from the same publication instant", () => {
  assert.deepEqual(countdown(startedAt, start + 90061000), { state: "counting", days: 28, hours: 22, minutes: 58, seconds: 59 });
});
test("thirty days are exact regardless of calendar month and time zone", () => {
  assert.equal(LAUNCH_DURATION_MS, 2592000000);
  assert.equal(countdown(startedAt, start + LAUNCH_DURATION_MS - 1).seconds, 1);
});
test("expiry is truthful and never becomes negative or claims product availability", () => {
  assert.deepEqual(countdown(startedAt, start + LAUNCH_DURATION_MS + 1000), { state: "elapsed", days: 0, hours: 0, minutes: 0, seconds: 0 });
});
test("invalid configuration and future starts remain bounded", () => {
  assert.equal(countdown("bad date", start).state, "preview");
  assert.equal(countdown(startedAt, start - 60000).days, 30);
});
