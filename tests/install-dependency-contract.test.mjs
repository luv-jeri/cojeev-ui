import assert from "node:assert/strict";
import test from "node:test";
import { motionDependencyEvidence } from "../scripts/install-dependency-contract.mjs";

test("a declared motion runtime can be supplied by the scaffold or the registry", () => {
  assert.deepEqual(motionDependencyEvidence(new Set(["motion"]), new Set(["motion"]), true), {
    declaredByPayload: true, alreadyInScaffold: true, availableForConsumer: true, addedForConsumer: false,
  });
  assert.equal(motionDependencyEvidence(new Set(), new Set(["motion"]), true).addedForConsumer, true);
});

test("missing declared runtime and newly added undeclared runtime are rejected", () => {
  assert.throws(() => motionDependencyEvidence(new Set(), new Set(), true), /declared motion runtime is missing/);
  assert.throws(() => motionDependencyEvidence(new Set(["motion"]), new Set(), true), /declared motion runtime is missing/);
  assert.throws(() => motionDependencyEvidence(new Set(), new Set(["motion"]), false), /undeclared motion runtime/);
  assert.equal(motionDependencyEvidence(new Set(["motion"]), new Set(["motion"]), false).addedForConsumer, false);
  assert.equal(motionDependencyEvidence(new Set(), new Set(), false).availableForConsumer, false);
});
