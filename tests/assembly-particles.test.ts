import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceAssemblyParticle,
  assemblyParticleCount,
  assemblyParticleSeed,
  assemblyParticleTarget,
} from "../registry/cojeev/lib/assembly-particles";

test("particle count stays dense on desktop, bounded, and lighter at 480px", () => {
  assert.equal(assemblyParticleCount(undefined, 680), 140);
  assert.equal(assemblyParticleCount(500, 680), 200);
  assert.equal(assemblyParticleCount(undefined, 480), 81);
  assert.equal(assemblyParticleCount(500, 360), 116);
});

test("particle seeds repeat for the same native part and differ across parts", () => {
  const first = assemblyParticleSeed("avatar", 17);
  assert.deepEqual(assemblyParticleSeed("avatar", 17), first);
  assert.notDeepEqual(assemblyParticleSeed("surface", 17), first);
  assert(first.edge >= 0 && first.edge <= 3);
  assert(first.edgePosition >= 0.08 && first.edgePosition <= 0.92);
});

test("gather targets follow the moving part edge and its inline rotation", () => {
  const seed = {
    edge: 0,
    edgePosition: 0.5,
    phase: 0,
    orbit: 20,
    speed: 0.2,
  };
  const frame = { x: 10, y: 20, width: 100, height: 40, rotation: 90 };
  assert.deepEqual(assemblyParticleTarget(seed, frame, 0, true), { x: 80, y: 40 });
  assert.deepEqual(
    assemblyParticleTarget(seed, { ...frame, x: 35, y: 12 }, 0, true),
    { x: 105, y: 32 },
  );
});

test("damped retargeting preserves position and velocity while clamping long frames", () => {
  const moving = { x: 12, y: 18, vx: 22, vy: -8, alpha: 0.9 };
  const gathered = advanceAssemblyParticle(moving, { x: 80, y: 35, alpha: 0 }, 0.016, true);
  const restarted = advanceAssemblyParticle({ ...moving, vx: 0, vy: 0 }, { x: 80, y: 35, alpha: 0 }, 0.016, true);
  assert.notEqual(gathered.x, 80, "retargeting does not teleport");
  assert.notEqual(gathered.x, restarted.x, "incoming velocity remains part of the next frame");
  assert(gathered.alpha < moving.alpha && gathered.alpha > 0, "settling fades softly");
  assert.deepEqual(
    advanceAssemblyParticle(moving, { x: 80, y: 35, alpha: 1 }, 1, false),
    advanceAssemblyParticle(moving, { x: 80, y: 35, alpha: 1 }, 0.034, false),
    "a stalled tab cannot inject an unbounded time step",
  );
});
