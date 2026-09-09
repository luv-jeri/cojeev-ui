import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { signatureShapePaths, type SignatureShapeName } from "../registry/cojeev/lib/signature-shapes";
import { ShapeArtwork, shapeArtworkSvg, shapeArtworkCode, type ShapeArtworkOptions } from "../registry/cojeev/ui/shape-artwork";

test("every original contour shares identical live and exported layers, paint, rotation and offsets", () => {
  for (const name of Object.keys(signatureShapePaths) as SignatureShapeName[]) {
    for (const filled of [true, false]) {
      const options: ShapeArtworkOptions = { name, filled, rotation: 73, shadowAngle: -132, echoAngle: 91, label: "Selected artwork" };
      const live = load(renderToStaticMarkup(createElement(ShapeArtwork, options)), { xml: true });
      const exported = load(shapeArtworkSvg(options, { fill: "#123456", echo: "#abcdef", shadow: "#010203" }), { xml: true });
      assert.equal(live("svg").attr("viewBox"), exported("svg").attr("viewBox"));
      assert.equal(exported("g").length, 3);
      for (const key of ["shadow", "echo", "fill"]) {
        const selector = `g[data-artwork-layer="${key}"]`;
        for (const attribute of ["transform", "opacity"]) assert.equal(live(selector).attr(attribute), exported(selector).attr(attribute));
        assert.equal(exported(`${selector} path`).attr("d"), signatureShapePaths[name]);
        assert.equal(live(`${selector} path`).attr("d"), signatureShapePaths[name]);
        assert.equal(live(`${selector} path`).attr("stroke-width"), exported(`${selector} path`).attr("stroke-width"));
      }
      assert.equal(exported('[data-artwork-layer="fill"] path').attr(filled ? "fill" : "stroke"), "#123456");
      assert.ok(!shapeArtworkSvg(options).includes("var("));
    }
  }
});

test("the export box contains every cubic control point at every layer angle, including stroke", () => {
  // A cubic stays in its control-point convex hull. Rotation preserves radius;
  // adding the largest layer offset and round stroke is a bound for ALL angles.
  for (const path of Object.values(signatureShapePaths)) {
    const points = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    for (let index = 0; index < points.length; index += 2) {
      const radius = Math.hypot(points[index] - 50, points[index + 1] - 50);
      assert.ok(radius + 9 + 1.5 / 2 < 70, "cast shadow inside -20..120 at every rotation/direction");
      assert.ok(radius + Math.hypot(9, -6) + .85 / 2 < 70, "rear outline inside -20..120 at every rotation");
    }
  }
});

test("layer toggles remove the same layers, and non-finite angles cannot corrupt exported geometry", () => {
  const options = { shadow: false, echo: false, filled: false, rotation: Infinity, shadowAngle: NaN };
  const exported = load(shapeArtworkSvg(options), { xml: true });
  const live = load(renderToStaticMarkup(createElement(ShapeArtwork, options)), { xml: true });
  assert.equal(exported("g").length, 1);
  assert.equal(live("g").length, 1);
  assert.equal(exported("g").attr("transform"), "rotate(0 50 50)");
  assert.equal(exported("path").attr("fill"), "none");
  assert.ok(!shapeArtworkCode(options).match(/NaN|Infinity/));
  assert.equal(shapeArtworkSvg({}, { fill: undefined }), shapeArtworkSvg());
  assert.ok(shapeArtworkCode({ rotation: 725 }).includes("rotation={5}"));
});

test("SVG text and attributes are escaped; React snippets preserve every selected prop safely", () => {
  const label = 'Seed </title><script>alert("x")</script> & "friends"';
  const svg = shapeArtworkSvg({ label }, { fill: '\" onload=\"alert(1)' });
  const parsed = load(svg, { xml: true });
  assert.equal(parsed("script,[onload]").length, 0);
  assert.equal(parsed("title").text(), label);
  assert.equal(parsed("svg").attr("aria-label"), label);
  const options: ShapeArtworkOptions = { name: "seed-wing", tone: "blue", rotation: 22, filled: false, shadow: false, shadowAngle: 130, echo: true, echoAngle: -77, label };
  const snippet = shapeArtworkCode(options);
  for (const [key, value] of Object.entries(options)) assert.ok(snippet.includes(`${key}={${JSON.stringify(value)}}`), `${key} reflected in code`);
  assert.equal(load(shapeArtworkSvg(), { xml: true })("svg").attr("aria-hidden"), "true");
  assert.throws(() => shapeArtworkSvg({ name: "__proto__" as SignatureShapeName }), /Unknown/);
});
