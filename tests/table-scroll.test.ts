import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { TableContainer, Table, TableBody, TableRow, TableCell } from "../registry/cojeev/ui/table";

test("TableContainer shares explicit direction with its real scroll owner", () => {
  const $ = load(renderToStaticMarkup(h(TableContainer, { dir: "rtl", id: "ledger", "aria-label": "Ledger" }, h(Table, null, h(TableBody, null, h(TableRow, null, h(TableCell, null, "Entry")))))));
  assert.equal($("[data-slot=scroll-area]").attr("dir"), "rtl");
  assert.equal($("#ledger[data-radix-scroll-area-viewport]").attr("dir"), "rtl");
  assert.equal($("table tbody td").text(), "Entry");
  assert.equal($("[aria-label=Ledger]").length, 1);
});
