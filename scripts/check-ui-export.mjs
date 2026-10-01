/** Validate the raw Next export before release packaging adds site/ui/. */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

export async function checkUiExport(directory, basePath) {
  if (basePath !== "/ui") throw new Error("checkUiExport requires the /ui base path");
  const root = path.resolve(directory);
  const problems = [];
  const exists = async (file, type = "file") => {
    try { const info = await stat(file); return type === "directory" ? info.isDirectory() : info.isFile(); }
    catch (error) { if (error.code === "ENOENT") return false; throw error; }
  };
  for (const entry of ["index.html", "_next", "r"]) {
    if (!await exists(path.join(root, entry), entry === "index.html" ? "file" : "directory")) {
      problems.push(`Raw export must contain ${entry} at the export root`);
    }
  }
  if (await exists(path.join(root, "ui/index.html"))) problems.push("Raw export must not be wrapped in ui/");
  if (problems.length) return problems;

  async function htmlFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "_next") files.push(...await htmlFiles(file));
      else if (entry.isFile() && entry.name.endsWith(".html")) files.push(file);
    }
    return files;
  }

  function mountedUrl(reference, relativeTo) {
    const url = new URL(reference, relativeTo);
    if (!["https://cojeev.com", "https://beta.000h.cojeev.com"].includes(url.origin) || !url.pathname.startsWith(`${basePath}/`)) return null;
    return url;
  }
  function exportedFile(url) {
    const file = path.resolve(root, `.${url.pathname.slice(basePath.length)}`);
    return file.startsWith(`${root}${path.sep}`) ? file : null;
  }
  function resourceIdentity(url) {
    return `${url.origin}${url.pathname}${url.search}`;
  }
  async function asset(reference, relativeTo, label, requirePrefix = false) {
    const url = mountedUrl(reference, relativeTo);
    if (!url || (requirePrefix && !reference.startsWith(`${basePath}/`) && !reference.startsWith(`${url.origin}${basePath}/`))) {
      problems.push(`${label}: asset must start with /ui/ or the canonical /ui/ URL: ${reference}`);
      return null;
    }
    const file = exportedFile(url);
    if (!file || !await exists(file)) problems.push(`${label}: missing exported asset ${reference}`);
    return url;
  }

  for (const file of await htmlFiles(root)) {
    const label = path.relative(root, file);
    const pageUrl = `https://cojeev.com${basePath}/${label.replace(/index\.html$/, "")}`;
    const $ = load(await readFile(file, "utf8"));
    const cssFonts = new Set();
    const styles = $("style").toArray().map(element => ({ css: $(element).text(), url: pageUrl }));
    for (const element of $('link[rel="stylesheet"]').toArray()) {
      const reference = $(element).attr("href");
      if (!reference) continue;
      const url = await asset(reference, pageUrl, `${label} stylesheet`);
      const cssFile = url && exportedFile(url);
      if (cssFile && await exists(cssFile)) styles.push({ css: await readFile(cssFile, "utf8"), url: url.href });
    }
    for (const style of styles) {
      for (const match of style.css.matchAll(/url\(\s*["']?([^"'\s)]+)["']?\s*\)/g)) {
        if (!/\.woff2?(?:[?#]|$)/i.test(match[1])) continue;
        const url = await asset(match[1], style.url, `${label} CSS font`);
        if (url) cssFonts.add(resourceIdentity(url));
      }
    }
    for (const element of $('link[rel="preload"][as="font"]').toArray()) {
      const reference = $(element).attr("href") ?? "";
      const url = await asset(reference, pageUrl, `${label} font preload`);
      if (url && !cssFonts.has(resourceIdentity(url))) problems.push(`${label}: font preload does not match a loaded CSS font resource: ${reference}`);
    }
    for (const element of $("[href], [src], [srcset], meta[content]").toArray()) {
      const references = ["href", "src", "content"].map(attribute => $(element).attr(attribute));
      const srcset = $(element).attr("srcset");
      if (srcset) references.push(...srcset.split(",").map(candidate => candidate.trim().split(/\s+/)[0]));
      for (const reference of references) {
        if (reference && /(?:(?:^|\/)brand\/|(?:^|\/)(?:icon|opengraph-image|twitter-image)\.png(?:[?#]|$)|000h-sculpture[^/]*\.(?:webp|png))/i.test(reference)) {
          await asset(reference, pageUrl, label, true);
        }
      }
    }
  }
  return [...new Set(problems)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--dir" || !args[1]) {
    console.error("Use: node scripts/check-ui-export.mjs --dir out");
    process.exitCode = 1;
  } else {
    const problems = await checkUiExport(args[1], "/ui");
    if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; }
    else console.log(`PASS: ${args[1]} is an unwrapped /ui export with matching fonts and resolved brand/metadata assets.`);
  }
}
