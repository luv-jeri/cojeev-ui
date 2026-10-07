/** Probe the candidate bundle through Cloudflare's packaged asset router. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {environmentConfig} from './release-config.mjs';
import {startAssetRouter,followChain,chainProblems} from './asset-router-harness.mjs';
import {CODE_PROBES} from './worker-first.mjs';

export async function checkAssetChains(directory) {
  const root=path.resolve(directory);
  const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
  assert.equal(manifest.schema,2,'Asset chains require a schema-2 website variant');
  assert.equal(manifest.side,'website','Asset chains require a website variant');
  const target=environmentConfig(manifest.environment),canonicalBase=target.canonicalSite;
  const homepage=path.resolve(import.meta.dirname,'../workers/registry-host/test/fixtures/homepage');
  const router=await startAssetRouter({worker:{kind:'packaged',directory:root},homepage});
  const problems=[];
  async function chain(url,mount,file) {
    const query=new URL(url).search;
    const {hops,final}=await followChain(router,url);
    problems.push(...chainProblems(hops,{mount,query,canonicalBase}));
    const body=Buffer.from(await final.arrayBuffer());
    if(final.status!==200) problems.push(`${mount} ${file?'RSC':'HTML'} did not serve: ${url} (${final.status})`);
    else if(file && !body.equals(await fs.readFile(path.join(root,file)))) problems.push(`${mount} RSC bytes differ: ${url}`);
  }
  try {
    // HTML redirects must retain the mount and query as well as text assets.
    await chain(`${canonicalBase}/index.html?x=1`,'canonical');
    for(const [mount,prefix,base] of [['canonical','site/ui/',canonicalBase],['legacy','site/',target.legacySite]]) {
      const files=Object.keys(manifest.files).filter(file=>file.startsWith(prefix) &&
        (mount==='canonical' || !file.startsWith('site/ui/')) && /(?:^|\/)(?:index|__next[^/]*)\.txt$/.test(file));
      const file=files.find(file=>file.includes('$'))??files[0];
      if(!file) {problems.push(`Manifest has no ${mount} RSC path`);continue;}
      const literal=file.slice(prefix.length);
      const encoded=literal.split('/').map(encodeURIComponent).join('/');
      for(const route of new Set([literal,encoded])) await chain(`${base}/${route}?_rsc=1`,mount,file);
    }
    if(manifest.environment==='production') {
      for(const method of ['GET','HEAD']) for(const probe of ['/uikit.txt?x=1','/ui-other.txt','/uix.txt?y=2']) {
        const url=`${target.origin}${probe}`,init={method,redirect:'manual'};
        router.reset();
        const actual=await router.fetch(url,init),expected=await router.homepage(url,init);
        const headers=response=>JSON.stringify([...response.headers].filter(([key])=>key!=='date'));
        const actualBody=Buffer.from(await actual.arrayBuffer()),expectedBody=Buffer.from(await expected.arrayBuffer());
        if(actual.status!==expected.status || !actualBody.equals(expectedBody) || headers(actual)!==headers(expected))
          problems.push(`Sibling delegation changed ${method} ${probe}`);
        if(!router.workerRuns().includes(new URL(url).pathname)) problems.push(`Sibling bypassed code: ${probe}`);
      }
    }
    for(const probe of CODE_PROBES) {
      router.reset();
      await (await router.fetch(`${target.origin}${probe}`,{redirect:'manual'})).arrayBuffer();
      if(!router.workerRuns().includes(probe)) problems.push(`Code probe bypassed Worker: ${probe}`);
    }
  } finally {await router.dispose();}
  if(problems.length) throw new Error(`Packaged asset chains failed: ${[...new Set(problems)].join('; ')}`);
  return {environment:manifest.environment};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if(!process.argv[2]) throw new Error('Use check-asset-chains.mjs DIRECTORY');
    const {environment}=await checkAssetChains(process.argv[2]);
    console.log(`Packaged asset chains, sibling delegation and code probes passed for ${environment}`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
