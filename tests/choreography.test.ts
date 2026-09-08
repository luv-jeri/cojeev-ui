import { test } from "node:test";
import assert from "node:assert/strict";
import { createMotionLane, resolveChoreography } from "../registry/sahajiv/motion/choreography";
import { getServerSettingsSnapshot } from "../registry/sahajiv/motion/settings";
import { motionClock } from "../registry/sahajiv/motion/clock";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { MotionPresence, MotionSurface } from "../registry/sahajiv/ui/presence";
import { acquirePageScrollbar, pageScrollGeometry, scrollThumbPath } from "../registry/sahajiv/motion/scroll-thumb";

// Motion checks browser constructors even for unowned scalar values. No DOM is
// needed here: the real scalar animator runs under the deterministic clock.
globalThis.HTMLElement ??= class {} as typeof HTMLElement;
globalThis.SVGElement ??= class {} as typeof SVGElement;

test("Off and reduced motion settle choreography while active speed remains responsive", () => {
  const snapshot = getServerSettingsSnapshot();
  assert.equal(resolveChoreography(snapshot, true).transition.duration, 0);
  assert.equal(resolveChoreography({ ...snapshot, motion: { ...snapshot.motion, mode: "off" } }, false).quiet, true);
  assert.equal(resolveChoreography({ ...snapshot, flow: { ...snapshot.flow, variant: "off" } }, false).quiet, true);
  assert.equal(resolveChoreography(snapshot, false).quiet, false);
  const faster = resolveChoreography({ ...snapshot, flow: { ...snapshot.flow, speed: 2 } }, false);
  assert.ok((faster.transition.stiffness ?? 0) > (resolveChoreography(snapshot, false).transition.stiffness ?? 0));
});

test("retargeting a running Motion spring starts from the rendered value and cancels stale completion", async () => {
  motionClock(0);
  const completions: string[] = [];
  let rendered = 0;
  const lane = createMotionLane(0, value => { rendered = value; });
  try {
    lane.to(100, { type: "spring", stiffness: 260, damping: 28 }, () => completions.push("stale"));
    motionClock(120);
    assert.ok(rendered > 0 && rendered < 100, `expected an intermediate spring value, got ${rendered}`);
    const interrupted = rendered;
    lane.to(-40, { type: "spring", stiffness: 260, damping: 28 }, () => completions.push("current"));
    assert.equal(rendered, interrupted);
    motionClock(3000);
    assert.ok(Math.abs(rendered + 40) < .01);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(completions, ["current"]);
    lane.to(20, { duration: .2 });
    lane.jump(7);
    motionClock(4000);
    assert.equal(rendered, 7);
  } finally {
    lane.stop();
    motionClock(null);
  }
});

test("disposing a motion lane prevents further writes and quiet jumps never queue motion", () => {
  motionClock(0);
  const values: number[] = [];
  const lane = createMotionLane(0, value => values.push(value));
  try {
    lane.to(3, { duration: 0 });
    assert.equal(values.at(-1), 3);
    lane.to(10, { duration: .3 });
    lane.dispose();
    const count = values.length;
    motionClock(1000);
    assert.equal(values.length, count);
  } finally {
    lane.stop();
    motionClock(null);
  }
});

test("scroll thumb edges deform without escaping the hit target or changing path topology", () => {
  const idle = scrollThumbPath(0, 0);
  const held = scrollThumbPath(1, 1);
  assert.notEqual(held, idle);
  assert.equal(held.match(/[MCZ]/g)?.join(""), idle.match(/[MCZ]/g)?.join(""));
  for (const engagement of [-10, 0, .5, 1, 30, NaN]) {
    for (const bias of [-10, -1, 0, 1, 10, NaN]) {
      const coordinates = scrollThumbPath(engagement, bias).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      coordinates.forEach((coordinate, index) => assert.ok(coordinate >= 0 && coordinate <= (index % 2 ? 100 : 20)));
    }
  }
});

test("document scrollbar derives reachable endpoints and handles non-scrollable or invalid documents", () => {
  assert.deepEqual(pageScrollGeometry(1000, 200, 180, 400), { maxScroll: 800, thumbSize: 36, thumbOffset: 72, travel: 144 });
  assert.equal(pageScrollGeometry(1000, 200, 180, 900).thumbOffset, 144);
  assert.deepEqual(pageScrollGeometry(100, 200, 180, 20), { maxScroll: 0, thumbSize: 180, thumbOffset: 0, travel: 0 });
  assert.deepEqual(pageScrollGeometry(NaN, 0, 0, Infinity), { maxScroll: 0, thumbSize: 0, thumbOffset: 0, travel: 0 });
});

test("native document scrollbar state is restored only after the last mounted rail releases it", () => {
  for (const original of [null, "prior-owner"]) {
    const attributes = new Map<string, string>(original === null ? [] : [["data-page-scrollbar", original]]);
    const root = {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => { attributes.set(name, value); },
      removeAttribute: (name: string) => { attributes.delete(name); },
    };
    const releaseA = acquirePageScrollbar(root), releaseB = acquirePageScrollbar(root);
    assert.equal(root.getAttribute("data-page-scrollbar"), "mounted");
    releaseA(); releaseA();
    assert.equal(root.getAttribute("data-page-scrollbar"), "mounted");
    releaseB();
    assert.equal(root.getAttribute("data-page-scrollbar"), original);
  }
});

test("presence composition preserves a native atomic button and its readable initial state", () => {
  const markup = renderToStaticMarkup(createElement(MotionPresence, null,
    createElement(MotionSurface, { key: "save", asChild: true, preset: "rise" },
      createElement("button", { type: "button", disabled: true, "data-slot": "button" }, "Save changes"))));
  const document = load(markup);
  assert.equal(document("body > button").length, 1);
  assert.equal(document("body > div").length, 0);
  assert.equal(document("button").attr("data-slot"), "button");
  assert.equal(document("button").prop("disabled"), true);
  assert.equal(document("button").text(), "Save changes");
  assert.match(document("button").attr("style") ?? "", /opacity:1/);
  assert.equal(document("button").attr("inert"), undefined);
});
