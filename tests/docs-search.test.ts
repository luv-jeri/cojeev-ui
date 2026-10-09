import assert from "node:assert/strict";
import test from "node:test";
import { createDocsSearch } from "../lib/docs-search";
import { exactNameFirst } from "../lib/docs-search-rank";

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

test("Run and workflow names find Milestone path", async () => {
  const search = createDocsSearch();
  for (const query of ["timeline", "workflow", "run trace", "execution trace", "nested steps", "milestones", "user flow", "event sequence"]) {
    assert.ok((await search.search(query)).some(result => result.url === "/docs/milestone-path/"), query);
  }
});

test("A component's exact name puts that component first", async () => {
  const search = createDocsSearch();
  const ranked = async (query: string) => exactNameFirst(await search.search(query), query);
  assert.equal((await ranked("button"))[0].url, "/docs/button/");
  assert.equal((await ranked("Button Group"))[0].url, "/docs/button-group/");
  assert.equal((await ranked("date-picker"))[0].url, "/docs/date-picker/");
  assert.deepEqual(await ranked("group"), await search.search("group"));
});
