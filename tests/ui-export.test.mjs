import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "ui-export-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(new URL("./fixtures/ui-export/", import.meta.url), directory, { recursive: true });
  return directory;
}

async function checker() {
  const module = new URL("../scripts/check-ui-export.mjs", import.meta.url);
  await assert.doesNotReject(readFile(module), "export checker must exist");
  return (await import(module)).checkUiExport;
}

test("ui_font_preload_matches_css_resource", async t => {
  const directory = await fixture(t);
  const checkUiExport = await checker();
  assert.deepEqual(await checkUiExport(directory, "/ui"), []);
  const html = await readFile(path.join(directory, "index.html"), "utf8");
  await writeFile(path.join(directory, "index.html"), html.replace("/ui/_next/static/media/display.woff2", "/ui/_next/static/media/other.woff2"));
  await writeFile(path.join(directory, "_next/static/media/other.woff2"), "fixture font");
  assert.match((await checkUiExport(directory, "/ui")).join("\n"), /font.*(?:preload|CSS)|preload.*font/i);
  await writeFile(path.join(directory, "index.html"), html);
  await writeFile(path.join(directory, "_next/static/css/site.css"), '@font-face{font-family:display;src:url("../media/display.woff2")}');
  assert.deepEqual(await checkUiExport(directory, "/ui"), [], "CSS relative URLs resolve against the stylesheet");
});

test("ui_brand_and_metadata_assets_resolve", async t => {
  const directory = await fixture(t);
  const checkUiExport = await checker();
  const html = await readFile(path.join(directory, "index.html"), "utf8");
  assert.deepEqual(await checkUiExport(directory, "/ui"), []);
  for (const asset of ["brand/sculpture.webp", "icon.png", "opengraph-image.png", "twitter-image.png"]) {
    await writeFile(path.join(directory, "index.html"), html.replaceAll(`/ui/${asset}`, `/${asset}`));
    assert.ok((await checkUiExport(directory, "/ui")).length > 0, `unmounted ${asset} fails`);
    await writeFile(path.join(directory, "index.html"), html);
    await rename(path.join(directory, asset), path.join(directory, `${asset}.saved`));
    assert.ok((await checkUiExport(directory, "/ui")).length > 0, `missing ${asset} fails`);
    await rename(path.join(directory, `${asset}.saved`), path.join(directory, asset));
  }
  await writeFile(path.join(directory, "index.html"), html.replaceAll('/ui/brand/', 'https://cojeev.com/ui/brand/'));
  assert.deepEqual(await checkUiExport(directory, "/ui"), []);
  const result = spawnSync(process.execPath, ["scripts/check-ui-export.mjs", "--dir", directory], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("raw_export_remains_unwrapped", async t => {
  const directory = await fixture(t);
  const checkUiExport = await checker();
  assert.deepEqual(await checkUiExport(directory, "/ui"), []);
  const nested = await mkdtemp(path.join(tmpdir(), "ui-wrapped-"));
  t.after(() => rm(nested, { recursive: true, force: true }));
  await cp(directory, path.join(nested, "ui"), { recursive: true });
  assert.ok((await checkUiExport(nested, "/ui")).length > 0);
  await rm(path.join(directory, "index.html"));
  assert.ok((await checkUiExport(directory, "/ui")).length > 0);
  const result = spawnSync(process.execPath, ["scripts/check-ui-export.mjs", "--dir", directory], { encoding: "utf8" });
  assert.equal(result.status, 1);
});
