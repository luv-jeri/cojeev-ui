import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { docsHarnessFingerprint } from "../scripts/docs-harness-fingerprint.mjs";

for (const changedFile of ["scripts/docs-transient-paint.mjs", "scripts/docs-behaviors-details.mjs"]) {
  test(`harness fingerprint detects a mutation of ${changedFile}`, () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "cojeev-docs-fingerprint-"));
    try {
      fs.mkdirSync(path.join(fixture, "scripts"));
      for (const file of ["scripts/check-docs.mjs", "scripts/docs-transient-paint.mjs", "scripts/docs-behaviors-details.mjs", "scripts/docs-harness-fingerprint.mjs"]) {
        fs.copyFileSync(new URL(`../${file}`, import.meta.url), path.join(fixture, file));
      }
      const before = docsHarnessFingerprint(fixture);
      assert.equal(docsHarnessFingerprint(fixture), before, "Identical bytes and paths produce a stable fingerprint");
      fs.appendFileSync(path.join(fixture, changedFile), "\n// simulated in-run observation change\n");
      assert.notEqual(docsHarnessFingerprint(fixture), before, "An observation-module mutation must invalidate the harness receipt");
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
}
