import { test } from "node:test";
import assert from "node:assert/strict";
import { createFlowPainter } from "../registry/cojeev/motion/flow-motion";
import { motionClock } from "../registry/cojeev/motion/clock";

globalThis.HTMLElement ??= class {} as typeof HTMLElement;
globalThis.SVGElement ??= class {} as typeof SVGElement;

test("hidden flow layers release their old scroll footprint after fading", async () => {
  motionClock(0);
  const styles = new Map<string, string>();
  const painter = createFlowPainter((name, value) => styles.set(name, value));
  try {
    for (const hover of [false, true]) {
      painter.paint({ x: 0, y: 6200, w: 180, h: 36, r: "8px" }, hover, true);
      painter.hide(hover);
    }
    motionClock(1000);
    await new Promise(resolve => setImmediate(resolve));
    for (const family of ["glide", "trail", "hov"]) {
      assert.equal(styles.get(`--${family}-o`), "0");
      for (const axis of ["x", "y", "w", "h"]) assert.equal(styles.get(`--${family}-${axis}`), "0px");
    }
  } finally { painter.dispose(); motionClock(null); }
});

test("quiet hides immediately release geometry and the next highlight starts at its new item", () => {
  const styles = new Map<string, string>();
  const painter = createFlowPainter((name, value) => styles.set(name, value));
  try {
    painter.paint({ x: 12, y: 6200, w: 180, h: 36, r: "8px" }, true, true);
    painter.hide(true, true);
    assert.equal(styles.get("--hov-y"), "0px");
    painter.paint({ x: 8, y: 40, w: 120, h: 44, r: "8px" }, true);
    assert.equal(styles.get("--hov-y"), "40px");
    assert.equal(styles.get("--hov-h"), "44px");
  } finally { painter.dispose(); }
});

test("a renewed highlight cancels a stale fade completion before it can erase the new geometry", async () => {
  motionClock(0);
  const styles = new Map<string, string>();
  const painter = createFlowPainter((name, value) => styles.set(name, value));
  try {
    painter.paint({ x: 0, y: 6200, w: 180, h: 36, r: "8px" }, true, true);
    painter.hide(true);
    motionClock(80);
    painter.paint({ x: 0, y: 40, w: 180, h: 44, r: "8px" }, true, true);
    motionClock(1000);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(styles.get("--hov-o"), "1");
    assert.equal(styles.get("--hov-y"), "40px");
    assert.equal(styles.get("--hov-h"), "44px");
  } finally { painter.dispose(); motionClock(null); }
});

test("interrupting selection travel does not strand a fading pointer ghost", async () => {
  motionClock(0);
  const styles = new Map<string, string>();
  const painter = createFlowPainter((name, value) => styles.set(name, value));
  try {
    const row = { x: 8, y: 40, w: 180, h: 44, r: "12px" };
    painter.paint(row, true, true);
    painter.hide(true);
    motionClock(40);
    painter.stop(false);
    painter.paint({ ...row, y: 90 });
    motionClock(1000);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(styles.get("--hov-o"), "0", "selection cannot cancel the ghost fade");
    assert.equal(styles.get("--hov-h"), "0px", "the old ghost releases its footprint");
    assert.equal(styles.get("--glide-o"), "1", "the new selection stays visible");
    assert.equal(styles.get("--glide-y"), "90px");
  } finally { painter.dispose(); motionClock(null); }
});
