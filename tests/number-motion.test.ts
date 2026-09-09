import assert from "node:assert/strict";
import test from "node:test";
import { numberParts, rollingTarget, mixNumber, stepNumber, parseNumberInput, numberInputText } from "../registry/cojeev/lib/number-motion";

test("formatted parts retain localized signs, grouping, fractions and exponent text", () => {
  for (const [locale, options] of [["en-US", { style: "currency", currency: "USD", currencySign: "accounting" }], ["de-DE", { minimumFractionDigits: 2 }], ["ar-EG", { minimumFractionDigits: 2 }], ["hi-IN", { useGrouping: true }], ["en-US", { notation: "scientific" }]] as const) {
    const formatter = new Intl.NumberFormat(locale, options);
    for (const value of [-123456.75, 0, 123456789.125]) {
      const parts = numberParts(formatter, value);
      assert.equal(parts.map(part => part.text).join(""), formatter.format(value));
      assert.equal(new Set(parts.map(part => part.key)).size, parts.length);
      for (const part of parts.filter(part => part.digit !== undefined)) assert.equal(part.glyphs?.[part.digit!], part.text);
    }
  }
});

test("rolling retargets preserve fractional position and travel in the requested direction", () => {
  assert.equal(rollingTarget(8.4, 2, 1), 12);
  assert.equal(rollingTarget(11.6, 9, -1), 9);
  assert.equal(rollingTarget(-.4, 9, -1), -1);
  assert.equal(rollingTarget(12, 2, 1), 12);
});

test("finite interpolation remains bounded even across opposite extreme values", () => {
  assert.equal(mixNumber(-Number.MAX_VALUE, Number.MAX_VALUE, .5), 0);
  assert.equal(mixNumber(10, 20, 1), 20);
  assert.equal(mixNumber(-0, -0, 1), -0);
});

test("decimal stepping avoids drift, respects step base and clamps native bounds", () => {
  assert.equal(stepNumber(.2, 1, .1), .3);
  assert.equal(stepNumber(9007199254740990, 1, 1), 9007199254740991);
  assert.equal(stepNumber(1e-90, 1, 1e-90), 2e-90);
  assert.equal(stepNumber(.3, -1, .1), .2);
  assert.equal(stepNumber(.21, 1, .1), .3);
  assert.equal(stepNumber(.21, -1, .1), .2);
  assert.equal(stepNumber(.3, 1, .1, 0, .35), .35);
  assert.equal(stepNumber(null, 1, 2, 3, 9), 3);
  assert.equal(stepNumber(5, -1, 2, 3, 9), 3);
});

test("editing retains partial text and preserves localized high-precision values", () => {
  assert.equal(parseNumberInput("-"), undefined);
  assert.equal(parseNumberInput("1e"), undefined);
  assert.equal(parseNumberInput(""), null);
  assert.equal(parseNumberInput("1.250,75", "de-DE"), 1250.75);
  assert.equal(parseNumberInput("١٢٫٥", "ar-EG"), 12.5);
  for (const value of [-0, 1e-30, 1e28, -3.141592653589793, 123456789012345]) for (const locale of ["en-US", "de-DE", "ar-EG"]) assert.equal(parseNumberInput(numberInputText(value, locale), locale), value);
});

test("SSR exposes the final formatted value and a real editable input without client motion", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { AnimatedNumber } = await import("../registry/cojeev/ui/animated-number");
  const { NumberInput } = await import("../registry/cojeev/ui/number-input");
  const markup = renderToStaticMarkup(React.createElement(AnimatedNumber, { value: -1250.5, from: 0, treatment: "roll", locale: "de-DE", format: { minimumFractionDigits: 2 } }));
  assert.match(markup, /-1\.250,50/);
  assert.match(markup, /aria-hidden="true"/);
  assert.doesNotMatch(markup, /__track/);
  const field = renderToStaticMarkup(React.createElement(NumberInput, { value: .2, "aria-label": "Quantity", disabled: true }));
  assert.match(field, /<input[^>]*role="spinbutton"[^>]*value="0.2"/);
  assert.match(field, /aria-label="Quantity"/);
  assert.equal((field.match(/<button[^>]*disabled=""/g) ?? []).length, 2);
});
