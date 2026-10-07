/** Verified static release packaging and promotion. No deployment occurs on build. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {buildEnvironment,environmentConfig} from './release-config.mjs';
import {assertCleanSource,copyCommittedSource,verifyManifest} from './release-manifest.mjs';
import {composeSecretBundles,validateSecrets} from './operations.mjs';
import {assessHealth} from './operations-health.mjs';
import {readBaselineRecord} from './release-phases.mjs';
import {readBaseline,packageEnvironment,readVariant} from './release-variants.mjs';
import {livePairCli} from './release-pair.mjs';
import {contractProblems} from './live-contracts.mjs';
import {promoteApi,promoteWebsite} from './release-promote.mjs';
export {promoteApi,promoteWebsite};
export {readVariant};
import {readIdentities,identityProblems,expectedId} from './release-identity.mjs';
export {readIdentities,identityProblems,expectedId};

const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
export function releaseMetadata(environment,commit,publicEnv) {
  return {
    environment,
    release:commit,
    analyticsEnabled:publicEnv.NEXT_PUBLIC_ANALYTICS_ENABLED==='true'&&Boolean(publicEnv.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim()),
  };
}
export async function buildVariants(root,commit,destination,settings={}) {
  if(process.versions.node!=='22.22.0') throw new Error('Release build requires Node 22.22.0');
  assertCleanSource(root,commit);
  if(JSON.parse(await fs.readFile(path.join(root,'node_modules/wrangler/package.json'),'utf8')).version!=='4.130.0') throw new Error('Locked Wrangler 4.130.0 required');
  // Verify both pinned artifacts before even building beta. Never rebuild a
  // baseline from today's source or publish a partial environment on failure.
  const baselines={};
  for(const environment of ['beta','production']) baselines[environment]=await readBaseline(environment,{record:path.join(root,'scripts/release-baseline.json')});
  try {
    if((await fs.readdir(destination)).length) throw new Error('Variant destination must be empty');
  } catch(error) {if(error.code!=='ENOENT') throw error;}
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-release-variants-'));
  try {
    const result={};
    for(const environment of ['beta','production']) {
      const publicEnv=buildEnvironment(environment,commit,settings[environment]??{});
      const sourceRoot=path.join(scratch,environment);await fs.mkdir(sourceRoot);
      // Verify every tracked Git blob, preserving the clean source boundary.
      await copyCommittedSource(root,commit,sourceRoot);
      // Turbopack refuses node_modules symlinks outside its filesystem root.
      await fs.cp(await fs.realpath(path.join(root,'node_modules')),path.join(sourceRoot,'node_modules'),{recursive:true,verbatimSymlinks:true});
      const buildEnv={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,CI:'true',NEXT_TELEMETRY_DISABLED:'1',...publicEnv};
      execFileSync('npm',['run','build'],{cwd:sourceRoot,env:buildEnv,stdio:'inherit'});
      const workers={};
      for(const [side,worker] of [['api','reporting'],['website','registry-host']]) {
        const source=await json(path.join(sourceRoot,`workers/${worker}/wrangler.jsonc`));
        const config={...source,...source.env[environment],services:source.env[environment].services,
          vars:{...source.env[environment].vars},main:'./index.js'};
        delete config.env;delete config.$schema;
        if(side==='api') config.d1_databases=config.d1_databases.map(binding=>({...binding,migrations_dir:'./migrations'}));
        const bundle=path.join(sourceRoot,'bundles',`${side}.js`);
        await build({entryPoints:[path.join(sourceRoot,`workers/${worker}/${source.main}`)],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2022',logLevel:'silent'});
        workers[side]={config,bundle,...(side==='api'?{migrations:path.join(sourceRoot,'workers/reporting/migrations')}:{})};
      }
      result[environment]=await packageEnvironment(path.join(sourceRoot,'out'),environment,commit,path.join(scratch,'variants',environment),{
        baseline:baselines[environment],publicMetadata:releaseMetadata(environment,commit,publicEnv),workers,
      });
    }
    assertCleanSource(root,commit);
    await fs.mkdir(destination,{recursive:true});
    await fs.cp(path.join(scratch,'variants'),destination,{recursive:true,errorOnExist:true,force:false});
    for(const [environment,variants] of Object.entries(result)) for(const [variant,artifact] of Object.entries(variants))
      artifact.directory=path.join(destination,environment,variant);
    return result;
  } finally {await fs.rm(scratch,{recursive:true,force:true});}
}
export function deploymentSecrets(environment,env=process.env,log=console.error) {
  const bundles=composeSecretBundles(env.REPORTING_SECRETS_JSON,env.REPORTING_ADDITIONAL_SECRETS_JSON);
  // Provision webhook signing separately without rewriting either protected
  // bundle. Refuse overlaps so rotation is explicit, never a silent overwrite.
  const webhook=env.RESEND_WEBHOOK_SECRET ? JSON.stringify({RESEND_WEBHOOK_SECRET:env.RESEND_WEBHOOK_SECRET}) : undefined;
  const composed=validateSecrets(composeSecretBundles(bundles,webhook),environment);
  // The one explicit exception to the no-overwrite rule: a rotated ADMIN_TOKEN
  // that the bundles (write-only GitHub secrets) cannot carry. Same rule as validateSecrets.
  const rotated=env.REPORTING_ADMIN_TOKEN;
  if(rotated===undefined||rotated==='') return composed;
  if(typeof rotated!=='string'||!rotated.trim()||/\s/.test(rotated)||rotated.length<32) throw new Error('REPORTING_ADMIN_TOKEN must be a non-blank value of at least 32 characters');
  log('ADMIN_TOKEN: rotated value from REPORTING_ADMIN_TOKEN');
  return {...composed,ADMIN_TOKEN:rotated};
}
/** Resolve only verified migration artifacts or the pinned baseline identity. */
export async function expectedFrom(environment,side,argument) {
  environmentConfig(environment);
  if(!['website','api'].includes(side)) throw new Error('Invalid expected side');
  if(argument==='baseline') {
    const record=await readBaselineRecord(environment);
    return {kind:'baseline',commit:record.commit,versionId:record[`${side}VersionId`]};
  }
  if(typeof argument!=='string'||!/^.+:[a-f0-9]{64}$/.test(argument)) throw new Error('Expected DIR:DIGEST or baseline');
  const separator=argument.lastIndexOf(':');
  const directory=argument.slice(0,separator),digest=argument.slice(separator+1);
  const manifest=await json(path.join(directory,'manifest.json'));
  await verifyManifest(directory,manifest,{environment,commit:manifest.commit,digest,schema:2});
  if(manifest.side!==side) throw new Error('Expected artifact side mismatch');
  return {kind:'variant',manifest};
}
// Retry propagation and HTTP outages only. A malformed identity, missing token,
// failed delivery queue or contract defect cannot be repaired by waiting.
export const TRANSIENT_LIVE_PROBLEMS=new Set(['analytics-config-mismatch','http-health','release-mismatch','stale-identity','site-unreachable','site-release-mismatch']);
export const LIVE_RETRY_WAITS=[4000,8000,12000,16000];
export const LIVE_BUDGET_MS=60000;
// Full catalogues and page contracts get their own five-minute budget after propagation.
export const CONTRACT_BUDGET_MS=300000;
const boundedFetcher=(fetcher,deadline,clock)=>async(url,options={})=>{
  const remaining=deadline-clock();
  if(remaining<=0) throw new Error('Live check budget exhausted');
  const signals=[options.signal,AbortSignal.timeout(remaining)].filter(Boolean);
  return fetcher(url,{...options,signal:AbortSignal.any(signals)});
};
/** Sanitized fixed codes and independent observations for one live read. */
export async function liveProblems(environment,{website,api,token=process.env.HEALTH_TOKEN,expectedAnalyticsEnabled,fetcher=fetch,contractFetcher=()=>fetcher,baseline,robotsBefore}) {
  const observed=await readIdentities(environment,{fetcher});
  const identities=identityProblems(environment,{website,api},observed);
  let problems=[...identities];
  const target=environmentConfig(environment);
  if(!token) problems.push('invalid-delivery-health');
  else try {
    const response=await fetcher(`${target.api}/v1/admin/health`,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('HTTP check failed');
    problems.push(...assessHealth(await response.json()));
  } catch {
    // Preserve the token-present outage rule without hiding an admin body that
    // answered and reported a real permanent delivery defect.
    if(!identities.includes('http-health')) problems.push('invalid-delivery-health');
  }
  if(token&&identities.includes('http-health')) problems=problems.filter(code=>code!=='invalid-delivery-health');
  const result=()=>({problems:[...new Set(problems)].sort(),observed});
  if(identities.length) return result();
  if(website.kind==='variant'&&expectedAnalyticsEnabled!==undefined&&observed.website.uiRelease.analyticsEnabled!==expectedAnalyticsEnabled) problems.push('analytics-config-mismatch');
  problems.push(...await contractProblems(environment,{website,api},{fetcher:contractFetcher(),baseline,robotsBefore}));
  return result();
}
/** Identity propagation retries are bounded separately from successful-identity contracts. */
export async function checkLiveRelease(environment,expected,{
  waits=LIVE_RETRY_WAITS,budgetMs=LIVE_BUDGET_MS,contractBudgetMs=CONTRACT_BUDGET_MS,clock=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log,fetcher=fetch,...options
}={}) {
  const deadline=clock()+budgetMs;
  const bounded=boundedFetcher(fetcher,deadline,clock);
  for(let attempt=0;;attempt++) {
    const {problems}=await liveProblems(environment,{...expected,...options,fetcher:bounded,
      contractFetcher:()=>boundedFetcher(fetcher,clock()+contractBudgetMs,clock)});
    if(!problems.length) return problems;
    const transient=problems.every(code=>TRANSIENT_LIVE_PROBLEMS.has(code));
    // Another attempt must be permitted, and must still fit in the budget.
    const remaining=deadline-clock();
    const wait=Math.min(waits[attempt]??-1,remaining);
    if(!transient||wait<=0) {
      const limit=transient?` within the ${budgetMs/1000}s propagation budget`:'';
      throw new Error(`Live checks failed after ${attempt+1} attempt${attempt?'s':''}${limit}: ${problems.join(', ')}`);
    }
    // Fixed codes only. No response body, header, credential or URL is printed.
    log(`Live checks attempt ${attempt+1}/${waits.length+1}: ${problems.join(', ')}; retrying in ${Math.round(wait/1000)}s`);
    await sleep(wait);
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [command,environment,commit,directory,digest]=process.argv.slice(2);
    if(command==='build-variants') {
      const source=process.cwd(),sha=environment,base=path.resolve(commit);
      const settings={};
      for(const name of ['beta','production']) {
        const prefix=name.toUpperCase();
        settings[name]={
          NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:process.env[`${prefix}_POSTHOG_PROJECT_TOKEN`]??'',
          NEXT_PUBLIC_ANALYTICS_ENABLED:process.env[`${prefix}_ANALYTICS_ENABLED`]??'false',
          NEXT_PUBLIC_CONTACT_ENABLED:process.env.PUBLIC_CONTACT_ENABLED??'false',
        };
      }
      const artifacts=await buildVariants(source,sha,base,settings);
      for(const [name,variants] of Object.entries(artifacts)) for(const [variant,{digest,deploymentId}] of Object.entries(variants)) {
        const key=`${name}_${variant.replaceAll('-','_')}`;
        console.log(`${name} ${variant} ${sha} ${digest} ${deploymentId}`);
        if(process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,`${key}_digest=${digest}\n${key}_id=${deploymentId}\n`);
      }
    } else if(command==='live-pair') {
      await livePairCli(process.argv.slice(3));
    } else if(command==='verify') {await readVariant(path.resolve(directory),environment,commit,digest);console.log('Artifact verified');}
    else if(command==='deploy'||command==='rollback') throw new Error('Untargeted deploy is retired: use promote-api or promote-website');
    else if(command==='promote-api'||command==='promote-website') {
      const args=process.argv.slice(3);
      if(!(args.length===5||args.length===6&&args[5]==='--rollback')) throw new Error('Use promote-api/promote-website ENV SHA DIRECTORY DIGEST EXPECTED_PEER_ID [--rollback]');
      const expected=args[4],fn=command==='promote-api'?promoteApi:promoteWebsite;
      const peer={directory:process.env.PEER_DIRECTORY,digest:process.env.PEER_DIGEST};
      console.log(JSON.stringify(await fn(path.resolve(directory),environment,commit,digest,expected,{rollback:args[5]==='--rollback',evidence:process.env.PROMOTION_EVIDENCE,peer})));
    }
    else if(command==='live') {
      const expected=process.env.EXPECTED_ANALYTICS_ENABLED;
      if(expected!==undefined&&!['true','false'].includes(expected)) throw new Error('Invalid expected analytics setting');
      const arguments_=process.argv.slice(4);
      if(arguments_.length!==2||arguments_.filter(value=>value.startsWith('--website=')).length!==1||arguments_.filter(value=>value.startsWith('--api=')).length!==1) throw new Error('Use live ENV --website=DIR:DIGEST|baseline --api=DIR:DIGEST|baseline');
      const identities={};
      for(const side of ['website','api']) identities[side]=await expectedFrom(environment,side,arguments_.find(value=>value.startsWith(`--${side}=`)).slice(side.length+3));
      const baseline=identities.website.kind==='baseline'?await readBaseline(environment):await readBaselineRecord(environment);
      const robotsBefore=environment==='production'&&baseline.apexProbes['/robots.txt'].robots!=='absent'
        ?await fs.readFile('docs/reports/2026-10-01-move-baseline/apex-robots.before.txt','utf8'):'';
      await checkLiveRelease(environment,identities,{baseline,robotsBefore,expectedAnalyticsEnabled:expected===undefined?undefined:expected==='true'});
      console.log(`live ok website=${expectedId(identities.website)} api=${expectedId(identities.api)}`);
    }
    else throw new Error('Use build-variants SHA DIRECTORY | verify ENV SHA DIRECTORY DIGEST | promote-api/promote-website ENV SHA DIRECTORY DIGEST EXPECTED_PEER_ID [--rollback] | live ENV --website=DIR:DIGEST|baseline --api=DIR:DIGEST|baseline');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
