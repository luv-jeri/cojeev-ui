import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as release from '../scripts/release-manifest.mjs';
import { environmentConfig, buildEnvironment } from '../scripts/release-config.mjs';
import { checkArtifactCsp } from '../scripts/release-csp.mjs';

test('unknown and opposite environment settings fail closed',()=>{
  assert.throws(()=>environmentConfig('preview'),/environment/i);
  assert.equal(environmentConfig('beta').databaseId,'e2adf4c4-5ab0-434d-b90f-96ea451e3be7');
  assert.equal(buildEnvironment('production','a'.repeat(40),{}).COJEEV_BASE_PATH,'');
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
  const page=body=>fs.writeFile(path.join(dir,'site/index.html'),`<html><body>${body}</body></html>`);
  try {
    await fs.mkdir(path.join(dir,'site'));
    // An outbound anchor and a canonical link are navigation and metadata, not
    // subresources: neither may be reported against a subresource directive.
    await page('<a href="https://github.com/luv-jeri">source</a><link rel="canonical" href="https://github.com/luv-jeri/cojeev-ui">');
    for(const environment of ['beta','production']) {
      const opposite=environmentConfig(environment==='beta'?'production':'beta');
      const {policy}=await checkArtifactCsp(dir,environment);
      assert.ok(policy.includes(environmentConfig(environment).api),policy);
      assert.ok(!policy.includes(opposite.api)&&!policy.includes(opposite.site),policy);
      for(const origin of ['https://challenges.cloudflare.com','https://eu.i.posthog.com','https://eu-assets.i.posthog.com']) assert.ok(policy.includes(origin),origin);
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
    await page('<iframe src="https://challenges.cloudflare.com/widget"></iframe><script src="https://eu-assets.i.posthog.com/a.js"></script>');
    assert.ok((await checkArtifactCsp(dir,'beta')).policy);
    await fs.rm(path.join(dir,'site/index.html'));
    await assert.rejects(checkArtifactCsp(dir,'beta'),/did not serve/);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
