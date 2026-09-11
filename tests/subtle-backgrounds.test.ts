import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PatternBackground } from "../registry/cojeev/ui/pattern-background";
import { subtleBackgrounds } from "../registry/cojeev/lib/subtle-backgrounds";

const variants = ["dots", "grid", "contours", "weave", "pebbles", "sunwash", "folds", "sprouts"] as const;

test("subtle backgrounds keep paint decorative and render distinct bounded structures", () => {
  for (const variant of variants) {
    const $ = load(renderToStaticMarkup(createElement(PatternBackground, { variant: variant as never, spacing: 20, opacity: .16 })));
    const host = $('[data-slot="pattern-background"]');
    assert.equal(host.attr("aria-hidden"), "true");
    assert.equal(host.attr("data-pattern"), variant);
    if (variant !== "dots" && variant !== "grid") {
      const svg = host.find('svg[data-slot="pattern-background-svg"]');
      assert.equal(svg.length, 1, `${variant} has authored SVG paint`);
      assert.equal(svg.attr("focusable"), "false");
      assert.equal(svg.attr("viewBox"), undefined, `${variant} paints in real viewport pixels rather than stretching a viewBox`);
      const tile = svg.find('pattern[data-slot="pattern-background-tile"]');
      assert.equal(tile.length, 1, `${variant} repeats an authored tile`);
      assert.equal(tile.attr("patternUnits"), "userSpaceOnUse");
      assert.equal(tile.attr("width"), String(20 * (variant === "sunwash" ? 16 : variant === "folds" ? 8 : 4)), `${variant} scales its tile from spacing`);
      assert.ok(tile.find('path, polygon, rect').length > 0, `${variant} is not an empty surface`);
      const paths = tile.find("path");
      if (variant === "contours") assert.ok(paths.length >= 3 && paths.toArray().every(path => /C.*Z/.test($(path).attr("d") ?? "")), "contours use nested closed organic curves");
      if (variant === "weave") {
        assert.match(tile.find('[data-thread="horizontal"]').attr("d") ?? "", /H69M81.*H19M31/, "horizontal threads alternate gaps at crossings");
        assert.match(tile.find('[data-thread="vertical"]').attr("d") ?? "", /V19M25 31.*V69M75 81/, "vertical threads use opposite gaps for over-and-under weaving");
      }
      if (variant === "pebbles") assert.ok(paths.length >= 3 && paths.toArray().every(path => ($(path).attr("d") ?? "").includes("Z")), "pebbles are closed irregular outlines");
      if (variant === "sunwash") assert.match(tile.html() ?? "", /radialgradient/i, "sunwash is a broad radial wash");
      if (variant === "folds") assert.equal(paths.length, 2, "folds use two faceted planes");
      if (variant === "sprouts") assert.equal(paths.length, 1, "sprouts pair leaves on sparse stems");
    }
  }
  const none = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "none" })));
  assert.equal(none('[data-slot="pattern-background-svg"]').length, 0);
  const invalid = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "unexpected" as never, spacing: 999, opacity: -1 })));
  assert.equal(invalid('[data-slot="pattern-background"]').attr("data-pattern"), "dots");
  assert.match(invalid('[data-slot="pattern-background"]').attr("style") ?? "", /--pattern-spacing:80px/);
  assert.match(invalid('[data-slot="pattern-background"]').attr("style") ?? "", /opacity:0/);
});

test("SVG tile scale and color are real paint inputs", () => {
  const compact = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "contours" as never, spacing: 12, color: "#1256a8" })));
  const open = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "contours" as never, spacing: 48, color: "#1256a8" })));
  assert.equal(compact('[data-slot="pattern-background-tile"]').attr("width"), "48");
  assert.equal(open('[data-slot="pattern-background-tile"]').attr("width"), "192");
  assert.match(compact('[data-slot="pattern-background"]').attr("style") ?? "", /--pattern-color:#1256a8/);
  const sunwash = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "sunwash" as never, color: "#1256a8" })));
  assert.match(sunwash.html() ?? "", /stop-color="currentColor"/);
});

test("catalogue offers the eight selectable paints and never exposes plain as a paint", () => {
  assert.deepEqual(subtleBackgrounds.map(background => background.value), variants);
  assert.ok(subtleBackgrounds.every(background => background.label && background.description));
});

test("each authored SVG instance namespaces its paint definitions", () => {
  const $ = load(renderToStaticMarkup(createElement("div", null,
    createElement(PatternBackground, { variant: "sunwash" as never }),
    createElement(PatternBackground, { variant: "sunwash" as never }),
  )));
  const ids = $('[data-slot="pattern-background-svg"] [id]').map((_, element) => $(element).attr("id")).get();
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, ids.length);
});
