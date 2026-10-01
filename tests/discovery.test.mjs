import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/check-discovery.mjs', import.meta.url));

function runCli(args, fetchSource) {
  const preload = `data:text/javascript,${encodeURIComponent(`globalThis.fetch = ${fetchSource};`)}`;
  return run(process.execPath, ['--import', preload, script, ...args]);
}

test('apex_robots_adds_only_ui_sitemap_line', async () => {
  const { robotsProblems } = await import('../scripts/check-discovery.mjs');
  const sitemap = 'Sitemap: https://cojeev.com/ui/sitemap.xml\n';
  const before = 'User-agent: *\nDisallow: /private/\n';
  assert.deepEqual(robotsProblems(before, before + sitemap), []);
  assert.deepEqual(robotsProblems('User-agent: *', 'User-agent: *\n' + sitemap), []);
  assert.deepEqual(robotsProblems('', sitemap), []);

  for (const [label, original, after] of [
    ['two sitemaps', before, before + sitemap + 'Sitemap: https://cojeev.com/sitemap.xml\n'],
    ['preexisting sitemap', 'Sitemap: https://cojeev.com/sitemap.xml\n', 'Sitemap: https://cojeev.com/sitemap.xml\n' + sitemap],
    ['changed existing line', before, 'User-agent: *\nDisallow: /other/\n' + sitemap],
    ['missing sitemap', before, before],
    ['missing trailing newline', '', sitemap.trimEnd()],
    ['extra content with absent robots', '', '\n' + sitemap],
    ['blocked ui prefix', 'User-agent: *\nDisallow: /ui\n', 'User-agent: *\nDisallow: /ui\n' + sitemap],
    ['blocked root', 'User-agent: *\nDisallow: /\n', 'User-agent: *\nDisallow: /\n' + sitemap],
    ['blocked wildcard', 'User-agent: *\nDisallow: /*ui/*\n', 'User-agent: *\nDisallow: /*ui/*\n' + sitemap],
    ['multiple agents', 'User-agent: crawler\nUser-agent: *\nDisallow: /ui/\n', 'User-agent: crawler\nUser-agent: *\nDisallow: /ui/\n' + sitemap],
    ['case and comment', 'user-agent: *\ndisallow: /ui/ # private\n', 'user-agent: *\ndisallow: /ui/ # private\n' + sitemap],
  ]) {
    assert.ok(robotsProblems(original, after).length > 0, label);
  }
  for (const allowed of [
    'User-agent: crawler\nDisallow: /ui/\n',
    'User-agent: *\nDisallow:\n',
    'User-agent: *\nDisallow: /uikit/\n',
    'User-agent: *\nDisallow: /ui$\n',
    'User-agent: *\nDisallow: /private/\n\nUser-agent: crawler\nDisallow: /ui/\n',
  ]) assert.deepEqual(robotsProblems(allowed, allowed + sitemap), [], allowed);

  const directory = await mkdtemp(join(tmpdir(), 'cojeev-discovery-'));
  try {
    const file = join(directory, 'before.txt');
    await writeFile(file, before);
    const fetchSource = `async url => {
      if (url !== 'https://cojeev.com/robots.txt') throw new Error('wrong apex URL');
      return new Response(${JSON.stringify(before + sitemap)});
    }`;
    assert.match((await runCli(['robots', file], fetchSource)).stdout, /discovery.*passed/i);
    await assert.rejects(runCli(['robots', file], `async () => new Response(${JSON.stringify(before)})`), error => error.code === 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('apex_robots_rejects_cr_delimited_ui_disallow', async () => {
  const { robotsProblems } = await import('../scripts/check-discovery.mjs');
  const sitemap = 'Sitemap: https://cojeev.com/ui/sitemap.xml\n';
  for (const newline of ['\r', '\n', '\r\n']) {
    const before = `User-agent: *${newline}Disallow: /ui/${newline}`;
    const after = before + (before.endsWith('\n') ? '' : '\n') + sitemap;
    assert.match(robotsProblems(before, after).join('\n'), /blocks \/ui\//, JSON.stringify(newline));
  }

  const before = 'User-agent: *\rDisallow: /private/\r';
  assert.deepEqual(robotsProblems(before, before + '\n' + sitemap), []);
  assert.match(
    robotsProblems(before, 'User-agent: *\nDisallow: /private/\n' + sitemap).join('\n'),
    /append only the approved UI Sitemap line/,
  );
});

test('apex_robots_extension_records_preserve_user_agent_groups', async () => {
  const { robotsProblems } = await import('../scripts/check-discovery.mjs');
  const sitemap = 'Sitemap: https://cojeev.com/ui/sitemap.xml\n';
  for (const extension of ['Crawl-delay: 10', 'X-Extension: value']) {
    const before = `User-agent: *\n${extension}\nUser-agent: ExampleBot\nDisallow: /ui/\n`;
    assert.match(robotsProblems(before, before + sitemap).join('\n'), /blocks \/ui\//, extension);

    for (const rule of ['Allow: /private/', 'Disallow: /private/', 'Disallow:']) {
      const separateGroups = `User-agent: *\n${rule}\n${extension}\nUser-agent: ExampleBot\nDisallow: /ui/\n`;
      assert.deepEqual(robotsProblems(separateGroups, separateGroups + sitemap), [], rule);
    }
  }
});

test('shadcn_directory_template_fetches_live_json', async () => {
  const { shadcnTemplateProblems } = await import('../scripts/check-discovery.mjs');
  const template = 'https://cojeev.com/ui/r/{name}.json';
  const names = ['button', 'cojeev', 'bento-builder'];
  const schema = 'https://ui.shadcn.com/schema/registry-item.json';
  const calls = [];
  const problems = await shadcnTemplateProblems(template, names, async (url, options) => {
    calls.push([url, options]);
    return Response.json({ name: url.split('/').at(-1).replace('.json', ''), $schema: schema });
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(calls, [
    ['https://cojeev.com/ui/r/button.json', { method: 'GET', redirect: 'error' }],
    ['https://cojeev.com/ui/r/cojeev.json', { method: 'GET', redirect: 'error' }],
    ['https://cojeev.com/ui/r/bento-builder.json', { method: 'GET', redirect: 'error' }],
  ]);

  for (const [label, response] of [
    ['301', new Response('', { status: 301, headers: { location: 'https://000h.cojeev.com/r/button.json' } })],
    ['HTML', new Response('<html></html>', { headers: { 'content-type': 'text/html' } })],
    ['wrong name', Response.json({ name: 'badge', $schema: schema })],
    ['invalid JSON', new Response('{', { headers: { 'content-type': 'application/json' } })],
    ['changed schema', Response.json({ name: 'button', $schema: 'https://cojeev.com/ui/schema.json' })],
    ['missing schema', Response.json({ name: 'button' })],
    ['null payload', Response.json(null)],
  ]) {
    assert.ok((await shadcnTemplateProblems(template, ['button'], async () => response)).length > 0, label);
  }
  assert.ok((await shadcnTemplateProblems(template, ['button'], async () => { throw new Error('network unavailable'); })).length > 0);

  const fetchSource = `async (url, options) => {
    if (options.method !== 'GET' || options.redirect !== 'error') throw new Error('wrong request options');
    if (!/^https:\\/\\/cojeev\\.com\\/ui\\/r\\/(button|cojeev|bento-builder)\\.json$/.test(url)) throw new Error('wrong template URL');
    return Response.json({ name: url.split('/').at(-1).replace('.json', ''), $schema: '${schema}' });
  }`;
  assert.match((await runCli(['shadcn-template', template, names.join(',')], fetchSource)).stdout, /discovery.*passed/i);
  await assert.rejects(runCli(['shadcn-template', template, names.join(',')], 'async () => new Response("", { status: 301 })'), error => error.code === 1);
});
