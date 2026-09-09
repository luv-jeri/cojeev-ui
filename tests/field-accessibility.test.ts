import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "../registry/cojeev/ui/field";

test("a field can show help and an error without duplicate document IDs", () => {
  const html = renderToStaticMarkup(h(Field, { invalid: true, controlId: "project" },
    h(FieldLabel, null, "Project"),
    h(FieldControl, null, h("input")),
    h(FieldDescription, null, "Use the project name."),
    h(FieldError, null, "This name is already in use."),
  ));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /for="project"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /role="alert"/);
});

test("a field with no description does not point at a nonexistent message", () => {
  const html = renderToStaticMarkup(h(Field, { controlId: "name" },
    h(FieldControl, null, h("input")),
  ));
  assert.doesNotMatch(html, /aria-describedby=/);
});
