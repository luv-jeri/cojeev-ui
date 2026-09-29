/**
 * Which documentation component ids does a component-confined change touch?
 *
 * Pure functions over registry.json and an import scan of the docs examples.
 * Anything this cannot resolve with certainty returns `{ full: reason }`, and the
 * caller then runs every id, exactly as before.
 */
import fs from "node:fs";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";

// The release depth step runs before `npm ci` (a documentation-only change installs
// nothing), so typescript is loaded on first use, not at import. When it cannot be
// loaded, every selection is full: the job runs everything instead of crashing.
let ts;
function loadTypeScript() {
  if (ts === undefined) {
    try { ts = createRequire(import.meta.url)("typescript"); } catch { ts = null; }
  }
  return ts;
}

// A css file listed by more than this many registry items is shared styling.
export const TARGET_MAX = 3;

const COMPONENT_PATH = /^registry\/cojeev\/(?:ui\/[^/]+\.tsx|styles\/[^/]+\.css)$/;
export const isComponentPath = file => COMPONENT_PATH.test(file);

const depName = url => String(url).split("/").pop().replace(/\.json$/, "");
const EXTENSIONS = ["", ".tsx", ".ts", ".mjs", ".js", ".css", ".json", "/index.tsx", "/index.ts"];
// Real import syntax only: an import statement inside a string literal (a code sample) is not one.
const importsOf = text => ts.preProcessFile(text, true, true).importedFiles.map(entry => entry.fileName);

/** True when the module holds an `import(x)` whose argument is not a plain string literal: its target is invisible to this scan. The parser sees real calls only, never text inside strings or comments. */
function hasOpaqueImport(file, text) {
  let opaque = false;
  const visit = node => {
    if (opaque) return;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && !(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]))) opaque = true;
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
  return opaque;
}

// Parsing is the slow part and the same module is reached from many examples; the text is the key.
const scanned = new Map();
function scanModule(file, text) {
  if (!scanned.has(text)) scanned.set(text, { specs: importsOf(text), opaque: hasOpaqueImport(file, text) });
  return scanned.get(text);
}

/** css @import targets. Comments are stripped first so a commented-out import is not followed. */
const cssImports = text => [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map(match => match[1]);

/** A bare specifier is safe only when it is a declared dependency or a node builtin. */
function knownPackage(spec, packages) {
  if (spec.startsWith("node:")) return true;
  const parts = spec.split("/");
  const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return packages.has(name) || builtinModules.includes(name);
}

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
function reachable(start, read, packages, skip = new Set()) {
  const seen = new Set();
  const queue = [[locate(start, read), start]];
  while (queue.length) {
    const [file, spec] = queue.pop();
    if (file === null) return { missing: spec };
    if (seen.has(file)) continue;
    seen.add(file);
    const isCss = file.endsWith(".css");
    if (!isCss && !/\.(?:tsx?|mjs|js)$/.test(file)) continue;
    const text = read(file);
    const scan = isCss ? { specs: cssImports(text) } : scanModule(file, text);
    if (scan.opaque) return { missing: `${file} has a dynamic import this scan cannot follow` };
    for (const spec of scan.specs) {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) {
        // Anything that is neither a project path nor a declared package (an unknown alias) is unreadable here.
        if (!knownPackage(spec, packages)) return { missing: `${file} imports ${spec}` };
        continue;
      }
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
 * `appModules()` lists every .ts/.tsx/.css module under app/, or returns `{ full }`
 * when app/ holds a file this scan cannot read. Without it the docs site chrome
 * cannot be scanned, so the answer is full.
 */
export function selectGateIds(paths, { registry, read, appModules, targetMax = TARGET_MAX }) {
  const items = registry?.items;
  if (!Array.isArray(items)) return { full: "registry or paths unreadable" };
  const order = items.filter(item => item.type === "registry:ui").map(item => item.name);
  // No paths: the caller wants only the registry order.
  if (!paths.length) return { ids: [], order };
  if (!loadTypeScript()) return { full: "typescript is not installed, so imports cannot be scanned" };
  const closure = new Set();
  // A stylesheet is never imported from TypeScript: it reaches pages through the component that owns it.
  // So the scans below look for the owner's module as well as the css itself.
  const changed = new Set(paths);
  for (const file of paths) {
    if (!isComponentPath(file)) return { full: `not a component file: ${file}` };
    const owners = items.filter(item => (item.files ?? []).some(entry => entry.path === file));
    if (!owners.length) return { full: `no registry item lists ${file}` };
    if (file.endsWith(".css") && owners.length > targetMax) return { full: `${file} is shared by ${owners.length} items` };
    owners.forEach(item => closure.add(item.name));
    if (file.endsWith(".css")) for (const item of owners) for (const entry of item.files) if (/^registry\/cojeev\/ui\/[^/]+\.tsx$/.test(entry.path)) changed.add(entry.path);
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
  const manifest = read("package.json");
  if (manifest === null) return { full: "package.json is unreadable" };
  let packages;
  try {
    const parsed = JSON.parse(manifest);
    packages = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})]);
  } catch { return { full: "package.json is unreadable" }; }
  const listed = appModules();
  if (!Array.isArray(listed)) return { full: listed.full };
  const chromeSeen = new Set();
  for (const start of listed) {
    const reach = reachable(start, read, packages, skip);
    if (reach.missing) return { full: `cannot resolve ${reach.missing}` };
    reach.seen.forEach(file => chromeSeen.add(file));
  }
  const shared = [...changed].find(file => chromeSeen.has(file));
  if (shared) return { full: `${shared} is imported by the docs site chrome` };
  const chosen = new Set(closure);
  const cache = new Map();
  for (const [id, files] of found.modules) {
    for (const file of files) {
      if (!cache.has(file)) cache.set(file, reachable(file, read, packages));
      const reach = cache.get(file);
      if (reach.missing) return { full: `cannot resolve ${reach.missing}` };
      if ([...changed].some(file => reach.seen.has(file))) chosen.add(id);
    }
  }
  const ids = items.filter(item => item.type === "registry:ui" && chosen.has(item.name)).map(item => item.name);
  return ids.length ? { ids, order } : { full: "no documentation id is affected by these files" };
}

/** selectGateIds against the checkout in `cwd`. */
export function selectGateIdsFromCheckout(paths, cwd = process.cwd()) {
  const read = file => { try { return fs.readFileSync(path.join(cwd, file), "utf8"); } catch { return null; } };
  const text = read("registry.json");
  if (text === null) return { full: "registry.json is unreadable" };
  // Static assets cannot import anything; any other file type is unreadable here, so the answer is full.
  const ASSET = /\.(?:png|jpe?g|svg|webp|ico|txt|xml|woff2|json)$/;
  const appModules = () => {
    let unknown = null;
    const walk = dir => fs.readdirSync(path.join(cwd, dir), { withFileTypes: true }).flatMap(entry => {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(file);
      if (/\.(?:tsx?|css)$/.test(entry.name)) return [file];
      if (!ASSET.test(entry.name) && entry.name !== ".DS_Store") unknown ??= file;
      return [];
    });
    const modules = walk("app");
    return unknown ? { full: `app/ holds a file this scan cannot read: ${unknown}` } : modules;
  };
  return selectGateIds(paths, { registry: JSON.parse(text), read, appModules });
}
