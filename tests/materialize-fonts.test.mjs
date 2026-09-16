import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const materializer = path.join(root, "registry/cojeev/scripts/materialize-fonts.mjs");
const sourceCss = path.join(root, "registry/cojeev/styles/fonts.css");
const fontNames = ["dm-sans-variable.woff2", "bricolage-grotesque-variable.woff2"];

function materialize(css) {
  return execFileSync(process.execPath, [materializer, "--css", css], {
    cwd: root,
    encoding: "utf8",
  });
}

function rejectedMaterialization(css) {
  return spawnSync(process.execPath, [materializer, "--css", css], {
    cwd: root,
    encoding: "utf8",
  });
}

test("materializer replaces only verified embedded sources and is idempotent", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cojeev-font-materialize-"));
  const css = path.join(directory, "src/styles/cojeev-fonts.css");
  try {
    await mkdir(path.dirname(css), { recursive: true });
    const original = `${await readFile(sourceCss, "utf8")}\n/* consumer-owned rule */\n.example{color:rebeccapurple}\n`;
    await writeFile(css, original);

    assert.match(materialize(css), /Materialized 2 verified WOFF2 fonts/);
    const rewritten = await readFile(css, "utf8");
    assert.ok(!rewritten.includes("data:font/woff2;base64,"));
    assert.match(rewritten, /url\("\.\/fonts\/dm-sans-variable\.woff2"\)/);
    assert.match(rewritten, /url\("\.\/fonts\/bricolage-grotesque-variable\.woff2"\)/);
    assert.ok(rewritten.endsWith("/* consumer-owned rule */\n.example{color:rebeccapurple}\n"));
    for (const name of fontNames) {
      assert.deepEqual(
        await readFile(path.join(directory, "src/styles/fonts", name)),
        await readFile(path.join(root, "app/fonts", name)),
        `${name} must equal the verified local canonical asset`,
      );
    }

    assert.match(materialize(css), /already materialized/);
    assert.equal(await readFile(css, "utf8"), rewritten, "rerun must not rewrite the stylesheet");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("materializer rejects a partial target instead of filling it in", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cojeev-font-partial-"));
  const css = path.join(directory, "src/styles/cojeev-fonts.css");
  try {
    await mkdir(path.join(directory, "src/styles/fonts"), { recursive: true });
    await writeFile(css, await readFile(sourceCss, "utf8"));
    const existing = path.join(directory, "src/styles/fonts", fontNames[0]);
    await writeFile(existing, await readFile(path.join(root, "app/fonts", fontNames[0])));

    const result = rejectedMaterialization(css);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /partial materialization/i);
    assert.deepEqual(await readFile(existing), await readFile(path.join(root, "app/fonts", fontNames[0])));
    await assert.rejects(readFile(path.join(directory, "src/styles/fonts", fontNames[1])));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
