import { test } from "node:test";
import assert from "node:assert/strict";
import registry from "../registry.json";
import { categories } from "../lib/categories";

test("every registered component is reachable through exactly one documentation category", () => {
  assert.equal(
    new Set(categories).size,
    categories.length,
    "navigation categories must be unique",
  );
  const components = registry.items.filter(
    (item) => item.type === "registry:ui",
  );
  assert.ok(components.length > 0);
  const missing = components.filter(
    (item) => !categories.includes(item.meta!.category!),
  );
  assert.deepEqual(
    missing.map((item) => item.name),
    [],
    "components must not disappear from navigation",
  );
});

test("charts have a dedicated category, including the shared frame and inspector", () => {
  const chartNames = [
    "chart",
    "area-chart",
    "bar-chart",
    "line-chart",
    "pie-chart",
    "radar-chart",
    "radial-chart",
    "chart-tooltip",
  ];
  assert.ok(categories.includes("Charts"));
  for (const name of chartNames)
    assert.equal(
      registry.items.find((item) => item.name === name)?.meta?.category,
      "Charts",
      name,
    );
});
