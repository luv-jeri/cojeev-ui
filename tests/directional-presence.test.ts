import assert from "node:assert/strict";
import test from "node:test";
import { flowSlideTravel } from "../registry/sahajiv/motion/flow";
const rect = { left: 680, right: 980, top: 24, bottom: 776 };
const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
test("inline travel clears the selected viewport edge including its resting inset", () => {
  assert.deepEqual(flowSlideTravel(rect, viewport, "slide-inline", "end", "ltr"), { x: 320, y: 0 });
  assert.deepEqual(flowSlideTravel({ ...rect, left: 20, right: 320 }, viewport, "slide-inline", "start", "ltr"), { x: -320, y: 0 });
  assert.deepEqual(flowSlideTravel({ ...rect, left: 20, right: 320 }, viewport, "slide-inline", "end", "rtl"), { x: -320, y: 0 });
  assert.deepEqual(flowSlideTravel(rect, viewport, "slide-inline", "start", "rtl"), { x: 320, y: 0 });
});
test("block travel clears bottom docks and a shifted visual viewport", () => {
  assert.deepEqual(flowSlideTravel({ left: 16, right: 984, top: 500, bottom: 750 }, viewport, "slide-block"), { x: 0, y: 300 });
  assert.deepEqual(flowSlideTravel(rect, { left: 100, top: 50, right: 900, bottom: 700 }, "slide-inline", "start", "ltr"), { x: -880, y: 0 });
  assert.deepEqual(flowSlideTravel({ ...rect, top: 900 }, viewport, "slide-block"), { x: 0, y: 0 });
});
