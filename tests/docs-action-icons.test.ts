import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { load } from "cheerio";
import { ComponentPreview } from "../components/component-preview";
import { ComponentHandoff } from "../components/component-handoff";
import { DocsShell } from "../components/docs-shell";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

test("preview actions have decorative glyphs without losing their labels and tab state", () => {
  const $ = load(renderToString(createElement(ComponentPreview, {
    id: "button", variants: [], sizes: [],
    code: { source: "export function ButtonExample() { return <button>Try me</button>; }", name: "ButtonExample" },
  })));
  for (const label of ["Preview", "Code", "Reset example"]) {
    const action = $("button").filter((_, element) => $(element).text().trim() === label);
    assert.equal(action.length, 1, `${label} keeps its existing accessible label`);
    const glyph = action.find('[data-slot="animated-icon"] svg[data-slot="icon"]');
    assert.equal(glyph.length, 1, `${label} has one action glyph`);
    assert.equal(glyph.attr("aria-hidden"), "true", `${label} glyph does not repeat its name`);
    assert.ok(glyph.hasClass("-sm"), `${label} uses the compact glyph size`);
  }
  const tabs = $('[role="tab"]');
  assert.equal(tabs.filter('[aria-selected="true"]').text().trim(), "Preview");
  assert.equal(tabs.filter('[aria-selected="false"]').text().trim(), "Code");
});

test("guide disclosure combines a decorative reading glyph with its existing state chevron", () => {
  const $ = load(renderToString(createElement(ComponentHandoff, {
    notes: "Read the component guide.", code: "<Button />", variant: "default", size: "default",
  })));
  const action = $("button").filter((_, element) => $(element).text().trim() === "Read guide");
  assert.equal(action.attr("aria-expanded"), "false");
  assert.equal(action.find('[data-slot="animated-icon"] svg[aria-hidden="true"]').length, 1);
  assert.equal(action.find('[data-slot="state-chevron"][aria-hidden="true"]').length, 1);
});

test("mobile browse keeps a named disclosure control with a decorative menu glyph", () => {
  const unexpectedNavigation = () => { throw new Error("Static disclosure render must not navigate"); };
  const router: AppRouterInstance = { back: unexpectedNavigation, forward: unexpectedNavigation, refresh: unexpectedNavigation, push: unexpectedNavigation, replace: unexpectedNavigation, prefetch: unexpectedNavigation, bfcacheId: "docs-glyph-fixture" };
  // DocsShell declares children as a required prop, including in createElement fixtures.
  // eslint-disable-next-line react/no-children-prop
  const shell = createElement(DocsShell, {
    entries: [{ name: "button", title: "Button", baseComponent: true, category: "Foundations", description: "A native action with expressive motion.", previewVariant: "default" }],
    children: createElement("p", null, "Documentation"),
  });
  const $ = load(renderToString(createElement(AppRouterContext.Provider, { value: router }, shell)));
  const action = $("button").filter((_, element) => $(element).text().trim() === "Browse");
  assert.equal(action.attr("aria-expanded"), "false");
  assert.equal(action.attr("aria-controls"), "docs-navigation");
  assert.equal(action.find('[data-slot="animated-icon"] svg[aria-hidden="true"]').length, 1);
});
