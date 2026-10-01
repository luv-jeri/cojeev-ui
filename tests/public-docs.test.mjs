import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = ['README.md', 'docs/README.md', 'docs/guides/INSTALLATION.md', 'CONTRIBUTING.md'];
const migration = 'The site moved to cojeev.com/ui. Saved drafts and browser preferences from 000h.cojeev.com do not transfer. Keep your downloaded report receipts.';
const legacy = 'The legacy registry at `https://000h.cojeev.com/r/<name>.json` keeps working.';

test('public_docs_advertise_new_urls_and_explain_legacy_support', async () => {
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(!text.includes('luv-jeri.github.io/cojeev-ui/r/'), `${file}: obsolete install URL`);
    for (const command of text.matchAll(/npx shadcn[^\n]*/g)) {
      for (const [url] of command[0].matchAll(/https?:\/\/[^\s`]+/g)) {
        assert.ok(url.startsWith('https://cojeev.com/ui/r/'), `${file}: ${url}`);
      }
    }
    if (/npx shadcn/.test(text)) assert.ok(text.includes(legacy), `${file}: explain legacy installs`);
    if (file === 'README.md') {
      assert.ok(text.includes('npx shadcn@latest add https://cojeev.com/ui/r/button.json'));
      for (const path of ['', 'docs/', 'work-with-me/', 'docs/slider/', 'docs/motion-drawer/', 'docs/bento-grid/', 'docs/command/']) {
        assert.ok(text.includes(`](https://cojeev.com/ui/${path})`), `README.md: canonical ${path}`);
      }
    }
    if (file === 'docs/README.md') assert.ok(text.includes('](https://cojeev.com/ui/docs/)'));
    if (file === 'docs/guides/INSTALLATION.md') {
      assert.ok(text.includes(migration), 'verbatim migration notice');
      assert.ok(text.includes('"@cojeev": "https://cojeev.com/ui/r/{name}.json"'));
      assert.ok(text.includes('npx shadcn@latest add https://cojeev.com/ui/r/cojeev.json --overwrite'));
    }
    if (file === 'CONTRIBUTING.md') assert.ok(text.includes('Documentation lives at `/ui/`.'));
  }
});

// Captured from `git show a71c722:<file>` for each of the four docs.
// That baseline has no profile or ui.shadcn.com/schema URLs in these files.
const baselineUrls = {
  'README.md': [
    'https://github.com/fuma-nama/fumadocs',
    'https://github.com/luv-jeri/cojeev-ui',
    'https://github.com/shadcn-ui/ui',
  ],
  'docs/README.md': [],
  'docs/guides/INSTALLATION.md': ['http://127.0.0.1:4318'],
  'CONTRIBUTING.md': [],
};

test('repository_schema_and_provider_urls_are_unchanged', async () => {
  for (const [file, urls] of Object.entries(baselineUrls)) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const url of urls) assert.ok(text.includes(url), `${file}: preserve ${url}`);
    if (file === 'README.md') {
      assert.ok(text.includes('[MIT](LICENCE)'));
      assert.ok(text.includes('[SIL Open Font Licences](FONT-NOTICES.md)'));
    }
  }
});
