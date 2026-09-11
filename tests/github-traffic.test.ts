import test from "node:test";
import assert from "node:assert/strict";
import { mergeTrafficSnapshot } from "../scripts/lib/github-traffic.mjs";

test("overlapping GitHub snapshots replace daily counts without inflating totals", () => {
  const one = { clones: { clones: [{ timestamp: "2026-09-09T00:00:00Z", count: 3, uniques: 2 }] }, views: { views: [] }, repository: { stargazers_count: 7, forks_count: 1 } };
  const first = mergeTrafficSnapshot(null, "luv-jeri/cojeev-ui", one, "2026-09-10T01:00:00Z");
  const updated = { ...one, clones: { clones: [{ timestamp: "2026-09-09T00:00:00Z", count: 4, uniques: 2 }, { timestamp: "2026-09-10T00:00:00Z", count: 1, uniques: 1 }] } };
  const second = mergeTrafficSnapshot(first, "luv-jeri/cojeev-ui", updated, "2026-09-10T02:00:00Z");
  assert.equal(second.clones["2026-09-09"].count, 4);
  assert.equal(second.clones["2026-09-10"].count, 1);
  assert.deepEqual(mergeTrafficSnapshot(second, "luv-jeri/cojeev-ui", updated, "2026-09-10T02:00:00Z"), second);
  assert.equal(Object.keys(second.repositoryDaily).length, 1);
});

test("traffic history rejects another repository and malformed API counters", () => {
  const snapshot = { clones: { clones: [] }, views: { views: [] }, repository: { stargazers_count: 1, forks_count: 0 } };
  const existing = mergeTrafficSnapshot(null, "luv-jeri/cojeev-ui", snapshot, "2026-09-10T01:00:00Z");
  assert.throws(() => mergeTrafficSnapshot(existing, "someone/else", snapshot, "2026-09-10T01:00:00Z"), /repository/);
  assert.throws(() => mergeTrafficSnapshot(null, "luv-jeri/cojeev-ui", { ...snapshot, clones: { clones: [{ timestamp: "bad", count: -1, uniques: 0 }] } }, "2026-09-10T01:00:00Z"), /Invalid/);
});
