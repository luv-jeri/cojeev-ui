import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawn} from 'node:child_process';
import {buildVariants} from '../scripts/release.mjs';
import {checkArtifactCsp, packagedWorker} from '../scripts/release-csp.mjs';
import {manifestDigest} from '../scripts/release-manifest.mjs';
import {startAssetRouter} from '../scripts/asset-router-harness.mjs';

const repository=path.resolve(import.meta.dirname,'..');
const homepage=path.join(repository,'workers/registry-host/test/fixtures/homepage');
let temporary, variants, commit;
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
async function write(root,file,bytes) {
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.writeFile(path.join(root,file),bytes);
}
async function cli(script,args) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(repository,'scripts',script),...args],{env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
    let output='';
    child.stdout.on('data',chunk=>{output+=chunk;}); child.stderr.on('data',chunk=>{output+=chunk;});
    child.on('error',reject); child.on('exit',code=>resolve({code,output}));
  });
}
before(async()=>{
  temporary=await fs.mkdtemp(path.join(os.tmpdir(),'packaged-gates-'));
  const root=path.join(temporary,'source');
  await fs.mkdir(root);
  await write(root,'.gitignore','node_modules/\n');
  await write(root,'node_modules/wrangler/package.json','{"version":"4.130.0"}');
  await write(root,'scripts/release-baseline.json',await fs.readFile(path.join(repository,'tests/fixtures/release-baseline/release-baseline.json')));
  await write(root,'package.json',JSON.stringify({scripts:{build:'node export.mjs'}}));
  await write(root,'export.mjs',`import fs from 'node:fs/promises';
await fs.cp('exports/'+process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT,'out',{recursive:true});`);
  await fs.cp(path.join(repository,'workers/registry-host/src'),path.join(root,'workers/registry-host/src'),{recursive:true});
  for(const worker of ['registry-host','reporting'])
    await write(root,`workers/${worker}/wrangler.jsonc`,await fs.readFile(path.join(repository,`workers/${worker}/wrangler.jsonc`)));
  await write(root,'workers/reporting/src/index.ts','export default {fetch(){return new Response("fixture")}};');
  await write(root,'workers/reporting/migrations/0001_initial.sql','CREATE TABLE fixture(id TEXT);');
  for(const env of ['beta','production']) {
    const base=env==='beta'?'https://beta.000h.cojeev.com/ui':'https://cojeev.com/ui';
    const out=`exports/${env}`;
    const graph=(nodes)=>JSON.stringify({'@context':'https://schema.org','@graph':nodes});
    const html=data=>`<html><script type="application/ld+json">${data}</script><script src="${base}/_next/x.js"></script></html>`;
    await write(root,`${out}/index.html`,html(graph([
      {'@type':'WebSite','@id':base+'/#website',url:base+'/'},
      {'@type':'SoftwareSourceCode','@id':base+'/#library',url:base+'/'},
      {'@type':'Person','@id':base+'/#creator',url:'https://hellosanjay.com'},
    ])));
    await write(root,`${out}/docs/index.html`,html(JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','@id':base+'/docs/#collection',url:base+'/docs/',mainEntity:{'@type':'ItemList',itemListElement:[{url:base+'/docs/button/'}]}})));
    await write(root,`${out}/docs/button/index.html`,html(graph([
      {'@type':'SoftwareSourceCode','@id':base+'/docs/button/#component',url:base+'/docs/button/',mainEntityOfPage:base+'/docs/button/'},
      {'@type':'BreadcrumbList','@id':base+'/docs/button/#breadcrumb',itemListElement:[{item:base+'/docs/'},{item:base+'/docs/button/'}]},
    ])));
    await write(root,`${out}/getting-started/index.html`,html(JSON.stringify({'@context':'https://schema.org','@type':'HowTo','@id':base+'/getting-started/#howto',url:base+'/getting-started/',step:['prepare-your-project','bring-in-a-button','put-it-to-work','find-your-next-piece'].map(id=>({'@type':'HowToStep',url:base+'/getting-started/#'+id}))})));
    await write(root,`${out}/404.html`,'<html>not found</html>');
    await write(root,`${out}/index.txt`,'canonical RSC');
    await write(root,`${out}/docs/button/__next.$d$component.txt`,'encoded canonical RSC');
    await write(root,`${out}/_next/x.js`,'console.log("fixture");');
    await write(root,`${out}/_next/static/chunks/new.js`,'packaged-chunk');
    for(const [name,deps] of [['cojeev',[]],['button',['cojeev']],['bento-grid',['cojeev']],['bento-builder',['bento-grid','button']]])
      await write(root,`${out}/r/${name}.json`,JSON.stringify({name,registryDependencies:deps.map(id=>`${base}/r/${id}.json`),...(name==='cojeev'?{config:{registries:{'@cojeev':`${base}/r/{name}.json`}}}:{})}));
  }
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','--quiet'); git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture');
  commit=git('rev-parse','HEAD');
  const saved={};
  try {
    for(const env of ['beta','production']) {
      const key=`BASELINE_${env.toUpperCase()}_DIRECTORY`; saved[key]=process.env[key];
      process.env[key]=path.join(repository,'tests/fixtures/release-baseline',env);
    }
    variants=await buildVariants(root,commit,path.join(temporary,'variants'),{});
  } finally {
    for(const [key,value] of Object.entries(saved)) {if(value===undefined) delete process.env[key]; else process.env[key]=value;}
  }
});
after(async()=>{await fs.rm(temporary,{recursive:true,force:true});});
async function copyVariant(name,env='production') {
  const directory=path.join(temporary,name);
  await fs.cp(variants[env]['website-regenerated'].directory,directory,{recursive:true});
  return directory;
}

test('csp_gate_resolves_absolute_same_origin_assets',async()=>{
  const directory=await copyVariant('csp');
  const worker=await packagedWorker(directory);
  await checkArtifactCsp(directory,'production',worker);
  await write(directory,'site/ui/index.html','<script src="https://cojeev.com.evil.example/x.js"></script>');
  await assert.rejects(checkArtifactCsp(directory,'production',worker),/cojeev\.com\.evil\.example/);
  await write(directory,'site/ui/index.html','<p>fixture</p>');
  for(const forbidden of ['https://feedback-beta.cojeev.com/path','https://beta.000h.cojeev.com/ui/path']) {
    const permissive={fetch:async(request,env)=>{
      const response=await worker.fetch(request,env),headers=new Headers(response.headers);
      headers.set('content-security-policy',headers.get('content-security-policy').replace("img-src 'self' data: blob:",`img-src 'self' data: blob: ${forbidden}`));
      return new Response(response.body,{status:response.status,headers});
    }};
    await assert.rejects(checkArtifactCsp(directory,'production',permissive),/other environment/);
  }
  const beta=await copyVariant('csp-beta','beta'),betaWorker=await packagedWorker(beta);
  await checkArtifactCsp(beta,'beta',betaWorker);
  for(const forbidden of ['https://000h.cojeev.com/path','https://cojeev.com/ui/path']) {
    const permissive={fetch:async(request,env)=>{
      const response=await betaWorker.fetch(request,env),headers=new Headers(response.headers);
      headers.set('content-security-policy',headers.get('content-security-policy').replace("img-src 'self' data: blob:",`img-src 'self' data: blob: ${forbidden}`));
      return new Response(response.body,{status:response.status,headers});
    }};
    await assert.rejects(checkArtifactCsp(beta,'beta',permissive),/other environment/);
  }
});

for(const [label,mount] of [['old',''],['new','/ui']]) test(`shadcn_${label}_url_installs_foundation_and_composed_item`,async(t)=>{
  const {releaseInstall,verifyInstall}=await import('../scripts/release-install.mjs');
  const artifact=variants.production['website-regenerated'],calls=[];
  const installer=path.join(temporary,`installer-${label}.mjs`);
  // Replace only the expensive external consumer CLI. The gate still constructs
  // its real subprocess arguments and serves both candidate graphs over HTTP.
  await fs.writeFile(installer,`
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const arg=name=>process.argv.find(value=>value.startsWith('--'+name+'=')).slice(name.length+3);
const baseURL=arg('url'),receipt=arg('receipt'),components=arg('components').split(',');
const seen=new Set(),base=new URL(baseURL);
async function install(url) {
  const parsed=new URL(url);
  assert.equal(parsed.origin,base.origin,'registry requests stay disposable');
  assert.ok(parsed.pathname.startsWith(base.pathname.replace(/\\/$/,'')+'/r/'));
  if(seen.has(url)) return; seen.add(url);
  const response=await fetch(url); assert.equal(response.status,200,url);
  const item=await response.json();
  if(item.config?.registries) assert.equal(item.config.registries['@cojeev'],baseURL+'/r/{name}.json');
  for(const dependency of item.registryDependencies??[]) await install(dependency);
}
for(const id of components) await install(baseURL+'/r/'+id+'.json');
await fs.mkdir(path.dirname(receipt),{recursive:true});
await fs.writeFile(receipt,JSON.stringify({build:'PASS',installer:'shadcn@4.21.0',components,baseURL,fetched:[...seen]}));
`);
  t.after(async()=>{for(const call of calls) await fs.rm(call.receipt,{force:true});});
  await releaseInstall('production',commit,artifact.directory,artifact.digest,{verify:async(baseURL,receipt)=>{
    calls.push({baseURL,receipt});
    assert.match(baseURL,/^http:\/\/127\.0\.0\.1:\d+(?:\/ui)?$/);
    return verifyInstall(baseURL,receipt,{run:(command,args,options)=>spawn(command,[installer,...args.slice(1)],options)});
  }});
  assert.equal(calls.length,2);
  assert.equal(new URL(calls[0].baseURL).origin,new URL(calls[1].baseURL).origin);
  assert.deepEqual(calls.map(call=>call.receipt),['legacy','canonical'].map(side=>`artifacts/stranger/production-${commit}-${side}.json`));
  const selected=calls.find(call=>new URL(call.baseURL).pathname===(mount||'/'));
  assert.ok(selected,`installer must run at ${mount||'root'}`);
  const result=await json(selected.receipt);
  assert.deepEqual(result.components,['button','cojeev','bento-builder']);
  assert.deepEqual(result.fetched.map(url=>new URL(url).pathname).sort(),['bento-builder','bento-grid','button','cojeev'].map(id=>`${mount}/r/${id}.json`).sort());
});

test('candidate_dependency_escape_fails_before_installer_runs',async()=>{
  const {releaseInstall}=await import('../scripts/release-install.mjs');
  const directory=await copyVariant('escaped');
  const file=path.join(directory,'site/ui/r/bento-builder.json');
  const item=await json(file); item.registryDependencies=['https://cojeev.com/ui/r/absent.json'];
  await fs.writeFile(file,JSON.stringify(item));
  // Re-sign the fixture so identity verification does not mask dependency validation.
  const manifest=await json(path.join(directory,'manifest.json'));
  const {createHash}=await import('node:crypto');
  manifest.files['site/ui/r/bento-builder.json'].sha256=createHash('sha256').update(await fs.readFile(file)).digest('hex');
  await write(directory,'manifest.json',JSON.stringify(manifest));
  let calls=0;
  await assert.rejects(releaseInstall('production',commit,directory,manifestDigest(manifest),{verify:async()=>{calls++;}}),/escapes candidate/);
  assert.equal(calls,0);
});

test('beta_robots_and_headers_block_indexing',async()=>{
  const directory=variants.beta['website-regenerated'].directory;
  assert.match(await fs.readFile(path.join(directory,'site/_headers'),'utf8'),/^\/\*\n(?:  [^\n]+\n)*  x-robots-tag: noindex/im);
  const router=await startAssetRouter({worker:{kind:'packaged',directory},homepage});
  try {
    const response=await router.fetch('https://beta.000h.cojeev.com/ui/_next/static/chunks/new.js');
    assert.equal(response.status,200); assert.equal(await response.text(),'packaged-chunk');
    assert.match(response.headers.get('x-robots-tag'),/noindex/);
    assert.deepEqual(router.workerRuns(),[],'asset layer serves the chunk');
  } finally {await router.dispose();}
});

test('asset_chain_gate_rejects_escaping_canonical_chain',async()=>{
  const directory=await copyVariant('escaped-chain');
  // This is an actual A14 schema-2 output, including its bundled Worker and config.
  assert.equal((await json(path.join(directory,'manifest.json'))).schema,2);
  for(const environment of ['production','beta']) for(const name of ['website-mounted','website-regenerated','website-redirect']) {
    const artifact=variants[environment][name];
    for(const [script,args] of [['release-csp.mjs',[environment,artifact.directory]],['check-asset-chains.mjs',[artifact.directory]]]) {
      const valid=await cli(script,args);
      assert.equal(valid.code,0,`${environment}/${name}: ${valid.output}`);
    }
  }
  await fs.cp(path.join(directory,'site/ui'),path.join(directory,'site'),{recursive:true});
  await fs.rm(path.join(directory,'site/ui'),{recursive:true});
  const invalid=await cli('check-asset-chains.mjs',[directory]);
  assert.equal(invalid.code,1,invalid.output);
  assert.match(invalid.output,/canonical|mount|RSC/i);
});

test('structured_data_gate_checks_exact_canonical_urls',async()=>{
  const directory=await copyVariant('structured');
  const args=['--dir',path.join(directory,'site/ui'),'--site','https://cojeev.com/ui'];
  const valid=await cli('check-structured-data.mjs',args);
  assert.equal(valid.code,0,valid.output);
  const file=path.join(directory,'site/ui/docs/button/index.html');
  const original=await fs.readFile(file,'utf8');
  await fs.writeFile(file,original.replaceAll('https://cojeev.com/ui/docs/button/','https://cojeev.com/ui/docs/button'));
  const invalid=await cli('check-structured-data.mjs',args);
  assert.equal(invalid.code,1,invalid.output);
  assert.match(invalid.output,/canonical/);
  await fs.writeFile(file,original);
  const index=path.join(directory,'site/ui/docs/index.html');
  await fs.writeFile(index,(await fs.readFile(index,'utf8')).replace('https://cojeev.com/ui/docs/button/','https://cojeevXcom/ui/docs/button/'));
  const disguised=await cli('check-structured-data.mjs',args);
  assert.equal(disguised.code,1,disguised.output);
  assert.match(disguised.output,/canonical/);
  const beta=variants.beta['website-regenerated'].directory;
  const betaResult=await cli('check-structured-data.mjs',['--dir',path.join(beta,'site/ui'),'--site','https://beta.000h.cojeev.com/ui']);
  assert.equal(betaResult.code,0,betaResult.output);
});

test('live_install_uses_both_public_bases_without_rewriting_and_reports_failures',async()=>{
  const {liveInstall}=await import('../scripts/live-install.mjs');
  const calls=[];
  const result=await liveInstall('production',{verify:async(base)=>{calls.push(base);return {installer:'shadcn@4.21.0',build:base.endsWith('/ui')?'FAIL':'PASS'};}});
  assert.deepEqual(calls,['https://000h.cojeev.com','https://cojeev.com/ui']);
  assert.equal(result.ok,false);
  assert.match(result.line,/shadcn@4\.21\.0.*legacy=PASS.*canonical=FAIL/);
});
