/**
 * One loader for the committed payloads, shared by the footprint report, the
 * delivery qualifier and the closure test.
 *
 * The index lives in the same directory as the payloads (`public/r/registry.json`)
 * and is recognised by its `items` array. It is not an installed item, and it must
 * be excluded everywhere: including it adds a phantom entry to the payload digest
 * that the emitted-size budget is keyed to, so a caller that loads the directory
 * differently from the others reports a permanent staleness that no re-measurement
 * can clear. That divergence happened once (found 2026-09-23 while re-measuring on a
 * new base); the closure test now asserts the two item sets are identical.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Every installable payload in `directory`, keyed by item name, sorted by filename.
 * The index is skipped; a malformed entry throws rather than being silently dropped,
 * because a silently missing payload would shrink every scenario that reaches it.
 */
export function loadPayloads(directory) {
  const payloads = new Map();
  for (const file of fs.readdirSync(directory).sort()) {
    if (!/^[a-z0-9][a-z0-9-]*\.json$/.test(file)) continue;
    const item = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
    if (Array.isArray(item.items)) continue;
    payloads.set(file.slice(0, -5), item);
  }
  return payloads;
}
