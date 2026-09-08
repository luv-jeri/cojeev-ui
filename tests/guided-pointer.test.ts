import assert from "node:assert/strict";
import test from "node:test";
import { normalizePointerPoints, resolvePointerPoint, type GuidedPointerPoint } from "../registry/sahajiv/lib/pointer-geometry";

test("waypoints discard unusable data and retain the first valid stable ID without mutation", () => {
  const input: GuidedPointerPoint[] = [{ id: "bad", x: NaN, y: 0 }, { id: "edge", x: -5, y: 4, click: true }, { id: "edge", x: .5, y: .5 }, { id: " ", x: 0, y: 0 }, { id: "held", x: .2, y: .8, pressed: true }];
  const original = structuredClone(input);
  assert.deepEqual(normalizePointerPoints(input), [{ id: "edge", x: 0, y: 1, click: true }, { id: "held", x: .2, y: .8, pressed: true }]);
  assert.deepEqual(input, original);
});

test("omitted selection differs from an unknown selection and both handle empty data", () => {
  const input = [{ id: "first", x: .2, y: .3 }, { id: "second", x: .7, y: .9 }];
  assert.equal(resolvePointerPoint(input)?.id, "first");
  assert.equal(resolvePointerPoint(input, "second")?.id, "second");
  assert.equal(resolvePointerPoint(input, "missing"), undefined);
  assert.equal(resolvePointerPoint([]), undefined);
});
