import assert from "node:assert/strict";
import test from "node:test";
import { parseTrackFragment } from "../lib/reporting/track";

const id = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const key = "a".repeat(32) + "0123456789".repeat(3) + "ab";

test("track fragment parser accepts id.key and rejects everything else", () => {
  assert.equal(key.length, 64);
  assert.deepEqual(parseTrackFragment(`#${id}.${key}`), { id, key });
  for (const bad of [`${id}.${key}`, `#not-a-uuid.${key}`, `#${id}.${key.slice(1)}`, `#${id}.${key.toUpperCase()}`, `#${id}.${key}.${key}`, "", `#${id}.${key} extra`, `#${id}.${key}\n`, "#"])
    assert.equal(parseTrackFragment(bad), null, JSON.stringify(bad));
});
