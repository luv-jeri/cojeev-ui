import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GlyphSculpture } from "../registry/cojeev/ui/glyph-sculpture";
import { createGlyphMesh, glyphGrid, normalizeGlyphOptions, rasterizeGlyphs, glyphText } from "../registry/cojeev/lib/glyph-mesh";

test("untrusted sizes and motion values stay within a finite rendering budget", () => {
  assert.deepEqual(normalizeGlyphOptions({ speed: Infinity, cellSize: NaN, turn: -900 }), { speed: 1, cellSize: 10, turn: -180 });
  assert.deepEqual(normalizeGlyphOptions({ speed: 0, cellSize: 1, turn: 720 }), { speed: 0, cellSize: 7, turn: 180 });
  for (const [width, height] of [[0, 0], [390, 340], [20000, 10000], [NaN, Infinity]]) {
    const grid = glyphGrid(width, height, 7);
    assert.ok(grid.columns >= 1 && grid.rows >= 1);
    assert.ok(grid.columns <= 140 && grid.rows <= 90);
    assert.ok(Number.isFinite(grid.cellWidth) && Number.isFinite(grid.cellHeight));
  }
});

test("three original meshes produce distinct, shaded, depth-tested glyph silhouettes", () => {
  const silhouettes = new Set<string>();
  for (const form of ["seed", "bloom", "pebble"] as const) {
    const mesh = createGlyphMesh(form);
    assert.ok(mesh.positions.length > 1000 && mesh.positions.every(Number.isFinite));
    const grid = glyphGrid(420, 340, 10);
    const frame = rasterizeGlyphs(mesh, grid, .35, -.2);
    const ink = [...frame].filter(Boolean);
    assert.ok(ink.length > 250, `${form} must form a substantial glyph sculpture`);
    assert.ok(new Set(ink).size >= 5, `${form} must retain curved shading`);
    assert.equal(frame.length, grid.columns * grid.rows);
    const text = glyphText(frame, grid.columns);
    assert.equal(text.split("\n").length, grid.rows);
    assert.notEqual(text, glyphText(rasterizeGlyphs(mesh, grid, 1.25, -.2), grid.columns), `${form} must have real 3D orientation`);
    assert.equal(text, glyphText(rasterizeGlyphs(mesh, grid, .35, -.2), grid.columns), "still image is deterministic");
    silhouettes.add(text);
  }
  assert.equal(silhouettes.size, 3);
});

test("server output already contains a decorative glyph sculpture before canvas is available", () => {
  const html = renderToStaticMarkup(React.createElement(GlyphSculpture, { form: "bloom", paused: true }));
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /data-moving="false"/);
  assert.match(html, /<pre[^>]*>[\s\S]*@/);
  assert.ok(html.length > 1500);
});
