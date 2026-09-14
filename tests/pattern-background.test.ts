import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PatternBackground } from "../registry/cojeev/ui/pattern-background";
import { CodeBlock } from "../registry/cojeev/ui/code-block";
import { Preview } from "../registry/cojeev/ui/preview";

test("pattern backgrounds stay decorative and expose bounded appearance options", () => {
  const $ = load(renderToStaticMarkup(createElement(PatternBackground, { variant: "grid", spacing: 28, opacity: 0.08, color: "var(--v-pink)" })));
  const pattern = $('[data-slot="pattern-background"]');
  assert.equal(pattern.attr("aria-hidden"), "true");
  assert.equal(pattern.attr("data-pattern"), "grid");
  assert.match(pattern.attr("style")!, /--pattern-spacing:28px/);
  assert.match(pattern.attr("style")!, /opacity:0.08/);
  const invalid = load(renderToStaticMarkup(createElement(PatternBackground, { spacing: -10, opacity: Number.NaN })));
  assert.match(invalid('span').attr('style')!, /--pattern-spacing:8px/);
  assert.doesNotMatch(invalid('span').attr('style')!, /NaN/);
});

test("preview and code reuse decorative patterns without altering copied source", () => {
  const code = "const source = '<unchanged>';\n";
  const $ = load(renderToStaticMarkup(createElement(CodeBlock, { code, pattern: "grid" })));
  assert.equal($('code').text(), code);
  assert.equal($('[data-slot="pattern-background"][data-pattern="grid"]').length, 1);
  const preview = load(renderToStaticMarkup(createElement(Preview, { code }, createElement('button', {}, 'Test action'))));
  assert.equal(preview('[data-slot="preview-canvas"] [data-pattern="dots"]').length, 1);
  assert.equal(preview('[data-slot="preview-canvas"] button').text(), 'Test action');
});

test("preview supports initial, controlled, fixed and hidden background choices", () => {
  const render = (props: Partial<React.ComponentProps<typeof Preview>>) => load(renderToStaticMarkup(createElement(Preview, { code: "example", ...props })));
  const initial = render({ defaultPattern: "pebbles" });
  assert.equal(initial('[data-slot="preview-canvas"] > [data-pattern="pebbles"]').length, 1);
  const fixed = render({ pattern: "none", defaultPattern: "grid" });
  assert.equal(fixed('[data-slot="preview-canvas"] > [data-slot="pattern-background"]').length, 0);
  assert.equal(fixed('button').filter((_, node) => fixed(node).text() === 'Background').is('[disabled]'), true);
  const controlled = render({ pattern: "sprouts", onPatternChange: () => {} });
  assert.equal(controlled('[data-slot="preview-canvas"] > [data-pattern="sprouts"]').length, 1);
  assert.equal(controlled('button').filter((_, node) => controlled(node).text() === 'Background').is('[disabled]'), false);
  const hidden = render({ showBackgroundPicker: false });
  assert.equal(hidden('button').filter((_, node) => hidden(node).text() === 'Background').length, 0);
});
