/** Write each route's component stylesheet from its import graph; --check verifies the committed files.
 *
 * All component rules share one cascade layer, so equal-specificity conflicts resolve by source
 * order. A route sheet therefore repeats the shell's components in their historical position
 * instead of relying on the shell sheet loading first: an identical rule earlier in the page cannot
 * change a result, and a sheet left over from a previous client-side navigation is always followed
 * by a complete, correctly ordered one. Separate sub-layers per component would not work: layer
 * order overrides specificity, which changes which rule wins. */
import fs from "node:fs";
import path from "node:path";

const styles = "registry/cojeev/styles";
const out = "app/styles";
// Foundation layers every page needs. They stay in app/globals.css.
const foundation = new Set(["tokens", "theme", "base", "morph", "flow-press", "fonts"]);
// Shared control foundations that installs pull in beside their owners (see build-registry.mjs).
const companions = { checkbox: ["choice-foundations"], "radio-group": ["choice-foundations"], switch: ["choice-foundations"] };

// The root layout renders on every route; the docs layout shows any component, so it keeps the full set.
const shell = { name: "shell", entry: "app/layout.tsx", importer: "app/layout.tsx" };
const routes = [
  { name: "home", entry: "app/page.tsx" },
  { name: "about", entry: "app/about/page.tsx" },
  { name: "getting-started", entry: "app/getting-started/page.tsx" },
  { name: "privacy", entry: "app/privacy/page.tsx" },
  { name: "work-with-me", entry: "app/work-with-me/page.tsx" },
  { name: "requests", entry: "app/requests/page.tsx" },
  { name: "workspace", entry: "app/workspace/page.tsx" },
  { name: "feedback-admin", entry: "app/feedback-admin/page.tsx" },
];

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
  "slider","spinner","stepper","switch","table","tabs","textarea","toast","toggle-group","toggle","tooltip",
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

function sheet(title, ids, importer) {
  const relative = path.posix.relative(path.posix.dirname(`${out}/x.css`), styles);
  const lines = componentStyles.filter((id) => ids.has(id)).map((id) => `@import "${relative}/${id}.css" layer(cojeev-states);`);
  return `/* Generated by scripts/build-route-styles.mjs — do not edit. ${title}\n   Imported by ${importer}. Order follows the historical cascade; see the header of this script. */\n${lines.join("\n")}\n`;
}

const shellIds = componentsOf(shell.entry);
const files = {
  [`${out}/shell.css`]: sheet("Components the root layout renders on every page.", shellIds, shell.importer),
};
const everything = new Set(componentStyles);
files[`${out}/docs.css`] = sheet("Every component, for the docs.", everything, "app/docs/layout.tsx");
for (const route of routes) {
  const ids = new Set([...componentsOf(route.entry), ...shellIds]);
  files[`${out}/${route.name}.css`] = sheet(`Every component ${route.entry} renders, the shell's included.`, ids, route.entry);
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
