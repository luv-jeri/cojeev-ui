import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { docsHarnessFiles, docsHarnessFingerprint } from "../scripts/docs-harness-fingerprint.mjs";

test("the harness list holds every local module the docs gate loads", () => {
  // A module the gate imports but the list leaves out can change a verdict without changing the receipt.
  for (const file of docsHarnessFiles) {
    for (const [, specifier] of fs.readFileSync(file, "utf8").matchAll(/from "(\.\.?\/[^"]+)"/g)) {
      const imported = path.posix.join(path.posix.dirname(file), specifier);
      assert.ok(docsHarnessFiles.includes(imported), `${file} imports ${imported}, which docsHarnessFiles leaves out`);
    }
  }
});

for (const changedFile of docsHarnessFiles) {
  test(`harness fingerprint detects a mutation of ${changedFile}`, () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "cojeev-docs-fingerprint-"));
    try {
      fs.mkdirSync(path.join(fixture, "scripts/lib"), { recursive: true });
      for (const file of docsHarnessFiles) {
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
