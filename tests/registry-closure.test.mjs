/**
 * What a consumer is promised by an installed entry, checked against the
 * committed payloads rather than the generator's own intent.
 *
 * Three separate promises, each of which has silently broken at least once:
 *
 * 1. An entry resolves. Every registry dependency names an item that exists, and
 *    the graph stays acyclic, so `shadcn add` cannot walk into a 404 or a loop.
 * 2. An entry is complete. Every npm package its own files import is declared
 *    either by the entry or by the foundation it depends on — no consumer is
 *    left to guess a missing dependency from a red squiggle.
 * 3. An entry is not wasteful. Nothing in the payload is a file the entry cannot
 *    reach, and the foundation claims no package it does not itself import.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { budgetViolations, footprintReport, scenarioFootprint } from "../scripts/registry-footprint-lib.mjs";

const directory = "public/r";
const payload = name => JSON.parse(fs.readFileSync(path.join(directory, `${name}.json`), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(directory, "registry.json"), "utf8"));
const names = index.items.map(item => item.name);
const uiEntries = names.filter(name => name !== "cojeev" && name !== "cojeev-icon-geometry");
const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
/**
 * Packages a consumer always has, because `shadcn init` installs React itself
 * and Node's own builtins are never a declaration. A registry that declared
 * either would be telling the consumer something it already knows.
 */
const ambientPackages = new Set(["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]);
/** The whole published set, as `scenarioFootprint` expects it: every item is resolvable. */
const allItems = names.map(payload);
const dependencyNames = item => (item.registryDependencies ?? []).map(value => {
  const match = value.match(/\/r\/([a-z0-9-]+)\.json$/);
  return match ? match[1] : null;
}).filter(Boolean);
/**
 * Every entry the installer would resolve for this one, not just its direct
 * declarations. A private helper may reach a sibling through another entry's
 * dependency, and the install is still complete because the installer walks the
 * whole graph before it writes anything.
 */
function resolvedEntries(name) {
  const seen = new Set();
  const visit = current => {
    if (seen.has(current)) return seen;
    seen.add(current);
    for (const next of dependencyNames(payload(current))) visit(next);
    return seen;
  };
  return visit(name);
}

/** Import specifiers of a payload's own TypeScript, as written in the file. */
function specifiers(contents) {
  const found = new Set();
  for (const match of contents.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*["']([^"']+)["']/g)) found.add(match[1]);
  for (const match of contents.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) found.add(match[1]);
  return found;
}

/**
 * Where the installer writes a payload file. A `registry:ui` entry carries no
 * target: shadcn places it at `components/ui/` by convention, and the two
 * private helper trees carry the absolute-from-project-root target they declare.
 */
const installedPath = file => (file.target ?? `components/ui/${path.basename(file.path)}`).replace(/^~\//, "");

/**
 * A declaration may pin a version for the consumer (`three@0.185.1`), so compare
 * on the package name and keep the pin as evidence, not as part of the name.
 */
const packageName = declaration => {
  const at = declaration.lastIndexOf("@");
  return at > 0 ? declaration.slice(0, at) : declaration;
};

const barePackage = specifier => {
  if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) return null;
  const segments = specifier.split("/");
  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
};

test("every declared registry dependency exists and the graph is acyclic", () => {
  const declared = new Set(names);
  const edges = new Map();
  for (const name of names) {
    const targets = (payload(name).registryDependencies ?? []).map(value => {
      const match = value.match(/\/r\/([a-z0-9-]+)\.json$/);
      assert.ok(match, `${name} declares a dependency that is not a registry URL: ${value}`);
      assert.ok(declared.has(match[1]), `${name} depends on ${match[1]}, which the registry does not define`);
      return match[1];
    });
    edges.set(name, targets);
  }
  const visiting = new Set();
  const done = new Set();
  const visit = (name, trail) => {
    if (done.has(name)) return;
    assert.ok(!visiting.has(name), `Registry dependency cycle: ${[...trail, name].join(" -> ")}`);
    visiting.add(name);
    for (const target of edges.get(name)) visit(target, [...trail, name]);
    visiting.delete(name);
    done.add(name);
  };
  for (const name of names) visit(name, []);
});

test("every npm package an installed file imports is declared for that entry", () => {
  const foundation = payload("cojeev");
  const foundationPackages = new Set((foundation.dependencies ?? []).map(packageName));
  const failures = [];
  for (const name of uiEntries) {
    const item = payload(name);
    // An entry inherits the foundation's packages through its registryDependency
    // on the base item, so only the remainder has to be declared on the entry.
    const available = new Set([...foundationPackages, ...(item.dependencies ?? []).map(packageName)]);
    for (const file of item.files ?? []) {
      if (!/\.(?:ts|tsx)$/.test(file.path) || typeof file.content !== "string") continue;
      for (const specifier of specifiers(file.content)) {
        const pkg = barePackage(specifier);
        if (pkg && !ambientPackages.has(pkg) && !available.has(pkg)) failures.push(`${name}: ${file.path} imports ${specifier} (${pkg})`);
      }
    }
  }
  assert.deepEqual(failures, [], `Undeclared npm imports:\n${failures.join("\n")}`);
});

test("every registry-internal import resolves to a file the install actually writes", () => {
  const failures = [];
  for (const name of [...uiEntries, "cojeev-icon-geometry"]) {
    const item = payload(name);
    // Every install address this closure writes, extension-insensitive: the
    // payload's own specifiers are extensionless, which is what the consumer's
    // TypeScript resolution expects.
    const installed = [...resolvedEntries(name)].flatMap(entry => (payload(entry).files ?? []).map(installedPath));
    const targets = new Set(installed.map(address => address.replace(/\.(?:ts|tsx|css|mjs)$/, "")));
    const siblingEntries = new Set(resolvedEntries(name));
    for (const file of item.files ?? []) {
      if (!/\.(?:ts|tsx)$/.test(file.path) || typeof file.content !== "string") continue;
      for (const specifier of specifiers(file.content)) {
        if (specifier === "@/components/ui") continue;
        if (specifier.startsWith("@/components/ui/")) {
          const sibling = specifier.slice("@/components/ui/".length).split("/")[0];
          if (!siblingEntries.has(sibling)) failures.push(`${name}: ${file.path} imports sibling ${sibling} without declaring it`);
          continue;
        }
        if (!specifier.startsWith("@/")) continue;
        const wanted = specifier.slice(2);
        const resolved = targets.has(wanted) || [...targets].some(target => target.startsWith(`${wanted}/`));
        if (!resolved) failures.push(`${name}: ${file.path} imports ${specifier}, which the install does not write`);
      }
    }
  }
  assert.deepEqual(failures, [], `Unresolvable installed imports:\n${failures.join("\n")}`);
});

test("the foundation declares only the packages its own files import", () => {
  const foundation = payload("cojeev");
  const imported = new Set();
  for (const file of foundation.files ?? []) {
    if (!/\.(?:ts|tsx|mjs)$/.test(file.path) || typeof file.content !== "string") continue;
    for (const specifier of specifiers(file.content)) {
      const pkg = barePackage(specifier);
      if (pkg && specifier !== "node:fs") imported.add(pkg);
    }
  }
  const declared = new Set((foundation.dependencies ?? []).map(packageName));
  const unused = [...declared].filter(pkg => !imported.has(pkg)).sort();
  const missing = [...imported].filter(pkg => !declared.has(pkg) && !manifest.devDependencies?.[pkg]).sort();
  assert.deepEqual(unused, [], `The foundation declares packages no foundation file imports: ${unused.join(", ")}`);
  assert.deepEqual(missing, [], `The foundation imports packages it does not declare: ${missing.join(", ")}`);
});

test("the foundation installs no file it cannot reach and no optional geometry", () => {
  const foundation = payload("cojeev");
  const targets = (foundation.files ?? []).map(file => file.target);
  assert.equal(new Set(targets).size, targets.length, "The foundation writes the same target twice");
  for (const target of targets) {
    assert.ok(!target.includes("lucide-icon-data"), `Optional icon geometry leaked into the foundation: ${target}`);
  }
  // The default install is what every consumer pays for, before choosing any
  // component: the fonts are the bulk of it and they must stay self-contained.
  const fonts = (foundation.files ?? []).find(file => file.target.endsWith("cojeev-fonts.css"));
  assert.ok(fonts, "The foundation no longer installs a font stylesheet");
  assert.match(fonts.content, /base64,/, "The default font delivery is no longer self-contained");
  assert.ok(!/@import\s+url\(https?:/.test(fonts.content), "The default font delivery reaches the network");
});

test("an entry that reaches no geometry or motion code does not install any", () => {
  const staticOnly = ["separator", "skeleton", "aspect-ratio"].filter(name => names.includes(name));
  assert.ok(staticOnly.length >= 2, "Expected at least two static entries to check");
  for (const name of staticOnly) {
    const item = payload(name);
    const footprint = scenarioFootprint(allItems, [name]);
    const paths = footprint.files.map(file => file.path).join("\n");
    assert.ok(!paths.includes("lucide-icon-data"), `${name} installs the optional icon geometry`);
    assert.ok(!paths.includes("icon-data"), `${name} installs the optional icon index`);
    assert.ok(!(item.dependencies ?? []).includes("three"), `${name} declares the optional Three.js runtime`);
  }
});

test("an entry that reaches the icon installs the geometry item automatically", () => {
  // B-012's acceptance asked for a test asserting the new dependency edge. The
  // negative direction is above; this is the positive one, read from the payloads so
  // it cannot drift from what a consumer is actually promised. An entry that renders
  // the icon without being asked for it by name still has to receive the geometry, or
  // a one-command install leaves `@/lib/cojeev/lucide-icon-data` unresolved.
  const geometry = payload("cojeev-icon-geometry");
  assert.deepEqual((geometry.files ?? []).map(file => file.target).sort(), ["lib/cojeev/icon-data.ts", "lib/cojeev/lucide-icon-data.ts"]);
  const iconConsumers = uiEntries.filter(name => (payload(name).files ?? []).some(file => (file.content ?? "").includes("@/components/ui/icon")));
  assert.ok(iconConsumers.length > 20, `Expected many entries to consume the icon, found ${iconConsumers.length}`);
  const missing = iconConsumers.filter(name => {
    const targets = scenarioFootprint(allItems, [name]).files.map(file => file.target ?? "");
    return !targets.some(target => target.includes("lucide-icon-data"));
  });
  assert.deepEqual(missing, [], `These entries consume the icon but do not install its geometry: ${missing.join(", ")}`);
});

test("the measured footprints match the declared delivery budgets", () => {
  const budgets = JSON.parse(fs.readFileSync("data/delivery-budgets.json", "utf8"));
  const report = footprintReport(allItems, Object.fromEntries(Object.entries(budgets.scenarios).map(([scenario, budget]) => [scenario, budget.entries])));
  assert.deepEqual(budgetViolations(report, budgets), []);
  // A budget that no measurement can breach is not a budget. Each ceiling has to
  // sit within reach of the measurement recorded beside it, or the check below
  // silently stops guarding anything.
  for (const [scenario, budget] of Object.entries(budgets.scenarios)) {
    const measured = report[scenario];
    assert.ok(budget.maxSourceBytes <= measured.sourceBytes * 1.25, `${scenario} source ceiling is more than 25 percent above the measurement`);
    assert.ok(budget.maxFiles <= measured.fileCount * 1.25, `${scenario} file ceiling is more than 25 percent above the measurement`);
    // The baseline is the evidence the ceilings were lowered from: a scenario
    // that no longer beats it has lost the reduction the split was made for.
    const baseline = budgets.baseline?.[scenario];
    if (baseline?.sourceBytes) assert.ok(measured.sourceBytes < baseline.sourceBytes, `${scenario} no longer beats its recorded baseline`);
  }
});

/**
 * The pixel gate renders this repository's own source through Vite, so it can only
 * ever see `registry/cojeev/**` and never `public/r/*`. That makes payload
 * completeness a blind spot for it: moving a stylesheet out of the foundation and
 * into claiming entries changes nothing the gate looks at, and the failure mode —
 * an entry that installs the component but not its paint — surfaces only in a
 * consumer, as an unstyled control.
 *
 * These two invariants close that gap by reading the payloads and the source they
 * are generated from, so a stylesheet can neither be dropped from the registry
 * entirely nor omitted from an entry that imports it.
 */
test("every stylesheet in the source is installed by at least one entry, and none is orphaned", () => {
  const stylesDirectory = "registry/cojeev/styles";
  const onDisk = fs.readdirSync(stylesDirectory).filter(name => name.endsWith(".css"));
  assert.ok(onDisk.length > 100, `Expected the full stylesheet set, found ${onDisk.length}`);
  const installed = new Set();
  for (const item of allItems) for (const file of item.files ?? []) installed.add(path.basename(file.path));
  const neverInstalled = onDisk.filter(name => !installed.has(name)).sort();
  assert.deepEqual(neverInstalled, [], "these stylesheets reach no entry, so no consumer can ever receive them");
});

test("each entry installs exactly the stylesheets its own files name, so nothing is left unpainted", () => {
  const stylesDirectory = "registry/cojeev/styles";
  const onDisk = new Set(fs.readdirSync(stylesDirectory).filter(name => name.endsWith(".css")));
  // A stylesheet reaches an entry by convention, not by import: the generator maps
  // a private module to the stylesheet of the same basename. The predecessor of
  // this test looked for `styles/…` import specifiers in installed TypeScript and
  // could never fail, because no TypeScript file in this project imports a
  // stylesheet at all. This reads the same linkage the generator uses, so it
  // breaks if the convention is applied inconsistently in either direction.
  const foundation = payload("cojeev");
  const foundationStyles = new Set((foundation.files ?? []).map(file => path.basename(file.path)).filter(name => onDisk.has(name)));
  const omitted = [];
  for (const name of names) {
    const installed = (payload(name).files ?? []).map(file => path.basename(file.path)).filter(file => onDisk.has(file));
    const installedSet = new Set(installed);
    // An entry's own paint, named after the entry itself, plus the shared paint of
    // every private module the payload ships. A component stylesheet is the one
    // file whose absence is invisible to `tsc` and to the Vite pixel gate.
    const ownComponentStyles = onDisk.has(`${name}.css`) ? [`${name}.css`] : [];
    for (const stylesheet of ownComponentStyles) {
      if (installedSet.has(stylesheet)) continue;
      // The installer also writes the foundation, so a sheet the foundation
      // carries does reach the consumer even when the entry does not name it.
      if (foundationStyles.has(stylesheet)) continue;
      omitted.push(`${name} ships no ${stylesheet}`);
    }
  }
  assert.deepEqual(omitted, [], "an entry ships a component without the stylesheet that paints it");

  // The inverse: nothing an entry installs may paint a module it does not ship.
  // Two documented exceptions exist and are named here rather than pattern-matched
  // away — `choice-foundations.css` is a shared example composition the generator
  // attaches to the whole choice family, and the foundation is paint with no
  // module at all. Any other mismatch means dead paint is riding along.
  const sharedSheets = new Set(["choice-foundations.css"]);
  const dead = [];
  for (const name of names) {
    const files = payload(name).files ?? [];
    const basenames = new Set(files.map(file => path.basename(file.path)));
    for (const file of files) {
      const stylesheet = path.basename(file.path);
      if (!onDisk.has(stylesheet) || stylesheet === `${name}.css`) continue;
      if (foundationStyles.has(stylesheet) || sharedSheets.has(stylesheet)) continue;
      const owner = stylesheet.replace(/\.css$/, "");
      if (basenames.has(`${owner}.ts`) || basenames.has(`${owner}.tsx`)) continue;
      dead.push(`${name} installs ${stylesheet} but not ${owner}.ts`);
    }
  }
  assert.deepEqual(dead, [], "an entry installs paint for a module it does not ship");
});
