import { mkdir, writeFile } from "node:fs/promises";
import { brandPath, brandViewBox } from "../lib/brand";

async function generate() {
  const destination = new URL("../public/brand/", import.meta.url);
  await mkdir(destination, { recursive: true });
  for (const [name, color] of [
    ["000h-mark", "#27292d"],
    ["000h-mark-inverse", "#f8f6f1"],
    ["000h-mark-pink", "#efa6cf"],
  ]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brandViewBox}" fill="${color}" role="img" aria-label="000h by Cojeev"><path fill-rule="evenodd" d="${brandPath}"/></svg>\n`;
    await writeFile(new URL(`${name}.svg`, destination), svg);
  }
  await writeFile(
    new URL("../app/icon.svg", import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brandViewBox}"><style>path{fill:#27292d}@media(prefers-color-scheme:dark){path{fill:#f8f6f1}}</style><path fill-rule="evenodd" d="${brandPath}"/></svg>\n`,
  );
}
void generate();
