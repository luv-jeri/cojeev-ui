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
  const body=await response.text();
  for(const match of body.matchAll(/\ssrc=["'](https?:\/\/[^"']+)["']/g)) {
    if(!URL.canParse(match[1])) {problems.push(`served page has a malformed resource URL (${match[1]})`);continue;}
    const {origin}=new URL(match[1]);
    if(!Object.values(policy).some(values=>values.includes(origin))) problems.push(`served page loads ${origin}, which no directive permits`);
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
