import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sitemapLine = 'Sitemap: https://cojeev.com/ui/sitemap.xml\n';
const itemSchema = 'https://ui.shadcn.com/schema/registry-item.json';

/** Check that the apex robots transition changes only the approved Sitemap. */
export function robotsProblems(before, after) {
  const problems = [];
  const prefix = before && !before.endsWith('\n') ? `${before}\n` : before;
  if (after !== prefix + sitemapLine) problems.push('Apex robots must append only the approved UI Sitemap line.');

  const lines = after.split(/\r?\n/).map(line => line.split('#')[0].trim());
  if (lines.filter(line => /^sitemap\s*:/i.test(line)).length !== 1) {
    problems.push('Apex robots must contain exactly one Sitemap line.');
  }

  let agents = [];
  let hasRules = false;
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (field === 'user-agent') {
      if (hasRules) agents = [];
      agents.push(value);
      hasRules = false;
      continue;
    }
    hasRules = true;
    if (field !== 'disallow' || !value || !agents.includes('*')) continue;
    // Robots paths match a prefix, with '*' wildcards and an optional end '$'.
    const anchored = value.endsWith('$');
    const path = anchored ? value.slice(0, -1) : value;
    const pattern = path.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    if (new RegExp(`^${pattern}${anchored ? '$' : ''}`).test('/ui/')) {
      problems.push(`Apex robots blocks /ui/ for User-agent: * (Disallow: ${value}).`);
    }
  }
  return problems;
}

/** Require direct JSON registry items, keeping shadcn's item schema unchanged. */
export async function shadcnTemplateProblems(template, names, fetcher = fetch) {
  const problems = [];
  for (const name of names) {
    const url = template.replaceAll('{name}', name);
    try {
      const response = await fetcher(url, { method: 'GET', redirect: 'error' });
      if (response.status !== 200) {
        problems.push(`${name}: expected HTTP 200, received ${response.status}.`);
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!/^application\/(?:json|[\w.-]+\+json)(?:\s*;|\s*$)/i.test(contentType)) {
        problems.push(`${name}: expected a JSON content type, received ${contentType || 'none'}.`);
        continue;
      }
      const item = await response.json();
      if (item?.name !== name) problems.push(`${name}: registry item name does not match.`);
      if (item?.$schema !== itemSchema) problems.push(`${name}: registry item $schema changed.`);
    } catch (error) {
      problems.push(`${name}: could not fetch or parse registry JSON (${error.message}).`);
    }
  }
  return problems;
}

async function main(args) {
  const [mode, input, names] = args;
  let problems;
  if (mode === 'robots' && input && args.length === 2) {
    const before = await readFile(input, 'utf8');
    const response = await fetch('https://cojeev.com/robots.txt', { method: 'GET', redirect: 'error' });
    if (response.status !== 200) throw new Error(`Apex robots returned HTTP ${response.status}.`);
    problems = robotsProblems(before, await response.text());
  } else if (mode === 'shadcn-template' && input?.includes('{name}') && names && args.length === 3) {
    problems = await shadcnTemplateProblems(input, names.split(','));
  } else {
    throw new Error('Usage: node scripts/check-discovery.mjs robots BEFORE_FILE | shadcn-template TEMPLATE NAME,NAME');
  }
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exitCode = 1;
  } else {
    console.log(`Discovery check passed (${mode}).`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
