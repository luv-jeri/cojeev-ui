import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const docsHarnessFiles = [
  "scripts/check-docs.mjs",
  "scripts/docs-behaviors-details.mjs",
  "scripts/docs-harness-fingerprint.mjs",
  "scripts/docs-transient-paint.mjs",
];

export function docsHarnessFingerprint(root = fileURLToPath(new URL("../", import.meta.url))) {
  const hash = createHash("sha256");
  for (const relative of docsHarnessFiles) {
    const bytes = fs.readFileSync(path.join(root, relative));
    hash.update(`${relative}\0${bytes.length}\0`).update(bytes);
  }
  return hash.digest("hex");
}
