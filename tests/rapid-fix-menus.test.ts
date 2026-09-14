import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as ContextPrimitive from "@radix-ui/react-context-menu";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Command } from "cmdk";
import { Select, SelectItem, type SelectItemProps } from "../registry/cojeev/ui/select";
import { Combobox, ComboboxItem } from "../registry/cojeev/ui/combobox";
import { ItemAdornment } from "../registry/cojeev/ui/item-adornment";
import { Icon } from "../registry/cojeev/ui/icon";
import { DropdownMenu, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "../registry/cojeev/ui/dropdown-menu";
import { ContextMenu, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem } from "../registry/cojeev/ui/context-menu";
import { Menubar, MenubarMenu, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem } from "../registry/cojeev/ui/menubar";

const h = React.createElement;
// Keep the real primitive contexts, but render content without a portal so the
// row's authored markup can be checked on the server as well as in the browser.
function selectRow(props: Partial<SelectItemProps> = {}) {
  return load(renderToStaticMarkup(h(Select, { defaultValue: "weekly", defaultOpen: true },
    h(SelectPrimitive.Content, { position: "popper" },
      h(SelectPrimitive.Viewport, null, h(SelectItem, { value: "weekly", ...props }, "Every week"))))));
}

test("a selected Select row relies on its background by default, with an explicit check opt-in", () => {
  const row = selectRow();
  assert.equal(row('[data-slot="select-item"]').attr("data-state"), "checked");
  assert.equal(row('[data-slot="select-item"]').text(), "Every week");
  assert.equal(row(".v-select__indicator").length, 0, "default selection must not add another grid child");
  assert.equal(selectRow({ showIndicator: true })(".v-select__indicator").length, 1);
});

test("automatic menu decoration is a single glyph, not a glyph on another blob", () => {
  for (const adornment of [undefined, "auto", { icon: "save", color: "pink" }] as const) {
    const row = selectRow({ adornment });
    assert.equal(row('[data-slot="item-adornment"] [data-slot="icon"]').length, 1);
    assert.equal(row('[data-slot="item-adornment"] [data-slot="shape-morph"]').length, 0);
  }
});

test("menu silhouette, hidden and custom decoration choices remain usable without stacking", () => {
  for (const adornment of [{ showIcon: false }, { icon: false }, { showBackground: true, icon: "save" }]) {
    const row = selectRow({ adornment });
    assert.equal(row('[data-slot="item-adornment"] [data-slot="shape-morph"]').length, 1);
    assert.equal(row('[data-slot="item-adornment"] [data-slot="icon"]').length, 0);
  }
  for (const adornment of [false, "none", { showIcon: false, showBackground: false }] as const) {
    assert.equal(selectRow({ adornment })('[data-slot="item-adornment"]').length, 0);
  }
  const custom = selectRow({ adornment: h(Icon, { name: "github" }) });
  assert.equal(custom('[data-slot="item-adornment"] [data-icon-name="github"]').length, 1);
  assert.equal(custom('[data-slot="shape-morph"]').length, 0);
});

test("a selected Combobox row uses the same uncluttered default while retaining its chosen value", () => {
  const render = (showIndicator?: boolean) => load(renderToStaticMarkup(
    h(Combobox, { defaultValue: "weekly" }, h(Command.List, null,
      h(ComboboxItem, { value: "weekly", showIndicator }, "Every week")))));
  const row = render();
  assert.equal(row('[data-slot="combobox-item"]').attr("data-selected-option"), "true");
  assert.equal(row('[data-slot="combobox-item"]').text(), "Every week");
  assert.equal(row(".v-combo__selected").length, 0);
  assert.equal(row('[data-slot="item-adornment"] [data-slot="shape-morph"]').length, 0);
  assert.equal(row('[data-slot="item-adornment"] [data-slot="icon"]').length, 1);
  assert.equal(render(true)(".v-combo__selected").length, 1);
});

test("non-menu adornments retain their explicit combined icon and silhouette", () => {
  const markup = load(renderToStaticMarkup(h(ItemAdornment, {
    identity: "Save", value: { shape: "clover-soft", icon: "save", color: "pink" },
  })));
  assert.equal(markup('[data-slot="shape-morph"]').length, 1);
  assert.equal(markup('[data-slot="icon"]').length, 1);
});

const menuFamilies = [
  {
    name: "dropdown-menu", Item: DropdownMenuItem, Checkbox: DropdownMenuCheckboxItem,
    RadioGroup: DropdownMenuRadioGroup, Radio: DropdownMenuRadioItem,
    render: (children: React.ReactNode) => h(DropdownMenu, { defaultOpen: true }, h(DropdownPrimitive.Content, { forceMount: true }, children)),
  },
  {
    name: "context-menu", Item: ContextMenuItem, Checkbox: ContextMenuCheckboxItem,
    RadioGroup: ContextMenuRadioGroup, Radio: ContextMenuRadioItem,
    render: (children: React.ReactNode) => h(ContextMenu, null, h(ContextPrimitive.Content, { forceMount: true }, children)),
  },
  {
    name: "menubar", Item: MenubarItem, Checkbox: MenubarCheckboxItem,
    RadioGroup: MenubarRadioGroup, Radio: MenubarRadioItem,
    render: (children: React.ReactNode) => h(Menubar, { defaultValue: "file" }, h(MenubarMenu, { value: "file" }, h(MenubarPrimitive.Content, { forceMount: true }, children))),
  },
];

for (const family of menuFamilies) {
  test(`${family.name} uses one row decoration without losing checkbox/radio meaning or native-child composition`, () => {
    const markup = load(renderToStaticMarkup(family.render(h(React.Fragment, null,
      h(family.Item, null, "Save"),
      h(family.Checkbox, { checked: true }, "Show notes"),
      h(family.RadioGroup, { value: "weekly" }, h(family.Radio, { value: "weekly" }, "Weekly")),
      h(family.Item, { asChild: true }, h("a", { href: "#notes" }, h(Icon, { name: "file-text" }), "Notes")),
    ))));
    assert.equal(markup('[role="menuitemcheckbox"]').attr("aria-checked"), "true");
    assert.equal(markup('[role="menuitemradio"]').attr("aria-checked"), "true");
    assert.equal(markup('[role="menuitemcheckbox"] .v-menu__check [data-icon-name="check"]').length, 1);
    assert.equal(markup('[role="menuitemradio"] .v-menu__check [data-icon-name="dot"]').length, 1);
    assert.equal(markup('a[role="menuitem"]').text(), "Notes");
    assert.equal(markup('a[role="menuitem"] [data-slot="item-adornment"]').length, 0);
    assert.equal(markup('[data-slot="item-adornment"]').length, 3);
    assert.equal(markup('[data-slot="item-adornment"] [data-slot="icon"]').length, 3);
    assert.equal(markup('[data-slot="item-adornment"] [data-slot="shape-morph"]').length, 0);
  });
}
