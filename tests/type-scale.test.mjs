import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Interface text sits on the --fs-* steps and the four --fw-* weights. Every literal up to 28px was
// snapped to the nearest step (ties round up). Larger display sizes and fluid clamp()/min()/calc()
// sizes are still set per component until the display scale is designed. A size that must stay
// relative to its parent keeps the floor: max(var(--fs-caps), .3em).
const LARGEST_RAW = 28;
const styles = "registry/cojeev/styles";
const read = (file) => fs.readFileSync(file, "utf8");
const listed = (dir, pattern) => fs.readdirSync(dir).filter((file) => pattern.test(file)).map((file) => path.join(dir, file));
const sheets = listed(styles, /\.css$/).filter((file) => !/\/(tokens|theme|fonts)\.css$/.test(file));
const sources = ["registry/cojeev/ui", "registry/cojeev/lib"].flatMap((dir) => listed(dir, /\.tsx?$/));
const typeTokens = new Set([...read(path.join(styles, "tokens.css")).matchAll(/(--(?:fs|fw|lh)-[\w-]+)\s*:/g)].map(([, name]) => name));
const css = (file) => read(file).replace(/@font-face\s*{[^}]*}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// A raw size literal: px (a bare number in JS) or rem up to LARGEST_RAW, or any bare em or %.
// Tokens and functions pass here; the last test checks that the tokens exist.
function rawSize(value) {
  const [, number, unit = "px"] = value.trim().replace(/^["'`]|["'`]$/g, "").match(/^(\d*\.?\d+)(px|rem|em|%)?$/) ?? [];
  if (number === undefined || Number(number) === 0) return false; // font-size: 0 hides text rather than sizing it
  if (unit === "em" || unit === "%") return true;
  return Number(number) * (unit === "rem" ? 16 : 1) <= LARGEST_RAW;
}
const rawWeight = (value) => /^["'`]?\d+["'`]?$/.test(value.trim());

// A font: shorthand sets style, weight and size before the slash and line-height after it.
function shorthand(value) {
  const parts = value.match(/\/|(?:[^\s/(]|\((?:[^()]|\([^()]*\))*\))+/g) ?? [];
  const lead = parts.includes("/") ? parts.slice(0, parts.indexOf("/")) : parts;
  return { size: lead.some(rawSize), weight: lead.some(rawWeight) };
}

// Declarations in a stylesheet, and Tailwind arbitrary font properties in TSX.
const cssDeclaration = /(?<![\w-])(font-size|font-weight|font)\s*:\s*([^;}]+)/g;
const arbitraryProperty = /\[(font-size|font-weight|font):([^\]]+)\]/g;

function offScale(file, text, pattern, check) {
  const offenders = [];
  for (const [, property, raw] of text.matchAll(pattern)) {
    const value = raw.replace(/!important/, "").replaceAll("_", " ").trim();
    const off = property === "font" ? shorthand(value)[check]
      : check === "size" ? property === "font-size" && rawSize(value)
      : property === "font-weight" && rawWeight(value);
    if (off) offenders.push(`${file}: ${property} ${value}`);
  }
  return offenders;
}

test("component stylesheets size interface text from the type scale", () => {
  const offenders = sheets.flatMap((file) => offScale(file, css(file), cssDeclaration, "size"));
  assert.deepEqual(offenders, [], "use a --fs-* step");
});

test("component weights come from the four weight tokens", () => {
  const offenders = sheets.flatMap((file) => offScale(file, css(file), cssDeclaration, "weight"));
  for (const file of sources) {
    const source = read(file);
    offenders.push(...offScale(file, source, arbitraryProperty, "weight"));
    for (const [match, value] of source.matchAll(/(?<![\w-])font-\[(?:number:)?([^\]]+)\]/g)) if (rawWeight(value)) offenders.push(`${file}: ${match}`);
    for (const [match, value] of source.matchAll(/(?<![\w-])fontWeight\s*:\s*([^,}\n]+)/g)) if (rawWeight(value)) offenders.push(`${file}: ${match}`);
    for (const [match] of source.matchAll(/(?<![\w-])font-(?:thin|extralight|light|extrabold|black)(?![\w-])/g)) offenders.push(`${file}: ${match}`);
  }
  assert.deepEqual(offenders, [], "use --fw-regular, --fw-medium, --fw-semibold or --fw-bold");
});

test("component sources size interface text from the type scale", () => {
  const offenders = [];
  for (const file of sources) {
    const source = read(file);
    offenders.push(...offScale(file, source, arbitraryProperty, "size"));
    for (const [match, value] of source.matchAll(/(?<![\w-])text-\[(?:length:)?([^\]]+)\]/g)) if (rawSize(value)) offenders.push(`${file}: ${match}`);
    for (const [match, value] of source.matchAll(/(?<![\w-])fontSize\s*:\s*([^,}\n]+)/g)) if (rawSize(value)) offenders.push(`${file}: ${match}`);
    // Tailwind's named sizes carry their own rem values and line-heights instead of the scale's steps.
    for (const [match] of source.matchAll(/(?<![\w-])text-(?:xs|sm|base|lg|[2-9]?xl)(?![\w-])/g)) offenders.push(`${file}: ${match}`);
  }
  assert.deepEqual(offenders, [], "size TSX text with the typed length form of a --fs-* token");
});

test("every type token in use is defined in tokens.css", () => {
  const site = ["app", "components"].flatMap((dir) => fs.readdirSync(dir, { recursive: true }).filter((file) => /\.(css|tsx?)$/.test(file)).map((file) => path.join(dir, file)));
  const missing = [...listed(styles, /\.css$/), ...sources, ...site].flatMap((file) => [...read(file).matchAll(/var\(\s*(--(?:fs|fw|lh)-[\w-]+)/g)].filter(([, name]) => !typeTokens.has(name)).map(([, name]) => `${file}: ${name}`));
  assert.deepEqual(missing, [], "an undefined --fs-*, --fw-* or --lh-* token silently inherits its size");
});
