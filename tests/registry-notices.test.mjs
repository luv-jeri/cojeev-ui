/**
 * Licence notices have to survive a real installation, not just appear in the
 * payload JSON. The shadcn CLI re-prints TypeScript sources and drops the
 * comment a file opens with, so these tests install with the real CLI and read
 * what a consumer actually ends up holding.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { leadingNotice, noticeText } from '../scripts/registry-notices.mjs';

const installer = 'node_modules/shadcn/dist/index.js';
const noticeFile = 'src/lib/cojeev/NOTICES.txt';

async function payloads() {
  const items = new Map();
  for (const file of await fs.readdir('public/r')) {
    if (!/^[a-z0-9-]+\.json$/.test(file)) continue;
    const item = JSON.parse(await fs.readFile(path.join('public/r', file), 'utf8'));
    if (!Array.isArray(item.items)) items.set(file.replace(/\.json$/, ''), item);
  }
  return items;
}

/** Serve the built payloads on loopback, with every dependency URL pointing back at this server. */
async function serve(items) {
  const served = new Map([...items].map(([name, item]) => [name, structuredClone(item)]));
  const site = createServer((request, response) => {
    const name = request.url?.match(/^\/r\/([a-z0-9-]+)\.json$/)?.[1];
    if (!served.has(name)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(served.get(name)));
  });
  await new Promise(resolve => site.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${site.address().port}`;
  for (const item of served.values()) {
    if (item.registryDependencies) item.registryDependencies = item.registryDependencies.map(value => `${origin}/r/${value.split('/').at(-1)}`);
    if (item.config?.registries?.['@cojeev']) item.config.registries['@cojeev'] = `${origin}/r/{name}.json`;
  }
  return { origin, close: () => new Promise(resolve => site.close(resolve)) };
}

/** Names an entry pulls in, itself included. */
function closure(items, name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const value of items.get(name)?.registryDependencies ?? []) closure(items, value.split('/').at(-1).replace(/\.json$/, ''), seen);
  return seen;
}

/** A consumer that already declares the packages, so installation needs no package network. */
async function consumer(items, names) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cojeev-notices-'));
  const dependencies = {};
  for (const name of names) for (const value of items.get(name)?.dependencies ?? []) dependencies[value.replace(/(?!^)@[^@]*$/, '')] = '*';
  await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: 'notices-consumer', private: true, version: '0.0.0', type: 'module', dependencies }, null, 2));
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } } }, null, 2));
  await fs.writeFile(path.join(directory, 'components.json'), JSON.stringify({
    $schema: 'https://ui.shadcn.com/schema.json', style: 'new-york', rsc: false, tsx: true,
    tailwind: { config: '', css: 'src/index.css', baseColor: 'neutral', cssVariables: true }, iconLibrary: 'lucide',
    aliases: { components: '@/components', utils: '@/lib/utils', ui: '@/components/ui', lib: '@/lib', hooks: '@/hooks' },
  }, null, 2));
  await fs.mkdir(path.join(directory, 'src'), { recursive: true });
  await fs.writeFile(path.join(directory, 'src/index.css'), '@import "tailwindcss";\n');
  return directory;
}

test('a component installed by the real CLI carries the project licence and the upstream notices its sources lose', async () => {
  const items = await payloads();
  const { origin, close } = await serve(items);
  const directory = await consumer(items, closure(items, 'motion-drawer'));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [installer, 'add', `${origin}/r/motion-drawer.json`, '--yes', '--overwrite', '--silent', '--cwd', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.once('error', reject);
      child.once('close', code => resolve({ code, output }));
    });
    assert.equal(result.code, 0, result.output);
    const installed = await fs.readFile(path.join(directory, noticeFile), 'utf8');

    assert.ok(installed.includes((await fs.readFile('LICENCE', 'utf8')).trim()), 'the project MIT licence must be installed verbatim');

    // The installer really does drop these: each holder opens a file it copies,
    // and after installation only the notices file still carries it.
    for (const [source, target, holder] of [
      ['registry/cojeev/lib/bloom-engine.ts', 'src/lib/cojeev/bloom-engine.ts', 'Copyright (c) 2026 Meng To'],
      ['registry/cojeev/lib/lucide-icon-data.ts', 'src/lib/cojeev/lucide-icon-data.ts', 'Copyright (c) 2013-2026 Cole Bemis'],
    ]) {
      assert.ok((await fs.readFile(source, 'utf8')).includes(holder), `${source} no longer carries ${holder}`);
      assert.ok(!(await fs.readFile(path.join(directory, target), 'utf8')).includes(holder), `${target} kept its own notice; the notices file no longer has to repeat it`);
      assert.ok(installed.includes(holder), `installed notices omit ${holder} from ${source}`);
    }

    // A notice after the directive prologue survives the rewrite in place.
    assert.ok((await fs.readFile(path.join(directory, 'src/components/ui/motion-drawer.tsx'), 'utf8')).includes('Copyright (c) 2024 UI LAYOUT'), 'the installed component lost its upstream attribution');
  } finally {
    await close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('every entry installs the foundation that carries the notices, and nothing else claims its target', async () => {
  const items = await payloads();
  const notice = items.get('cojeev').files.find(file => file.target?.endsWith('NOTICES.txt'));
  assert.ok(notice, 'the foundation item must ship a notices file');
  for (const [name, item] of items) {
    assert.ok(closure(items, name).has('cojeev'), `${name} does not install the foundation, so it would ship without notices`);
    for (const file of item.files ?? []) if (name !== 'cojeev') assert.notEqual(file.target, notice.target, `${name} would overwrite the notices file`);
  }
});

test('the committed notices match the current sources', async () => {
  const sources = [];
  for (const folder of ['registry/cojeev/lib', 'registry/cojeev/motion', 'registry/cojeev/ui']) {
    for (const name of (await fs.readdir(folder)).sort()) if (/\.tsx?$/.test(name)) sources.push(path.join(folder, name));
  }
  const expected = noticeText(await fs.readFile('LICENCE', 'utf8'), await Promise.all(sources.map(async file => [file, await fs.readFile(file, 'utf8')])));
  assert.equal(await fs.readFile('registry/cojeev/NOTICES.txt', 'utf8'), expected, 'run npm run registry:build: the notices no longer match the sources');
});

test('files sharing one notice are listed together instead of repeating it', () => {
  const notice = '/* Copyright (c) 2024 Someone */';
  const text = noticeText('MIT\n', [['a.ts', `${notice}\nexport const a = 1;\n`], ['b.ts', `${notice}\nexport const b = 2;\n`], ['c.ts', 'export const c = 3;\n']]);
  assert.equal(text.split('Copyright (c) 2024 Someone').length - 1, 1);
  assert.match(text, /Retained from a\.ts, b\.ts:/);
  assert.doesNotMatch(text, /c\.ts/);
});

test('only a notice the installer drops is collected', () => {
  assert.equal(leadingNotice('// generated\n/*\nCopyright (c) 2024 Someone\n*/\nexport const a = 1;\n'), '// generated\n/*\nCopyright (c) 2024 Someone\n*/');
  // Kept in place by the installer, so repeating it would be redundant.
  assert.equal(leadingNotice('"use client";\n/* Copyright (c) 2024 Someone */\nexport const a = 1;\n'), undefined);
  assert.equal(leadingNotice('/** Palette roles are computed in sRGB. */\nexport const a = 1;\n'), undefined);
  assert.equal(leadingNotice('export const a = 1;\n/* Copyright (c) 2024 Someone */\n'), undefined);
});
