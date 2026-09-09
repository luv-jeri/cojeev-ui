import assert from "node:assert/strict";
import test from "node:test";
import { BloomSimulation, normalizeBloomOptions } from "../registry/cojeev/lib/bloom-engine";

test("invalid physics inputs stay finite and bounded", () => {
  const options = normalizeBloomOptions({ particleCount: Infinity, radius: -1, speed: NaN, connectionDistance: 99999 });
  assert.equal(options.particleCount, 50);
  assert.equal(options.radius, 6);
  assert.equal(options.speed, 1);
  assert.equal(options.connectionDistance, 240);
});

test("the same seed and elapsed time produce the same bloom at 30Hz and 120Hz", () => {
  const slow = new BloomSimulation(600, 400, {}, 17);
  const fast = new BloomSimulation(600, 400, {}, 17);
  for (let i = 0; i < 60; i++) slow.advance(1 / 30, [], null);
  for (let i = 0; i < 240; i++) fast.advance(1 / 120, [], null);
  assert.deepEqual(slow.particles, fast.particles);
});

test("pointer attraction pulls the organism toward the pointer", () => {
  const attracted = new BloomSimulation(800, 600, { wander: 0 }, 9);
  const resting = new BloomSimulation(800, 600, { wander: 0 }, 9);
  for (let i = 0; i < 30; i++) {
    attracted.advance(1 / 60, [], { x: 600, y: 300 });
    resting.advance(1 / 60, [], null);
  }
  const center = (s: BloomSimulation) => s.particles.reduce((sum, p) => sum + p.x, 0) / s.particles.length;
  assert.ok(center(attracted) > center(resting) + 80);
});

test("zero speed freezes state, and long background gaps are bounded", () => {
  const simulation = new BloomSimulation(600, 400, { speed: 0 }, 8);
  const before = structuredClone(simulation.particles);
  simulation.advance(100, [], { x: 100, y: 100 });
  assert.deepEqual(simulation.particles, before);
  simulation.configure({ speed: 1 });
  assert.ok(simulation.advance(100, [], null) <= 4);
});

test("resizing and population changes retain a finite bounded organism", () => {
  const simulation = new BloomSimulation(800, 600, {}, 4);
  simulation.resize(280, 180);
  simulation.configure({ particleCount: 80 });
  assert.equal(simulation.particles.length, 80);
  for (let i = 0; i < 600; i++) simulation.advance(1 / 60, [{ x: 140, y: 90 }], null);
  assert.ok(simulation.particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 280 && p.y >= 0 && p.y <= 180));
});

test("gather joins scattered particles around the text", () => {
  const simulation = new BloomSimulation(800, 600, { wander: 0 }, 5);
  simulation.scatter();
  const distance = () => simulation.particles.reduce((sum, p) => sum + Math.hypot(p.x - 400, p.y - 300), 0);
  const before = distance();
  simulation.gather();
  for (let i = 0; i < 180; i++) simulation.advance(1 / 60, [{ x: 400, y: 300 }], null);
  assert.ok(distance() < before * 0.35);
});

test("an explicit gather can settle immediately even when playback speed is zero", () => {
  const simulation = new BloomSimulation(800, 600, { speed: 0, wander: 0 }, 7);
  simulation.scatter();
  simulation.gather();
  simulation.settle([{ x: 400, y: 300 }]);
  assert.equal(simulation.options.speed, 0);
  assert.ok(simulation.particles.every(p => Math.hypot(p.x - 400, p.y - 300) < 20));
});
