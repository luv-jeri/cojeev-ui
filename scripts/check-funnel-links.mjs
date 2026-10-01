import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

export function funnelLinkProblems(html, file) {
  // Preserve invalid nested anchors so the checker can diagnose them rather than repair them.
  const $ = load(html, { xml: { xmlMode: false } });
  const problems = [];
  const links = $("a").filter((_, node) => $(node).text().trim() === "Explore Cojeev");
  if (links.length !== 1) problems.push(`${file}: expected one Explore Cojeev anchor, found ${links.length}`);
  links.each((_, node) => {
    const link = $(node);
    if (link.attr("href") !== "https://cojeev.com/") problems.push(`${file}: Explore Cojeev must link to https://cojeev.com/`);
    if (link.attr("target") !== undefined) problems.push(`${file}: Explore Cojeev must use the same tab (no target)`);
  });
  $("a").filter((_, node) => $(node).text().trim() === "by Cojeev").each((_, node) => {
    if ($(node).parents("a").length) problems.push(`${file}: by Cojeev anchor is nested inside another anchor`);
  });
  return problems;
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(file);
  }
  return files.sort();
}

async function main() {
  const directory = process.argv[process.argv.indexOf("--dir") + 1];
  if (!process.argv.includes("--dir") || !directory) throw new Error("Usage: node scripts/check-funnel-links.mjs --dir out");
  const files = await htmlFiles(directory);
  if (!files.length) throw new Error(`${directory}: no HTML pages found`);
  const problems = [];
  for (const file of files) problems.push(...funnelLinkProblems(await readFile(file, "utf8"), file));
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else console.log(`${files.length} HTML pages have exactly one same-tab Explore Cojeev link and no nested attribution.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
