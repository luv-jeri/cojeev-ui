import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTextLines } from "../registry/sahajiv/lib/text-lines";
import { relayIndex, relayRank, relayTiming } from "../registry/sahajiv/lib/text-relay";

test("measured lines preserve original Unicode and explicit empty lines", () => {
  const text = "A 👩‍👩‍👧‍👦\n\nनमस्ते";
  const units = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), ({ segment, index }) => ({ start: index, end: index + segment.length, top: index < 2 ? 0 : 24 }));
  assert.deepEqual(groupTextLines(text, units).map(line => line.text), ["A ", "👩‍👩‍👧‍👦", "", "नमस्ते"]);
});

test("fractional baseline variations stay together, real row changes split", () => {
  assert.deepEqual(groupTextLines("abcd", [0, .2, .1, 32].map((top, start) => ({ top, start, end: start + 1 }))).map(line => line.text), ["abc", "d"]);
  assert.deepEqual(groupTextLines("", []), []);
});

test("relay navigation remains bounded for empty and invalid inputs", () => {
  assert.equal(relayIndex(20, 3), 2);
  assert.equal(relayIndex(-10, 3), 0);
  assert.equal(relayIndex(NaN, 3), 0);
  assert.equal(relayIndex(Infinity, 0), 0);
});

test("center and edge stagger ranks are symmetric for odd and even counts", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(i => relayRank(i, 5, "center")), [2, 1, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3].map(i => relayRank(i, 4, "edges")), [0, 1, 1, 0]);
  assert.deepEqual([0, 1, 2].map(i => relayRank(i, 3, "last")), [2, 1, 0]);
});

test("long sequences compress their whole stagger window evenly", () => {
  const long = relayTiming(650, 120, 1001);
  assert.equal(long.window, 1150);
  assert.equal(long.step, .0005);
  assert.equal(relayTiming(-8, -5, 1).duration, 0);
});
