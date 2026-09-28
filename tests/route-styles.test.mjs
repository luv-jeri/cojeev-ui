import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";

test("every route stylesheet matches its import graph", () => {
  // Throws with the stale file names when a page starts rendering a component its sheet lacks.
  execFileSync(process.execPath, ["scripts/build-route-styles.mjs", "--check"], { stdio: "pipe" });
});

test("component styles load per route, never from the global sheet", () => {
  const globals = fs.readFileSync("app/globals.css", "utf8");
  const foundation = ["tokens", "theme", "base", "flow-press", "morph"];
  for (const [, id] of globals.matchAll(/registry\/cojeev\/styles\/([a-z0-9-]+)\.css/g)) assert.ok(foundation.includes(id), `${id}.css belongs in a route sheet`);
  for (const [page, sheet] of [["app/page.tsx", "home"], ["app/about/page.tsx", "about"], ["app/workspace/page.tsx", "workspace"]]) {
    assert.ok(fs.readFileSync(page, "utf8").includes(`styles/${sheet}.css"`), `${page} must import its route sheet`);
  }
  assert.ok(fs.readFileSync("app/docs/layout.tsx", "utf8").includes('styles/docs.css"'));
  assert.ok(fs.readFileSync("app/layout.tsx", "utf8").includes('styles/shell.css"'));
});
