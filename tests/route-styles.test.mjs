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

test("no component in the route sheets uses !important", () => {
  // Layer order reverses for important declarations: the lowest tier present would beat docs.css.
  const docs = fs.readFileSync("app/styles/docs.css", "utf8");
  for (const [, file] of docs.matchAll(/@import "([^"]+)"/g)) {
    assert.ok(!fs.readFileSync(path.join("app/styles", file), "utf8").includes("!important"), `${path.basename(file)} uses !important, which inverts the tier order`);
  }
});

test("whichever route sheets a navigation leaves, the highest-ranked one holds every rule of the others", () => {
  const sheets = fs.readdirSync("app/styles").filter((file) => file.endsWith(".css")).map((file) => {
    const text = fs.readFileSync(`app/styles/${file}`, "utf8");
    const imports = [...text.matchAll(/@import "[^"]*\/([a-z0-9-]+)\.css" layer\(([^)]+)\);/g)];
    return { file, text, ids: imports.map((match) => match[1]), layers: [...new Set(imports.map((match) => match[2]))] };
  });
  const docs = sheets.find((sheet) => sheet.file === "docs.css");
  // Rules directly in cojeev-states outrank every cojeev-states sub-layer.
  assert.deepEqual(docs.layers, ["cojeev-states"], "docs.css sits directly in cojeev-states");
  const tiers = sheets.find((sheet) => sheet.file === "shell.css").text.match(/^@layer ([^;{]+);$/m)?.[1].split(", ");
  assert.ok(tiers?.length && tiers.every((tier) => tier.startsWith("cojeev-states.")), "shell.css declares the tier order");
  const rank = (sheet) => sheet === docs ? tiers.length : tiers.indexOf(sheet.layers[0]);
  for (const sheet of sheets) {
    assert.equal(sheet.layers.length, 1, `${sheet.file} uses one layer`);
    assert.ok(rank(sheet) >= 0, `${sheet.file} uses a declared tier`);
    if (sheet !== docs) assert.ok(sheet.text.includes(`@layer ${tiers.join(", ")};`), `${sheet.file} declares the same tier order`);
    assert.deepEqual(sheet.ids, docs.ids.filter((id) => sheet.ids.includes(id)), `${sheet.file} keeps the historical order`);
    for (const other of sheets) {
      if (rank(other) < rank(sheet)) assert.ok(other.ids.every((id) => sheet.ids.includes(id)), `${sheet.file} must hold every component of ${other.file}`);
      if (rank(other) === rank(sheet)) assert.deepEqual(other.ids, sheet.ids, `${sheet.file} and ${other.file} share a tier, so they must match`);
    }
  }
});
