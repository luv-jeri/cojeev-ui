/**
 * Per-part computed-style diagnosis for one component/fixture.
 *
 * Read-only. Starts the gate Vite server on its own port, loads the reference
 * isolation fixture and the candidate page, and reports every differing
 * property per matched part, plus a ranked summary of the
 * (part, property, reference-value, candidate-value) triples that account for
 * the differences. This is triage tooling for the visual-repair milestone; it
 * makes no verdict and writes no shared artifact.
 *
 *   node scripts/diagnose-component.mjs --id=bubble --file=default-default-rest.html --width=390
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const arg = (name) =>
  process.argv.find((v) => v.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const id = arg("id");
if (!id) throw new Error("--id is required");
const width = Number(arg("width") ?? 390);
const reference = "reference/cojeev-handoff-v4";
const registry = JSON.parse(fs.readFileSync(`${reference}/data/registry.json`, "utf8")).entries;
const portMap = JSON.parse(fs.readFileSync(`${reference}/data/port-map.json`, "utf8")).entries;
const semantics = JSON.parse(fs.readFileSync("apps/gate/fixture-semantic-map.json", "utf8")).entries;
const port = Number(arg("port") ?? 4318);

const entry = registry[id];
if (!entry) throw new Error(`Unknown reference id: ${id}`);
const file = arg("file") ?? entry.isolation.find((f) => !f.includes("-open")) ?? entry.isolation[0];
if (!entry.isolation.includes(file)) throw new Error(`Fixture ${file} is not listed for ${id}`);

const openActions = {
  "alert-dialog": { selector: "[data-dialog-open]", method: "click" },
  dialog: { selector: "[data-dialog-open]", method: "click" },
  sheet: { selector: "[data-sheet-open]", method: "click" },
  drawer: { selector: "[data-drawer-open]", method: "click" },
  "dropdown-menu": { selector: "[data-menu]", method: "click" },
  popover: { selector: "[data-menu]", method: "click" },
  menubar: { selector: ".v-menubar__trigger", method: "click" },
  select: { selector: "[data-select] > button", method: "click" },
  combobox: { selector: "[data-combo] input", method: "click" },
  "date-picker": { selector: "[data-datepicker] > button", method: "click" },
  "context-menu": { selector: "[data-context]", method: "contextmenu" },
  "hover-card": { selector: "[data-hovercard]", method: "hover" },
  tooltip: { selector: "[data-tooltip]", method: "hover" },
  toast: { selector: "[data-toast][data-durable]", method: "click" },
};
let sourceFile = file;
let action = null;
if (file.includes("-open") && openActions[id]) {
  sourceFile = file.replace("-open", "-rest");
  action = openActions[id];
}

const properties = [
  "background-color", "color", "font-family", "font-size", "font-weight", "line-height",
  "letter-spacing", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "width", "height", "min-height", "border-top-width", "border-top-style", "border-top-color",
  "border-radius", "box-shadow", "outline", "outline-offset", "gap", "opacity", "transform",
  "transition-duration", "transition-timing-function",
];
/** Context that explains a mismatch even though the gate does not compare it. */
const context = [
  "display", "max-width", "min-width", "flex-direction", "align-items", "justify-content",
  "justify-self", "position", "box-sizing", "margin-top", "margin-bottom", "margin-left",
  "margin-right", "font-style", "text-align", "overflow-wrap", "white-space", "vertical-align",
];

const parts = { ...portMap[id].parts, ...semantics[id]?.additionalParts };
const translations = semantics[id]?.parts;

const server = await createServer({
  configFile: path.resolve("apps/gate/vite.config.ts"),
  server: { port, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

async function sample(url, candidate) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  if (action) {
    const trigger = page.locator(action.selector).first();
    if (action.method === "hover") await trigger.hover();
    else await trigger.click(action.method === "contextmenu" ? { button: "right", position: { x: 24, y: 24 } } : {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
  }
  const shot = await page.screenshot();
  const measured = await page.evaluate(
    ({ properties, context, parts, translations, candidate }) => {
      const visible = (el) => {
        if (!el.getClientRects().length) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") return false;
        for (let p = el; p; p = p.parentElement) if (Number(getComputedStyle(p).opacity) === 0) return false;
        return true;
      };
      const roots = Array.from(document.querySelectorAll("[data-gate]"));
      const counts = new Map();
      const key = (kind, name, el) => {
        const prefix = `${visible(el) ? "" : "hidden-"}${kind}:${name}`;
        const count = counts.get(prefix) ?? 0;
        counts.set(prefix, count + 1);
        return `${prefix}:${count}`;
      };
      const entries = roots.map((el) => ({ el, key: key("gate", el.getAttribute("data-gate"), el) }));
      for (const [selector, name] of Object.entries(parts)) {
        const translation = translations?.[selector];
        const resolved = candidate ? translation?.candidateSelector ?? selector : translation?.referenceSelector ?? selector;
        const pseudo = candidate ? translation?.candidatePseudo : translation?.referencePseudo;
        document.querySelectorAll(resolved).forEach((el) => {
          if (pseudo || !roots.includes(el)) entries.push({ el, pseudo, key: key("part", name, el) });
        });
      }
      const mapped = new Set(entries.map((e) => e.el));
      return {
        styles: Object.fromEntries(
          entries.map(({ el, pseudo, key: k }) => {
            const cs = getComputedStyle(el, pseudo);
            return [k, {
              __visible: String(visible(el)),
              __selector: el.matches?.("[data-gate]") ? el.getAttribute("data-gate") : null,
              __tag: el.tagName.toLowerCase(),
              __class: el.getAttribute?.("class") ?? null,
              __text: (el.textContent ?? "").trim().slice(0, 60),
              ...Object.fromEntries([...properties, ...context].map((p) => [p, cs.getPropertyValue(p)])),
            }];
          }),
        ),
        // Every rendered element in the fixture subtree that the part map does
        // NOT cover, with its box. Differences that localise here are real
        // visual defects the port map cannot attribute.
        unmapped: Array.from(document.querySelectorAll("[data-gate] *"))
          .filter((el) => !mapped.has(el) && visible(el))
          .map((el) => {
            const box = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase(),
              class: el.getAttribute("class"),
              slot: el.getAttribute("data-slot"),
              left: Math.round(box.left),
              top: Math.round(box.top),
              width: Math.round(box.width),
              height: Math.round(box.height),
              background: getComputedStyle(el).backgroundColor,
              color: getComputedStyle(el).color,
              fontSize: getComputedStyle(el).fontSize,
              fontFamily: getComputedStyle(el).fontFamily.split(",")[0],
              text: (el.textContent ?? "").trim().slice(0, 40),
            };
          }),
      };
    },
    { properties, context, parts, translations, candidate },
  );
  return { ...measured, shot };
}

const outDir = path.resolve(arg("out") ?? `.work/diagnose/${id}`);
fs.mkdirSync(outDir, { recursive: true });

const oracleUrl = `${reference}/isolation/${id}/${sourceFile}`;
const candidateUrl = `candidate?id=${id}&file=${sourceFile}`;
const base = `http://127.0.0.1:${port}/`;
const A = await sample(base + oracleUrl, false);
const B = await sample(base + candidateUrl, true);
for (const [name, s] of [["reference", A], ["candidate", B]]) {
  fs.writeFileSync(`${outDir}/${file.replace(".html", "")}-${width}-${name}.png`, s.shot);
}

const rows = [];
for (const key of new Set([...Object.keys(A.styles), ...Object.keys(B.styles)])) {
  const a = A.styles[key];
  const b = B.styles[key];
  if (!a || !b) {
    rows.push({ key, property: "presence", reference: a ? "present" : "ABSENT", candidate: b ? "present" : "ABSENT" });
    continue;
  }
  if (a.__visible !== b.__visible) {
    rows.push({ key, property: "visibility", reference: a.__visible, candidate: b.__visible });
    continue;
  }
  if (a.__visible === "false") continue;
  for (const p of properties) if (a[p] !== b[p]) rows.push({ key, property: p, reference: a[p], candidate: b[p] });
}

// Pixel evidence: total ratio plus the horizontal bands that actually differ,
// so an unmapped difference can still be located on the page.
const x = PNG.sync.read(A.shot);
const y = PNG.sync.read(B.shot);
const diffPng = new PNG({ width: x.width, height: x.height });
const diffCount = pixelmatch(x.data, y.data, diffPng.data, x.width, x.height, { threshold: 0.1, includeAA: true });
fs.writeFileSync(`${outDir}/${file.replace(".html", "")}-${width}-diff.png`, PNG.sync.write(diffPng));
const bands = [];
const rowHits = new Array(y.height).fill(0);
for (let py = 0; py < y.height; py++) {
  let hits = 0;
  for (let px = 0; px < x.width; px++) {
    const i = (py * x.width + px) * 4;
    if (diffPng.data[i] !== x.data[i] || diffPng.data[i + 1] !== x.data[i + 1] || diffPng.data[i + 2] !== x.data[i + 2]) hits++;
  }
  rowHits[py] = hits;
}
let start = null;
for (let py = 0; py <= y.height; py++) {
  const on = py < y.height && rowHits[py] > 0;
  if (on && start === null) start = py;
  if (!on && start !== null) { bands.push({ top: start, bottom: py - 1 }); start = null; }
}
const merged = [];
for (const band of bands) {
  const last = merged[merged.length - 1];
  if (last && band.top - last.bottom <= 4) last.bottom = band.bottom;
  else merged.push({ ...band });
}

const signature = new Map();
for (const r of rows) {
  const sig = `${r.property} :: ref=${r.reference} :: cand=${r.candidate}`;
  signature.set(sig, (signature.get(sig) ?? 0) + 1);
}

console.log(`# ${id} / ${file} @${width}px  (source: ${sourceFile}${action ? `, action: ${action.method} ${action.selector}` : ""})`);
console.log(`\n## Ranked signatures (${rows.length} property differences across ${new Set(rows.map((r) => r.key)).size} parts)\n`);
for (const [sig, n] of [...signature].sort((x, y) => y[1] - x[1])) console.log(`${String(n).padStart(4)}  ${sig}`);

const byPart = new Map();
for (const r of rows) {
  if (!byPart.has(r.key)) byPart.set(r.key, []);
  byPart.get(r.key).push(r);
}
console.log(`\n## Pixel evidence\n`);
console.log(`differing pixels: ${diffCount} / ${x.width * y.height} = ${((100 * diffCount) / (x.width * y.height)).toFixed(4)}%`);
console.log(`screenshots: ${outDir}/${file.replace(".html", "")}-${width}-{reference,candidate,diff}.png`);
console.log(`\n## Differing horizontal bands (viewport y, 900px tall)\n`);
for (const band of merged) {
  const hits = rowHits.slice(band.top, band.bottom + 1).reduce((a, b) => a + b, 0);
  console.log(`  y ${band.top}–${band.bottom} (h=${band.bottom - band.top + 1}, ${hits} px)`);
}

console.log(`\n## Per-part detail\n`);
for (const [key, list] of byPart) {
  const meta = A.styles[key] ?? B.styles[key];
  console.log(`- ${key}  <${meta.__tag}> class="${meta.__class}"${meta.__text ? ` text="${meta.__text}"` : ""}`);
  if (meta.__selector) console.log(`    gate=${meta.__selector}`);
  for (const r of list) console.log(`    ${r.property}: ref=${r.reference} | cand=${r.candidate}`);
  const inContextOnly = context.filter((p) => (A.styles[key]?.[p] ?? "") !== (B.styles[key]?.[p] ?? ""));
  if (inContextOnly.length) {
    console.log(`    (context only, not gated)`);
    for (const p of inContextOnly) console.log(`      ${p}: ref=${A.styles[key]?.[p]} | cand=${B.styles[key]?.[p]}`);
  }
}

// Elements the port map does not cover. A differing band inside one of these
// boxes is a defect the gate reports but cannot attribute to a named part.
const unmappedDiff = [];
for (const a of A.unmapped) {
  const b = B.unmapped.find((c) => c.tag === a.tag && c.slot === a.slot && c.text === a.text && Math.abs(c.top - a.top) < 400);
  const fields = ["left", "top", "width", "height", "background", "color", "fontSize", "fontFamily"];
  const changed = b ? fields.filter((f) => a[f] !== b[f]).map((f) => `${f}: ref=${a[f]} | cand=${b[f]}`) : ["present in reference only"];
  const box = { top: a.top, bottom: a.top + a.height };
  const overlap = merged.filter((m) => m.bottom >= box.top && m.top <= box.bottom);
  if (changed.length || overlap.length) {
    unmappedDiff.push({ a, b, changed, overlap });
  }
}
console.log(`\n## Unmapped elements with differences or differing pixels (${unmappedDiff.length})\n`);
for (const { a, changed, overlap } of unmappedDiff) {
  console.log(`- <${a.tag}> slot=${a.slot} class="${a.class}" box=(${a.left},${a.top},${a.width}x${a.height})${a.text ? ` text="${a.text}"` : ""}`);
  for (const c of changed) console.log(`    ${c}`);
  if (overlap.length) console.log(`    differing pixels overlap: ${overlap.map((o) => `y${o.top}-${o.bottom}`).join(", ")}`);
}

await browser.close();
await server.close();
