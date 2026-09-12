import assert from "node:assert/strict";
import test from "node:test";
import { groupDocsEntries } from "../lib/docs-navigation";

test("the index groups foundations and charts without losing or repeating entries", () => {
  const entries = [
    { name: "input", title: "Input", category: "Forms" },
    { name: "icon", title: "Icon library", category: "Data display" },
    { name: "shape", title: "Shape studio", category: "Visual effects" },
    { name: "area-chart", title: "Area chart", category: "Data display" },
    { name: "chart-tooltip", title: "Chart tooltip", category: "Data display" },
    { name: "custom", title: "Custom", category: "Something new" },
  ];
  const groups = groupDocsEntries(entries);
  assert.equal(groups[0].name, "Foundations");
  assert.deepEqual(groups.find(group => group.name === "Charts")?.entries.map(entry => entry.name), ["area-chart", "chart-tooltip"]);
  assert.equal(new Set(groups.flatMap(group => group.entries.map(entry => entry.name))).size, entries.length);
  assert.equal(groups.flatMap(group => group.entries).length, entries.length);
});
