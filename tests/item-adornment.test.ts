import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItemAdornment, resolveItemAdornment, adornItem } from "../registry/sahajiv/ui/item-adornment";
import { Icon, Disk, iconNames } from "../registry/sahajiv/ui/icon";

test("visual identities are deterministic across reorder and filtering", () => {
  const identities = ["Save document", "Share link", "Open settings", "Visit GitHub", "Create project"];
  const original = Object.fromEntries(identities.map(id => [id, resolveItemAdornment(id)]));
  for (const id of identities.toReversed().filter(id => id !== "Open settings")) assert.deepEqual(resolveItemAdornment(id), original[id]);
  assert(new Set(Object.values(original).map(x => x.shape)).size > 1);
  assert(new Set(Object.values(original).map(x => x.color)).size > 1);
});

test("automatic, explicit, custom and none adornments have distinct SSR contracts", () => {
  const render = (value?: React.ComponentProps<typeof ItemAdornment>["value"]) => renderToStaticMarkup(React.createElement(ItemAdornment, { identity:"document", value }));
  assert.equal(render(false), "");
  assert.equal(render("none"), "");
  assert.match(render(), /data-slot="item-adornment"/);
  const explicit = render({ shape:"clover-soft", color:"blue", icon:"save" });
  assert.match(explicit, /data-shape="clover-soft"/);
  assert.match(explicit, /data-icon-name="save"/);
  assert.equal((render(React.createElement(Icon, {name:"github"})).match(/data-slot="icon"/g) ?? []).length, 1);
});

test("every advertised icon renders as SVG", () => {
  assert.equal(new Set(iconNames).size, iconNames.length);
  assert(iconNames.length >= 136, "preserve the original advertised icon set as the pack grows");
  for(const name of ["github","arrow-up","paperclip","square","shield-check","pointer"])assert(iconNames.includes(name));
  for (const name of iconNames) assert.match(renderToStaticMarkup(React.createElement(Icon, {name})), /^<svg/);
});

test("legacy visual composition is preserved without a second automatic icon", () => {
  const children = React.createElement(React.Fragment, null, React.createElement(Disk, null, React.createElement(Icon, {name:"github"})), "GitHub");
  const markup = renderToStaticMarkup(React.createElement("div", null, adornItem(children, undefined, "github")));
  assert.equal((markup.match(/data-slot="icon"/g) ?? []).length, 1);
  assert(!markup.includes('data-slot="item-adornment"'));
});
