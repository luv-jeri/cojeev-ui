import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSwarm, stepSwarm, orbitPoint, rippleOffset, boundedCount } from "../registry/cojeev/lib/reference-effect-geometry";

test("swarm stays finite and approaches a moved pointer after a suspended tab", () => {
  const particles = makeSwarm(18);
  const target = { x: 280, y: 160 };
  for (let i = 0; i < 180; i++) stepSwarm(particles, target, i === 1 ? 5000 : 16.67, i * .016, 24);
  assert(particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert(particles.every(p => Math.hypot(p.x - target.x, p.y - target.y) < 80));
});
test("counts stay within the paint budget for invalid and extreme props", () => {
  assert.equal(boundedCount(Infinity, 18, 64), 18);
  assert.equal(boundedCount(9000, 18, 64), 64);
  assert.equal(boundedCount(-10, 18, 64), 1);
});
test("an orbit closes and keeps its image center inside its bounds", () => {
  assert.deepEqual(orbitPoint(0, 400, 240), orbitPoint(1, 400, 240));
  for (let i = 0; i < 100; i++) {
    const p = orbitPoint(i / 100, 400, 240);
    assert(p.x >= 40 && p.x <= 360 && p.y >= 35 && p.y <= 205);
  }
});
test("a ripple displaces nearby pixels and settles without a wave", () => {
  assert.deepEqual(rippleOffset(50, 50, [], 1), { x: 0, y: 0 });
  const offset = rippleOffset(75, 50, [{ x: 50, y: 50, time: 0 }], .15);
  assert(Math.abs(offset.x) > .01);
  assert.equal(offset.y, 0);
  assert.deepEqual(rippleOffset(75, 50, [{ x: 50, y: 50, time: 0 }], 5), { x: 0, y: 0 });
});
