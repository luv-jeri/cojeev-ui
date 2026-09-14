import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { Button } from "../registry/cojeev/ui/button";

// Regression mutation: forwarding shape as an inert HTML attribute leaves the
// real control and its morph painter pill-shaped.
test("card Button owns a finite painter radius without changing caller semantics", () => {
  const $ = load(renderToStaticMarkup(createElement(Button, {
    shape: "card", "aria-pressed": true, type: "submit",
  }, "Notebook")));
  const button = $("button");
  assert.equal(button.attr("data-r"), "12");
  assert.equal(button.attr("shape"), undefined);
  assert.equal(button.attr("type"), "submit");
  assert.equal(button.attr("aria-pressed"), "true");
  assert.equal(button.text(), "Notebook");
});

test("default Button keeps its pill API and does not opt into card geometry", () => {
  const $ = load(renderToStaticMarkup(createElement(Button, null, "Continue")));
  assert.equal($("button").attr("data-r"), undefined);
  assert.equal($("button").attr("shape"), undefined);
  assert.equal($("button").attr("type"), "button");
  assert.equal($("button").attr("aria-pressed"), undefined);
});

test("card Button preserves disabled, busy and asChild contracts", () => {
  const disabled = load(renderToStaticMarkup(createElement(Button, {
    shape: "card", disabled: true,
  }, "Unavailable")));
  assert.equal(disabled("button").is(":disabled"), true);
  assert.equal(disabled("button").attr("aria-disabled"), "true");

  const busy = load(renderToStaticMarkup(createElement(Button, {
    shape: "card", loading: true, loadingIndicator: createElement("span", null, "Working"),
  }, "Saving")));
  assert.equal(busy("button").attr("disabled"), undefined);
  assert.equal(busy("button").attr("aria-busy"), "true");
  assert.equal(busy("button").attr("aria-disabled"), "true");
  assert.equal(busy('[data-slot="button-loading"]').attr("aria-hidden"), "true");
  assert.equal(busy('[data-slot="button-loading"]').text(), "Working");

  const link = load(renderToStaticMarkup(createElement(Button, {
    shape: "card", asChild: true, disabled: true,
  }, createElement("a", { href: "/notebook" }, "Notebook"))));
  assert.equal(link("button").length, 0);
  assert.equal(link("a").attr("href"), "/notebook");
  assert.equal(link("a").attr("data-r"), "12");
  assert.equal(link("a").attr("type"), undefined);
  assert.equal(link("a").attr("tabindex"), "-1");
});
