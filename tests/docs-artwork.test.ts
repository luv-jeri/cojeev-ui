import assert from "node:assert/strict";
import test from "node:test";
import { docsArtworkModel } from "../lib/docs-artwork";

test("component artwork is stable across repeated renders", () => {
  assert.deepEqual(docsArtworkModel("button", "pink"), docsArtworkModel("button", "pink"));
});

test("component slugs produce visibly different living compositions", () => {
  const slugs = ["button", "slider", "animated-icon", "theme-toggle", "motion-drawer", "calendar"];
  const signatures = new Set(slugs.map(slug => {
    const model = docsArtworkModel(slug, "pink");
    return `${model.layout}:${model.pieces.map(piece => `${piece.name}>${piece.morphTo}:${piece.tone}`).join("|")}`;
  }));

  assert.ok(signatures.size >= 5, `expected at least five distinct compositions, received ${signatures.size}`);
});

test("every composition has three compatible, bounded living shapes", () => {
  const model = docsArtworkModel("slider", "olive");

  assert.equal(model.pieces.length, 3);
  assert.equal(model.pieces[0].tone, "olive");
  for (const piece of model.pieces) {
    assert.notEqual(piece.name, piece.morphTo);
    assert.ok(piece.duration >= 7 && piece.duration <= 15);
    assert.ok(piece.rotation >= -40 && piece.rotation <= 40);
    assert.ok(piece.x >= -16 && piece.x <= 62);
    assert.ok(piece.y >= -14 && piece.y <= 60);
    assert.ok(piece.size >= 30 && piece.size <= 100);
  }
});
