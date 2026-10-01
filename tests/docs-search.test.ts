import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as docsSearch from "../lib/docs-search";
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

test("Everyday names find the component that does the job", async () => {
  const search = createDocsSearch();
  for (const query of ["timeline", "history", "audit trail"]) {
    assert.ok((await search.search(query)).some(result => result.url === "/docs/activity-feed/"), query);
  }
});

test("search_fetch_is_prefixed_and_entries_are_logical", async () => {
  const shell = readFileSync(new URL("../components/docs-shell.tsx", import.meta.url), "utf8");
  assert.equal(shell.match(/searchUrl\s*=\s*"([^"]+)"/)?.[1], "/ui/docs-search.json");
  const data = await createDocsSearch().export() as { docs: { docs: Record<string, { url: string }> } };
  const entries = Object.values(data.docs.docs);
  assert.ok(entries.length > 0);
  assert.ok(entries.every(entry => entry.url.startsWith("/docs/") && !entry.url.startsWith("/ui/")));
});

test("search_selection_uses_existing_route_guard", () => {
  assert.ok("searchTarget" in docsSearch, "the existing route guard must be exported");
  const searchTarget = docsSearch.searchTarget as (url: string) => string | null;
  assert.equal(searchTarget("/ui/docs/x/"), null);
  assert.equal(searchTarget("https://cojeev.com/ui/docs/x/"), null);
  assert.equal(searchTarget("/docs/x/"), "/docs/x/");
  assert.equal(searchTarget("/docs/"), "/docs/");
  assert.equal(searchTarget("/docs"), null);
  const source = readFileSync(new URL("../components/docs-search.tsx", import.meta.url), "utf8");
  assert.match(source, /const navigate = \(url: string\) => \{[^}]*searchTarget\(url\)/);
});
