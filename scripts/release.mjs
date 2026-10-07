/** Verified static release packaging and promotion. No deployment occurs on build. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {buildEnvironment,environmentConfig} from './release-config.mjs';
import {assertCleanSource,copyCommittedSource,verifyManifest} from './release-manifest.mjs';
import {prepareDatabaseRecovery,cloudflare,composeSecretBundles,validateDeploymentConfig,validateSecrets,wrangler} from './operations.mjs';
import {assessHealth} from './operations-health.mjs';
import {readBaselineRecord,WEBSITE_PHASES,API_PHASES} from './release-phases.mjs';
import {readBaseline,packageEnvironment,readVariant} from './release-variants.mjs';
export {readVariant};

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
export async function readArtifact(directory,environment,commit,digest) {
  const manifest=await json(path.join(directory,'manifest.json'));
  await verifyManifest(directory,manifest,{environment,commit,digest});
  for(const kind of ['api','website']) {
    const config=await json(path.join(directory,kind,'wrangler.jsonc'));
    validateDeploymentConfig(environment,config,kind,{source:true});
    if(config.vars.RELEASE!==commit||config.main!=='./index.js') throw new Error('Artifact release/config mismatch');
    // Files that skip the Worker get their security headers only from site/_headers.
    if(kind==='website'&&config.assets.run_worker_first!==true) await fs.access(path.join(directory,'site/_headers')).catch(()=>{throw new Error('Artifact lets static files skip the Worker without site/_headers');});
  }
  const release=await json(path.join(directory,'site/release.json'));
  if(release.environment!==environment||release.release!==commit) throw new Error('Public release identity mismatch');
  return manifest;
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
export async function deployRelease(directory,environment,commit,digest,{rollback=false,run=wrangler,backupDatabase=prepareDatabaseRecovery,cf=cloudflare}={}) {
  const manifest=await readArtifact(directory,environment,commit,digest);
  const target=environmentConfig(environment);
  const secrets=deploymentSecrets(environment);
  const config=path.join(directory,'api/wrangler.jsonc');
  if(environment==='production') {
    const existing=await cf(`workers/scripts/${target.worker}/secrets`);
    for(const name of ['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET','TURNSTILE_SECRET']) if(!secrets[name]&&!existing.some(item=>item.name===name)) throw new Error('Required production secret is not provisioned');
    if(!/^0x[A-Za-z0-9_-]{20,}$/.test(secrets.TURNSTILE_SITE_KEY??(await json(config)).vars.TURNSTILE_SITE_KEY??'')) throw new Error('Production Turnstile site key missing');
  }
  // The current additive schema is the only reviewed code rollback boundary.
  // Any future migration requires an explicit compatibility review in this tool.
  if(rollback && (process.env.ROLLBACK_SCHEMA_ACK!=='0002_safe_delivery.sql'||!manifest.files['api/migrations/0002_safe_delivery.sql']||Object.keys(manifest.files).some(file=>file.startsWith('api/migrations/')&&!/^api\/migrations\/000[12]_/.test(file)))) throw new Error('Code rollback requires reviewed compatible schema 0002');
  if(!rollback) {
    await backupDatabase(environment,config);
    run(['d1','migrations','apply',target.database,'--remote','--config',config]);
  }
  // Wrangler opens --secrets-file by pathname. Node subprocess stdin is a socket
  // on Linux, so /dev/stdin fails with ENXIO even though it works on macOS.
  // Use the supported file interface outside the immutable artifact/workspace.
  const secretDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-deploy-secrets-'));
  try {
    await fs.chmod(secretDirectory,0o700);
    const secretsFile=path.join(secretDirectory,'secrets.json');
    const serializedSecrets=JSON.stringify(secrets);
    await fs.writeFile(secretsFile,serializedSecrets,{mode:0o600,flag:'wx'});
    // Keep the in-memory bundle available to the wrapper's error redactor too.
    // No secret value is placed in argv or in the packaged release.
    run(['deploy','--config',config,'--no-bundle','--secrets-file',secretsFile],serializedSecrets);
  } finally {
    await fs.rm(secretDirectory,{recursive:true,force:true});
  }
  run(['deploy','--config',path.join(directory,'website/wrangler.jsonc'),'--no-bundle']);
  return {environment,commit,manifestDigest:digest,rollback};
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
export function expectedId(expected) {
  return expected.kind==='variant'?expected.manifest.deploymentId:`baseline:${expected.versionId}`;
}

// Keep each endpoint's identity separate: an agreeing peer must never repair a
// malformed or stale response. Absent deployment metadata denotes a baseline.
async function readIdentity(url,side,{fetcher,releaseFile=false,onDeploymentId}) {
  let response;
  try {response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'}});}
  catch {return {ok:false,reason:'http-0'};}
  if(!response.ok||response.headers.get('location')) return {ok:false,reason:`http-${response.status}`};
  let value;
  try {value=await response.json();} catch {return {ok:false,reason:'not-json'};}
  const missing=field=>({ok:false,reason:`missing-${field}`});
  if(!value||typeof value!=='object'||Array.isArray(value)) return missing('environment');
  if(Object.hasOwn(value,'deploymentId')) onDeploymentId?.();
  if(typeof value.environment!=='string'||!value.environment.trim()) return missing('environment');
  if(typeof value.release!=='string'||!/^[a-f0-9]{40}$/.test(value.release)) return missing('release');
  const observation={ok:true,environment:value.environment,release:value.release,deploymentId:null,phase:null};
  const variant=Object.hasOwn(value,'deploymentId')||Object.hasOwn(value,'phase');
  if(variant) {
    const phases=side==='website'?WEBSITE_PHASES:API_PHASES;
    if(typeof value.deploymentId!=='string'||!new RegExp(`^${side}-(?:${Object.keys(phases).join('|')})-[a-f0-9]{12}-[a-f0-9]{8}$`).test(value.deploymentId)) return missing('deploymentId');
    if(typeof value.phase!=='string'||!Object.hasOwn(phases,value.phase)) return missing('phase');
    observation.deploymentId=value.deploymentId;observation.phase=value.phase;
    for(const [field,allowed] of side==='website'
      ? [['migrationStage',['additive','redirect']],['registryGraph',['baseline','canonical']]]
      : [['reportingBase',null]]) {
      if(allowed?!allowed.includes(value[field]):typeof value[field]!=='string'||!value[field].trim()) return missing(field);
      observation[field]=value[field];
    }
    if(releaseFile&&typeof value.analyticsEnabled!=='boolean') return missing('analyticsEnabled');
  }
  // Preserve only identity fields actually supplied by this endpoint.
  for(const field of ['migrationStage','registryGraph','reportingBase','analyticsEnabled'])
    if(Object.hasOwn(value,field)) observation[field]=value[field];
  return observation;
}
export async function readIdentities(environment,{fetcher=fetch}={}) {
  const target=environmentConfig(environment);
  let hasDeploymentId=false;
  const health=await readIdentity(`${target.legacySite}/health`,'website',{fetcher,onDeploymentId:()=>{hasDeploymentId=true;}});
  let uiHealth=null,uiRelease=null;
  if(hasDeploymentId) {
    uiHealth=await readIdentity(`${target.canonicalSite}/health`,'website',{fetcher});
    uiRelease=await readIdentity(`${target.canonicalSite}/release.json`,'website',{fetcher,releaseFile:true});
  }
  const apiHealth=await readIdentity(`${target.api}/health`,'api',{fetcher});
  return {website:{health,uiHealth,uiRelease},api:{health:apiHealth}};
}
export function identityProblems(environment,{website,api},observed) {
  const problems=[];
  const compare=(expected,observation,side)=>{
    if(!observation) {problems.push('identity-malformed');return;}
    if(!observation.ok) {
      problems.push(observation.reason.startsWith('http-')?'http-health':'identity-malformed');return;
    }
    if(observation.environment!==environment) {problems.push('identity-malformed');return;}
    const commit=expected.kind==='variant'?expected.manifest.commit:expected.commit;
    if(observation.release!==commit) problems.push('release-mismatch');
    if(expected.kind==='baseline') {
      if(observation.deploymentId!==null) problems.push('stale-identity');
      return;
    }
    if(observation.deploymentId===null||observation.phase===null) {problems.push('identity-malformed');return;}
    const fields=side==='website'?['deploymentId','phase','migrationStage','registryGraph']:['deploymentId','phase','reportingBase'];
    if(fields.some(field=>observation[field]!==expected.manifest[field])) problems.push('stale-identity');
  };
  compare(website,observed.website.health,'website');
  if(website.kind==='variant'&&observed.website.health.ok&&observed.website.health.deploymentId!==null) {
    compare(website,observed.website.uiHealth,'website');compare(website,observed.website.uiRelease,'website');
  }
  compare(api,observed.api.health,'api');
  const fields=['environment','release','deploymentId','phase','migrationStage','registryGraph'];
  for(const value of [observed.website.uiHealth,observed.website.uiRelease]) {
    if(!value) continue;
    if(!value.ok) problems.push(value.reason.startsWith('http-')?'http-health':'identity-malformed');
    else if(value.environment!==environment) problems.push('identity-malformed');
    else if(observed.website.health.ok&&observed.website.health.environment===environment&&fields.some(field=>value[field]!==observed.website.health[field])) problems.push('stale-identity');
  }
  return [...new Set(problems)].sort();
}
// Retry propagation and HTTP outages only. A malformed identity, missing token,
// failed delivery queue or contract defect cannot be repaired by waiting.
export const TRANSIENT_LIVE_PROBLEMS=new Set(['analytics-config-mismatch','http-health','release-mismatch','stale-identity','site-unreachable','site-release-mismatch']);
export const LIVE_RETRY_WAITS=[4000,8000,12000,16000];
export const LIVE_BUDGET_MS=60000;
const boundedFetcher=(fetcher,deadline,clock)=>async(url,options={})=>{
  const remaining=deadline-clock();
  if(remaining<=0) throw new Error('Live check budget exhausted');
  const signals=[options.signal,AbortSignal.timeout(remaining)].filter(Boolean);
  return fetcher(url,{...options,signal:AbortSignal.any(signals)});
};
/** Sanitized fixed codes and independent observations for one live read. */
export async function liveProblems(environment,{website,api,token=process.env.HEALTH_TOKEN,expectedAnalyticsEnabled,fetcher=fetch}) {
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
  const commit=website.kind==='variant'?website.manifest.commit:website.commit;
  for(const [route,status] of [['/release.json',200],['/r/button.json',200],['/__cojeev_missing_release_probe__/',404]]) {
    let response;
    try {response=await fetcher(`${target.site}${route}`,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'}});}
    catch {problems.push('site-unreachable');continue;}
    if(response.status!==status||response.headers.get('x-content-type-options')!=='nosniff'||environment==='beta'&&!response.headers.get('x-robots-tag')?.includes('noindex')) {problems.push('site-contract');continue;}
    if(route!=='/release.json') continue;
    let value;
    try {value=await response.json();} catch {problems.push('site-contract');continue;}
    if(value.release!==commit||value.environment!==environment) problems.push('site-release-mismatch');
    else if(website.kind==='baseline'&&expectedAnalyticsEnabled!==undefined&&value.analyticsEnabled!==expectedAnalyticsEnabled) problems.push('analytics-config-mismatch');
  }
  return result();
}
/** Bounded propagation retries: at most five reads inside one wall-clock budget. */
export async function checkLiveRelease(environment,expected,{
  waits=LIVE_RETRY_WAITS,budgetMs=LIVE_BUDGET_MS,clock=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log,fetcher=fetch,...options
}={}) {
  const deadline=clock()+budgetMs;
  const bounded=boundedFetcher(fetcher,deadline,clock);
  for(let attempt=0;;attempt++) {
    const {problems}=await liveProblems(environment,{...expected,...options,fetcher:bounded});
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
    } else if(command==='verify') {await readVariant(path.resolve(directory),environment,commit,digest);console.log('Artifact verified');}
    else if(command==='deploy'||command==='rollback') console.log(JSON.stringify(await deployRelease(path.resolve(directory),environment,commit,digest,{rollback:command==='rollback'})));
    else if(command==='live') {
      const expected=process.env.EXPECTED_ANALYTICS_ENABLED;
      if(expected!==undefined&&!['true','false'].includes(expected)) throw new Error('Invalid expected analytics setting');
      const arguments_=process.argv.slice(4);
      if(arguments_.length!==2||arguments_.filter(value=>value.startsWith('--website=')).length!==1||arguments_.filter(value=>value.startsWith('--api=')).length!==1) throw new Error('Use live ENV --website=DIR:DIGEST|baseline --api=DIR:DIGEST|baseline');
      const identities={};
      for(const side of ['website','api']) identities[side]=await expectedFrom(environment,side,arguments_.find(value=>value.startsWith(`--${side}=`)).slice(side.length+3));
      await checkLiveRelease(environment,identities,{expectedAnalyticsEnabled:expected===undefined?undefined:expected==='true'});
      console.log(`live ok website=${expectedId(identities.website)} api=${expectedId(identities.api)}`);
    }
    else throw new Error('Use build-variants SHA DIRECTORY | verify/deploy/rollback ENV SHA DIRECTORY DIGEST | live ENV --website=DIR:DIGEST|baseline --api=DIR:DIGEST|baseline');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
