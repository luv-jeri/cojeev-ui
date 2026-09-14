import assert from "node:assert/strict";
import test from "node:test";
import { catalog, documentationCatalog } from "../lib/catalog";
import { createDocsSearch } from "../lib/docs-search";

test("one Tables guide keeps both installable APIs", () => {
  const docs = documentationCatalog();
  assert.equal(
    docs.filter((entry) => ["table", "data-table"].includes(entry.name)).length,
    1,
  );
  const table = docs.find((entry) => entry.name === "table")!;
  assert.ok(table.meta.api.some((api) => api.name === "TableProps"));
  assert.ok(table.meta.api.some((api) => api.name === "DataTableProps"));
  assert.ok(
    catalog().some((entry) => entry.name === "data-table"),
    "public DataTable remains installable",
  );
});
test("search finds the unified guide by the old composed API name", async () => {
  const results = await createDocsSearch().search("DataTable");
  assert.ok(results.some((result) => result.url === "/docs/table/"));
  assert.ok(results.every((result) => result.url !== "/docs/data-table/"));
});
