import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { Dock, type DockItem } from "../registry/cojeev/ui/dock";
import { DockExample } from "../components/examples/dock";

const items: DockItem[] = [
  { value: "today", label: "Today", icon: createElement("span", null, "T") },
  { value: "work", label: "Work", icon: createElement("span", null, "W"), badge: 3 },
  { value: "paused", label: "Paused", icon: createElement("span", null, "P"), disabled: true },
];

test("dock defaults to glass and clamps its public size controls", () => {
  const $ = load(renderToStaticMarkup(createElement(Dock, {
    items,
    defaultValue: "work",
    itemSize: 500,
    magnification: Number.NaN,
    "aria-label": "Workspace launcher",
  })));

  const dock = $('[data-slot="dock"]');
  assert.equal(dock.attr("data-variant"), "glass");
  assert.equal(dock.attr("aria-label"), "Workspace launcher");
  assert.match(dock.attr("style")!, /--dock-item-size:72px/);
  assert.match(dock.attr("style")!, /--dock-magnification:1.65/);
  assert.equal($('[data-part="glass-lens"]').length, 1);
  assert.equal($('[data-part="active-indicator"]').length, items.length, "each lane reserves indicator geometry");
  assert.equal($('button[aria-pressed="true"]').attr("aria-label"), "Work");
  assert.equal($('button[disabled]').attr("aria-label"), "Paused");
  assert.equal($('[data-part="badge"]').text(), "3");
});

test("dock variants render distinct supporting structures and readable labels", () => {
  const expected = {
    glass: "glass-lens",
    shelf: "shelf-plane",
    rail: "rail-spine",
  } as const;

  for (const [variant, part] of Object.entries(expected)) {
    const $ = load(renderToStaticMarkup(createElement(Dock, { items, variant: variant as keyof typeof expected })));
    assert.equal($(`[data-part="${part}"]`).length, 1, `${variant} owns its structural surface`);
    assert.equal($('[data-part="label"]').length, items.length);
    assert.equal($('[role="toolbar"]').attr("aria-orientation"), variant === "rail" ? "vertical" : "horizontal");
  }
});

test("dock examples map default to glass and keep full-only controls out of compact galleries", () => {
  for (const variant of ["default", "glass", "shelf", "rail"]) {
    const $ = load(renderToStaticMarkup(createElement(DockExample, { variant })));
    const resolved = variant === "default" ? "glass" : variant;
    assert.equal($('[data-example="dock"]').attr("data-example-variant"), resolved);
    assert.equal($('[data-slot="dock"]').attr("data-variant"), resolved);
    assert.equal($('[role="status"]').length, 1, `${variant} keeps a visible action receipt`);
    assert.equal($('[data-slot="slider"]').length, 2, `${variant} full specimen exposes two Cojeev sliders`);
    assert.deepEqual($('[data-slot="slider"]').map((_, node) => $(node).attr("aria-label")).get(), ["Item size", "Magnification"]);

    const compact = load(renderToStaticMarkup(createElement(DockExample, { variant, compact: true })));
    assert.equal(compact('[data-slot="slider"]').length, 0);
    assert.equal(compact('[role="status"]').length, 1);
  }
});
