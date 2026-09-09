import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sculptureGeometry, sculptureFromPixels, SCULPTURE_LIMITS } from "../registry/cojeev/lib/sculpture-geometry";
import { sculptureFromGLB, loadSculptureFile } from "../registry/cojeev/lib/sculpture-loaders";
import { createGlyphMesh, glyphGrid } from "../registry/cojeev/lib/glyph-mesh";
import { rasterizeSculpture, sculptureGrid, sculpturePrint, sculptureCharacters } from "../registry/cojeev/lib/sculpture-raster";
import { GlyphSculpture } from "../registry/cojeev/ui/glyph-sculpture";
import { DitherSculpture } from "../registry/cojeev/ui/dither-sculpture";
import { InkSculpture } from "../registry/cojeev/ui/ink-sculpture";
import { normalizeSculptureView } from "../registry/cojeev/ui/sculpture-orbit";

const triangle = { positions: [0, 0, 0, 2, 0, 0, 0, 2, 0], triangles: [0, 1, 2] };
function makeGLB(modify: (json: Record<string, unknown>) => void = () => {}) {
  const coordinates = new Float32Array(triangle.positions), indices = new Uint16Array(triangle.triangles), binary = new Uint8Array(44);
  binary.set(new Uint8Array(coordinates.buffer)); binary.set(new Uint8Array(indices.buffer), 36);
  const json: Record<string, unknown> = { asset: { version: "2.0" }, buffers: [{ byteLength: 44 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 6 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0 };
  modify(json);
  const bytes = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(bytes.length / 4) * 4, total = 12 + 8 + padded + 8 + binary.length, buffer = new ArrayBuffer(total), view = new DataView(buffer), out = new Uint8Array(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, total, true); view.setUint32(12, padded, true); view.setUint32(16, 0x4e4f534a, true); out.fill(32, 20, 20 + padded); out.set(bytes, 20); view.setUint32(20 + padded, binary.length, true); view.setUint32(24 + padded, 0x004e4942, true); out.set(binary, 28 + padded);
  return buffer;
}

test("custom geometry is copied, normalized, lit and bounded before rendering", () => {
  const mesh = sculptureGeometry(triangle);
  assert.deepEqual(triangle.positions, [0, 0, 0, 2, 0, 0, 0, 2, 0]);
  for (let i = 0; i < mesh.positions.length; i += 3) assert.ok(Math.hypot(...mesh.positions.slice(i, i + 3)) <= 1.000001);
  assert.equal(mesh.normals[2], 1);
  for (const invalid of [{ positions: [NaN, 0, 0, 1, 0, 0, 0, 1, 0] }, { ...triangle, triangles: [0, 1, 7] }, { ...triangle, normals: [1] }, { positions: new Float32Array((SCULPTURE_LIMITS.vertices + 1) * 3) }, { positions: new Float32Array(9) }]) assert.throws(() => sculptureGeometry(invalid));
});

test("self-contained GLB imports multiple transformed nodes without loading model material assets", () => {
  const simple = sculptureFromGLB(makeGLB());
  assert.equal(simple.positions.length, 9); assert.equal(simple.triangles.length, 3);
  const multiple = sculptureFromGLB(makeGLB(json => { json.nodes = [{ children: [1, 2], rotation: [0, 0, Math.sin(.3), Math.cos(.3)] }, { mesh: 0, translation: [-2, 0, 0] }, { mesh: 0, translation: [2, 0, 0], scale: [1, 2, 1] }]; }));
  assert.equal(multiple.positions.length, 18); assert.deepEqual([...multiple.triangles], [0, 1, 2, 3, 4, 5]);
  assert.notDeepEqual([...multiple.positions.slice(0, 9)], [...multiple.positions.slice(9)]);
  for (const change of [
    (json: Record<string, unknown>) => { json.buffers = [{ byteLength: 44, uri: "https://example.invalid/model.bin" }]; },
    (json: Record<string, unknown>) => { json.images = [{ uri: "https://example.invalid/image.png" }]; },
    (json: Record<string, unknown>) => { json.extensionsRequired = ["KHR_draco_mesh_compression"]; },
    (json: Record<string, unknown>) => { json.nodes = [{ children: [0], mesh: 0 }]; },
    (json: Record<string, unknown>) => { json.nodes = [{ mesh: 0, skin: 0 }]; },
    (json: Record<string, unknown>) => { json.accessors = [{ bufferView: 0, componentType: 5126, count: 9999999, type: "VEC3" }]; },
    (json: Record<string, unknown>) => { json.accessors = [{ bufferView: 0, byteOffset: -10, componentType: 5126, count: 3, type: "VEC3" }]; },
  ]) assert.throws(() => sculptureFromGLB(makeGLB(change)));
  const truncated = makeGLB().slice(0, -1); assert.throws(() => sculptureFromGLB(truncated));
});

test("local file import rejects unsupported, huge and cancelled input before decoding", async () => {
  await assert.rejects(loadSculptureFile(new Blob(["not an asset"])), /Choose a self-contained/);
  await assert.rejects(loadSculptureFile(new Blob([new Uint8Array(SCULPTURE_LIMITS.fileBytes + 1)])), /8 MiB/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadSculptureFile(new Blob([makeGLB()]), { signal: controller.signal }), { name: "AbortError" });
  const bytes = new Uint8Array(24), view = new DataView(bytes.buffer); view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(16, 9000); view.setUint32(20, 9000);
  await assert.rejects(loadSculptureFile(new Blob([bytes])), /4 million/);
  assert.equal((await loadSculptureFile(new Blob([makeGLB()]))).positions.length, 9);
});

test("image relief preserves transparency and limits sampled geometry", () => {
  const width = 100, height = 80, pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const at = (y * width + x) * 4; pixels[at] = x * 2; pixels[at + 1] = y * 3; pixels[at + 2] = 120; pixels[at + 3] = x > 12 && x < 85 ? 255 : 0; }
  const mesh = sculptureFromPixels({ width, height, data: pixels });
  assert.ok(mesh.positions.length <= 72 * 72 * 3); assert.ok(mesh.triangles.length < 71 * 71 * 6); assert.ok(new Set(Array.from(mesh.positions).filter((_, i) => i % 3 === 2)).size > 50);
  assert.throws(() => sculptureFromPixels({ width: 2, height: 2, data: new Uint8Array(16) }), /transparent/);
});

test("all print treatments use the same surface depth and remain inside the fitted silhouette", () => {
  const mesh = sculptureGeometry(createGlyphMesh("bloom")), grid = sculptureGrid(420, 360, 2), frame = rasterizeSculpture(mesh, grid, .7, -.3, 1.15), signatures = new Set<string>();
  for (const pattern of ["ordered", "halftone", "diffusion", "stipple"] as const) {
    const marks = sculpturePrint(frame, { kind: "dither", pattern });
    assert.ok(marks.filter(Boolean).length > 500); assert.ok(marks.every((mark, i) => !mark || frame.coverage[i])); signatures.add(Buffer.from(marks).toString("base64"));
  }
  for (const treatment of ["hatch", "crosshatch", "contour"] as const) {
    const marks = sculpturePrint(frame, { kind: "ink", treatment, angle: -25, relief: .55 });
    assert.ok(marks.filter(Boolean).length > 300); assert.ok(marks.every((mark, i) => !mark || frame.coverage[i])); signatures.add(Buffer.from(marks).toString("base64"));
    const changed = sculpturePrint(frame, { kind: "ink", treatment, angle: 40, relief: 0, markSize: 12 });
    assert.ok(marks.some((mark, i) => mark !== changed[i]), `${treatment} must respond to meaningful print controls`);
  }
  assert.equal(signatures.size, 7);
  for (let i = 0; i < grid.columns; i++) { assert.equal(frame.coverage[i], 0); assert.equal(frame.coverage[frame.coverage.length - 1 - i], 0); }
  const glyphFrame = rasterizeSculpture(mesh, glyphGrid(420, 340, 10));
  const edged = sculptureCharacters(glyphFrame, "density", true), densityOnly = sculptureCharacters(glyphFrame, "density", false);
  assert.notDeepEqual(edged, densityOnly); assert.ok(edged.some(mark => ["/", "\\", "|", "_"].includes(mark)));
  assert.ok(sculptureCharacters(glyphFrame, "digits").every(mark => " .0123456789".includes(mark)));
  assert.deepEqual(normalizeSculptureView({ turn: 725, pitch: 999, zoom: Infinity }), { turn: 5, pitch: 80, zoom: 1 });
});

test("all three treatments have geometry-derived SSR output and explicit invalid-geometry feedback", () => {
  for (const Component of [GlyphSculpture, DitherSculpture, InkSculpture]) {
    const html = renderToStaticMarkup(React.createElement(Component, { geometry: triangle, paused: true }));
    assert.match(html, /aria-hidden="true"/); assert.match(html, /data-moving="false"/); assert.match(html, /data-form="custom"/); assert.ok(html.length > 600);
    const error = renderToStaticMarkup(React.createElement(Component, { geometry: { positions: [] } }));
    assert.match(error, /data-renderer="error"/); assert.match(error, /role="status"/); assert.doesNotMatch(error, /aria-hidden="true"/);
  }
});

test("overlapping geometry triggers adaptive sampling before triangle-cell work becomes excessive", () => {
  const mesh = sculptureGeometry({ positions: [-1, -1, 0, 1, -1, 0, 0, 1, 0], triangles: Array.from({ length: 2000 * 3 }, (_, i) => i % 3) });
  const frame = rasterizeSculpture(mesh, sculptureGrid(420, 360, 2));
  assert.ok(frame.sampling > 2, "overdraw must reduce sampling without dropping the model");
  assert.ok(frame.coverage.filter(Boolean).length > 500);
  assert.equal(frame.coverage.length, frame.grid.columns * frame.grid.rows);
});
