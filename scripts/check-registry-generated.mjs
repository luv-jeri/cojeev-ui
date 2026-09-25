/** Fail the normal test entry point when committed registry output has drifted from source. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedFiles = ["registry.json", "public/registry.json", "registry/cojeev/NOTICES.txt"];

function snapshot() {
  const files = new Map();
  for (const relative of generatedFiles) {
    const absolute = path.join(root, relative);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) files.set(relative, hash(absolute));
  }

  const payloadDirectory = path.join(root, "public/r");
  if (fs.existsSync(payloadDirectory)) {
    for (const name of fs.readdirSync(payloadDirectory).sort()) {
      const absolute = path.join(payloadDirectory, name);
      if (fs.statSync(absolute).isFile()) files.set(path.posix.join("public/r", name), hash(absolute));
    }
  }
  return files;
}

function hash(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const before = snapshot();
execFileSync(process.execPath, [path.join(root, "scripts/build-registry.mjs")], {
  cwd: root,
  stdio: "inherit",
});
const after = snapshot();
const changed = [...new Set([...before.keys(), ...after.keys()])]
  .filter(file => before.get(file) !== after.get(file))
  .sort();

const registry = JSON.parse(fs.readFileSync(path.join(root, "public/r/registry.json"), "utf8"));
const expectedPayloads = new Set(["registry.json", ...(registry.items ?? []).map(item => `${item.name}.json`)]);
const actualPayloads = new Set(fs.readdirSync(path.join(root, "public/r")));
const missingPayloads = [...expectedPayloads].filter(name => !actualPayloads.has(name)).sort();
const extraPayloads = [...actualPayloads].filter(name => !expectedPayloads.has(name)).sort();
const inventoryDrift = missingPayloads.length > 0 || extraPayloads.length > 0;

if (changed.length || inventoryDrift) {
  if (changed.length) {
    console.error(`\nGenerated registry output was stale for ${changed.length} file(s):`);
    for (const file of changed.slice(0, 30)) console.error(`  ${file}`);
    if (changed.length > 30) console.error(`  … and ${changed.length - 30} more`);
  }
  if (missingPayloads.length) console.error(`\nMissing generated payloads: ${missingPayloads.join(", ")}`);
  if (extraPayloads.length) console.error(`\nUnindexed generated payloads: ${extraPayloads.join(", ")}`);
  console.error("Review the generated output and inventory, then rerun npm test.");
  process.exitCode = 1;
} else {
  console.log(`Generated registry output matches source (${after.size} files).`);
}
