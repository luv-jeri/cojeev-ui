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

// Resolve literal names and file-local constants, including calls through the
// motion parse/persist wrappers. Unresolved storage owners fail the inventory.
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
  const memberName = node => node && ts.isPropertyAccessExpression(node) ? node.name.text
    : node && ts.isElementAccessExpression(node) ? resolve(node.argumentExpression) : null;
  const globalName = node => {
    if (node && ts.isIdentifier(node)) return node.text;
    const name = memberName(node);
    return name && ts.isIdentifier(node.expression) && ["window", "globalThis", "self"].includes(node.expression.text) ? name : null;
  };
  walk(source, node => {
    // Layout boot scripts are source too; inspect their literal JS bodies.
    if (ts.isStringLiteralLike(node) && /\b(?:localStorage|sessionStorage|indexedDB|BroadcastChannel)\b/.test(node.text)) {
      const embedded = scanKeys({ path: `${path}:inline`, text: node.text });
      for (const key of embedded.keys) keys.add(key);
      for (const key of embedded.removed) removed.add(key);
    }
    const write = ts.isBinaryExpression(node)
      && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      && (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left))
      && ["localStorage", "sessionStorage"].includes(globalName(node.left.expression));
    const channel = ts.isNewExpression(node) && globalName(node.expression) === "BroadcastChannel";
    if (write || channel) {
      const key = write ? memberName(node.left) : resolve(node.arguments?.[0]);
      assert(key, `${path}: unresolved storage key in ${node.getText(source)}`);
      keys.add(key);
      return;
    }
    if (!ts.isCallExpression(node)) return;
    const expression = node.expression;
    const method = memberName(expression);
    const motionWrapper = path === "registry/cojeev/motion/settings.ts" && ts.isIdentifier(expression) && ["parse", "persist"].includes(expression.text);
    const database = method === "open" && globalName(expression.expression) === "indexedDB";
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

// Every fixture introduces an unlisted owner (the first also collides with the
// homepage). An empty scan would let it bypass the real inventory assertions.
for (const [name, text, key] of [
  ["local_storage_element_write", 'localStorage["cojeev-coming-soon-theme"] = "dark";', "cojeev-coming-soon-theme"],
  ["local_storage_property_write", 'localStorage.unlisted = "value";', "unlisted"],
  ["session_storage_element_write", 'sessionStorage["unlisted"] = "value";', "unlisted"],
  ["session_storage_property_write", 'sessionStorage.unlisted = "value";', "unlisted"],
  ["broadcast_channel_constructor", 'new BroadcastChannel("unlisted");', "unlisted"],
  ["window_element_indexed_db_open", 'window["indexedDB"].open("unlisted");', "unlisted"],
  ["global_this_indexed_db_open", 'globalThis.indexedDB.open("unlisted");', "unlisted"],
  ["inline_broadcast_channel_constructor", 'const script = `new BroadcastChannel("unlisted");`;', "unlisted"],
]) {
  test(`storage_inventory_records_${name}`, () => {
    const found = scanKeys({ path: "fixture.ts", text });
    assert.deepEqual([...found.keys], [key], "unlisted storage owner must reach inventory/collision assertions");
    assert(!UI_KEYS.includes(key));
  });
}

for (const text of ['localStorage[runtimeKey] = "value";', 'new BroadcastChannel(runtimeKey);']) {
  test(`storage_inventory_rejects_unresolved_owner: ${text}`, () => {
    assert.throws(() => scanKeys({ path: "fixture.ts", text }), /unresolved storage key/);
  });
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
