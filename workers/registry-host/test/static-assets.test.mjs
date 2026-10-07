import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cp, mkdir, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {siteHeaders} from '../src/headers.mjs';
import {ruleMatches, retainedTextInventory, workerFirstList} from '../../../scripts/worker-first.mjs';
import {startAssetRouter} from '../../../scripts/asset-router-harness.mjs';

// Cloudflare's rule: `*` matches any characters, `/` included, and a matching `!` pattern always wins.
const runsWorker=(rule,path)=>rule===true||Array.isArray(rule)&&rule.some(p=>!p.startsWith('!')&&ruleMatches(p,path))&&!rule.some(p=>p.startsWith('!')&&ruleMatches(p.slice(1),path));
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));

test('static files skip the Worker so Cloudflare serves them free; pages, registry items and guarded paths still run it',()=>{
  for(const {assets} of [config,config.env.beta,config.env.production]) {
    for(const path of ['/_next/static/chunks/app.js','/_next/static/media/font.woff2','/index.txt','/docs/shape/__next.docs.$d$component.__PAGE__.txt']) assert.equal(runsWorker(assets.run_worker_first,path),false,path);
    for(const path of ['/','/docs/button/','/health','/release.json','/r/button.json','/media/private.png','/v1/admin/reports','/__cojeev_missing_release_probe__/']) assert.equal(runsWorker(assets.run_worker_first,path),true,path);
  }
});

// Compare every application header, excluding only asset metadata, caching and HTTP transport.
const deliveryHeaders=new Set(['cache-control','cf-cache-status','content-length','content-type','date','etag','mf-content-encoding','transfer-encoding']);
const applicationHeaders=response=>Object.fromEntries([...response.headers].filter(([name])=>!deliveryHeaders.has(name)));
test('files that skip the Worker get exactly the headers the Worker would have added',async()=>{
  for(const environment of ['beta','production']) {
    const site=await mkdtemp(join(tmpdir(),'cojeev-headers-'));
    let router;
    try {
      await cp(new URL('./fixtures/packaged-site/',import.meta.url),site,{recursive:true});
      await writeFile(join(site,'_headers'),siteHeaders(environment));
      for(const dir of ['admin','feedback-admin']) {
        await mkdir(join(site,'ui',dir),{recursive:true});
        await writeFile(join(site,'ui',dir,'index.txt'),'admin RSC\n');
        await writeFile(join(site,'ui',dir,'index.html'),'<h1>Admin</h1>\n');
      }
      router=await startAssetRouter({worker:{kind:'source',site,workerFirst:workerFirstList(await retainedTextInventory(site)),environment,migrationStage:'redirect'},homepage:new URL('./fixtures/homepage/',import.meta.url).pathname});
      for(const [path,body] of [['/ui/_next/static/chunks/new.js','// canonical chunk\n'],['/ui/docs/button/index.txt','canonical Button RSC\n'],['/ui/feedback-admin/index.txt','admin RSC\n'],['/ui/admin/index.txt','admin RSC\n']]) {
        const origin=`https://${environment==='beta'?'beta.000h.cojeev.com':'cojeev.com'}`;
        const workerPath=path.includes('/admin/')?'/ui/admin/':path.includes('/feedback-admin/')?'/ui/feedback-admin/':'/ui/';
        router.reset();
        const workerResponse=await router.fetch(`${origin}${workerPath}`);
        assert.equal(workerResponse.status,200);
        assert.deepEqual(router.workerRuns(),[workerPath],`${environment} Worker header reference`);
        await workerResponse.arrayBuffer();
        router.reset();
        const response=await router.fetch(`${origin}${path}`);
        assert.equal(response.status,200);assert.equal(await response.text(),body);
        assert.deepEqual(router.workerRuns(),[],path);
        assert.deepEqual(applicationHeaders(response),applicationHeaders(workerResponse),`${environment} ${path} application-header parity`);
        assert.equal(response.headers.has('x-robots-tag'),environment==='beta'||path.includes('/admin/')||path.includes('/feedback-admin/'));
      }
    } finally {await router?.dispose();await rm(site,{recursive:true,force:true});}
  }
});
test('no missing file is ever cached for long: _headers rules also apply to 404s, and a rollback may revive the file',()=>{
  for(const environment of ['beta','production']) assert.doesNotMatch(siteHeaders(environment),/cache-control|immutable/i,environment);
});
