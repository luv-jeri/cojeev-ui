import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h, type ElementType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { Input, InputWrapper, InputControl } from "../registry/cojeev/ui/input";
import { Textarea } from "../registry/cojeev/ui/textarea";
import { Field, FieldLabel, FieldControl, FieldDescription } from "../registry/cojeev/ui/field";
import { InputGroup, InputGroupInput } from "../registry/cojeev/ui/input-group";
import { Button } from "../registry/cojeev/ui/button";
import { NativeSelect } from "../registry/cojeev/ui/native-select";
import { NumberInput } from "../registry/cojeev/ui/number-input";
import { MultiSelect } from "../registry/cojeev/ui/multi-select";

// Removing prop consumption leaks cosmetic configuration into native form data surfaces.
for (const Component of [Input, Textarea]) test(`${Component.name} preserves native editing props and owns cosmetic props`, () => {
  const $ = load(renderToStaticMarkup(h(Component as ElementType, { appearance: "editorial", radius: "square", name: "draft", defaultValue: "Keep this draft" })));
  const control = $("input,textarea");
  assert.equal(control.attr("appearance"), undefined);
  assert.equal(control.attr("radius"), undefined);
  assert.equal(control.attr("data-appearance"), "editorial");
  assert.match(control.attr("style") ?? "", /--v-control-radius:0px/);
  assert.equal(control.attr("name"), "draft");
  assert.equal(control.is("input") ? control.attr("value") : control.text(), "Keep this draft");
});
for (const [Shell, Control] of [[InputWrapper, InputControl], [InputGroup, InputGroupInput]] as const) test(`${Shell.name} owns corners without leaking onto the native input`, () => {
  const $ = load(renderToStaticMarkup(h(Shell as ElementType, { appearance: "inset", radius: "soft" }, h(Control, { name: "slug", defaultValue: "personal-space" }))));
  assert.equal($("[appearance],[radius]").length, 0);
  assert.match($("[data-appearance=inset]").attr("style") ?? "", /--v-control-radius:8px/);
  assert.equal($("input").attr("name"), "slug");
  assert.equal($("input").attr("value"), "personal-space");
});
test("Field retains label association and nested local corners", () => {
  const $ = load(renderToStaticMarkup(h(Field, { controlId: "workspace", appearance: "inset", radius: "pill" } as never,
    h(FieldLabel, null, "Workspace"), h(FieldControl, null, h(Input, { radius: "square", defaultValue: "Home" } as never)), h(FieldDescription, { id: "workspace-help" }, "Your space"))));
  assert.equal($("label").attr("for"), $("input").attr("id"));
  assert.equal($("[data-slot=field]").attr("data-appearance"), "inset");
  assert.match($("input").attr("style") ?? "", /--v-control-radius:0px/);
  assert.equal($("#workspace-help").text(), "Your space");
});
for (const Component of [Button, NativeSelect, NumberInput, MultiSelect]) test(`${Component.name} shares local corner ownership`, () => {
  const $ = load(renderToStaticMarkup(h(Component as ElementType, { radius: "soft", label: "Tags", options: [], "aria-label": "Control" })));
  assert.equal($("[radius]").length, 0);
  assert.match($("[style]").first().attr("style") ?? "", /--v-control-radius:8px/);
});
