import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// The review binds application, tooling, delivery inputs and generated assets as
// well as the narrower registry/gate scope. Local ledgers and artifacts are excluded.
export const REVIEW_SOURCE_ROOTS = [".github", "app", "apps", "components", "data", "docs/guides", "lib", "public", "reference", "registry", "scripts", "tests"];
export const REVIEW_SOURCE_FILES = [".env.example", ".gitignore", "CONTRIBUTING.md", "FONT-NOTICES.md", "INSTALLATION.md", "LICENCE", "README.md", "components.json", "eslint.config.mjs", "next.config.ts", "package-lock.json", "package.json", "postcss.config.mjs", "registry.json", "tsconfig.json"];

export function reviewedCandidateHash(root) {
  const files = [];
  function walk(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) walk(path.join(relative, name));
    } else files.push(relative);
  }
  for (const relative of [...REVIEW_SOURCE_ROOTS, ...REVIEW_SOURCE_FILES]) walk(relative);
  const hash = crypto.createHash("sha256");
  for (const relative of files.sort()) {
    hash.update(`${relative}\n`);
    hash.update(fs.readFileSync(path.join(root, relative)));
    hash.update("\n");
  }
  return hash.digest("hex");
}
