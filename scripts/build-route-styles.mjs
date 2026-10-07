/** Write each route's component stylesheet from its import graph; --check verifies the committed files.
 *
 * React never removes or reorders a stylesheet it inserted, so after client-side navigation a page
 * also carries the sheets of every route visited before it, in visit order. Within one layer,
 * equal-specificity conflicts resolve by source order, so a leftover sheet that repeats shared
 * components after the current page's sheet would override the current page's later rules.
 *
 * The sheets therefore form a chain of tiers. Each tier holds every component of the tier below it,
 * plus those of the routes it adds, in the historical order, and sits in a cojeev-states sub-layer
 * declared above the tier below. docs.css holds every component directly in cojeev-states, which
 * outranks every sub-layer. Whatever sheets a navigation leaves, the highest-ranked one present
 * holds a copy of every rule in the others, so it wins every conflict and resolves exactly as on
 * its own: specificity first, then the historical order. A lower-ranked leftover never changes a
 * result. A higher-ranked leftover (docs.css after a docs visit) makes a page resolve as that larger
 * set does, as every page did before the split; tests/route-styles.browser.mjs checks that this
 * matches the hard loads. One sub-layer per component would not work: layer order overrides
 * specificity, which changes which rule wins. */
import fs from "node:fs";
import path from "node:path";

const styles = "registry/cojeev/styles";
const out = "app/styles";
// Foundation layers every page needs. They stay in app/globals.css.
const foundation = new Set(["tokens", "theme", "base", "morph", "flow-press", "fonts"]);
// Shared control foundations that installs pull in beside their owners (see build-registry.mjs).
const companions = { checkbox: ["choice-foundations"], "radio-group": ["choice-foundations"], switch: ["choice-foundations"] };

// The root layout renders on every route; the docs layout shows any component, so it keeps the full set.
const shell = "app/layout.tsx";
// Every other page gets a sheet named after its route: app/page.tsx is home, app/a/b/page.tsx is a-b.
const routes = fs.readdirSync("app", { recursive: true }).map((file) => file.split(path.sep).join("/"))
  .filter((file) => /(^|\/)page\.tsx$/.test(file) && !file.startsWith("docs/")).sort()
  .map((file) => ({ name: path.posix.dirname(file).replace(/[()[\]]/g, "").replaceAll("/", "-").replace(/^\.$/, "home"), entry: `app/${file}` }));

function resolve(from, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = specifier.slice(2);
  else if (specifier.startsWith(".")) base = path.posix.join(path.posix.dirname(from), specifier);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

function imports(file) {
  const source = fs.readFileSync(file, "utf8");
  const found = [];
  // Static and dynamic imports both count: a lazily loaded section still paints with this stylesheet.
  for (const match of source.matchAll(/(?:^|[\s;])(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
    if (match[1]) continue;
    const resolved = resolve(file, match[2] ?? match[3]);
    if (resolved) found.push(resolved);
  }
  return found;
}

function componentsOf(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...imports(file));
  }
  const ids = new Set();
  for (const file of seen) {
    const match = file.match(/^registry\/cojeev\/ui\/([a-z0-9-]+)\.tsx$/);
    if (match) ids.add(match[1]);
    if (file === "registry/cojeev/lib/control-appearance.ts") ids.add("control-appearance");
  }
  for (const id of [...ids]) for (const companion of companions[id] ?? []) ids.add(companion);
  return ids;
}

// Cascade order within the cojeev-states layer, as globals.css imported it before the split.
// Rules of equal specificity in two sheets resolve by this order, so new styles append to the end.
const order = [
  "semantic-bloom","swapy","buy-me-coffee","image-masking","linear-modal","motion-drawer","dock",
  "article-headings","portal-field","dither-dissolve","wave-wipe","grain-dissolve","option-wheel",
  "accordion-gallery","infinite-spiral","meta-balls","image-trail","strands","click-spark","ghost-cursor",
  "magic-rings","target-cursor","orbit-images","pixel-swap","swarm-cursor","elastic-mesh","ripple-distortion",
  "scroll-expand","zoom-words","caret-swap","word-stream","variable-proximity","scroll-reveal","falling-text",
  "warp-text","particle-text","typography-vortex","accordion","adjuster","alert-dialog","alert","aspect-ratio",
  "bento-grid","bento-builder","attachment","avatar","badge","breadcrumb","bubble","button-group","button",
  "calendar","card","carousel","chart","checkbox","code-block","pattern-background","collapsible","combobox",
  "command","context-menu","data-table","date-picker","dialog","direction","drawer","dropdown-menu","dropzone",
  "empty","field","hover-card","icon","input-group","input-otp","input","item","kbd","label","marker","menubar",
  "message-scroller","message","native-select","navigation-menu","pagination","popover","preview","progress",
  "questionnaire","radio-group","resizable","scroll-area","select","separator","sheet","sidebar","skeleton",
  "slider","spinner","switch","table","tabs","textarea","toast","toggle-group","toggle","tooltip",
  "tree","typography","animated-number","word-relay","reading-trail","living-link","pigment-field",
  "contour-field","milestone-path","activity-feed","text-reveal","text-ribbon","glyph-sculpture",
  "sculpture-orbit","shape-scene","multi-select","ambient-background","marquee","agent-state","agent-chat",
  "theme-toggle","animated-icon","shape-artwork","shape","presence","item-adornment","appearance",
  "assembly-part","organism-composition","organism-assembly","scroll-organism","hero-button","depth-background",
  "float-layer","writing-caret","guided-pointer","glass-sculpture","number-input","control-appearance",
  "choice-foundations",
];
const known = new Set(fs.readdirSync(styles).filter((file) => file.endsWith(".css")).map((file) => file.slice(0, -4)));
for (const id of known) if (!foundation.has(id) && !order.includes(id)) order.push(id);
const componentStyles = order.filter((id) => known.has(id) && !foundation.has(id));

const tierLayer = (tier) => `cojeev-states.tier-${tier}`;
function sheet(title, ids, importer, layer, declaration = "") {
  const relative = path.posix.relative(path.posix.dirname(`${out}/x.css`), styles);
  const lines = componentStyles.filter((id) => ids.has(id)).map((id) => `@import "${relative}/${id}.css" layer(${layer});`);
  return `/* Generated by scripts/build-route-styles.mjs — do not edit. ${title}\n   Imported by ${importer}. Order follows the historical cascade; see the header of this script. */\n${declaration}${lines.join("\n")}\n`;
}

// Tier 0 is the shell. Each route takes the lowest tier that holds all its components, or opens a
// new tier that adds them to the highest one. Smallest routes first keeps the lower tiers small.
const tiers = [componentsOf(shell)];
for (const route of routes) route.ids = new Set([...componentsOf(route.entry), ...tiers[0]]);
for (const route of [...routes].sort((a, b) => a.ids.size - b.ids.size || a.name.localeCompare(b.name))) {
  route.tier = tiers.findIndex((tier) => [...route.ids].every((id) => tier.has(id)));
  if (route.tier < 0) route.tier = tiers.push(new Set([...tiers.at(-1), ...route.ids])) - 1;
}
// Every tier sheet declares the whole order, so it holds whichever tier sheet loads first.
const declaration = `@layer ${tiers.map((_, tier) => tierLayer(tier)).join(", ")};\n`;
const files = {
  [`${out}/shell.css`]: sheet("Components the root layout renders on every page: tier 0.", tiers[0], shell, tierLayer(0), declaration)
    + ".explore-cojeev:focus-visible, .cojeev-attribution:focus-visible { outline: 2px solid var(--ring); outline-offset: 4px; }\n",
};
files[`${out}/docs.css`] = sheet("Every component, for the docs, above every tier.", new Set(componentStyles), "app/docs/layout.tsx", "cojeev-states");
for (const route of routes) {
  files[`${out}/${route.name}.css`] = sheet(`Tier ${route.tier}, holding every component ${route.entry} renders.`, tiers[route.tier], route.entry, tierLayer(route.tier), declaration);
}

if (process.argv.includes("--check")) {
  const stale = Object.entries(files).filter(([file, content]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content).map(([file]) => file);
  if (stale.length) throw new Error(`Route stylesheets are stale; run node scripts/build-route-styles.mjs: ${stale.join(", ")}`);
  console.log(`${Object.keys(files).length} route stylesheets match their import graphs.`);
} else {
  fs.mkdirSync(out, { recursive: true });
  for (const [file, content] of Object.entries(files)) fs.writeFileSync(file, content);
  for (const [file, content] of Object.entries(files)) console.log(file, (content.match(/@import/g) ?? []).length);
}
