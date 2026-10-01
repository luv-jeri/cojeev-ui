import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import host from '../src/index.mjs';
import {siteHeaders} from '../src/headers.mjs';

// Cloudflare's rule: `*` matches any characters, `/` included, and a matching `!` pattern always wins.
const glob=pattern=>new RegExp(`^${pattern.split('*').map(part=>part.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*')}$`);
const runsWorker=(rule,path)=>rule===true||Array.isArray(rule)&&rule.some(p=>!p.startsWith('!')&&glob(p).test(path))&&!rule.some(p=>p.startsWith('!')&&glob(p.slice(1)).test(path));
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));

test('static files skip the Worker so Cloudflare serves them free; pages, registry items and guarded paths still run it',()=>{
  for(const {assets} of [config,config.env.beta,config.env.production]) {
    for(const path of ['/_next/static/chunks/app.js','/_next/static/media/font.woff2','/index.txt','/docs/shape/__next.docs.$d$component.__PAGE__.txt']) assert.equal(runsWorker(assets.run_worker_first,path),false,path);
    for(const path of ['/','/docs/button/','/health','/release.json','/r/button.json','/media/private.png','/v1/admin/reports','/__cojeev_missing_release_probe__/']) assert.equal(runsWorker(assets.run_worker_first,path),true,path);
  }
});

// A `_headers` block is a path pattern followed by indented `name: value` lines.
const rules=text=>text.trim().split(/\n\s*\n/).map(block=>{const [pattern,...lines]=block.split('\n');return [glob(pattern.trim()),lines.map(line=>line.trim().split(/: (.*)/s).slice(0,2))];});
test('files that skip the Worker get exactly the headers the Worker would have added',async()=>{
  for(const environment of ['beta','production']) {
    const file=rules(siteHeaders(environment));
    for(const [path,type] of [['/_next/static/chunks/app.js','text/javascript'],['/docs/__next._tree.txt','text/plain'],['/feedback-admin/__next._tree.txt','text/plain'],['/admin/index.txt','text/plain']]) {
      const worker=await host.fetch(new Request(`https://${environment === 'beta' ? 'beta.000h.cojeev.com' : '000h.cojeev.com'}${path}`),{ENVIRONMENT:environment,RELEASE:'a'.repeat(40),ASSETS:{fetch:async()=>new Response('asset',{headers:{'content-type':type}})}});
      const applied=file.filter(([pattern])=>pattern.test(path)).flatMap(([,headers])=>headers).sort();
      const expected=[...worker.headers].filter(([name])=>name!=='content-type').sort();
      assert.deepEqual(applied,expected,`${environment} ${path}`);
    }
  }
});
test('no missing file is ever cached for long: _headers rules also apply to 404s, and a rollback may revive the file',()=>{
  for(const environment of ['beta','production']) assert.doesNotMatch(siteHeaders(environment),/cache-control|immutable/i,environment);
});
