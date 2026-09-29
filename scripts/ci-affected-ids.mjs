/**
 * Which documentation component ids does a component-confined change touch?
 *
 * Pure functions over registry.json and an import scan of the docs examples.
 * Anything this cannot resolve with certainty returns `{ full: reason }`, and the
 * caller then runs every id, exactly as before.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// A css file listed by more than this many registry items is shared styling.
export const TARGET_MAX = 3;

const COMPONENT_PATH = /^registry\/cojeev\/(?:ui\/[^/]+\.tsx|styles\/[^/]+\.css)$/;
export const isComponentPath = file => COMPONENT_PATH.test(file);

const depName = url => String(url).split("/").pop().replace(/\.json$/, "");
const EXTENSIONS = ["", ".tsx", ".ts", ".mjs", ".js", ".css", ".json", "/index.tsx", "/index.ts"];
// Real import syntax only: an import statement inside a string literal (a code sample) is not one.
const importsOf = text => ts.preProcessFile(text, true, true).importedFiles.map(entry => entry.fileName);

/** Example id -> module files that render it (index.ts) or show its source (manifest.ts). */
function exampleModules(read) {
  const modules = new Map();
  const add = (id, file) => modules.set(id, new Set([...(modules.get(id) ?? []), file]));
  const index = read("components/examples/index.ts");
  const manifest = read("components/examples/manifest.ts");
  if (index === null || manifest === null) return { full: "example index or manifest is unreadable" };
  const entries = [...index.matchAll(/^\s*"?([\w-]+)"?:\s*lazy\(\(\)\s*=>\s*import\("([^"]+)"\)/gm)];
  if (entries.length !== (index.match(/\blazy\(/g) ?? []).length || !entries.length) return { full: "example index has an entry this scan cannot read" };
  for (const [, id, spec] of entries) add(id, path.posix.join("components/examples", spec));
  const files = [...manifest.matchAll(/^\s*"?([\w-]+)"?:\s*\{\s*file:\s*"([^"]+)"/gm)];
  if (files.length !== (manifest.match(/\bfile:/g) ?? []).length || !files.length) return { full: "example manifest has an entry this scan cannot read" };
  for (const [, id, file] of files) add(id, `components/examples/${file}`);
  return { modules };
}

/** The real file behind an extensionless module path, or null. read() is null for a missing file and for a directory. */
const locate = (base, read) => EXTENSIONS.map(extension => base + extension).find(candidate => read(candidate) !== null) ?? null;

/** Every project file reachable by imports from module `start`, or `{ missing }` naming the import that cannot be resolved. */
function reachable(start, read, skip = new Set()) {
  const seen = new Set();
  const queue = [[locate(start, read), start]];
  while (queue.length) {
    const [file, spec] = queue.pop();
    if (file === null) return { missing: spec };
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(?:tsx?|mjs|js)$/.test(file)) continue;
    for (const spec of importsOf(read(file))) {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const base = spec.startsWith("@/") ? spec.slice(2) : path.posix.join(path.posix.dirname(file), spec);
      const target = locate(base, read);
      // A skipped module is deliberately not walked: it is owned by another scan.
      if (target !== null && skip.has(target)) continue;
      queue.push([target, `${file} imports ${spec}`]);
    }
  }
  return { seen };
}

/**
 * `paths` must all satisfy isComponentPath. Returns `{ ids }` (registry order) or `{ full: reason }`.
 * `appModules()` lists every .ts/.tsx module under app/. Without it the docs site
 * chrome cannot be scanned, so the answer is full.
 */
export function selectGateIds(paths, { registry, read, appModules, targetMax = TARGET_MAX }) {
  const items = registry?.items;
  if (!Array.isArray(items) || !paths.length) return { full: "registry or paths unreadable" };
  const closure = new Set();
  for (const file of paths) {
    if (!isComponentPath(file)) return { full: `not a component file: ${file}` };
    const owners = items.filter(item => (item.files ?? []).some(entry => entry.path === file));
    if (!owners.length) return { full: `no registry item lists ${file}` };
    if (file.endsWith(".css") && owners.length > targetMax) return { full: `${file} is shared by ${owners.length} items` };
    owners.forEach(item => closure.add(item.name));
  }
  // Reverse closure over registryDependencies: whatever installs an affected item.
  for (let grew = true; grew;) {
    grew = false;
    for (const item of items) {
      if (!closure.has(item.name) && (item.registryDependencies ?? []).some(dep => closure.has(depName(dep)))) { closure.add(item.name); grew = true; }
    }
  }
  const found = exampleModules(read);
  if (found.full) return found;
  // Site chrome: app/ and whatever it imports, minus the example modules walked
  // per id below. app/docs/[component]/page.tsx imports registry components
  // directly, so editing one of those changes every docs page, not just its own.
  // Walking through the examples index would make every component chrome.
  if (typeof appModules !== "function") return { full: "site chrome modules cannot be listed" };
  // The index lists extensionless specs, so each module is resolved to its real file.
  const skip = new Set(["components/examples/index.ts", "components/examples/manifest.ts"]);
  for (const set of found.modules.values()) for (const file of set) skip.add(locate(file, read) ?? file);
  const chromeSeen = new Set();
  for (const start of appModules()) {
    const reach = reachable(start, read, skip);
    if (reach.missing) return { full: `cannot resolve ${reach.missing}` };
    reach.seen.forEach(file => chromeSeen.add(file));
  }
  const shared = paths.find(changed => chromeSeen.has(changed));
  if (shared) return { full: `${shared} is imported by the docs site chrome` };
  const chosen = new Set(closure);
  const cache = new Map();
  for (const [id, files] of found.modules) {
    for (const file of files) {
      if (!cache.has(file)) cache.set(file, reachable(file, read));
      const reach = cache.get(file);
      if (reach.missing) return { full: `cannot resolve ${reach.missing}` };
      if (paths.some(changed => reach.seen.has(changed))) chosen.add(id);
    }
  }
  const ids = items.filter(item => item.type === "registry:ui" && chosen.has(item.name)).map(item => item.name);
  return ids.length ? { ids, order: items.filter(item => item.type === "registry:ui").map(item => item.name) } : { full: "no documentation id is affected by these files" };
}

/** selectGateIds against the checkout in `cwd`. */
export function selectGateIdsFromCheckout(paths, cwd = process.cwd()) {
  const read = file => { try { return fs.readFileSync(path.join(cwd, file), "utf8"); } catch { return null; } };
  const text = read("registry.json");
  if (text === null) return { full: "registry.json is unreadable" };
  const appModules = () => {
    const walk = dir => fs.readdirSync(path.join(cwd, dir), { withFileTypes: true }).flatMap(entry => {
      const file = `${dir}/${entry.name}`;
      return entry.isDirectory() ? walk(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
    });
    return walk("app");
  };
  return selectGateIds(paths, { registry: JSON.parse(text), read, appModules });
}
