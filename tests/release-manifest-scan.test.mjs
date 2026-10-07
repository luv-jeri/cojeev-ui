import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createManifest, validateContent, verifyManifest, manifestDigest} from '../scripts/release-manifest.mjs';

const commit = 'a'.repeat(40);
const sha256 = content => createHash('sha256').update(content).digest('hex');
const identity = (registryGraph = 'canonical') => ({side:'website', phase:registryGraph === 'baseline' ? 'mounted' : 'regenerated',
  deploymentId:`website-${registryGraph === 'baseline' ? 'mounted' : 'regenerated'}-aaaaaaaaaaaa-12345678`,
  migrationStage:'additive', registryGraph, reportingBase:null});
const html = 'site/ui/index.html', rsc = 'site/ui/docs/button/index.txt', js = 'site/ui/_next/static/chunks/a.js';
const registry = 'site/ui/r/registry.json', dependency = 'site/ui/r/button.json';
// Each literal verdict comes from the approved fixture table, independently of the scanner.
const rows = [
  ['beta-anchor.html','beta',html,'build','canonical',true],
  ['beta-anchor-rsc.txt','beta',rsc,'build','canonical',true],
  ['beta-anchor-js.js','beta',js,'build','canonical',true],
  ['beta-link-rsc.txt','beta',rsc,'build','canonical',false,/metadata/],
  ['beta-bare-rsc.txt','beta',rsc,'build','canonical',false,/anchor/],
  ['beta-link-js.js','beta',js,'build','canonical',false,/metadata/],
  ['beta-canonical.html','beta',html,'build','canonical',false,/metadata/],
  ['beta-meta.html','beta',html,'build','canonical',false,/metadata/],
  ['beta-jsonld.html','beta',html,'build','canonical',false,/metadata/],
  ['beta-sitemap.xml','beta','site/ui/sitemap.xml','build','canonical',false,/sitemap/],
  ...['ui','about','http','port','user','query','fragment','bare'].map(kind => [`beta-${kind}-anchor.html`,'beta',html,'build','canonical',false,/anchor/]),
  ['beta-fetch.js','beta',js,'build','canonical',false,/fetch/],
  ['beta-api.js','beta',js,'build','canonical',false,/API|environment/],
  ['beta-dependency.json','beta',dependency,'build','canonical',false,/dependency/],
  ['beta-legacy-image.html','beta',html,'build','canonical',false,/environment/],
  ['production-beta.html','production',html,'build','canonical',false],
  ['production-root-css.html','production',html,'build','canonical',false],
  ['production-ui-css.html','production',html,'build','canonical',true],
  ['production-css-url.css','production','site/ui/_next/static/css/x.css','build','canonical',false],
  ['production-retained.html','production','site/index.html','baseline','baseline',true],
  ['production-rebuilt-root.html','production','site/index.html','build','canonical',false],
  ['production-legacy-dependency.json','production',dependency,'build','canonical',false],
  ['production-retained-dependency.json','production',dependency,'baseline','baseline',true],
  ['production-mounted-registry.json','production',registry,'baseline','baseline',true],
  ['production-canonical-registry.json','production',registry,'build','canonical',false],
  ['beta-mounted-registry.json','beta',registry,'baseline','baseline',true],
  ['beta-canonical-registry.json','beta',registry,'build','canonical',false],
];
async function put(root, file, content) {
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.writeFile(path.join(root,file),content);
}
async function artifact(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'manifest-scan-'));
  try {
    await put(root,html,'<html>public</html>');
    await put(root,'site/ui/release.json','{}');
    await run(root);
  } finally {await fs.rm(root,{recursive:true,force:true});}
}
async function checkRow(row) {
  const [fixture,environment,file,origin,registryGraph,pass,context] = row;
  const content = await fs.readFile(new URL(`./fixtures/manifest-scan/${fixture}`,import.meta.url),'utf8');
  const error = value => {assert.ok(value.message.includes(file),value.message); if(context) assert.match(value.message,context); return true;};
  const validate = () => validateContent(file,content,environment,{origin,registryGraph});
  if(pass) assert.doesNotThrow(validate,fixture); else assert.throws(validate,error,fixture);
  await artifact(async root => {
    await put(root,file,content);
    const id = identity(registryGraph);
    if(origin === 'baseline') id.baseline = {commit:'b'.repeat(40),digest:'c'.repeat(64),hashes:new Map([[file === registry ? 'site/r/registry.json' : file,sha256(content)]])};
    if(pass) {
      const manifest = await createManifest(root,environment,commit,id);
      assert.equal(manifest.files[file].origin,origin,fixture);
      await verifyManifest(root,manifest,{environment,commit,digest:manifestDigest(manifest),schema:2});
    } else await assert.rejects(createManifest(root,environment,commit,id),error,fixture);
  });
}
// Exercise the public scanner, creation, and digest-pinned verification independently.
async function checkContent(file, content, environment, pass, context) {
  const error = value => {assert.ok(value.message.includes(file),value.message); assert.match(value.message,context); return true;};
  const validate = () => validateContent(file,content,environment,{origin:'build',registryGraph:'canonical'});
  if(pass) assert.doesNotThrow(validate); else assert.throws(validate,error);
  await artifact(async root => {
    await put(root,file,content);
    if(pass) {
      const manifest = await createManifest(root,environment,commit,identity());
      await verifyManifest(root,manifest,{environment,commit,digest:manifestDigest(manifest),schema:2});
    } else {
      await assert.rejects(createManifest(root,environment,commit,identity()),error);
      await put(root,file,file.endsWith('.json') ? '{}' : '');
      const manifest = await createManifest(root,environment,commit,identity());
      await put(root,file,content);
      manifest.files[file].sha256=sha256(content);
      await assert.rejects(verifyManifest(root,manifest,{environment,commit,digest:manifestDigest(manifest),schema:2}),error);
    }
  });
}
test('canonical_registry_dependencies_require_the_registry_prefix',async t => {
  for(const environment of ['production','beta']) {
    const origin=environment==='production' ? 'https://cojeev.com' : 'https://beta.000h.cojeev.com';
    for(const [suffix,pass] of [['/ui/docs/button/',false],['/ui/r/x.json',true],['/ui/r/../docs/button/',false]])
      await t.test(`${environment} ${suffix}`,()=>checkContent(dependency,JSON.stringify({registryDependencies:[origin+suffix]}),environment,pass,/registry dependency/));
  }
});
test('decoded_javascript_urls_keep_host_checks_and_anchor_boundaries',async t => {
  for(const [name,content,pass] of [
    ['unicode slashes',String.raw`fetch("https:\u002f\u002fcojeev.com/")`,false],
    ['hex slashes',String.raw`fetch('https:\x2f\x2fcojeev.com/')`,false],
    ['unicode host',String.raw`fetch("https://\u0063ojeev.com/")`,false],
    ['template literal',String.raw`fetch(\`https:\u{2f}\u{2f}cojeev.com/\`)`.replaceAll('\\`','`'),false],
    ['escaped API',String.raw`const api="https:\u002f\u002ffeedback.cojeev.com"`,false],
    ['escaped anchor',String.raw`(0,n.jsx)("a",{href:"https:\u002f\u002fcojeev.com/"})`,true],
    ['escaped anchor trailing slash',String.raw`(0,n.jsx)("a",{href:"https://cojeev.com\u002f"})`,true],
    ['escaped non-anchor',String.raw`(0,n.jsx)("link",{href:"https:\u002f\u002fcojeev.com/"})`,false],
    ['escaped nested href',String.raw`(0,n.jsx)("a",{data:{href:"https:\u002f\u002fcojeev.com/"}})`,false],
    ['anchor plus escaped fetch',String.raw`(0,n.jsx)("a",{href:"https://cojeev.com/"});fetch("https:\u002f\u002fcojeev.com/")`,false],
    ['escaped beta URL',String.raw`fetch("https:\u002f\u002fbeta.000h.cojeev.com/ui/")`,true],
  ]) await t.test(name,()=>checkContent(js,content,'beta',pass,/environment|fetch|metadata|anchor/));
  await t.test('inline script',()=>checkContent(html,String.raw`<script>fetch("https:\u002f\u002fcojeev.com/")</script>`,'beta',false,/fetch/));
  await t.test('registry source',()=>checkContent(dependency,JSON.stringify({files:[{content:String.raw`fetch("https:\u002f\u002fcojeev.com/")`}]}),'beta',false,/fetch/));
  await t.test('escaped RSC anchor trailing slash',()=>checkContent(rsc,String.raw`["$","a",null,{"href":"https://cojeev.com\u002f"}]`,'beta',true,/anchor/));
});
test('mounted_paths_reject_normalized_dot_segment_escapes',async t => {
  for(const environment of ['production','beta']) {
    const origin=environment==='production' ? 'https://cojeev.com' : 'https://beta.000h.cojeev.com';
    for(const [name,file,content,pass] of [
      ['relative escape',html,'<img src="/ui/../brand/x.png">',false],
      ['encoded escape',html,'<img src="/ui/%2e%2e/brand/x.png">',false],
      ['absolute escape',html,`<img src="${origin}/ui/../brand/x.png">`,false],
      ['srcset escape',html,'<img srcset="/ui/a.png 1x, /ui/../brand/b.png 2x">',false],
      ['CSS escape','site/ui/_next/static/css/x.css','a{background:url(/ui/../brand/x.png)}',false],
      ['contained dot segment',html,`<img src="${origin}/ui/docs/../brand/x.png">`,true],
      ['relative mount root',html,'<a href="/ui/docs/..">',true],
    ]) await t.test(`${environment} ${name}`,()=>checkContent(file,content,environment,pass,/base path|Legacy page/));
  }
});
test('artifact_path_policy_matches_creation_and_verification_for_extra_files',async t => {
  for(const file of ['site/reports/data.txt','site/ui/.hidden','site/ui/leak.map','unexpected/data.txt'])
    await t.test(file,()=>artifact(async root => {
      const manifest=await createManifest(root,'production',commit,identity());
      await put(root,file,'private');
      const error=value=>{assert.ok(value.message.includes(file),value.message); assert.match(value.message,/Private\/forbidden|Unexpected artifact path/); return true;};
      await assert.rejects(createManifest(root,'production',commit,identity()),error);
      await assert.rejects(verifyManifest(root,manifest,{environment:'production',commit,digest:manifestDigest(manifest),schema:2}),error);
    }));
  await t.test('public assets and permitted SQL migration',()=>artifact(async root => {
    await put(root,'site/ui/brand/icon.png','public');
    await put(root,'api/migrations/0001_init.sql','CREATE TABLE example(id INTEGER);');
    const manifest=await createManifest(root,'production',commit,identity());
    await verifyManifest(root,manifest,{environment:'production',commit,digest:manifestDigest(manifest),schema:2});
  }));
});
test('manifest_rejects_cross_environment_hosts_and_wrong_base_paths',async t => {
  for(const row of rows.filter(row => row[1] === 'production' || ['beta-api.js','beta-legacy-image.html'].includes(row[0])))
    await t.test(row[0],() => checkRow(row));
  // Base-path ownership includes every served HTML attribute and CSS URL.
  for(const content of ['<a href="/docs/">','<img src="/brand/x.png">','<form action="/submit">',
    '<img srcset="/ui/a.png 1x, /brand/b.png 2x">','<style>a{background:url("/brand/a.png")}</style>',
    '<img src="https://cojeev.com/brand/a.png">'])
    assert.throws(() => validateContent(html,content,'production',{origin:'build',registryGraph:'canonical'}),/base|canonical/i);
  for(const content of ['<a href="/ui">','<img srcset="/ui/a.png 1x, /ui/b.png 2x">','<a href="https://cojeev.com/">'])
    assert.doesNotThrow(() => validateContent(html,content,'production',{origin:'build',registryGraph:'canonical'}));
  assert.doesNotThrow(() => validateContent(dependency,'{"registryDependencies":["https://000h.cojeev.com/r/x.json"]}','production',{origin:'build',registryGraph:'baseline'}));
  assert.doesNotThrow(() => validateContent(dependency,'{"registryDependencies":["https://beta.000h.cojeev.com/r/x.json"]}','beta',{origin:'build',registryGraph:'baseline'}));
  assert.doesNotThrow(() => validateContent(js,'const legacy="https://beta.000h.cojeev.com/r/x.json"','beta',{origin:'build',registryGraph:'canonical'}));
  assert.throws(() => validateContent(dependency,'{"registryDependencies":["https://beta.000h.cojeev.com/r/x.json"]}','beta',{origin:'build',registryGraph:'canonical'}),/dependency/);
  assert.doesNotThrow(() => validateContent(js,'const route="/docs/button"','production',{origin:'build',registryGraph:'canonical'}));
});
test('beta_manifest_allows_exact_cojeev_homepage_navigation_only',async t => {
  const inline=payload=>`<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
  await t.test('HTML embedded Next navigation',()=>checkContent(html,inline('1:["$","a",null,{"href":"https://cojeev.com/","children":"by Cojeev"}]\n'),'beta',true));
  for(const payload of [
    '["$","a",null,{"href":"https://cojeev.com/","data":{"url":"https://cojeev.com/ui/"}}]',
    '["$","link",null,{"href":"https://cojeev.com/"}]',
    '["$","a",null,{"data":{"href":"https://cojeev.com/"}}]',
    '["$","a",null,{"href":"https://cojeev.com/"}];fetch("https://cojeev.com/")',
  ]) await t.test(payload,()=>checkContent(html,inline(payload),'beta',false,/environment|metadata|fetch/));
  for(const row of rows.filter(row => row[1] === 'beta' && row[5])) await t.test(row[0],() => checkRow(row));
});
test('beta_manifest_rejects_production_ui_api_and_canonical_metadata',async t => {
  for(const row of rows.filter(row => row[1] === 'beta' && !row[5])) await t.test(row[0],() => checkRow(row));
  // A nested props object, a second URL, or an unrelated call cannot grant the exception.
  for(const [file,content] of [[rsc,'["$","a",null,{"data":{"href":"https://cojeev.com/"}}]'],
    [js,'(0,n.jsx)("a",{data:{href:"https://cojeev.com/"}})'],
    [js,'(0,n.jsx)("a",{href:"https://cojeev.com/"});fetch("https://cojeev.com/")'],
    [js,'fetch("a",{href:"https://cojeev.com/"})'],
    [html,'<script>const x = \'<a href="https://cojeev.com/">\'</script>']])
    assert.throws(() => validateContent(file,content,'beta',{origin:'build',registryGraph:'canonical'}),/environment|anchor|fetch|metadata/i);
});
test('reserved_export_rejection_covers_root_and_ui',async () => {
  for(const reserved of ['site/media/x','site/ui/media/x','site/ui/v1/a.json','site/private/','site/ui/backups/x'])
    await artifact(async root => {
      await put(root,'site/index.html','<html>public</html>');
      if(reserved.endsWith('/')) await fs.mkdir(path.join(root,reserved),{recursive:true}); else await put(root,reserved,'{}');
      for(const id of [undefined,identity()]) await assert.rejects(createManifest(root,'production',commit,id),/reserved|private|forbidden/i,reserved);
    });
  await artifact(async root => {
    await put(root,'site/index.html','<html>public</html>'); await put(root,'site/ui/mediakit/x','public');
    for(const id of [undefined,identity()]) await createManifest(root,'production',commit,id);
  });
});
test('mounted_registry_copy_keeps_baseline_provenance',async () => {
  for(const environment of ['production','beta']) await artifact(async root => {
    const content = await fs.readFile(new URL(`./fixtures/manifest-scan/${environment}-mounted-registry.json`,import.meta.url),'utf8');
    await put(root,'site/r/registry.json',content); await put(root,registry,content);
    const id = {...identity('baseline'),baseline:{commit:'b'.repeat(40),digest:'c'.repeat(64),hashes:new Map([['site/r/registry.json',sha256(content)]])}};
    const manifest = await createManifest(root,environment,commit,id);
    assert.equal(manifest.files['site/r/registry.json'].origin,'baseline');
    assert.equal(manifest.files[registry].origin,'baseline');
    await verifyManifest(root,manifest,{environment,commit,digest:manifestDigest(manifest),schema:2});
    const wrongOrigin=structuredClone(manifest);
    wrongOrigin.files[registry].origin='build';
    await assert.rejects(verifyManifest(root,wrongOrigin,{environment,commit,digest:manifestDigest(wrongOrigin),schema:2}),/site\/ui\/r\/registry.json/);
    await put(root,registry,content+' ');
    await assert.rejects(createManifest(root,environment,commit,id),/site\/ui\/r\/registry.json/);
    await put(root,registry,content);
    await assert.rejects(createManifest(root,environment,commit,{...id,...identity('canonical')}),/site\/ui\/r\/registry.json/);
  });
});

test('manifest_allows_origin_only_connection_hints_only',async()=>{
  const real=await fs.readFile(new URL('./fixtures/manifest-scan/next-origin-hint.html',import.meta.url),'utf8');
  for(const environment of ['beta','production']) {
    for(const content of [real,real.replace('preconnect','dns-prefetch')])
      assert.doesNotThrow(()=>validateContent(html,content,environment,{origin:'build',registryGraph:'canonical'}));
    for(const content of ['<link rel="preload" href="/x.js">','<link rel="preload" href="/">',
      '<link rel="preconnect" href="/x">','<link rel="preconnect" href="//cojeev.com/">',
      '<link rel="preconnect" href="https://cojeev.com/">'])
      assert.throws(()=>validateContent(html,content,environment,{origin:'build',registryGraph:'canonical'}),/base path|environment/);
  }
});
