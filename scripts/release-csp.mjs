/**
 * Serves a packaged artifact's site through the real hosting Worker and checks the
 * Content-Security-Policy it emits. This is a local header contract check, not a
 * browser: it proves the policy still names every origin the app must reach and
 * names no opposite-environment origin. Actual browser execution of Turnstile and
 * PostHog against the live domains remains Task 4 acceptance.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import host from '../workers/registry-host/src/index.mjs';
import {environmentConfig} from './release-config.mjs';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain','.xml':'application/xml','.png':'image/png'};
export function directoryAssets(site) {
  const root=path.resolve(site);
  return {fetch: async request => {
    const {pathname}=new URL(request.url);
    const file=path.resolve(root,`.${pathname.endsWith('/')?`${pathname}index.html`:pathname}`);
    if(file!==root && !file.startsWith(`${root}${path.sep}`)) return new Response('Not found',{status:404});
    try {return new Response(await fs.readFile(file),{headers:{'content-type':types[path.extname(file)]??'application/octet-stream'}});}
    catch {return new Response('Not found',{status:404});}
  }};
}
// The deployed bytes are the artifact's own bundle; the source handler is only the
// default so a fixture directory without a packaged bundle can still be checked.
export const packagedWorker = async directory => (await import(pathToFileURL(path.join(directory,'website/index.js')))).default;
export async function checkArtifactCsp(directory,environment,worker=host) {
  const target=environmentConfig(environment),opposite=environmentConfig(environment==='beta'?'production':'beta');
  const env={ENVIRONMENT:environment,RELEASE:'0'.repeat(40),ASSETS:directoryAssets(path.join(directory,'site'))};
  const response=await worker.fetch(new Request(`${target.site}/`),env);
  if(!response.ok) throw new Error(`Packaged home page did not serve through the hosting Worker (${response.status})`);
  const header=response.headers.get('content-security-policy')??'';
  const policy=Object.fromEntries(header.split(';').map(part=>part.trim().split(/\s+/)).filter(([name])=>name).map(([name,...values])=>[name,values]));
  const permits=(directive,origin)=>(policy[directive]??policy['default-src']??[]).includes(origin);
  // Turnstile and PostHog are compiled into the app unconditionally, so their
  // origins are required of every environment; the API origin is this one's only.
  const required=[[target.api,['connect-src']],['https://eu.i.posthog.com',['connect-src']],['https://eu-assets.i.posthog.com',['script-src','connect-src']],['https://challenges.cloudflare.com',['script-src','frame-src']]];
  const problems=required.flatMap(([origin,directives])=>directives.filter(directive=>!permits(directive,origin)).map(directive=>`${directive} no longer permits ${origin}`));
  for(const forbidden of [opposite.api,opposite.site]) if(Object.values(policy).some(values=>values.includes(forbidden))) problems.push(`policy permits the ${opposite.site===forbidden?'website':'API'} origin of the other environment (${forbidden})`);
  // Each served resource tag is checked against the directive that actually governs
  // it, so an origin permitted only by connect-src cannot authorise a script or an
  // image. An ordinary outbound anchor is navigation, not a subresource, and is
  // deliberately not checked here; form-action and frame-ancestors stay with the
  // header contract above.
  const preloaded={script:'script-src',style:'style-src',image:'img-src',font:'font-src',fetch:'connect-src'};
  const body=await response.text();
  for(const [,name,attributes] of body.matchAll(/<(script|img|iframe|frame|link)\s([^>]*)>/gi)) {
    const attribute=key=>attributes.match(new RegExp(`(?:^|\\s)${key}=["']([^"']*)["']`,'i'))?.[1];
    const tag=name.toLowerCase(),rel=(attribute('rel')??'').toLowerCase().split(/\s+/);
    const directive=tag==='script'?'script-src':tag==='img'?'img-src':tag==='iframe'||tag==='frame'?'frame-src'
      :rel.includes('stylesheet')?'style-src':rel.includes('modulepreload')?'script-src'
      :rel.includes('preload')||rel.includes('prefetch')?preloaded[(attribute('as')??'').toLowerCase()]:undefined;
    const value=attribute(tag==='link'?'href':'src');
    if(!directive||!value||!/^https?:\/\//.test(value)) continue;
    if(!URL.canParse(value)) {problems.push(`served page has a malformed resource URL (${value})`);continue;}
    const {origin}=new URL(value);
    if(!permits(directive,origin)) problems.push(`served page loads ${origin} as ${directive}, which the policy does not permit`);
  }
  if(problems.length) throw new Error(`Artifact CSP check failed for ${environment}: ${[...new Set(problems)].join('; ')}`);
  return {environment,policy:header};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [environment,directory]=process.argv.slice(2);
    if(!directory) throw new Error('Use release-csp.mjs ENV DIRECTORY');
    const root=path.resolve(directory);
    await checkArtifactCsp(root,environment,await packagedWorker(root));
    console.log(`Artifact CSP permits every required runtime origin for ${environment}`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
