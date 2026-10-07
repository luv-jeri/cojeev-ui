import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createManifest,manifestDigest} from '../scripts/release-manifest.mjs';
import {liveProblems,TRANSIENT_LIVE_PROBLEMS} from '../scripts/release.mjs';
import {securityHeaders} from '../workers/registry-host/src/headers.mjs';
import {decide} from '../workers/registry-host/src/routing.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const commit='a'.repeat(40),token='fixture-health-token';
const delivery={queue:[],usage:{daily:0,monthly:0},limits:{daily:95,monthly:2850},providers:{email:true,github:true,resendWebhook:true,ownerNotification:true},activationCutoff:1,deploymentIntent:'active'};
const routes=['/','/docs/','/docs/button/','/docs/aspect-ratio/','/getting-started/','/about/','/privacy/','/work-with-me/'];
const legacyRedirects=['/','/about/','/work-with-me/','/requests/','/track/','/feedback-admin/','/docs/button/?utm_source=move&x=a%2Fb','/nope/'];
const robotsBefore='User-agent: *\nAllow: /\n';
const sitemap='Sitemap: https://cojeev.com/ui/sitemap.xml\n';

function fixture(environment='production',stage='additive') {
  const legacy=environment==='production'?'https://000h.cojeev.com':'https://beta.000h.cojeev.com';
  const origin=environment==='production'?'https://cojeev.com':legacy;
  const canonical=origin+'/ui',api=environment==='production'?'https://feedback.cojeev.com':'https://feedback-beta.cojeev.com';
  const files={'site/ui/robots.txt':'User-agent: *','site/ui/docs/button/index.txt':'canonical RSC','site/docs/button/__next.tree.txt':'legacy RSC','site/_next/chunk.js':'chunk','site/r/button.json':'{"name":"button","graph":"old"}','site/ui/r/button.json':'{"name":"button","graph":"new"}','site/r/registry.json':'{"items":[]}','site/ui/r/registry.json':'{"items":[]}'};
  const website={environment,release:commit,commit,side:'website',phase:stage==='redirect'?'redirect':'mounted',migrationStage:stage,registryGraph:stage==='redirect'?'canonical':'baseline'};
  website.deploymentId=`website-${website.phase}-aaaaaaaaaaaa-12345678`;
  website.files=Object.fromEntries(Object.entries(files).map(([file,bytes])=>[file,{sha256:hash(bytes),origin:'build'}]));
  const apiIdentity={environment,release:commit,commit,side:'api',phase:'linked',deploymentId:'api-linked-aaaaaaaaaaaa-12345678',reportingBase:'canonical'};
  const expected={website:{kind:'variant',manifest:website},api:{kind:'variant',manifest:apiIdentity}};
  const responses=new Map(),requests=[];
  const headers={'x-content-type-options':'nosniff',...(environment==='beta'?{'x-robots-tag':'noindex, nofollow'}:{})};
  const put=(url,body='',status=200,extra={},method='GET')=>responses.set(`${method} ${url}`,{body,status,headers:{...headers,...extra}});
  const html=(route)=>{
    const own=route==='/docs/aspect-ratio/'?'/docs/bento-grid/':route==='/work-with-me/'?'/about/':route;
    return `<html><head><link rel="canonical" href="${canonical}${own}"><meta property="og:url" content="${canonical}${own}"><meta property="og:image" content="${canonical}/opengraph-image.png"><meta name="twitter:image" content="${canonical}/twitter-image.png"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage','@id':canonical+own+'#page',url:canonical+own,itemListElement:[{item:canonical+'/docs/'}],author:{'@type':'Person',url:'https://hellosanjay.com/'}})}</script></head><body>Page</body></html>`;
  };
  for(const route of routes) put(canonical+route,html(route),200,{'content-type':'text/html','cache-control':'public, max-age=0, must-revalidate'});
  put(origin+'/ui?x=1','',301,{location:canonical+'/?x=1','cache-control':'no-store'});
  put(canonical+'/__cojeev_missing_release_probe__/','missing',404);
  put(canonical+'/sitemap.xml','<xml/>',200,{'content-type':'application/xml'});
  put(canonical+'/robots.txt','User-agent: *',200,{'content-type':'text/plain'});
  put(canonical+'/opengraph-image.png','png',200,{'content-type':'image/png'});
  put(canonical+'/twitter-image.png','png',200,{'content-type':'image/png'});
  put(canonical+'/track/','<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">',200,{'content-type':'text/html'});
  put(canonical+'/feedback-admin/','<meta name="robots" content="noindex">',200,{'content-type':'text/html'});
  for(const [file,bytes] of Object.entries(files)) {
    const url=(file.startsWith('site/ui/')?origin:legacy)+'/'+file.slice(5);
    put(url,bytes,200,{'content-type':file.endsWith('.json')?'application/json':file.endsWith('.txt')?'text/plain':'text/javascript'});
  }
  put(legacy+'/r/button.json','',200,{'content-type':'application/json'},'HEAD');
  for(const url of [legacy+'/r/cojeev-missing-probe.json',canonical+'/r/cojeev-missing-probe.json',legacy+'/__cojeev_missing__.txt']) put(url,'missing',404);
  if(stage==='redirect') for(const route of legacyRedirects) for(const method of ['GET','HEAD']) put(legacy+route,'',301,{location:canonical+route,'cache-control':'no-store'},method);
  else for(const route of ['/','/docs/button/']) put(legacy+route,'old page',200,{'content-type':'text/html'});
  const baseline={hashes:new Map(Object.entries(files).filter(([file])=>file.startsWith('site/r/')).map(([file,bytes])=>[file,hash(bytes)])),apexProbes:{}};
  if(environment==='production') for(const route of ['/','/robots.txt','/uikit?x=1','/uikit.txt?x=1','/ui-other.txt']) {
    const body=route==='/robots.txt'?robotsBefore:'apex page',status=route==='/'||route==='/robots.txt'?200:404,contentType=route==='/robots.txt'?'text/plain':'text/html';
    baseline.apexProbes[route]={status,contentType,...(route==='/robots.txt'?{robots:'present'}:{sha256:hash(body)})};
    // The delegated apex never inherits registry security headers.
    responses.set('GET '+origin+route,{body,status,headers:{'content-type':contentType}});
  }
  for(const url of [legacy+'/health',canonical+'/health']) put(url,JSON.stringify({status:'ok',...website}),200,{'content-type':'application/json','cache-control':'no-store'});
  put(canonical+'/release.json',JSON.stringify({...website,analyticsEnabled:false}),200,{'content-type':'application/json','cache-control':'no-store'});
  put(api+'/health',JSON.stringify({status:'ok',...apiIdentity,reportingBase:canonical}),200,{'content-type':'application/json'});
  put(api+'/v1/admin/health',JSON.stringify(delivery),200,{'content-type':'application/json'});
  const fetcher=async(input,options={})=>{
    const url=typeof input==='string'?input:input.url,method=options.method??'GET';requests.push({url,method});
    const value=responses.get(`${method} ${url}`);
    if(!value) throw new Error('Unexpected fixture request: '+method+' '+url);
    return new Response(value.body,{status:value.status,headers:value.headers});
  };
  return {environment,legacy,origin,canonical,api,expected,baseline,files,responses,requests,fetcher,put,html};
}
async function problems(f,expected=f.expected) {
  const mod=await import('../scripts/live-contracts.mjs');
  assert.equal(typeof mod.contractProblems,'function','contractProblems must implement the live contracts');
  return mod.contractProblems(f.environment,expected,{fetcher:f.fetcher,baseline:f.baseline,robotsBefore});
}

// An invalid registry probe redirects in the real routing table and cannot verify an absent item.
test('missing_registry_probe_is_valid_and_absent_at_both_mounts',async()=>{
  for(const environment of ['production','beta']) {
    const f=fixture(environment,'redirect');
    const fetcher=async(input,options={})=>{
      const url=new URL(input);
      if(/\/r\/.*missing.*\.json$/.test(url.pathname)) {
        f.requests.push({url:url.href,method:options.method??'GET'});
        const decision=decide(url,options.method??'GET',{ENVIRONMENT:environment,MIGRATION_STAGE:'redirect'});
        return decision.kind==='asset'&&decision.registryName
          ? new Response('absent registry item',{status:404,headers:environment==='beta'?{'x-robots-tag':'noindex, nofollow'}:{}})
          : new Response(null,{status:301,headers:{location:decision.location??f.canonical+'/'}});
      }
      return f.fetcher(input,options);
    };
    const {contractProblems}=await import('../scripts/live-contracts.mjs');
    assert.deepEqual(await contractProblems(environment,f.expected,{fetcher,baseline:f.baseline,robotsBefore}),[]);
    for(const base of [f.legacy,f.canonical])
      assert.ok(f.requests.some(({url})=>url===base+'/r/cojeev-missing-probe.json'));
    assert.ok(f.requests.some(({url})=>url===f.legacy+'/__cojeev_missing__.txt'));
    f.put(f.legacy+'/r/cojeev-missing-probe.json','',301,{location:f.canonical+'/r/cojeev-missing-probe.json'});
    assert.ok((await problems(f)).includes('registry-missing:/r/cojeev-missing-probe.json'));
  }
});

// Comparing peers or trusting a digest header instead of the promoted bytes breaks this invariant.
test('live_registry_hashes_match_promoted_artifact_not_only_each_other',async t=>{
  const f=fixture();assert.deepEqual(await problems(f),[]);
  for(const path of ['/r/button.json','/ui/r/button.json']) f.put((path.startsWith('/ui')?f.origin:f.legacy)+path,'stale',200,{'content-type':'application/json','x-digest':f.expected.website.manifest.files['site'+path].sha256});
  assert.deepEqual(await problems(f),['registry-hash-mismatch:/r/button.json','registry-hash-mismatch:/ui/r/button.json']);
  f.put(f.legacy+'/r/button.json','unexpected HEAD body',200,{},'HEAD');
  assert.ok((await problems(f)).includes('registry-head'));
  const brokenBody=fixture();
  const {contractProblems}=await import('../scripts/live-contracts.mjs');
  const fetcher=async(url,options)=>{
    if(options?.method==='HEAD') return new Response(new ReadableStream({start(controller){controller.error(new Error('private body error'));}}));
    return brokenBody.fetcher(url,options);
  };
  assert.deepEqual(await contractProblems('production',brokenBody.expected,{fetcher,baseline:brokenBody.baseline,robotsBefore}),['registry-head']);
  // Run launch readiness itself: its default must be /ui, and the optional
  // legacy checks must reject a registry redirect independently of canonical.
  const g=fixture(),samples=['button','semantic-bloom','animated-icon','motion-drawer','organism-assembly'];
  const item=name=>({name,files:[{content:'export const Component = {};'}]});
  for(const base of [g.canonical,g.legacy]) {
    g.put(base+'/r/registry.json',JSON.stringify({items:samples.map(name=>({name}))}),200,{'content-type':'application/json'});
    for(const name of samples) g.put(base+'/r/'+name+'.json',JSON.stringify(item(name)),200,{'content-type':'application/json'});
    g.put(base+'/r/000h-readiness-missing.json','missing',404);
  }
  for(const route of ['','docs/','getting-started/','about/','privacy/',...samples.map(name=>'docs/'+name+'/')]) {
    g.put(g.canonical+'/'+route,g.html('/'+route)+'<title>000h</title><h1>Page</h1>',200,{'content-type':'text/html'});
  }
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-launch-cli-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const preload=path.join(directory,'fetch.mjs');
  const prepare=()=>fs.writeFile(preload,`const responses=${JSON.stringify(Object.fromEntries(g.responses))};globalThis.fetch=async(url,options={})=>{const value=responses[(options.method??'GET')+' '+url];if(!value)throw new Error('Unexpected request');return new Response(value.body,{status:value.status,headers:value.headers});};`);
  const script=fileURLToPath(new URL('../scripts/check-launch-readiness.mjs',import.meta.url));
  const run=()=>execFileSync(process.execPath,['--import',preload,script,'--legacy-url='+g.legacy],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  await prepare();assert.match(run(),/Readiness checks passed/);
  g.put(g.legacy+'/r/button.json','',301,{location:g.canonical+'/r/button.json'});await prepare();
  assert.throws(run,error=>{assert.match(error.stderr,/must return HTTP 200/);return true;});
});

// Mixing the two mounts or ignoring the manifest stage breaks these isolated results.
test('live_gate_checks_canonical_and_legacy_contracts_separately',async()=>{
  for(const stage of ['additive','redirect']) {
    const f=fixture('production',stage);assert.deepEqual(await problems(f),[]);
    f.put(f.origin+'/ui?x=1','',308,{location:f.canonical+'/?x=1','cache-control':'no-store'});
    assert.ok((await problems(f)).every(code=>code.startsWith('canonical-')));
    const g=fixture('production',stage);
    if(stage==='redirect') for(const route of legacyRedirects) for(const method of ['GET','HEAD']) g.put(g.legacy+route,'oops',200,{},method);
    else g.put(g.legacy+'/docs/button/','',301,{location:g.canonical+'/docs/button/'});
    const codes=await problems(g);assert.ok(codes.length>0);assert.ok(codes.every(code=>code.startsWith('legacy-')));
    for(const code of codes) assert.ok(!TRANSIENT_LIVE_PROBLEMS.has(code));
  }
});

// Probing /ui for baseline, skipping pinned hashes, or reading baseline artifacts for variants breaks this test.
test('baseline_website_contracts_skip_ui_and_use_pinned_hashes',async t=>{
  const f=fixture('beta');const baselineExpected={...f.expected,website:{kind:'baseline',commit,versionId:'old'}};
  f.put(f.canonical+'/','missing',404);
  assert.deepEqual(await problems(f,baselineExpected),[]);
  assert.ok(f.requests.every(({url})=>!/^\/ui(?:\/|$)/.test(new URL(url).pathname)));
  f.put(f.legacy+'/r/button.json','stale',200,{'content-type':'application/json'});
  assert.deepEqual(await problems(f,baselineExpected),['registry-hash-mismatch:/r/button.json']);

  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-contract-cli-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const artifact=path.join(directory,'baseline'),variant=path.join(directory,'variant');
  await fs.mkdir(path.join(directory,'scripts'),{recursive:true});
  await fs.mkdir(path.join(directory,'docs/reports/2026-10-01-move-baseline'),{recursive:true});
  await fs.writeFile(path.join(directory,'docs/reports/2026-10-01-move-baseline/apex-robots.before.txt'),robotsBefore);
  for(const [file,body] of Object.entries({'site/index.html':'old','site/r/button.json':'{"name":"button"}'})) {
    await fs.mkdir(path.dirname(path.join(artifact,file)),{recursive:true});await fs.writeFile(path.join(artifact,file),body);
  }
  const baselineManifest=await createManifest(artifact,'production',commit);
  await fs.writeFile(path.join(artifact,'manifest.json'),JSON.stringify(baselineManifest));
  const g=fixture();
  const record={commit,runId:'123',digest:manifestDigest(baselineManifest),websiteVersionId:'11111111-1111-4111-8111-111111111111',apiVersionId:'22222222-2222-4222-8222-222222222222',apexProbes:g.baseline.apexProbes};
  await fs.writeFile(path.join(directory,'scripts/release-baseline.json'),JSON.stringify({schema:1,production:record}));
  for(const [file,body] of Object.entries({...g.files,'website/index.js':'export default {}','site/ui/index.html':g.html('/'),'site/ui/release.json':JSON.stringify({...g.expected.website.manifest,analyticsEnabled:false})})) {
    await fs.mkdir(path.dirname(path.join(variant,file)),{recursive:true});await fs.writeFile(path.join(variant,file),body);
  }
  const variantManifest=await createManifest(variant,'production',commit,{side:'website',phase:'mounted',deploymentId:g.expected.website.manifest.deploymentId,migrationStage:'additive',registryGraph:'baseline'});
  await fs.writeFile(path.join(variant,'manifest.json'),JSON.stringify(variantManifest));
  g.put(g.api+'/health',JSON.stringify({environment:'production',release:commit}),200,{'content-type':'application/json'});
  const preload=path.join(directory,'fetch.mjs'),sentinel=path.join(directory,'requests.txt');
  const writePreload=()=>fs.writeFile(preload,`import fs from 'node:fs';const responses=${JSON.stringify(Object.fromEntries(g.responses))};globalThis.fetch=async(url,options={})=>{fs.appendFileSync(${JSON.stringify(sentinel)},url+'\\n');const value=responses[(options.method??'GET')+' '+url];if(!value)throw new Error('Unexpected URL');return new Response(value.body,{status:value.status,headers:value.headers});};`);
  await writePreload();
  const script=fileURLToPath(new URL('../scripts/release.mjs',import.meta.url));
  const run=(website,extra={})=>execFileSync(process.execPath,['--import',preload,script,'live','production','--website='+website,'--api=baseline'],{cwd:directory,env:{PATH:process.env.PATH,HEALTH_TOKEN:token,...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.throws(()=>run('baseline'),error=>{assert.match(error.stderr,/Baseline artifact missing: production/);return true;});
  await assert.rejects(fs.readFile(sentinel),{code:'ENOENT'});
  // No baseline directory exists in this child environment. The record's apex probe is authoritative.
  assert.match(run(variant+':'+manifestDigest(variantManifest)),/^live ok website=website-mounted-/);
  g.put(g.origin+'/uikit?x=1','changed',404,{'content-type':'text/html'});await writePreload();
  assert.throws(()=>run(variant+':'+manifestDigest(variantManifest)),error=>{assert.match(error.stderr,/apex-/);return true;});
  g.put(g.origin+'/uikit?x=1','apex page',404,{'content-type':'text/html'});
  g.put(g.legacy+'/health',JSON.stringify({environment:'production',release:commit}),200,{'content-type':'application/json'});
  g.put(g.legacy+'/r/button.json','{"name":"button"}',200,{'content-type':'application/json'});await writePreload();
  await fs.writeFile(sentinel,'');assert.match(run('baseline',{BASELINE_PRODUCTION_DIRECTORY:artifact}),/^live ok website=baseline:/);
  assert.ok((await fs.readFile(sentinel,'utf8')).split('\n').filter(Boolean).every(url=>!/^\/ui(?:\/|$)/.test(new URL(url).pathname)));
});

// Incorrect alias targets, escaped mounts, missing private metadata or duplicate edge injection break this test.
test('deployed_seo_and_private_pages_match_canonical_metadata',async()=>{
  for(const environment of ['production','beta']) assert.deepEqual(await problems(fixture(environment)),[]);
  const mutations=[
    ['/docs/',f=>f.html('/docs/').replaceAll(f.canonical+'/',f.canonical+'/ui/'),'seo-'],
    ['/docs/button/',f=>f.html('/docs/button/').replaceAll(f.canonical,f.legacy),'seo-'],
    ['/docs/aspect-ratio/',f=>f.html('/docs/aspect-ratio/').replace('/docs/bento-grid/','/docs/aspect-ratio/'),'seo-'],
    ['/about/',f=>f.html('/about/').replace('"item":"'+f.canonical+'/docs/"','"item":"https://000h.cojeev.com/docs/"'),'seo-'],
    ['/track/',()=>'<meta name="robots" content="noindex,nofollow">','private-'],
    ['/feedback-admin/',()=>'<html/>','private-'],
  ];
  for(const [route,body,prefix] of mutations) {const f=fixture();f.put(f.canonical+route,body(f),200,{'content-type':'text/html'});const codes=await problems(f);assert.ok(codes.some(code=>code.startsWith(prefix)),route);}
  const f=fixture();f.put(f.canonical+'/opengraph-image.png','html',200,{'content-type':'text/html'});assert.ok((await problems(f)).some(code=>code.startsWith('seo-')));
  const g=fixture(),beacon='<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
  g.put(g.canonical+'/',g.html('/')+beacon,200,{'content-type':'text/html','cache-control':'public, max-age=0, must-revalidate'});assert.deepEqual(await problems(g),[]);
  g.put(g.canonical+'/',g.html('/')+beacon+beacon,200,{'content-type':'text/html','cache-control':'public, max-age=0, must-revalidate'});assert.deepEqual(await problems(g),['beacon-duplicate']);
  const b=fixture('beta');b.responses.get('GET '+b.canonical+'/robots.txt').headers['x-robots-tag']='';assert.ok((await problems(b)).some(code=>code.startsWith('canonical-')));
});

// Selecting robots.txt, allowing prefix/host crossings, or ignoring RSC bytes breaks this invariant.
test('live_rsc_chains_stay_under_their_own_prefix',async()=>{
  for(const [environment,mount,location] of [
    ['production','canonical','https://cojeev.com/docs/button/index.txt'],
    ['beta','canonical','https://cojeev.com/ui/docs/button/index.txt'],
    ['production','legacy','https://cojeev.com/ui/docs/button/index.txt'],
  ]) {
    const f=fixture(environment),url=mount==='canonical'?f.canonical+'/docs/button/index.txt':f.legacy+'/docs/button/__next.tree.txt';
    f.put(url,'',301,{location});f.put(location,mount==='canonical'?'canonical RSC':'legacy RSC',200,{'content-type':'text/plain'});
    assert.ok((await problems(f)).includes('rsc-'+mount));
  }
  const f=fixture();assert.deepEqual(await problems(f),[]);
  assert.ok(f.requests.some(({url})=>url===f.canonical+'/docs/button/index.txt'));
  f.put(f.canonical+'/docs/button/index.txt','wrong',200,{'content-type':'text/plain'});assert.deepEqual(await problems(f),['rsc-canonical']);
  const g=fixture();g.put(g.legacy+'/docs/button/__next.tree.txt','',301,{location:'/docs/button/__next.final.txt'});g.put(g.legacy+'/docs/button/__next.final.txt','legacy RSC',200,{'content-type':'text/x-component'});assert.deepEqual(await problems(g),[]);
});

// Absent headers and charset parameters must preserve the recorded media type.
test('apex_probe_compares_media_type_and_absent_header',async t=>{
  for(const pathname of ['/robots.txt','/uikit?x=1']) {
    for(const [name,status,recorded,header,passes] of [
      ['absent header',404,'',null,true],
      ['parameterized media type',200,'text/html','text/html; charset=utf-8',true],
      ['wrong media type',200,'text/html','text/plain',false],
    ]) await t.test(pathname+' '+name,async()=>{
      const f=fixture(),response=f.responses.get('GET '+f.origin+pathname);
      const body='apex page';
      f.baseline.apexProbes[pathname]={status,contentType:recorded,
        ...(pathname==='/robots.txt'?{robots:'absent'}:{sha256:hash(body)})};
      // A string Response body adds text/plain automatically; bytes preserve no header.
      response.status=status;response.body=Buffer.from(body);
      if(header===null) delete response.headers['content-type'];
      else response.headers['content-type']=header;
      const code=pathname==='/robots.txt'?'apex-robots':'apex-probe:'+pathname;
      assert.deepEqual(await problems(f),passes?[]:[code]);
    });
  }
});

// Admitting arbitrary robots edits or leaking UI security headers onto siblings breaks these checks.
test('apex_robots_transition_is_accepted_only_as_reviewed',async()=>{
  const f=fixture();assert.deepEqual(await problems(f),[]);
  f.responses.get('GET '+f.origin+'/robots.txt').body=robotsBefore+sitemap;assert.deepEqual(await problems(f),[]);
  assert.deepEqual((await liveProblems('production',{...f.expected,token,fetcher:f.fetcher,baseline:f.baseline,robotsBefore})).problems,[]);
  f.responses.get('GET '+f.origin+'/robots.txt').body=robotsBefore+'Disallow: /ui\n'+sitemap;assert.deepEqual(await problems(f),['apex-robots']);
  assert.deepEqual((await liveProblems('production',{...f.expected,token,fetcher:f.fetcher,baseline:f.baseline,robotsBefore})).problems,['apex-robots']);
  const g=fixture();g.baseline.apexProbes['/robots.txt']={status:404,contentType:'text/html',robots:'absent'};
  g.responses.set('GET '+g.origin+'/robots.txt',{body:'missing',status:404,headers:{'content-type':'text/html'}});assert.deepEqual(await problems(g),[]);
  g.responses.set('GET '+g.origin+'/robots.txt',{body:sitemap,status:200,headers:{'content-type':'text/plain'}});assert.deepEqual(await problems(g),[]);
  g.responses.get('GET '+g.origin+'/uikit?x=1').headers['x-robots-tag']='noindex';assert.ok((await problems(g)).some(code=>code.startsWith('apex-')));
  delete g.responses.get('GET '+g.origin+'/uikit?x=1').headers['x-robots-tag'];
  g.responses.get('GET '+g.origin+'/ui-other.txt').headers['content-security-policy']=securityHeaders('production')['content-security-policy'];
  assert.deepEqual(await problems(g),['apex-probe:/ui-other.txt']);
});

// Real catalogue size and real 20ms timers reproduce the sequential bottleneck.
test('catalogue_contract_check_fits_budget_at_20ms_per_request',async()=>{
  const f=fixture('beta'),names=(await fs.readdir(new URL('../public/r/',import.meta.url))).filter(name=>name.endsWith('.json'));
  assert.ok(names.length>=1877,'use the complete real catalogue');
  const bytes='{"catalogue":"valid"}';
  for(const name of names) for(const mount of ['r/','ui/r/']) {
    f.expected.website.manifest.files['site/'+mount+name]={sha256:hash(bytes),origin:'build'};
    f.put((mount.startsWith('ui/')?f.origin:f.legacy)+'/'+mount+name,bytes,200,{'content-type':'application/json'});
  }
  let active=0,peak=0,calls=0;
  const start=Date.now(),deadline=start+10000;
  const fetcher=async(url,options)=>{
    if(Date.now()>=deadline) throw new Error('Catalogue budget exhausted');
    active++;peak=Math.max(peak,active);calls++;
    try {await new Promise(resolve=>setTimeout(resolve,20));return await f.fetcher(url,options);}
    finally {active--;}
  };
  const {contractProblems}=await import('../scripts/live-contracts.mjs');
  assert.deepEqual(await contractProblems('beta',f.expected,{fetcher,baseline:f.baseline}),[]);
  assert.ok(Date.now()-start<10000);
  assert.ok(peak>1&&peak<=16,`bounded concurrency: ${peak}`);
  assert.ok(calls>=names.length*2);
});
