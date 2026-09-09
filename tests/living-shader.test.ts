import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeShaderMotion, shaderResolution } from "../registry/cojeev/lib/living-shader";
import { PigmentField } from "../registry/cojeev/ui/pigment-field";
import { ContourField } from "../registry/cojeev/ui/contour-field";

test("shader motion preserves deliberate stillness and prevents nonfinite or excessive uniforms", () => {
  assert.deepEqual(normalizeShaderMotion(0, 0), { speed: 0, intensity: 0 });
  assert.deepEqual(normalizeShaderMotion(-3, 99), { speed: 0, intensity: 2 });
  assert.deepEqual(normalizeShaderMotion(NaN, Infinity), { speed: 1, intensity: 1 });
  assert.deepEqual(normalizeShaderMotion(99, -4), { speed: 3, intensity: 0 });
});

test("shader allocation caps DPR and total pixels while preserving surface aspect", () => {
  assert.deepEqual(shaderResolution(300, 150, 4), { width: 600, height: 300 });
  assert.deepEqual(shaderResolution(0, 0, 2), { width: 1, height: 1 });
  for (const size of [[10000, 8000, 4], [Infinity, NaN, Infinity], [1e20, 1e20, 2]]) {
    const { width, height } = shaderResolution(...size as [number, number, number]);
    assert.ok(Number.isFinite(width) && Number.isFinite(height));
    assert.ok(width >= 1 && height >= 1);
    assert.ok(width * height <= 2_000_000);
    assert.ok(width <= 4096 && height <= 4096);
  }
  const wide = shaderResolution(10000, 8000, 4);
  assert.ok(Math.abs(wide.width / wide.height - 1.25) < 0.003);
});

test("both fields server-render accessible decoration with still artwork before browser capability is known", () => {
  for (const Component of [PigmentField, ContourField]) {
    const html = renderToStaticMarkup(React.createElement(Component, { speed: NaN, intensity: Infinity, tone: "cool", paused: true }));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /inert=""/);
    assert.match(html, /data-renderer="pending"/);
    assert.match(html, /data-tone="cool"/);
    assert.match(html, /data-slot="field-fallback"/);
    assert.doesNotMatch(html, /NaN|Infinity|undefined/);
    assert.equal(html, renderToStaticMarkup(React.createElement(Component, { speed: NaN, intensity: Infinity, tone: "cool", paused: true })));
  }
});
