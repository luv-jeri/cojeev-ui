import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

// Homepage keys from ~/Developer/cojeev-coming-soon-performance-review source, 2026-10-01
export const HOMEPAGE_KEYS = ["cojeev-coming-soon-theme", "cojeev-preview-clock"];
export const UI_KEYS = ["000h.analytics-consent.v1", "000h.analytics-opt-out", "cojeev-docs-theme", "cojeev-docs-navigation", "cojeev-appearance", "cojeev-reporting-v1", "v-motion", "v-morph-cfg-v3", "v-flow-v1"];
const root = fileURLToPath(new URL("../", import.meta.url));

async function sources(directory) {
  const entries = await readdir(`${root}${directory}`, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sources(path);
    return /\.[cm]?[jt]sx?$/.test(path) ? [{ path, text: await readFile(`${root}${path}`, "utf8") }] : [];
  }));
  return files.flat();
}
const files = (await Promise.all(["app", "components", "lib", "registry"].map(sources))).flat();

// Resolve literal arguments and file-local constants, including calls through the
// motion parse/persist wrappers. Unresolved key call sites fail the inventory.
function scanKeys({ path, text }) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants = new Map();
  const keys = new Set();
  const removed = new Set();
  const walk = (node, visit) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
  walk(source, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer);
  });
  const resolve = (node, seen = new Set()) => {
    if (node && ts.isStringLiteralLike(node)) return node.text;
    if (node && ts.isIdentifier(node) && !seen.has(node.text)) return resolve(constants.get(node.text), new Set([...seen, node.text]));
    return null;
  };
  walk(source, node => {
    // Layout boot scripts are source too; inspect their literal JS bodies.
    if (ts.isStringLiteralLike(node) && /\b(?:localStorage|sessionStorage|indexedDB)\b/.test(node.text)) {
      const embedded = scanKeys({ path: `${path}:inline`, text: node.text });
      for (const key of embedded.keys) keys.add(key);
      for (const key of embedded.removed) removed.add(key);
    }
    if (!ts.isCallExpression(node)) return;
    const expression = node.expression;
    const method = ts.isPropertyAccessExpression(expression) ? expression.name.text
      : ts.isElementAccessExpression(expression) ? resolve(expression.argumentExpression) : null;
    const motionWrapper = path === "registry/cojeev/motion/settings.ts" && ts.isIdentifier(expression) && ["parse", "persist"].includes(expression.text);
    const database = method === "open" && /(?:^|\.)indexedDB$/.test(expression.expression.getText(source));
    if (!["getItem", "setItem", "removeItem"].includes(method) && !motionWrapper && !database) return;
    const key = resolve(node.arguments[0]);
    // These are the forwarding parameters, whose callers are scanned above.
    if (!key && path === "registry/cojeev/motion/settings.ts" && node.arguments[0]?.getText(source) === "key") return;
    // Legacy removal loops are checked separately, never counted as live owners.
    if (!key && method === "removeItem") {
      let parent = node.parent;
      while (parent && !ts.isForOfStatement(parent)) parent = parent.parent;
      assert(parent && ts.isArrayLiteralExpression(parent.expression), `${path}: unresolved removed key`);
      for (const item of parent.expression.elements) {
        assert(resolve(item), `${path}: unresolved legacy key`);
        removed.add(resolve(item));
      }
      return;
    }
    assert(key, `${path}: unresolved storage key in ${node.getText(source)}`);
    (method === "removeItem" ? removed : keys).add(key);
  });
  return { keys, removed };
}

test("ui_keys_do_not_collide_with_homepage_keys", () => {
  const keys = new Set();
  for (const file of files) {
    const found = scanKeys(file);
    for (const key of found.keys) keys.add(key);
    for (const key of [...found.keys, ...found.removed]) assert(!HOMEPAGE_KEYS.includes(key), `${file.path}: homepage key ${key}`);
    const calls = file.text.replace(/\?\./g, ".").replace(/\[\s*["'](localStorage|sessionStorage|indexedDB|serviceWorker|clear|deleteDatabase|register|cookie|set|delete)["']\s*\]/g, ".$1");
    assert.doesNotMatch(calls, /\b(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(|\bindexedDB\s*\.\s*deleteDatabase\s*\(|\bnavigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(/, file.path);
    assert.doesNotMatch(calls, /\bdocument\s*\.\s*cookie\s*=|\bcookieStore\s*\.\s*(?:set|delete)\s*\(|\bcookies\s*\([^)]*\)\s*\.\s*(?:set|delete)\s*\(/, file.path);
  }
  assert.deepEqual([...keys].sort(), [...UI_KEYS].sort());
});

test("old_origin_drafts_and_preferences_are_not_imported_or_deleted", async () => {
  for (const file of files) {
    if (/\b(?:localStorage|sessionStorage|indexedDB|postMessage)\b/.test(file.text)) {
      assert.doesNotMatch(file.text, /000h\.cojeev\.com/, `${file.path}: old-origin bridge`);
    }
    assert.doesNotMatch(file.text, /\bimport[^;\n]*000h\.cojeev\.com/, `${file.path}: old-origin import`);
  }
  const privacy = await readFile(`${root}app/privacy/page.tsx`, "utf8");
  assert(privacy.includes("The site moved to cojeev.com/ui. Saved drafts and browser preferences from 000h.cojeev.com do not transfer. Keep your downloaded report receipts."), "privacy page must include the verbatim migration sentence");
});
