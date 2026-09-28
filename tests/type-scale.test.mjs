import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Interface text sits on the --fs-* steps and the four --fw-* weights. Large display sizes
// (above the section step) are still set per component until the display scale is designed.
const LARGEST_RAW = 26;
const styles = "registry/cojeev/styles";
const sheets = fs.readdirSync(styles).filter((file) => file.endsWith(".css") && !["tokens.css", "theme.css", "fonts.css"].includes(file));
const sources = ["registry/cojeev/ui", "registry/cojeev/lib"].flatMap((dir) => fs.readdirSync(dir).filter((file) => file.endsWith(".tsx")).map((file) => path.join(dir, file)));

test("component stylesheets size interface text from the type scale", () => {
  const offenders = [];
  for (const file of sheets) {
    const css = fs.readFileSync(path.join(styles, file), "utf8");
    for (const [, px] of css.matchAll(/font-size:\s*([0-9.]+)px/g)) if (Number(px) <= LARGEST_RAW) offenders.push(`${file}: ${px}px`);
    for (const [, px] of css.matchAll(/(?:^|[;{\s])font:\s*[0-9]{3}\s+([0-9.]+)px/gm)) if (Number(px) <= LARGEST_RAW) offenders.push(`${file}: font ${px}px`);
  }
  assert.deepEqual(offenders, [], "use a --fs-* step");
});

test("component weights come from the four weight tokens", () => {
  const offenders = [];
  for (const file of sheets) {
    const css = fs.readFileSync(path.join(styles, file), "utf8").replace(/@font-face\s*{[^}]*}/g, "");
    for (const [match] of css.matchAll(/font-weight:\s*[0-9]+/g)) offenders.push(`${file}: ${match}`);
  }
  for (const file of sources) {
    const source = fs.readFileSync(file, "utf8");
    for (const [match] of source.matchAll(/\[font-weight:[0-9]+\]|(?<![\w-])font-\[[0-9]+\]/g)) offenders.push(`${file}: ${match}`);
  }
  assert.deepEqual(offenders, [], "use --fw-regular, --fw-medium, --fw-semibold or --fw-bold");
});

test("component sources size interface text from the type scale", () => {
  const offenders = [];
  for (const file of sources) {
    const source = fs.readFileSync(file, "utf8");
    for (const [match, px] of source.matchAll(/(?:text-\[|\[font-size:)([0-9.]+)px\]/g)) if (Number(px) <= LARGEST_RAW) offenders.push(`${file}: ${match}`);
  }
  assert.deepEqual(offenders, [], "use text-[length:var(--fs-*)]");
});
