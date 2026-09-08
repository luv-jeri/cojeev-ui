import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { mix } from "motion";
import { signatureShapePaths } from "../registry/sahajiv/lib/signature-shapes";
import { ShapeMorph } from "../registry/sahajiv/ui/shape";

test("every signature path and pairwise interpolation stays inside its normalized SVG box", () => {
  const paths = Object.values(signatureShapePaths);
  for (const from of paths) {
    assert.equal(from.match(/C/g)?.length, 96);
    assert.ok(from.startsWith("M") && from.endsWith("Z"));
    for (const to of paths) {
      const interpolate = mix(from, to);
      for (const progress of [0, .25, .5, .75, 1]) {
        const values = interpolate(progress).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        assert.equal(values.length, 578);
        assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 100));
      }
    }
  }
});

test("ShapeMorph exposes a supplied graphic label and otherwise stays decorative", () => {
  const decorative = load(renderToStaticMarkup(createElement(ShapeMorph, { name: "daisy-12" })));
  assert.equal(decorative('[data-slot="shape-morph"]').attr("aria-hidden"), "true");
  const graphic = load(renderToStaticMarkup(createElement(ShapeMorph, { name: "cloud-3", label: "Ideas taking shape", variant: "outline" })));
  assert.equal(graphic('[data-slot="shape-morph"]').attr("role"), "img");
  assert.equal(graphic('[data-slot="shape-morph"]').attr("aria-label"), "Ideas taking shape");
  assert.equal(graphic('[data-slot="shape-morph"]').attr("aria-hidden"), undefined);
  assert.equal(graphic("path").attr("d"), signatureShapePaths["cloud-3"]);
  assert.equal(graphic("path").attr("fill"), "none");
});
