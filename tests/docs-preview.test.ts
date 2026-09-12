import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { load } from "cheerio";
import { ComponentPreview } from "../components/component-preview";
import { CheckboxExample, RadioGroupExample } from "../components/examples/choice-foundations";

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

test("compact choice tiles drop the repeated introduction and stay live", () => {
  for (const [Example, role, feedback] of [
    [CheckboxExample, "checkbox", /Working notes/],
    [RadioGroupExample, "radio", /working notes/],
  ] as const) {
    const full = load(renderToString(createElement(Example, {})));
    assert.equal(full(".v-choice-example header").length, 1, "the working specimen keeps its full introduction");
    const $ = load(renderToString(createElement(Example, { compact: true })));
    assert.equal($(".v-choice-example header").length, 0, "comparison tiles let their approach label lead");
    assert.equal($(`[role="${role}"]`).length, 3, "every retained option stays interactive in the comparison");
    assert.match($('[role="status"]').text(), feedback, "selection feedback survives the compact tile");
    assert.equal($('[role="group"][aria-label], [role="radiogroup"][aria-label]').length, 1, "the compact group keeps an accessible name");
  }
});
