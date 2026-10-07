import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as releases from '../scripts/release.mjs';
import {createManifest,manifestDigest} from '../scripts/release-manifest.mjs';
import {siteHeaders} from '../workers/registry-host/src/headers.mjs';

const repository=path.resolve(import.meta.dirname,'..');
const fixtures=path.join(repository,'tests/fixtures/release-baseline');
const environments=['beta','production'];
const websiteVariants=['website-mounted','website-regenerated','website-redirect'];
const variants=[...websiteVariants,'api-prepared','api-linked'];
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function write(root,file,bytes) {
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.writeFile(path.join(root,file),bytes);
}
async function files(root,prefix='') {
  const result={};
  for(const entry of await fs.readdir(path.join(root,prefix),{withFileTypes:true})) {
    const file=path.posix.join(prefix,entry.name);
    if(entry.isDirectory()) Object.assign(result,await files(root,file));
    else result[file]=sha(await fs.readFile(path.join(root,file)));
  }
  return result;
}
function commitSource(root) {
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','--allow-empty','-m','fixture');
  return git('rev-parse','HEAD');
}

// Real clean-source capture, subprocess builds, esbuild, manifests and config
// validation run here. Only Next's expensive export is replaced by tiny inputs.
async function withSource(run) {
  assert.equal(typeof releases.buildVariants,'function','buildVariants must package the five per-side variants');
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'release-variants-test-'));
  const root=path.join(temporary,'source');
  const baseline=path.join(temporary,'baseline');
  const saved=Object.fromEntries(environments.map(env=>[env,process.env[`BASELINE_${env.toUpperCase()}_DIRECTORY`]]));
  try {
    await fs.mkdir(root);
    await fs.cp(fixtures,baseline,{recursive:true});
    for(const env of environments) process.env[`BASELINE_${env.toUpperCase()}_DIRECTORY`]=path.join(baseline,env);
    await write(root,'.gitignore','node_modules/\n');
    await write(root,'scripts/release-baseline.json',await fs.readFile(path.join(fixtures,'release-baseline.json')));
    await write(root,'node_modules/wrangler/package.json','{"version":"4.130.0"}');
    await write(root,'package.json',JSON.stringify({scripts:{build:'node export.mjs'}}));
    await write(root,'export.mjs',`import fs from 'node:fs/promises';
const env=process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT;
if(process.env.COJEEV_BASE_PATH!=='/ui') throw new Error('fixture build must mount /ui');
await fs.cp('exports/'+env,'out',{recursive:true});
// More than one export per environment is an observable build error.
await fs.writeFile('built-'+env,'built',{flag:'wx'});
`);
    for(const env of environments) {
      const canonical=env==='beta'?'https://beta.000h.cojeev.com/ui':'https://cojeev.com/ui';
      const out=`exports/${env}`;
      await write(root,`${out}/index.html`,`<html><body>NEW_${env.toUpperCase()} <script src="/ui/_next/app.js"></script></body></html>\n`);
      await write(root,`${out}/404.html`,'<html><body>new 404</body></html>\n');
      await write(root,`${out}/index.txt`,'new RSC payload\n');
      await write(root,`${out}/_next/app.js`,'console.log("new export");\n');
      await write(root,`${out}/r/button.json`,JSON.stringify({name:'button',registryDependencies:[`${canonical}/r/base.json`]})+'\n');
      await write(root,`${out}/r/base.json`,'{"name":"base","registryDependencies":[],"description":"new"}\n');
    }
    for(const [worker,main] of [['registry-host','index.mjs'],['reporting','index.ts']]) {
      await write(root,`workers/${worker}/wrangler.jsonc`,await fs.readFile(path.join(repository,`workers/${worker}/wrangler.jsonc`)));
      await write(root,`workers/${worker}/src/${main}`,'export default {fetch() {return new Response("fixture");}};\n');
    }
    await write(root,'workers/reporting/migrations/0001_initial.sql','CREATE TABLE fixture(id TEXT);\n');
    execFileSync('git',['init','--quiet'],{cwd:root});
    const commit=commitSource(root);
    await run({temporary,root,baseline,commit});
  } finally {
    for(const env of environments) {
      const key=`BASELINE_${env.toUpperCase()}_DIRECTORY`;
      if(saved[env]===undefined) delete process.env[key]; else process.env[key]=saved[env];
    }
    await fs.rm(temporary,{recursive:true,force:true});
  }
}

test('artifact_contains_ui_home_identity_headers_and_legacy_registry',async()=>{
  await withSource(async({temporary,root,commit})=>{
    const result=await releases.buildVariants(root,commit,path.join(temporary,'variants'),{});
    for(const env of environments) {
      assert.deepEqual(Object.keys(result[env]).sort(),[...variants].sort());
      for(const variant of variants) {
        const {directory,digest,deploymentId}=result[env][variant];
        assert.equal(directory,path.join(temporary,'variants',env,variant));
        const verified=await releases.readVariant(directory,env,commit,digest);
        const [side,phase]=variant.split('-');
        assert.equal(verified.side,side); assert.equal(verified.phase,phase);
        assert.equal(verified.deploymentId,deploymentId);
        if(side==='website') {
          const release=await json(path.join(directory,'site/ui/release.json'));
          assert.deepEqual(release,{environment:env,release:commit,deploymentId,phase,
            migrationStage:phase==='redirect'?'redirect':'additive',
            registryGraph:phase==='mounted'?'baseline':'canonical',analyticsEnabled:false});
          assert.match(await fs.readFile(path.join(directory,'site/ui/index.html'),'utf8'),new RegExp(`NEW_${env.toUpperCase()}`));
          assert.equal(await fs.readFile(path.join(directory,'site/_headers'),'utf8'),siteHeaders(env));
          assert.deepEqual(await fs.readFile(path.join(directory,'site/404.html')),await fs.readFile(path.join(root,`exports/${env}/404.html`)));
          await fs.access(path.join(directory,'site/r/button.json'));
          await fs.access(path.join(directory,'site/ui/r/button.json'));
          assert.equal(verified.config.assets.directory,'../site');
          assert.ok(verified.config.assets.run_worker_first.includes('!/index.txt'));
          assert.ok(verified.config.assets.run_worker_first.includes('!/docs/*.txt'));
          await assert.rejects(fs.access(path.join(directory,'site/release.json')));
          await assert.rejects(fs.access(path.join(directory,'api')));
        } else {
          await assert.rejects(fs.access(path.join(directory,'site')));
          await assert.rejects(fs.access(path.join(directory,'website')));
          await fs.access(path.join(directory,'api/migrations/0001_initial.sql'));
          // Wrangler environment vars are non-inheritable: beta must not take
          // production's default public Turnstile key during config merging.
          if(env==='beta') assert.equal(verified.config.vars.TURNSTILE_SITE_KEY,undefined);
          assert.equal(verified.config.vars.LEGACY_SITE_URL,env==='beta'?'https://beta.000h.cojeev.com':'https://000h.cojeev.com');
          assert.equal(verified.config.vars.SITE_URL,phase==='prepared'?verified.config.vars.LEGACY_SITE_URL:env==='beta'?'https://beta.000h.cojeev.com/ui':'https://cojeev.com/ui');
        }
      }
    }
    // A digest-valid public identity or config substitution still must fail.
    const selected=result.production['website-mounted'];
    const manifest=await json(path.join(selected.directory,'manifest.json'));
    await fs.writeFile(path.join(selected.directory,'site/ui/release.json'),JSON.stringify({environment:'production',release:commit,phase:'redirect'}));
    manifest.files['site/ui/release.json'].sha256=sha(await fs.readFile(path.join(selected.directory,'site/ui/release.json')));
    await fs.writeFile(path.join(selected.directory,'manifest.json'),JSON.stringify(manifest));
    await assert.rejects(releases.readVariant(selected.directory,'production',commit,manifestDigest(manifest)),/identity/i);
  });
  for(const failure of ['ui-export','worker-first','config','manifest']) {
    await withSource(async({temporary,root,baseline})=>{
      if(failure==='ui-export') await write(root,'exports/production/index.html','<img src="/brand/missing.png">');
      if(failure==='config') {
        const config=await json(path.join(root,'workers/reporting/wrangler.jsonc'));
        config.env.production.vars.LOCAL_MODE='true';
        await write(root,'workers/reporting/wrangler.jsonc',JSON.stringify(config));
      }
      if(failure==='manifest') await write(root,'exports/production/index.html','<a href="https://beta.000h.cojeev.com/ui/">wrong environment</a>');
      if(failure==='worker-first') {
        const directory=path.join(baseline,'production');
        await write(directory,'site/ui-other.txt','retained sibling text');
        const record=await json(path.join(root,'scripts/release-baseline.json'));
        const manifest=await createManifest(directory,'production',record.production.commit);
        await write(directory,'manifest.json',JSON.stringify(manifest));
        record.production.digest=manifestDigest(manifest);
        await write(root,'scripts/release-baseline.json',JSON.stringify(record));
      }
      const commit=commitSource(root),destination=path.join(temporary,'rejected');
      const errors={'ui-export':/Invalid \/ui export/,'worker-first':/Invalid Worker-first inventory/,
        config:/Deployment target mismatch: vars.LOCAL_MODE/,manifest:/Cross-environment/};
      await assert.rejects(releases.buildVariants(root,commit,destination,{}),errors[failure]);
      await assert.rejects(fs.access(destination),{code:'ENOENT'});
    });
  }
});

test('additive_artifact_preserves_pinned_same_environment_old_site',async()=>{
  await withSource(async({temporary,root,baseline,commit})=>{
    const result=await releases.buildVariants(root,commit,path.join(temporary,'valid'),{});
    for(const env of environments) {
      const record=await json(path.join(fixtures,'release-baseline.json'));
      const mod=await import('../scripts/release-variants.mjs');
      const old=await mod.readBaseline(env,{record:path.join(root,'scripts/release-baseline.json'),directory:path.join(baseline,env)});
      assert.equal(old.commit,record[env].commit); assert.equal(old.digest,record[env].digest);
      assert.equal(old.runId,record[env].runId); assert.equal(old.siteRoot,path.join(baseline,env,'site'));
      assert.equal(old.websiteVersionId,record[env].websiteVersionId); assert.equal(old.apiVersionId,record[env].apiVersionId);
      assert.deepEqual(old.apexProbes,record[env].apexProbes);
      const original=await files(path.join(baseline,env,'site'));
      for(const variant of websiteVariants) {
        const site=path.join(result[env][variant].directory,'site');
        for(const [file,hash] of Object.entries(original)) {
          if(file.startsWith('r/')||['release.json','_headers','404.html'].includes(file)) continue;
          assert.equal(sha(await fs.readFile(path.join(site,file))),hash,`${env}/${variant}/${file}`);
          assert.equal(old.hashes.get(`site/${file}`),hash);
        }
        if(env==='beta') for(const file of Object.keys(await files(site)))
          assert.ok(!(await fs.readFile(path.join(site,file),'utf8')).includes('BASELINE_PRODUCTION_ONLY'),file);
      }
      await assert.rejects(releases.readVariant(path.join(baseline,env),env,record[env].commit,record[env].digest),
        {message:'Unversioned artifact: migration artifacts need manifest schema 2'});
    }
    // Corrupt production so beta must not be published before all inputs verify.
    for(const mode of ['missing','archive-root','digest','pretty-file-digest','tampered']) {
      const destination=path.join(temporary,mode);
      await fs.mkdir(destination);
      const record=await json(path.join(fixtures,'release-baseline.json'));
      let directory=path.join(baseline,'production');
      if(mode==='missing') directory=path.join(temporary,'absent');
      if(mode==='archive-root') directory=baseline;
      if(mode==='digest') record.production.digest='0'.repeat(64);
      if(mode==='pretty-file-digest') record.production.digest=sha(await fs.readFile(path.join(directory,'manifest.json')));
      if(mode==='tampered') await fs.writeFile(path.join(directory,'site/index.html'),'tampered');
      await write(root,'scripts/release-baseline.json',JSON.stringify(record));
      const changedCommit=commitSource(root);
      process.env.BASELINE_PRODUCTION_DIRECTORY=directory;
      await assert.rejects(releases.buildVariants(root,changedCommit,destination,{}),
        mode==='missing'||mode==='archive-root'?/Baseline artifact missing: production/:/digest|integrity/i,mode);
      assert.deepEqual(await fs.readdir(destination),[],mode);
    }
  });
});

test('same_sha_variants_have_distinct_deployment_ids',async()=>{
  await withSource(async({temporary,root,commit})=>{
    const builds=[];
    for(const name of ['first','second']) {
      const result=await releases.buildVariants(root,commit,path.join(temporary,name),{});
      const ids=[];
      for(const env of environments) for(const variant of variants) {
        const artifact=result[env][variant];
        ids.push(artifact.deploymentId);
        assert.match(artifact.deploymentId,new RegExp(`^${variant}-${commit.slice(0,12)}-[a-f0-9]{8}$`));
        const manifest=await json(path.join(artifact.directory,'manifest.json'));
        const config=await json(path.join(artifact.directory,`${manifest.side}/wrangler.jsonc`));
        assert.equal(manifest.deploymentId,artifact.deploymentId);
        assert.equal(config.vars.DEPLOYMENT_ID,artifact.deploymentId);
        assert.equal(config.vars.RELEASE,commit); assert.equal(config.vars.PHASE,manifest.phase);
        assert.equal(manifestDigest(manifest),artifact.digest);
        if(manifest.side==='website') assert.equal((await json(path.join(artifact.directory,'site/ui/release.json'))).deploymentId,artifact.deploymentId);
        for(const file of Object.keys(manifest.files)) assert.ok(!(await fs.readFile(path.join(artifact.directory,file),'utf8')).includes(artifact.digest),file);
      }
      assert.equal(new Set(ids).size,10);
      builds.push(ids);
    }
    assert.equal(new Set(builds.flat()).size,20);
    const githubOutput=path.join(temporary,'github-output');
    const cliDirectory=path.join(temporary,'cli');
    // The CLI must emit 20 values for 10 real variants, preserving prior output.
    await fs.writeFile(githubOutput,'existing=value\n');
    execFileSync(process.execPath,[path.join(repository,'scripts/release.mjs'),'build-variants',commit,cliDirectory],{
      cwd:root,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:githubOutput,
        BETA_ANALYTICS_ENABLED:'true',BETA_POSTHOG_PROJECT_TOKEN:'fixture-public-project-token',
        PRODUCTION_ANALYTICS_ENABLED:'false'},
    });
    const outputs=Object.fromEntries((await fs.readFile(githubOutput,'utf8')).trim().split('\n').map(line=>line.split('=')));
    assert.equal(outputs.existing,'value'); assert.equal(Object.keys(outputs).length,21);
    for(const env of environments) for(const variant of variants) {
      const key=`${env}_${variant.replaceAll('-','_')}`,directory=path.join(cliDirectory,env,variant);
      const manifest=await json(path.join(directory,'manifest.json'));
      assert.equal(outputs[`${key}_digest`],manifestDigest(manifest));
      assert.equal(outputs[`${key}_id`],manifest.deploymentId);
      const verified=execFileSync(process.execPath,[path.join(repository,'scripts/release.mjs'),'verify',env,commit,directory,outputs[`${key}_digest`]],{encoding:'utf8'});
      assert.match(verified,/Artifact verified/);
      if(manifest.side==='website') assert.equal((await json(path.join(directory,'site/ui/release.json'))).analyticsEnabled,env==='beta');
    }
  });
});

test('legacy_and_canonical_registry_payloads_match',async()=>{
  await withSource(async({temporary,root,baseline,commit})=>{
    const result=await releases.buildVariants(root,commit,path.join(temporary,'variants'),{});
    for(const env of environments) for(const variant of websiteVariants) {
      const directory=result[env][variant].directory;
      const legacy=await files(path.join(directory,'site/r'));
      const canonical=await files(path.join(directory,'site/ui/r'));
      assert.deepEqual(legacy,canonical);
      assert.deepEqual(legacy,await files(variant==='website-mounted'?path.join(baseline,env,'site/r'):path.join(root,`exports/${env}/r`)));
      const manifest=await json(path.join(directory,'manifest.json'));
      for(const file of Object.keys(legacy)) assert.equal(manifest.files[`site/ui/r/${file}`].origin,variant==='website-mounted'?'baseline':'build');
    }
    for(const env of environments) {
      const regenerated=await files(path.join(result[env]['website-regenerated'].directory,'site'));
      const redirect=await files(path.join(result[env]['website-redirect'].directory,'site'));
      delete regenerated['ui/release.json']; delete redirect['ui/release.json'];
      assert.deepEqual(regenerated,redirect);
    }
  });
});
