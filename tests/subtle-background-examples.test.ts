import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PatternBackgroundExample } from "../components/examples/pattern-background";
import { DotsBackgroundExample, GridBackgroundExample, ContoursBackgroundExample, WeaveBackgroundExample, PebblesBackgroundExample, SunwashBackgroundExample, FoldsBackgroundExample, SproutsBackgroundExample } from "../components/examples/subtle-backgrounds";

const patterns = ["dots", "grid", "contours", "weave", "pebbles", "sunwash", "folds", "sprouts"];

for (const variant of patterns) {
  test(`the ${variant} pattern example renders its own paint and keeps a foreground action`, () => {
    const $ = load(renderToStaticMarkup(createElement(PatternBackgroundExample, { variant })));
    assert.equal($('[data-slot="pattern-background"]').attr("data-pattern"), variant);
    assert.equal($('[data-slot="pattern-background"]').attr("aria-hidden"), "true");
    const action = $("button").filter((_, element) => $(element).text().trim() === "Add a note");
    assert.equal(action.length, 1);
    assert.equal(action.attr("disabled"), undefined);
    assert.equal($('[role="status"]').text().trim(), "0 notes added.");
    assert.equal($('[data-slot="slider"]').length, 2);
  });
}

test("plain and compact pattern examples retain the useful foreground", () => {
  const $ = load(renderToStaticMarkup(createElement(PatternBackgroundExample, { variant: "none", compact: true })));
  assert.equal($('[data-slot="pattern-background"]:not([data-pattern="none"])').length, 0);
  assert.equal($("button").filter((_, element) => $(element).text().trim() === "Add a note").length, 1);
  assert.equal($('[data-slot="slider"]').length, 0);
});

const dedicated = [
  ["dots", DotsBackgroundExample], ["grid", GridBackgroundExample],
  ["contours", ContoursBackgroundExample], ["weave", WeaveBackgroundExample],
  ["pebbles", PebblesBackgroundExample], ["sunwash", SunwashBackgroundExample],
  ["folds", FoldsBackgroundExample], ["sprouts", SproutsBackgroundExample],
] as const;

for (const [pattern, Example] of dedicated) {
  test(`the dedicated ${pattern} example retains its renderer and action in compact galleries`, () => {
    for (const compact of [false, true]) {
      const $ = load(renderToStaticMarkup(createElement(Example, { compact })));
      assert.equal($('[data-slot="pattern-background"]').length, 1);
      assert.equal($('[data-slot="pattern-background"]').attr("data-pattern"), pattern);
      assert.equal($('[data-slot="pattern-background"]').attr("aria-hidden"), "true");
      assert.equal($("button").filter((_, element) => $(element).text().trim() === "Add a note").length, 1);
      assert.equal($('[role="status"]').text().trim(), "0 notes added.");
      assert.equal($('[data-slot="slider"]').length, compact ? 0 : 2);
    }
  });
}
