import assert from "node:assert/strict";
import test from "node:test";
import { createDocsSearch } from "../lib/docs-search";

test("Fumadocs indexes documentation content beyond component titles", async () => {
  const search = createDocsSearch();
  const results = await search.search("rubber");
  assert.ok(results.some(result => result.url === "/docs/slider/"));
  assert.equal((await search.search("zzqnotacomponentzzq")).length, 0);
  assert.ok(results.every(result => result.url.startsWith("/docs/")));
  const data = await search.export() as { type: string };
  assert.equal(data.type, "simple");
});
