import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as release from '../scripts/release.mjs';
import {checkHealth} from '../scripts/operations-health.mjs';
import {createManifest,manifestDigest} from '../scripts/release-manifest.mjs';

const commit='a'.repeat(40),apiCommit='b'.repeat(40),token='test-health-token';
const site='https://beta.000h.cojeev.com',api='https://feedback-beta.cojeev.com';
const headers={'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const delivery={queue:[],usage:{daily:0,monthly:0},limits:{daily:95,monthly:2850},providers:{email:true,github:true,resendWebhook:true,ownerNotification:true},activationCutoff:1,deploymentIntent:'active'};
const website={environment:'beta',release:commit,deploymentId:'website-mounted-aaaaaaaaaaaa-12345678',phase:'mounted',migrationStage:'additive',registryGraph:'baseline'};
const apiIdentity={environment:'beta',release:apiCommit,deploymentId:'api-linked-bbbbbbbbbbbb-12345678',phase:'linked',reportingBase:'canonical'};
const rscHash=createHash('sha256').update('RSC').digest('hex');
const files={'site/ui/docs/button/index.txt':{sha256:rscHash,origin:'build'},'site/docs/button/index.txt':{sha256:rscHash,origin:'baseline'},'site/_next/chunk.js':{sha256:createHash('sha256').update('chunk').digest('hex'),origin:'baseline'}};
const expected={website:{kind:'variant',manifest:{...website,commit,side:'website',files}},api:{kind:'variant',manifest:{...apiIdentity,commit:apiCommit,side:'api'}}};
const baseline={kind:'baseline',commit,versionId:'baseline-version'};
function edge({health=website,uiHealth=health,uiRelease={...health,analyticsEnabled:false},apiHealth=apiIdentity,registry,legacyHealth}={}) {
  return async(url,options)=>{
    if(url===`${site}/health`) return legacyHealth?.()??Response.json({status:'ok',...health},{headers});
    if(url===`${site}/ui/health`) return Response.json({status:'ok',...uiHealth},{headers:{...headers,'cache-control':'no-store'}});
    if(url===`${site}/ui/release.json`) return Response.json(uiRelease);
    if(url===`${api}/health`) return Response.json({status:'ok',...apiHealth});
    if(url===`${api}/v1/admin/health`) return Response.json(delivery);
    if(url===`${site}/release.json`) return Response.json({...health,analyticsEnabled:false},{headers});
    if(url===`${site}/r/button.json`) return registry?.()??(options?.method==='HEAD'?new Response(null,{headers}):Response.json({name:'button'},{headers}));
    if(url===`${site}/ui?x=1`) return new Response(null,{status:301,headers:{...headers,location:site+'/ui/?x=1','cache-control':'no-store'}});
    if(url===`${site}/ui/sitemap.xml`) return new Response('<xml/>',{headers:{...headers,'content-type':'application/xml'}});
    if(url===`${site}/ui/robots.txt`) return new Response('User-agent: *',{headers});
    if(url.endsWith('.png')) return new Response('png',{headers:{...headers,'content-type':'image/png'}});
    if(url.endsWith('/index.txt')) return new Response('RSC',{headers:{...headers,'content-type':'text/plain'}});
    if(url===`${site}/_next/chunk.js`) return new Response('chunk',{headers});
    if(url===`${site}/`||url===`${site}/docs/button/`) return new Response('old page',{headers:{...headers,'content-type':'text/html'}});
    if(url.includes('__cojeev_missing')||url.endsWith('/r/cojeev-missing-probe.json')) return new Response('missing',{status:404,headers});
    if(url===`${site}/ui/track/`||url===`${site}/ui/feedback-admin/`) return new Response('<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">',{headers:{...headers,'content-type':'text/html'}});
    if(url.startsWith(site+'/ui/')) {
      const path=new URL(url).pathname.replace('/ui',''),own=path==='/docs/aspect-ratio/'?'/docs/bento-grid/':path==='/work-with-me/'?'/about/':path,canonical=site+'/ui';
      return new Response(`<link rel="canonical" href="${canonical}${own}"><meta property="og:url" content="${canonical}${own}"><meta property="og:image" content="${canonical}/opengraph-image.png"><meta name="twitter:image" content="${canonical}/twitter-image.png">`,{headers:{...headers,'content-type':'text/html','cache-control':'public, max-age=0, must-revalidate'}});
    }
    if(url===`${site}/__cojeev_missing_release_probe__/`) return new Response('missing',{status:404,headers});
    throw new Error(`Unexpected URL: ${url}`);
  };
}
function fakeTime() {
  let now=0;const waits=[];
  return {waited:waits,clock:()=>now,sleep:async ms=>{waits.push(ms);now+=ms;},log:()=>{}};
}

// Accepting a matching commit without checking each endpoint's ID breaks this test.
test('live_gate_rejects_stale_same_sha_variant',async()=>{
  for(const [wanted,fetcher] of [
    [expected,edge({uiHealth:{...website,deploymentId:'website-mounted-aaaaaaaaaaaa-87654321'}})],
    [{...expected,website:baseline},edge()],
  ]) {
    const time=fakeTime();
    await assert.rejects(release.checkLiveRelease('beta',wanted,{...time,token,fetcher}),/after 5 attempts.*stale-identity/);
    assert.deepEqual(time.waited,[4000,8000,12000,16000]);
    assert.ok(time.waited.reduce((a,b)=>a+b,0)<=60000);
  }
});

// Judging routes before all identities match, or treating split edges as ready, breaks this test.
test('split_edge_identity_retries_within_budget',async()=>{
  for(const catchesUp of [true,false]) {
    let attempts=0;const routes=[];const time=fakeTime();
    const fetcher=async(url,options)=>{
      if(url===`${site}/health`&&!routes.length) attempts++;
      if(url===`${site}/ui/`) routes.push(url);
      const health=catchesUp&&attempts>2?website:{...website,deploymentId:'website-mounted-aaaaaaaaaaaa-87654321'};
      return edge({health,uiHealth:website,uiRelease:{...website,analyticsEnabled:false}})(url,options);
    };
    if(catchesUp) {
      assert.deepEqual(await release.checkLiveRelease('beta',expected,{...time,token,fetcher}),[]);
      assert.equal(attempts,3);assert.equal(routes.length,1);
      assert.deepEqual(time.waited,[4000,8000]);
    } else {
      await assert.rejects(release.checkLiveRelease('beta',expected,{...time,token,fetcher}),/stale-identity/);
      assert.equal(routes.length,0);
    }
    assert.ok(time.waited.reduce((a,b)=>a+b,0)<=60000);
  }
  const observed=await release.readIdentities('beta',{fetcher:edge({health:{...website,release:'c'.repeat(40)},uiHealth:website,uiRelease:{...website,analyticsEnabled:false}})});
  assert.deepEqual(release.identityProblems('beta',expected,observed),['release-mismatch','stale-identity']);
});

// Merging endpoints or retrying a malformed identity breaks this test.
test('missing_identity_fails_immediately',async()=>{
  const noId={...website};delete noId.deploymentId;
  const noPhase={...website};delete noPhase.phase;
  const cases=[edge({health:noId}),edge({uiHealth:noId}),edge({uiHealth:noPhase}),
    edge({uiRelease:{...website,analyticsEnabled:false,environment:'production'}}),
    edge({uiRelease:{...website,analyticsEnabled:'false'}}),
    edge({apiHealth:{...apiIdentity,reportingBase:null}})];
  for(const fetcher of cases) {
    const time=fakeTime();
    await assert.rejects(release.checkLiveRelease('beta',expected,{...time,token,fetcher}),/after 1 attempt: identity-malformed/);
    assert.deepEqual(time.waited,[]);
  }
  assert.equal(typeof release.readIdentities,'function');
  const observed=await release.readIdentities('beta',{fetcher:cases[3]});
  assert.equal(observed.website.health.environment,'beta');
  assert.equal(observed.website.uiHealth.environment,'beta');
  assert.equal(observed.website.uiRelease.environment,'production');
  assert.equal(observed.api.health.release,apiCommit);
  const malformedLegacy=await release.readIdentities('beta',{fetcher:edge({health:noPhase,uiHealth:website,uiRelease:{...website,analyticsEnabled:false}})});
  assert.deepEqual(malformedLegacy.website.health,{ok:false,reason:'missing-phase'});
  assert.ok(malformedLegacy.website.uiHealth,'/ui/health is read whenever legacy reports a deployment ID');
  assert.equal(malformedLegacy.website.uiHealth.deploymentId,website.deploymentId);
  for(const [response,reason] of [[()=>new Response('oops',{status:503}),'http-503'],[()=>new Response('oops'),'not-json'],[()=>Response.json({release:commit}),'missing-environment']]) {
    const read=await release.readIdentities('beta',{fetcher:async url=>url===`${site}/health`?response():edge()(url)});
    assert.deepEqual(read.website.health,{ok:false,reason});
    assert.equal(read.website.uiHealth,null);
    assert.equal(read.website.uiRelease,null);
  }
});

// Equating website/API commits or admitting an unlisted phase pair breaks this test.
test('health_checks_independently_expected_api_and_website_identities',async()=>{
  assert.deepEqual((await checkHealth('beta',{token,expected:{websiteId:website.deploymentId,apiId:apiIdentity.deploymentId},fetcher:edge()})).problems,[]);
  for(const [webPhase,apiPhase,want] of [
    ['baseline','baseline',[]],['baseline','prepared',[]],['mounted','prepared',[]],
    ['mounted','linked',[]],['regenerated','linked',[]],['redirect','linked',[]],
    ['redirect','prepared',['unlisted-pair']],['baseline','linked',['unlisted-pair']],
  ]) {
    const health=webPhase==='baseline'?{environment:'beta',release:commit}:{...website,phase:webPhase,deploymentId:`website-${webPhase}-aaaaaaaaaaaa-12345678`,migrationStage:webPhase==='redirect'?'redirect':'additive',registryGraph:webPhase==='mounted'?'baseline':'canonical'};
    const apiHealth=apiPhase==='baseline'?{environment:'beta',release:apiCommit}:{...apiIdentity,phase:apiPhase,deploymentId:`api-${apiPhase}-bbbbbbbbbbbb-12345678`,reportingBase:apiPhase==='prepared'?'legacy':'canonical'};
    assert.deepEqual((await checkHealth('beta',{token,fetcher:edge({health,apiHealth})})).problems,want,`${webPhase}/${apiPhase}`);
  }
  assert.deepEqual((await checkHealth('beta',{token,fetcher:edge({apiHealth:{...apiIdentity,reportingBase:'https://beta.000h.cojeev.com/ui'}})})).problems,[]);
  assert.deepEqual((await checkHealth('beta',{token,expected:{websiteId:'other',apiId:'other'},fetcher:edge()})).problems,['expected-identity-mismatch']);
  assert.deepEqual((await checkHealth('beta',{token,fetcher:edge({uiHealth:{...website,deploymentId:'website-mounted-aaaaaaaaaaaa-87654321'}})})).problems,['website-identity-split']);
  assert.deepEqual((await checkHealth('beta',{token,fetcher:edge({registry:()=>new Response('{}',{headers:{location:'https://cojeev.com/ui/r/button.json'}}),legacyHealth:()=>new Response(null,{status:301,headers:{location:'https://cojeev.com/ui/health'}})})})).problems,['http-health','legacy-health','legacy-registry']);
});

// Skipping digest/schema/side verification makes an untrusted expected identity usable.
test('expected_artifacts_require_verified_schema_and_side',async t=>{
  assert.equal(typeof release.expectedFrom,'function');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-live-identity-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  await fs.mkdir(path.join(dir,'api'));
  await fs.writeFile(path.join(dir,'api/index.js'),'export default {}');
  const manifest=await createManifest(dir,'beta',apiCommit,{side:'api',phase:'linked',deploymentId:apiIdentity.deploymentId,reportingBase:'canonical'});
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
  const argument=`${dir}:${manifestDigest(manifest)}`;
  const wanted=await release.expectedFrom('beta','api',argument);
  assert.deepEqual(wanted,{kind:'variant',manifest});
  assert.equal(release.expectedId(wanted),'api-linked-bbbbbbbbbbbb-12345678');
  assert.equal(release.expectedId(baseline),'baseline:baseline-version');
  await assert.rejects(release.expectedFrom('beta','website',argument),/side/);
  await assert.rejects(release.expectedFrom('production','api',argument),/identity/);
  await assert.rejects(release.expectedFrom('beta','api',`${dir}:${'0'.repeat(64)}`),/digest/);
  await fs.writeFile(path.join(dir,'api/index.js'),'changed');
  await assert.rejects(release.expectedFrom('beta','api',argument),/integrity/);
  await fs.mkdir(path.join(dir,'site'));
  await fs.writeFile(path.join(dir,'site/index.html'),'<html>baseline</html>');
  const unversioned=await createManifest(dir,'beta',apiCommit);
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(unversioned));
  await assert.rejects(release.expectedFrom('beta','api',`${dir}:${manifestDigest(unversioned)}`),/schema 2/);
});

// A legacy /release.json value must not override canonical analytics metadata.
test('variant_analytics_uses_ui_release_and_production_reads_canonical_host',async()=>{
  const fetcher=edge({uiRelease:{...website,analyticsEnabled:true}});
  const result=await release.liveProblems('beta',{...expected,token,expectedAnalyticsEnabled:true,fetcher});
  assert.deepEqual(result.problems,[]);
  assert.equal(result.observed.website.uiRelease.analyticsEnabled,true);
  assert.deepEqual((await release.liveProblems('beta',{...expected,token,expectedAnalyticsEnabled:true,fetcher:edge()})).problems,['analytics-config-mismatch']);
  const raw=await release.readIdentities('beta',{fetcher:edge({apiHealth:{...apiIdentity,reportingBase:'https://beta.000h.cojeev.com/ui'}})});
  assert.equal(raw.api.health.reportingBase,'https://beta.000h.cojeev.com/ui');
  const urls=[];
  await release.readIdentities('production',{fetcher:async url=>{
    urls.push(url);
    return Response.json({... (url.startsWith('https://feedback.cojeev.com')?apiIdentity:website),environment:'production',analyticsEnabled:false});
  }});
  assert.deepEqual(urls,['https://000h.cojeev.com/health','https://cojeev.com/ui/health','https://cojeev.com/ui/release.json','https://feedback.cojeev.com/health']);
});

// Exercise the actual CLI with a temporary pinned record and no network or settings changes.
test('live_and_health_clis_resolve_baselines_and_print_only_fixed_results',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-live-cli-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  await fs.mkdir(path.join(directory,'scripts'));
  const websiteVersionId='11111111-1111-1111-1111-111111111111',apiVersionId='22222222-2222-2222-2222-222222222222';
  const artifact=path.join(directory,'baseline');
  await fs.mkdir(path.join(artifact,'site/r'),{recursive:true});
  await fs.writeFile(path.join(artifact,'site/index.html'),'old page');
  await fs.writeFile(path.join(artifact,'site/r/button.json'),'{"name":"button"}');
  const manifest=await createManifest(artifact,'beta',commit);
  await fs.writeFile(path.join(artifact,'manifest.json'),JSON.stringify(manifest));
  await fs.writeFile(path.join(directory,'scripts/release-baseline.json'),JSON.stringify({schema:1,beta:{commit,runId:'123',digest:manifestDigest(manifest),websiteVersionId,apiVersionId}}));
  const preload=path.join(directory,'fetch.mjs');
  await fs.writeFile(preload,`globalThis.fetch=async(url,options={})=>{
    const headers={'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
    if(url.endsWith('/v1/admin/health')) return Response.json(${JSON.stringify(delivery)});
    if(url.endsWith('/health')) return Response.json({status:'ok',environment:'beta',release:'${commit}'},{headers});
    if(url.endsWith('/release.json')) return Response.json({environment:'beta',release:'${commit}',analyticsEnabled:false},{headers});
    if(url.endsWith('/r/button.json')) return options.method==='HEAD'?new Response(null,{headers}):Response.json({name:'button'},{headers});
    if(url==='${site}/'||url==='${site}/docs/button/') return new Response('old',{headers:{...headers,'content-type':'text/html'}});
    if(url.endsWith('/r/cojeev-missing-probe.json')||url.endsWith('/__cojeev_missing__.txt')) return new Response('missing',{status:404,headers});
    if(url.endsWith('/__cojeev_missing_release_probe__/')) return new Response('missing',{status:404,headers});
    throw new Error('unexpected request');
  };`);
  const releaseScript=fileURLToPath(new URL('../scripts/release.mjs',import.meta.url));
  const healthScript=fileURLToPath(new URL('../scripts/operations-health.mjs',import.meta.url));
  const env={PATH:process.env.PATH,BASELINE_BETA_DIRECTORY:artifact,HEALTH_TOKEN:token,EXPECTED_ANALYTICS_ENABLED:'false'};
  const run=(script,args,extra={})=>execFileSync(process.execPath,['--import',preload,script,...args],{cwd:directory,env:{...env,...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.equal(run(releaseScript,['live','beta','--api=baseline','--website=baseline']),`live ok website=baseline:${websiteVersionId} api=baseline:${apiVersionId}\n`);
  for(const ids of [{},{EXPECTED_WEBSITE_ID:`baseline:${websiteVersionId}`,EXPECTED_API_ID:`baseline:${apiVersionId}`}]) {
    assert.deepEqual(JSON.parse(run(healthScript,['beta'],ids)),{environment:'beta',problems:[]});
  }
  assert.throws(()=>run(healthScript,['beta'],{EXPECTED_API_ID:'different'}),error=>{
    assert.equal(error.status,1);
    assert.deepEqual(JSON.parse(error.stdout),{environment:'beta',problems:['expected-identity-mismatch']});return true;
  });
  assert.throws(()=>run(releaseScript,['live','beta',commit]),error=>{
    assert.equal(error.status,1);assert.match(error.stderr,/--website=/);return true;
  });
});
