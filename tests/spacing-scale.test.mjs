import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Padding, margin and gap sit on the --s-* grid, corners on the --r-* steps. 1-3px optical nudges stay
// raw, and so do large layout dimensions (36px and up) that are not spacing steps.
const styles = "registry/cojeev/styles";
const sheets = fs.readdirSync(styles).filter((file) => file.endsWith(".css") && !["tokens.css", "theme.css", "fonts.css"].includes(file));
const SPACE = /(?<![\w-])(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?:\s*([^;{}!]+)/g;
const RADIUS = /(?<![\w-])border(?:-[a-z]+-[a-z]+)?-radius:\s*([^;{}!]+)/g;

function rawLengths(value) {
  // Only lengths written directly in the value; var() fallbacks and calc() terms are the author's call.
  let bare = value;
  for (let previous = ""; previous !== bare; ) { previous = bare; bare = bare.replace(/[a-z-]*\([^()]*\)/g, ""); }
  return [...bare.matchAll(/(?<![\w.-])([0-9]+(?:\.[0-9]+)?)px/g)].map(([, px]) => Number(px));
}

test("component spacing sits on the 4px grid tokens", () => {
  const offenders = [];
  for (const file of sheets) {
    const css = fs.readFileSync(path.join(styles, file), "utf8");
    for (const [match, value] of css.matchAll(SPACE)) {
      for (const px of rawLengths(value)) if (px > 3 && px < 36) offenders.push(`${file}: ${match.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], "use a --s-* step");
});

test("component corners use the radius tokens", () => {
  const offenders = [];
  for (const file of sheets) {
    const css = fs.readFileSync(path.join(styles, file), "utf8");
    for (const [match, value] of css.matchAll(RADIUS)) {
      if (value.includes("/") || value.includes("%")) continue; // authored organic silhouettes
      for (const px of rawLengths(value)) if (px > 2 && px <= 30) offenders.push(`${file}: ${match.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], "use a --r-* step");
});
