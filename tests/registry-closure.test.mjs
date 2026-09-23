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
import { budgetViolations, emittedBudgetViolations, footprintReport, installedSourceDigest, scenarioFootprint } from "../scripts/registry-footprint-lib.mjs";
import { loadPayloads } from "../scripts/registry-payloads.mjs";

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

  // The same relation read forward, which is the direction that was missing: a
  // private module whose paint exists on disk must arrive with that paint. The
  // inverse check below only requires paint to have an owner, so dropping
  // `flow-press.css` from an entry that still ships `flow-press.ts` satisfied
  // both existing directions. Any helper with a matching stylesheet is covered,
  // not a hand-listed set, so a new styled helper is protected automatically.
  const paintless = [];
  for (const name of names) {
    const basenames = new Set((payload(name).files ?? []).map(file => path.basename(file.path)));
    for (const basename of basenames) {
      if (basename === `${name}.ts` || basename === `${name}.tsx`) continue;
      const owner = basename.replace(/\.tsx?$/, "");
      const stylesheet = `${owner}.css`;
      if (!onDisk.has(stylesheet) || basenames.has(stylesheet) || foundationStyles.has(stylesheet)) continue;
      paintless.push(`${name} ships ${basename} without ${stylesheet}`);
    }
  }
  assert.deepEqual(paintless, [], "an entry ships a styled helper without the stylesheet that paints it");

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

test("a css import a consumer receives is alias-based, layer-safe and framework-honest", () => {
  // A registry item's `css` keys are written into the consumer's stylesheet verbatim.
  // Measured against shadcn 4.21.0, Tailwind 4.1.16 and both documented scaffolds:
  //
  //   `@/styles/...`   resolves in Vite (@ -> src/, where the installer puts styles/)
  //                    and FAILS in Next (@ -> the project root, no alias in Tailwind's
  //                    PostCSS resolver). This is what the registry ships.
  //   `../styles/...`  fixes Next and FAILS in Vite. `~/`, bare and absolute all fail.
  //
  // The installer writes foundation targets to the project root for *both* frameworks,
  // so no specifier reaches them in both and the registry cannot fix this by choosing
  // differently. It ships the specifier its verified Vite control resolves; a Next
  // consumer needs one documented path change, tracked as B-028 and reported by
  // `npm run delivery:verify:next` as a QUALIFICATION rather than repaired in silence.
  //
  // What this test protects is that the block stays *shaped* so that repair is one
  // find-and-replace, and that nothing here breaks a consumer in a way the alias
  // question would hide: `@custom-variant` must be top level (the installer renders
  // declarations inside `@layer base`, a layer cannot contain it, and a payload that
  // nested it failed every Next build with "`@custom-variant` cannot be nested").
  const alias = [];
  const imports = [];
  const declarations = [];
  const misplaced = [];
  for (const name of names) {
    const item = payload(name);
    for (const rule of Object.keys(item.css ?? {})) {
      if (rule.startsWith("@custom-variant ")) continue;
      // Anything else is a selector whose body the installer renders as a layer.
      if (!rule.startsWith("@import ")) { declarations.push(rule); continue; }
      const specifier = rule.replace(/^@import\s+"?/, "").replace(/"?;?$/, "");
      imports.push(specifier);
      if (specifier.startsWith("@/styles/")) alias.push(specifier);
      else if (!specifier.startsWith("http")) misplaced.push(`${name} imports ${specifier}`);
    }
  }
  assert.ok(imports.length > 0, "the registry declares css imports at all");
  assert.deepEqual(misplaced, [], "an import is neither the verified alias nor a URL, so the documented rewrite would not cover it");
  assert.ok(declarations.length > 0, "the css block still carries the declarations the installer layers");
  // Every import must resolve in the framework the registry has verified.
  assert.equal(alias.length, imports.length, "every css import uses the verified alias form, so one documented rewrite covers all of them");

  // `@custom-variant` must precede the declarations, because declarations are layered.
  for (const name of names) {
    const keys = Object.keys(payload(name).css ?? {});
    const firstDeclaration = keys.findIndex(key => !key.startsWith("@import ") && !key.startsWith("@custom-variant "));
    const firstVariant = keys.findIndex(key => key.startsWith("@custom-variant "));
    if (firstVariant === -1 || firstDeclaration === -1) continue;
    assert.ok(firstVariant < firstDeclaration, `${name} places its @custom-variant before the layered declarations, where Tailwind accepts it`);
  }
});

test("every declared registry address points at the canonical origin", () => {
  // The closure check above only reads the `/r/<name>.json` suffix, so a mirror
  // that serves the same names satisfies it. Enforcing the origin is what turns
  // "the canonical URLs are currently correct" into "a non-canonical origin
  // cannot return silently" — two different claims that were previously merged.
  const canonical = "https://000h.cojeev.com";
  const failures = [];
  // The catalogue's own address is the one every consumer starts from, and no
  // payload carries `homepage` today, so checking only the items would leave the
  // strongest address in the file unasserted.
  if (index.homepage && !index.homepage.startsWith(canonical)) failures.push(`the registry declares homepage ${index.homepage}, which is not on ${canonical}`);
  for (const name of names) {
    const item = payload(name);
    for (const value of item.registryDependencies ?? []) {
      const match = value.match(/^([a-z][a-z0-9+.-]*:\/\/[^/]+)\/r\/([a-z0-9-]+)\.json$/);
      if (!match) {
        failures.push(`${name} declares a dependency that is not a plain registry URL: ${value}`);
        continue;
      }
      if (match[1] !== canonical) failures.push(`${name} depends on ${value}, which is not on ${canonical}`);
    }
    const alias = item.config?.registries?.["@cojeev"];
    if (alias && !alias.startsWith(`${canonical}/r/`)) failures.push(`${name} declares the @cojeev alias as ${alias}, which is not on ${canonical}`);
    if (item.homepage && !item.homepage.startsWith(canonical)) failures.push(`${name} declares homepage ${item.homepage}, which is not on ${canonical}`);
  }
  assert.deepEqual(failures, [], "a payload points consumers at a non-canonical origin");
});

/**
 * The emitted budget is keyed to a payload digest, so every caller has to agree on
 * what "the payloads" means. This pins the two ways this suite can build that set —
 * the shared loader and the registry index — to each other. They diverged once (the
 * qualifier digested the index as if it were an item), which made the recorded
 * measurement permanently stale no matter how often it was re-taken.
 */
test("the payload loader and the registry index describe the same item set", () => {
  const loaded = loadPayloads(directory);
  assert.deepEqual(
    [...loaded.keys()].sort(),
    [...names].sort(),
    "public/r holds an item the index does not list, or the index lists one it does not hold",
  );
  assert.equal(
    installedSourceDigest(loaded),
    installedSourceDigest(allItems),
    "the payload digest depends on how the payloads were loaded; the index must never be digested as an item",
  );
});

/**
 * The source budgets above are recomputed from the payloads on every run. Emitted
 * browser bytes cannot be: they need a bundler, so they are measured once by
 * `scripts/qualify-library-delivery.mjs` and recorded in the budget file. This
 * test is what keeps that recording honest in both directions — the payload digest
 * proves it was taken on these payloads, the ceilings prove the numbers are
 * acceptable, and when the machine-produced artifact is present it must agree with
 * the recorded values to the byte.
 */
test("the recorded emitted-size budget is current, honest and not exceeded", () => {
  const budgets = JSON.parse(fs.readFileSync("data/delivery-budgets.json", "utf8"));
  assert.ok(budgets.emitted, "the milestone requires emitted-size enforcement, not only source budgets");
  const measurement = {
    payloadDigest: installedSourceDigest(allItems),
    profiles: Object.fromEntries(Object.entries(budgets.emitted.profiles ?? {}).map(([profile, declared]) => [profile, declared.measured ?? {}])),
  };
  assert.deepEqual(emittedBudgetViolations(measurement, budgets.emitted), []);

  // The artifact is the machine-produced measurement this block was copied from.
  // It is not committed (artifacts/ is ignored), so this cross-check runs when the
  // qualifier has been run in this checkout and is silent otherwise — the digest
  // and ceiling checks above never depend on it.
  const artifactPath = budgets.emitted.artifact;
  if (artifactPath && fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    for (const [profile, declared] of Object.entries(budgets.emitted.profiles)) {
      const measured = artifact.profiles?.[profile]?.totals;
      assert.ok(measured, `${profile} is declared in the emitted budget but absent from ${artifactPath}`);
      for (const [kind, value] of Object.entries(declared.measured ?? {})) {
        assert.equal(measured[kind]?.rawBytes, value, `${profile} recorded ${kind} bytes do not match ${artifactPath}; the budget was edited instead of re-measured`);
      }
    }
  }
});
