import test from "node:test";
import assert from "node:assert/strict";
import { advanceMarquee, marqueeDepth, marqueeScrollVelocity } from "../registry/cojeev/lib/marquee-motion";

test("scroll reversal passes through the current velocity and stays on the same periodic strip", () => {
  const state = { phase: 290, velocity: 40, scrollVelocity: -1200, scrollDirection: 1 };
  let next = advanceMarquee(state, .016, 40, 300, true);
  assert(next.velocity < state.velocity && next.velocity > 0);
  for (let i = 0; i < 90; i++) {
    next = advanceMarquee(next, .016, 40, 300, true);
    assert(next.phase >= 0 && next.phase < 300);
  }
  assert(next.velocity < 0);
  assert.equal(next.scrollDirection, -1);
  assert.equal(marqueeScrollVelocity(-100, .0001), -2400);
});

test("background time and malformed values cannot create a jump or unbounded depth", () => {
  const state = { phase: 20, velocity: 32, scrollVelocity: 0, scrollDirection: 1 };
  assert.deepEqual(advanceMarquee(state, 80, 32, 400, false), advanceMarquee(state, .05, 32, 400, false));
  assert.equal(advanceMarquee(state, .016, NaN, 400, true).phase, 0);
  assert.deepEqual(marqueeDepth(100, 200, 1), { blur: 0, opacity: 1 });
  assert.deepEqual(marqueeDepth(5000, 200, 10), { blur: 3, opacity: .72 });
});
