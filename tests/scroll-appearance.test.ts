import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { PageScrollBar, ScrollArea, ScrollbarProvider } from "../registry/cojeev/ui/scroll-area";

test("one scrollbar provider gives managed areas and the page rail the same appearance", () => {
  const markup = renderToStaticMarkup(createElement(ScrollbarProvider, {
    scrollbarSize: 4,
    scrollbarColor: "var(--v-brand)",
    scrollbarVariant: "organic",
  }, createElement(Fragment, null,
    createElement(ScrollArea, { "aria-label": "Shared area" }, createElement("div", null, "Scrollable content")),
    createElement(PageScrollBar),
  )));
  const document = load(markup);
  for (const slot of ["scroll-area", "page-scrollbar"]) {
    const control = document(`[data-slot="${slot}"]`);
    assert.equal(control.attr("data-scrollbar-variant"), "organic");
    assert.match(control.attr("style") ?? "", /--scrollbar-size:4px/);
    assert.match(control.attr("style") ?? "", /--scrollbar-color:var\(--v-brand\)/);
  }
});

test("a local scrollbar appearance overrides the provider without changing its sibling", () => {
  const markup = renderToStaticMarkup(createElement(ScrollbarProvider, {
    scrollbarSize: 5,
    scrollbarColor: "teal",
    scrollbarVariant: "rounded",
  }, createElement(Fragment, null,
    createElement(ScrollArea, { scrollbarSize: 9, scrollbarVariant: "minimal" }, createElement("div", null, "Scrollable content")),
    createElement(PageScrollBar),
  )));
  const document = load(markup);
  const area = document('[data-slot="scroll-area"]');
  const page = document('[data-slot="page-scrollbar"]');
  assert.equal(area.attr("data-scrollbar-variant"), "minimal");
  assert.match(area.attr("style") ?? "", /--scrollbar-size:9px/);
  assert.match(area.attr("style") ?? "", /--scrollbar-color:teal/);
  assert.equal(page.attr("data-scrollbar-variant"), "rounded");
  assert.match(page.attr("style") ?? "", /--scrollbar-size:5px/);
});

test("scroll appearance clamps visual paint while preserving the shared rail API", () => {
  const markup = renderToStaticMarkup(createElement(ScrollArea, {
    scrollbarSize: 1,
    scrollbarColor: "rebeccapurple",
    scrollbarVariant: "minimal",
    style: { height: 160 },
  }, createElement("div", null, "Scrollable content")));
  const document = load(markup);
  const root = document('[data-slot="scroll-area"]');
  assert.equal(root.attr("data-scrollbar-variant"), "minimal");
  assert.match(root.attr("style") ?? "", /--scrollbar-size:2px/);
  assert.match(root.attr("style") ?? "", /--scrollbar-color:rebeccapurple/);
});

test("page scrollbar exposes the same default organic appearance and maximum visual clamp", () => {
  const markup = renderToStaticMarkup(createElement(PageScrollBar, {
    scrollbarSize: 100,
    scrollbarColor: "#1256a8",
    scrollbarVariant: "rounded",
  }));
  const document = load(markup);
  const rail = document('[data-slot="page-scrollbar"]');
  assert.equal(rail.attr("data-scrollbar-variant"), "rounded");
  assert.match(rail.attr("style") ?? "", /--scrollbar-size:16px/);
  assert.match(rail.attr("style") ?? "", /--scrollbar-color:#1256a8/);
});
