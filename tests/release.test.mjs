import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as release from '../scripts/release-manifest.mjs';
import { environmentConfig, buildEnvironment } from '../scripts/release-config.mjs';
import { checkArtifactCsp } from '../scripts/release-csp.mjs';
import host from '../workers/registry-host/src/index.mjs';

test('manifest_schema_2_validates_identity_fields',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-schema-2-'));
  const commit='a'.repeat(40);
  const expected=manifest=>({environment:'production',commit,digest:release.manifestDigest(manifest),schema:2});
  try {
    await fs.mkdir(path.join(dir,'site/ui'),{recursive:true});
    await fs.writeFile(path.join(dir,'site/index.html'),'<html>public</html>');
    await fs.writeFile(path.join(dir,'site/ui/index.html'),'<html>mounted</html>');
    await fs.writeFile(path.join(dir,'site/ui/release.json'),'{}');
    const old=await release.createManifest(dir,'production',commit);
    await release.verifyManifest(dir,old,{...expected(old),schema:undefined});
    await release.verifyManifest(dir,old,{...expected(old),schema:1});
    await assert.rejects(release.verifyManifest(dir,old,expected(old)),{message:'Unversioned artifact: migration artifacts need manifest schema 2'});
    const id={side:'website',phase:'mounted',deploymentId:'website-mounted-aaaaaaaaaaaa-12345678',migrationStage:'additive',registryGraph:'baseline',reportingBase:null};
    const manifest=await release.createManifest(dir,'production',commit,id);
    assert.equal(manifest.schema,2);
    assert.deepEqual(manifest.files['site/ui/index.html'],{sha256:'e36cdbb1fc1b0aa1590be8c1fc861a103e334ce2928c45933953da78bf6c4591',origin:'build'});
    await release.verifyManifest(dir,manifest,expected(manifest));
    await release.verifyManifest(dir,manifest,{...expected(manifest),schema:undefined});
    for(const change of [{migrationStage:'redirect'},{registryGraph:'canonical'},{reportingBase:'legacy'},
      {deploymentId:'malformed'},{deploymentId:'website-redirect-aaaaaaaaaaaa-12345678'},
      {side:'api'},{phase:'unknown'},{baseline:{commit:'bad',digest:'bad'}}]) {
      const invalid={...manifest,...change};
      await assert.rejects(release.verifyManifest(dir,invalid,expected(invalid)),/identity|baseline|phase|deployment/i);
    }
    const unknown={...manifest,schema:3};
    await assert.rejects(release.verifyManifest(dir,unknown,{...expected(unknown),schema:undefined}),/Artifact identity or manifest digest mismatch/);
    await assert.rejects(release.verifyManifest(dir,manifest,{...expected(manifest),schema:1}),/identity/);
    const invalidOrigin=structuredClone(manifest); invalidOrigin.files['site/ui/index.html'].origin='invented';
    await assert.rejects(release.verifyManifest(dir,invalidOrigin,expected(invalidOrigin)),/origin|integrity/i);
    await fs.writeFile(path.join(dir,'site/ui/index.html'),'tampered');
    await assert.rejects(release.verifyManifest(dir,manifest,expected(manifest)),/integrity/i);
    await fs.rm(path.join(dir,'site'),{recursive:true});
    await fs.mkdir(path.join(dir,'api')); await fs.writeFile(path.join(dir,'api/index.js'),'export default {}');
    const api=await release.createManifest(dir,'production',commit,{side:'api',phase:'prepared',deploymentId:'api-prepared-aaaaaaaaaaaa-12345678',reportingBase:'legacy'});
    assert.equal(api.migrationStage,null); assert.equal(api.registryGraph,null);
    await release.verifyManifest(dir,api,expected(api));
    const wrongBase={...api,reportingBase:'canonical'};
    await assert.rejects(release.verifyManifest(dir,wrongBase,expected(wrongBase)),/identity|reportingBase/i);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('release_environment_sets_ui_bases_consistently',()=>{
  assert.throws(()=>environmentConfig('preview'),/environment/i);
  assert.equal(environmentConfig('beta').databaseId,'e2adf4c4-5ab0-434d-b90f-96ea451e3be7');
  for(const environment of ['beta','production']) {
    const target=environmentConfig(environment);
    const env=buildEnvironment(environment,'a'.repeat(40));
    assert.equal(target.canonicalSite,target.origin+target.basePath);
    assert.equal(env.COJEEV_BASE_PATH,'/ui');
    for(const key of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_REGISTRY_URL','COJEEV_REGISTRY_URL']) assert.equal(env[key],target.canonicalSite);
    assert.equal(env.NEXT_PUBLIC_REPORTING_API_URL,target.api);
    for(const [key,value] of [['COJEEV_BASE_PATH',''],['NEXT_PUBLIC_SITE_URL',target.legacySite]])
      assert.throws(()=>buildEnvironment(environment,'a'.repeat(40),{[key]:value}),/Environment URL\/config mismatch/);
  }
  assert.throws(()=>buildEnvironment('beta','a'.repeat(40),{NEXT_PUBLIC_SITE_URL:'https://000h.cojeev.com'}),/environment|URL/i);
});
test('manifest verification detects edits, extra private files, missing files, and wrong identity',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-test-'));
  try {
    await fs.mkdir(path.join(dir,'site'));
    await fs.writeFile(path.join(dir,'site/index.html'),'<html>public</html>');
    const manifest=await release.createManifest(dir,'beta','a'.repeat(40));
    const digest=release.manifestDigest(manifest);
    await release.verifyManifest(dir,manifest,{environment:'beta',commit:'a'.repeat(40),digest});
    await assert.rejects(release.verifyManifest(dir,manifest,{environment:'production',commit:'a'.repeat(40),digest}),/identity/);
    await fs.writeFile(path.join(dir,'site/index.html'),'tampered');
    await assert.rejects(release.verifyManifest(dir,manifest,{environment:'beta',commit:'a'.repeat(40),digest}),/integrity/);
    await fs.writeFile(path.join(dir,'site/private.sql'),'data');
    await assert.rejects(release.createManifest(dir,'beta','a'.repeat(40)),/private|forbidden/i);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('the site cannot ship files under the paths the hosting Worker reserves, since some skip the Worker',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-test-'));
  try {
    await fs.mkdir(path.join(dir,'site/_next/static/media'),{recursive:true});
    await fs.writeFile(path.join(dir,'site/index.html'),'<html>public</html>');
    await fs.writeFile(path.join(dir,'site/_next/static/media/font.woff2'),'font');
    await release.createManifest(dir,'beta','a'.repeat(40));
    for(const reserved of ['media','backups','private','v1']) {
      await fs.mkdir(path.join(dir,'site',reserved));
      await fs.writeFile(path.join(dir,'site',reserved,'x.txt'),'data');
      await assert.rejects(release.createManifest(dir,'beta','a'.repeat(40)),/private|forbidden|reserved/i,reserved);
      await fs.rm(path.join(dir,'site',reserved),{recursive:true});
    }
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('artifact URL validation distinguishes documentation examples from deployable references',()=>{
  assert.doesNotThrow(()=>release.validateContent('site/docs/index.html','<code>http://localhost:3000</code>','beta'));
  assert.throws(()=>release.validateContent('site/index.html','<script src="http://localhost:3000/app.js"></script>','beta'),/URL|environment/);
  assert.throws(()=>release.validateContent('site/r/button.json',JSON.stringify({registryDependencies:['https://000h.cojeev.com/r/cojeev.json']}),'beta'),/URL|environment/);
  assert.throws(()=>release.validateContent('site/_next/static/chunks/app.js','fetch("https://feedback.cojeev.com/v1/reports")','beta'),/URL|environment/);
  assert.throws(()=>release.validateContent('site/config.json','{"api":"http://localhost:3000"}','beta'),/URL|environment/);
  assert.throws(()=>release.validateContent('site/index.html','<script>fetch("http://localhost:3000/data")</script>','beta'),/URL|environment/);
  assert.doesNotThrow(()=>release.validateContent('site/_next/static/chunks/docs.js','const example="https://…/docs/component/";','beta'));
  assert.throws(()=>release.validateContent('site/_next/static/chunks/app.js','fetch("https://…/docs/component/")','beta'),/URL/);
});
test('registry component source is scanned: opposite origins throw, inert localhost examples pass, malformed URLs never surface as TypeError',()=>{
  const item=value=>JSON.stringify({name:'button',description:'demo',files:[{path:'button.tsx',content:value}]});
  assert.throws(()=>release.validateContent('site/r/button.json',item('fetch("https://feedback.cojeev.com/v1/reports")'),'beta'),/Cross-environment/);
  assert.throws(()=>release.validateContent('site/r/button.json',item('const site="https://luv-jeri.github.io/cojeev-ui";'),'beta'),/Cross-environment/);
  assert.throws(()=>release.validateContent('site/r/button.json',JSON.stringify({description:'Mirrors https://beta.000h.cojeev.com/r/button.json'}),'production'),/Cross-environment/);
  assert.doesNotThrow(()=>release.validateContent('site/r/button.json',item('// during development point at http://localhost:8787'),'beta'));
  assert.throws(()=>release.validateContent('site/r/button.json',item('fetch("http://localhost:8787/v1/reports")'),'beta'),/Cross-environment/);
  assert.doesNotThrow(()=>release.validateContent('site/r/button.json',item('see https://…/docs/component/ for details'),'beta'));
  assert.throws(()=>release.validateContent('site/index.html','<script src="https://…/app.js"></script>','beta'),{message:/Malformed URL dependency/});
  assert.throws(()=>release.validateContent('site/registry.json',JSON.stringify({homepage:'https://…/'}),'beta'),{message:/Malformed URL dependency/});
});
test('public sitemap XML and RSC text payloads reject the other environment but keep inert localhost documentation',()=>{
  assert.throws(()=>release.validateContent('site/sitemap.xml','<urlset><url><loc>https://000h.cojeev.com/</loc></url></urlset>','beta'),/Cross-environment/);
  assert.throws(()=>release.validateContent('site/index.txt','2:{"api":"https:\\/\\/feedback.cojeev.com\\/v1\\/reports"}','beta'),/Cross-environment/);
  assert.throws(()=>release.validateContent('site/docs/index.txt','mirrored at https://beta.000h.cojeev.com/r/button.json','production'),/Cross-environment/);
  assert.throws(()=>release.validateContent('site/index.txt','the old home was https://luv-jeri.github.io/cojeev-ui','beta'),/Cross-environment/);
  assert.doesNotThrow(()=>release.validateContent('site/sitemap.xml','<urlset><url><loc>https://beta.000h.cojeev.com/</loc></url></urlset>','beta'));
  assert.doesNotThrow(()=>release.validateContent('site/robots.txt','Sitemap: https://beta.000h.cojeev.com/sitemap.xml','beta'));
  assert.doesNotThrow(()=>release.validateContent('site/docs/index.txt','run the API at http://localhost:8787 while developing','beta'));
  assert.doesNotThrow(()=>release.validateContent('site/docs/index.txt','see https://…/docs/component/ for details','beta'));
});
test('source snapshots reject dirty and mismatched commits including untracked files',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-git-'));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  try {
    git('init','--quiet');git('config','user.email','test@example.invalid');git('config','user.name','Test');
    await fs.writeFile(path.join(dir,'source'),'source');git('add','source');git('commit','--quiet','-m','fixture');
    const commit=git('rev-parse','HEAD');
    assert.equal(release.assertCleanSource(dir,commit),commit);
    assert.throws(()=>release.assertCleanSource(dir,'b'.repeat(40)),/commit/);
    await fs.writeFile(path.join(dir,'extra'),'untracked');
    assert.throws(()=>release.assertCleanSource(dir,commit),/clean|dirty/);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('tracked snapshot preserves executable mode and verifies bytes against the committed index',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-copy-'));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  try {
    git('init','--quiet');git('config','user.email','test@example.invalid');git('config','user.name','Test');
    await fs.writeFile(path.join(dir,'run'),'#!/bin/sh\nexit 0\n',{mode:0o755});git('add','run');git('commit','--quiet','-m','fixture');
    const destination=await fs.mkdtemp(path.join(os.tmpdir(),'release-copy-target-'));
    try {
      await release.copyCommittedSource(dir,git('rev-parse','HEAD'),destination);
      assert.equal(await fs.readFile(path.join(destination,'run'),'utf8'),'#!/bin/sh\nexit 0\n');
      assert.equal((await fs.stat(path.join(destination,'run'))).mode&0o111,0o111);
      await fs.symlink('run',path.join(dir,'link'));git('add','link');git('commit','--quiet','-m','symlink');
      await assert.rejects(release.copyCommittedSource(dir,git('rev-parse','HEAD'),destination),/regular|symlink/);
    } finally {await fs.rm(destination,{recursive:true,force:true});}
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('the packaged site served through the hosting Worker keeps a CSP that permits every runtime origin',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'release-csp-'));
  const page=body=>fs.writeFile(path.join(dir,'site/ui/index.html'),`<html><body>${body}</body></html>`);
  try {
    await fs.mkdir(path.join(dir,'site/ui'),{recursive:true});
    // An outbound anchor and a canonical link are navigation and metadata, not
    // subresources: neither may be reported against a subresource directive.
    await page('<a href="https://github.com/luv-jeri">source</a><link rel="canonical" href="https://github.com/luv-jeri/cojeev-ui">');
    for(const environment of ['beta','production']) {
      const opposite=environmentConfig(environment==='beta'?'production':'beta');
      const {policy}=await checkArtifactCsp(dir,environment);
      assert.ok(policy.includes(environmentConfig(environment).api),policy);
      assert.ok(![opposite.api,opposite.legacySite,opposite.origin].some(origin=>policy.includes(origin)),policy);
      for(const origin of ['https://challenges.cloudflare.com','https://eu.i.posthog.com','https://eu-assets.i.posthog.com','https://static.cloudflareinsights.com']) assert.ok(policy.includes(origin),origin);
    }
    await page('<script src="https://cdn.example.com/x.js"></script>');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/cdn\.example\.com/);
    // A host the policy permits only for one directive cannot authorise another.
    await page('<script src="https://eu.i.posthog.com/array.js"></script>');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/script-src/);
    await page('<img src="https://eu-assets.i.posthog.com/logo.png">');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/img-src/);
    await page('<link rel="stylesheet" href="https://fonts.googleapis.com/css2">');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/style-src/);
    await page('<link rel="preload" as="font" href="https://fonts.gstatic.com/x.woff2">');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/font-src/);
    await page('<video src="https://cdn.example.com/clip.mp4"></video>');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/media-src/);
    await page('<embed src="https://cdn.example.com/x.swf">');
    await assert.rejects(checkArtifactCsp(dir,'beta'),/object-src/);
    // Cloudflare injects this Web Analytics tag into HTML at the edge; it reports to same-origin /cdn-cgi/rum.
    const beacon='<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495" data-cf-beacon=\'{"token":"t"}\' crossorigin="anonymous"></script>';
    await page(`<iframe src="https://challenges.cloudflare.com/widget"></iframe><script src="https://eu-assets.i.posthog.com/a.js"></script>${beacon}`);
    assert.ok((await checkArtifactCsp(dir,'beta')).policy);
    const withoutBeacon={fetch:async(request,env)=>{
      const response=await host.fetch(request,env),headers=new Headers(response.headers);
      headers.set('content-security-policy',headers.get('content-security-policy').replace(' https://static.cloudflareinsights.com',''));
      return new Response(response.body,{status:response.status,headers});
    }};
    await page('<p>no injected tag</p>');
    await assert.rejects(checkArtifactCsp(dir,'beta',withoutBeacon),/script-src no longer permits https:\/\/static\.cloudflareinsights\.com/);
    await fs.rm(path.join(dir,'site/ui/index.html'));
    await assert.rejects(checkArtifactCsp(dir,'beta'),/did not serve/);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
