import {readdir} from 'node:fs/promises';
import {join} from 'node:path';

export const FIXED_WORKER_FIRST = Object.freeze([
  '/*', '!/_next/*', '!/ui/_next/*', '!/ui/*.txt', '!/ui/brand/*',
  '!/ui/icon.png', '!/ui/opengraph-image.png', '!/ui/twitter-image.png',
]);
export const CODE_PROBES = Object.freeze([
  '/ui', '/ui.txt', '/uikit', '/uikit.txt', '/ui-other.txt', '/uikit/a.txt',
  '/', '/index.html', '/404.html', '/docs/button/', '/docs/button/index.html',
  '/ui/', '/ui/docs/button/', '/ui/docs/button/index.html',
  '/r/button.json', '/ui/r/button.json', '/health', '/ui/health', '/release.json', '/ui/release.json',
  '/media/a.txt', '/backups/a.txt', '/private/a.txt', '/v1/a.txt', '/ui/media/', '/ui/v1',
]);
const codePointOrder = (a, b) => {
  const left = Array.from(a, c => c.codePointAt(0)), right = Array.from(b, c => c.codePointAt(0));
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
};
async function containsText(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.isFile() && entry.name.endsWith('.txt')) return true;
    if (entry.isDirectory() && await containsText(join(directory, entry.name))) return true;
  }
  return false;
}
export async function retainedTextInventory(siteRoot) {
  const rootFiles = [], directories = [];
  for (const entry of await readdir(siteRoot, {withFileTypes: true})) {
    if (entry.isFile() && entry.name.endsWith('.txt')) rootFiles.push(`/${entry.name}`);
    if (entry.isDirectory() && !['ui', '_next', 'r'].includes(entry.name) && await containsText(join(siteRoot, entry.name))) directories.push(entry.name);
  }
  return {rootFiles: rootFiles.sort(codePointOrder), directories: directories.sort(codePointOrder)};
}
const forms = name => {
  const encoded = encodeURIComponent(name);
  return encoded === name ? [name] : [name, encoded];
};
export function workerFirstList({rootFiles, directories}) {
  return [...FIXED_WORKER_FIRST,
    ...[...new Set(rootFiles)].sort(codePointOrder).flatMap(file => forms(file.slice(1)).map(name => `!/${name}`)),
    ...[...new Set(directories)].sort(codePointOrder).flatMap(dir => forms(dir).map(name => `!/${name}/*.txt`)),
  ];
}
/** Cloudflare's wildcard includes slashes; callers strip a leading exclusion marker. */
export function ruleMatches(rule, pathname) {
  return new RegExp(`^${rule.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(pathname);
}
export function workerFirstProblems(list, inventory) {
  const problems = [];
  FIXED_WORKER_FIRST.forEach((rule, i) => {if (list[i] !== rule) problems.push(`Fixed rule ${i} must be ${rule}`);});
  if (list.length > 100) problems.push(`Too many raw entries: ${list.length} (maximum 100)`);
  const justified = inventory && new Set(workerFirstList(inventory).slice(FIXED_WORKER_FIRST.length));
  for (const rule of list.slice(FIXED_WORKER_FIRST.length)) {
    if (!/^!\/[^/*]+\.txt$/.test(rule) && !/^!\/[^/*]+\/\*\.txt$/.test(rule)) problems.push(`Invalid derived rule: ${rule}`);
    if (/^!\/ui[^/]/.test(rule)) problems.push(`Derived exclusion covers a /ui sibling: ${rule}`);
    if (justified && !justified.has(rule)) problems.push(`Inventory does not justify: ${rule}`);
  }
  for (const rule of list.filter(rule => rule.startsWith('!'))) {
    const path = CODE_PROBES.find(path => ruleMatches(rule.slice(1), path));
    if (path) problems.push(`Exclusion ${rule} matches code probe ${path}`);
  }
  return problems;
}
