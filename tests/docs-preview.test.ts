import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { load } from "cheerio";
import { ComponentPreview } from "../components/component-preview";

const code = { source: "export function ButtonExample() { return <button>Try me</button>; }", name: "ButtonExample" };

test("real alternatives stay visible while size is a control, not a duplicate gallery", () => {
  const $ = load(renderToString(createElement(ComponentPreview, {
    id: "button", variants: ["default", "accent", "outline"], sizes: ["default", "sm", "lg"], code,
  })));
  assert.equal($('[role="combobox"][aria-label="Example size"]').length, 1, "one size control should adjust the working specimen");
  assert.deepEqual($('[aria-label="Variants"] figure figcaption').map((_, el) => $(el).text()).get(), ["Default", "Accent", "Outline"]);
  assert.equal($('[aria-label="Sizes"] figure').length, 0,"sizes are configuration, not genuinely different concepts");
});

test("a component without alternatives keeps one working example without empty galleries", () => {
  const $ = load(renderToString(createElement(ComponentPreview, { id: "button", variants: [], sizes: [], code })));
  assert.equal($('[data-example="button"]').length, 1);
  assert.equal($('[aria-label="Variants"], [aria-label="Sizes"]').length, 0);
});
