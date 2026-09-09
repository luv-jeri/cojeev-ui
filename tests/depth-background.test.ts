import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DepthBackground, depthBackgroundPoints } from "../registry/cojeev/ui/depth-background";
import { FloatLayer } from "../registry/cojeev/ui/float-layer";

test("depth artwork is seeded, bounded and retains three distinct perspective planes", () => {
  for (const variant of ["pollen", "contour", "orbital"] as const) {
    const a = depthBackgroundPoints(variant, 1, "example");
    assert.deepEqual(a, depthBackgroundPoints(variant, 1, "example"));
    assert.notDeepEqual(a, depthBackgroundPoints(variant, 1, "other"));
    assert.equal(new Set(a.map(point => point.layer)).size, 3);
    assert.ok(a.every(point => Object.values(point).every(Number.isFinite)));
    assert.ok(a.every(point => point.size > 0 && point.size <= 93));
    assert.ok(depthBackgroundPoints(variant, Infinity).length <= 84);
    assert.ok(depthBackgroundPoints(variant, 500).length <= 84);
    if (variant !== "contour") assert.ok(a.every(point => !(point.x > 22 && point.x < 78 && point.y > 18 && point.y < 84)));
  }
});

test("depth decoration is deterministic and hidden from assistive navigation", () => {
  const element = React.createElement(DepthBackground, { variant: "orbital", seed: 31, density: .5, className: "scene" });
  const html = renderToStaticMarkup(element);
  assert.equal(html, renderToStaticMarkup(element));
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /inert=""/);
  assert.match(html, /data-depth-layer="far"/);
  assert.match(html, /data-depth-layer="near"/);
  assert.doesNotMatch(html, /NaN|undefined|Infinity|radial-gradient/);
});

test("FloatLayer server output remains visible and asChild preserves the native control and transform", () => {
  const html = renderToStaticMarkup(React.createElement(FloatLayer, { asChild: true, depth: 48 }, React.createElement("button", { type: "button", "aria-label": "Explore", style: { transform: "rotate(3deg)" } }, "Explore")));
  assert.ok(html.startsWith("<button"));
  assert.doesNotMatch(html, /<div|aria-hidden|inert/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="Explore"/);
  assert.match(html, /transform:rotate\(3deg\)/);
  assert.match(html, /--float-reveal:1/);
  assert.match(html, /data-float-depth="48"/);
});
