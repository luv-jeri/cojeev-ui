import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("every route stylesheet matches its import graph", () => {
  // Throws with the stale file names when a page starts rendering a component its sheet lacks.
  execFileSync(process.execPath, ["scripts/build-route-styles.mjs", "--check"], { stdio: "pipe" });
});

test("component styles load per route, never from the global sheet", () => {
  const globals = fs.readFileSync("app/globals.css", "utf8");
  const foundation = ["tokens", "theme", "base", "flow-press", "morph"];
  for (const [, id] of globals.matchAll(/registry\/cojeev\/styles\/([a-z0-9-]+)\.css/g)) assert.ok(foundation.includes(id), `${id}.css belongs in a route sheet`);
  // Every page outside the docs, found the way the generator finds them: app/page.tsx is home, app/a/b/page.tsx is a-b.
  const pages = fs.readdirSync("app", { recursive: true }).map((file) => file.split(path.sep).join("/"))
    .filter((file) => /(^|\/)page\.tsx$/.test(file) && !file.startsWith("docs/"));
  assert.ok(pages.includes("page.tsx") && pages.includes("privacy/page.tsx"), "page discovery must find the site's pages");
  for (const page of pages) {
    const sheet = path.posix.dirname(page).replace(/[()[\]]/g, "").replaceAll("/", "-").replace(/^\.$/, "home");
    assert.ok(fs.readFileSync(`app/${page}`, "utf8").includes(`styles/${sheet}.css"`), `app/${page} must import its route sheet, styles/${sheet}.css`);
  }
  assert.ok(fs.readFileSync("app/docs/layout.tsx", "utf8").includes('styles/docs.css"'));
  assert.ok(fs.readFileSync("app/layout.tsx", "utf8").includes('styles/shell.css"'));
});
