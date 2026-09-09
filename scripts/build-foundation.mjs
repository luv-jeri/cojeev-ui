import fs from "node:fs";
import path from "node:path";
import ttf2woff2 from "ttf2woff2";

const reference = "reference/cojeev-handoff-v4";
const output = "registry/cojeev/styles";
fs.mkdirSync(output, { recursive: true });
// The authored token blocks are the authority, including the data-mode switch.
fs.copyFileSync(`${reference}/tokens/tokens.css`, `${output}/tokens.css`);
const { tokens } = JSON.parse(fs.readFileSync(`${reference}/data/tokens.json`, "utf8"));
const mapping = {};
for (const [name, token] of Object.entries(tokens)) {
  if (token.$type === "color") mapping[`--color-${name}`] = `var(--${name})`;
  if (name.startsWith("r-")) mapping[`--radius-v-${name.slice(2)}`] = `var(--${name})`;
  if (/^(s-|ctl-|disk-|icon-|shell-|sidebar-|rail-|topbar-|card-pad|content-max)/.test(name) && token.$type !== "color") {
    mapping[`--spacing-${name}`] = `var(--${name})`;
  }
  if (name.startsWith("fs-")) mapping[`--text-v-${name.slice(3)}`] = `var(--${name})`;
}
mapping["--font-cojeev-text"] = "var(--font-text)";
mapping["--font-cojeev-display"] = "var(--font-display)";
// These authored aliases are colors even where the original token metadata
// omitted or misclassified their type.
for (const name of ["primary-foreground", "sidebar", "sidebar-foreground"]) {
  delete mapping[`--spacing-${name}`];
  mapping[`--color-${name}`] = `var(--${name})`;
}
fs.writeFileSync(`${output}/theme.css`, `@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));\n@theme inline {\n${Object.entries(mapping).map(([key,value])=>`  ${key}: ${value};`).join("\n")}\n}\n`);

const faces = [
  ["DMSans-VF", "DM Sans", "100 1000", ""],
  ["BricolageGrotesque-VF", "Bricolage Grotesque", "200 800", "font-stretch:75% 100%;"],
];
// Embedded WOFF2 makes a registry install self-contained; no hostname or CDN is baked into font URLs.
const css = faces.map(([file, family, weights, stretch]) => {
  const bytes = ttf2woff2(fs.readFileSync(path.join(reference, "fonts", `${file}.ttf`)));
  return `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${bytes.toString("base64")}") format("woff2");font-weight:${weights};font-style:normal;${stretch}font-display:swap}`;
}).join("\n");
fs.writeFileSync(`${output}/fonts.css`, `/* Fonts converted losslessly from the reference TTFs. OFL licences ship with the base item. */\n@layer theme, base, components, utilities, cojeev-states, cojeev-morph, cojeev-flow, cojeev-accessibility;\n${css}\n`);
console.log(`Foundation: authored tokens, ${Object.keys(mapping).length} theme mappings, 2 embedded WOFF2 fonts`);
