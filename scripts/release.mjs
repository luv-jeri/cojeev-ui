/** Verified static release packaging and promotion. No deployment occurs on build. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {buildEnvironment,environmentConfig} from './release-config.mjs';
import {assertCleanSource,copyCommittedSource,createManifest,manifestDigest,verifyManifest} from './release-manifest.mjs';
import {prepareDatabaseRecovery,cloudflare,composeSecretBundles,validateDeploymentConfig,validateSecrets,wrangler} from './operations.mjs';
import {checkHealth} from './operations-health.mjs';

const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
export async function buildRelease(root,environment,commit,destination,settings={}) {
  if(process.versions.node!=='22.22.0') throw new Error('Release build requires Node 22.22.0');
  assertCleanSource(root,commit);
  const publicEnv=buildEnvironment(environment,commit,settings);
  if(JSON.parse(await fs.readFile(path.join(root,'node_modules/wrangler/package.json'),'utf8')).version!=='4.130.0') throw new Error('Locked Wrangler 4.130.0 required');
  // Verify each tracked file's Git blob identity without hydrating archived Git
  // objects from a potentially cloud-backed .git directory.
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-release-source-'));
  try {
    await copyCommittedSource(root,commit,scratch);
    // Turbopack refuses node_modules symlinks outside its filesystem root.
    // Copy the already lock-installed dependencies, not project/private state.
    await fs.cp(await fs.realpath(path.join(root,'node_modules')),path.join(scratch,'node_modules'),{recursive:true,verbatimSymlinks:true});
    const buildEnv={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,CI:'true',NEXT_TELEMETRY_DISABLED:'1',...publicEnv};
    execFileSync('npm',['run','build'],{cwd:scratch,env:buildEnv,stdio:'inherit'});
    // Refuse to merge into an older release directory.
    await fs.mkdir(destination,{recursive:false});
    await fs.cp(path.join(scratch,'out'),path.join(destination,'site'),{recursive:true});
    await fs.writeFile(path.join(destination,'site/release.json'),JSON.stringify({environment,release:commit})+'\n');
    for(const [kind,worker] of [['api','reporting'],['website','registry-host']]) {
      const directory=path.join(destination,kind);await fs.mkdir(directory);
      const source=await json(path.join(scratch,`workers/${worker}/wrangler.jsonc`));
      const config={...source,...source.env[environment],vars:{...source.env[environment].vars,RELEASE:commit},main:'./index.js'};
      delete config.env;delete config.$schema;
      if(kind==='website') config.assets={...config.assets,directory:'../site'};
      else {
        config.d1_databases=config.d1_databases.map(binding=>({...binding,migrations_dir:'./migrations'}));
        await fs.cp(path.join(scratch,'workers/reporting/migrations'),path.join(directory,'migrations'),{recursive:true});
      }
      validateDeploymentConfig(environment,config,kind);
      await build({entryPoints:[path.join(scratch,`workers/${worker}/${source.main}`)],outfile:path.join(directory,'index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',logLevel:'silent'});
      await fs.writeFile(path.join(directory,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
    }
    const manifest=await createManifest(destination,environment,commit);
    await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    assertCleanSource(root,commit);
    return manifestDigest(manifest);
  } finally {await fs.rm(scratch,{recursive:true,force:true});}
}
export async function readArtifact(directory,environment,commit,digest) {
  const manifest=await json(path.join(directory,'manifest.json'));
  await verifyManifest(directory,manifest,{environment,commit,digest});
  for(const kind of ['api','website']) {
    const config=await json(path.join(directory,kind,'wrangler.jsonc'));
    validateDeploymentConfig(environment,config,kind);
    if(config.vars.RELEASE!==commit||config.main!=='./index.js') throw new Error('Artifact release/config mismatch');
  }
  const release=await json(path.join(directory,'site/release.json'));
  if(release.environment!==environment||release.release!==commit) throw new Error('Public release identity mismatch');
  return manifest;
}
export async function deployRelease(directory,environment,commit,digest,{rollback=false,run=wrangler,backupDatabase=prepareDatabaseRecovery,cf=cloudflare}={}) {
  const manifest=await readArtifact(directory,environment,commit,digest);
  const target=environmentConfig(environment);
  const secrets=validateSecrets(composeSecretBundles(process.env.REPORTING_SECRETS_JSON,process.env.REPORTING_ADDITIONAL_SECRETS_JSON),environment);
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
// Cloudflare acknowledges a deploy before every edge serves the new Worker and
// asset version, so the first live read can legitimately still answer with the
// previous release. Retry only the codes a later read can resolve. A missing
// health token, a stalled or failed delivery queue, email quota, an unconfigured
// provider and a broken header/404 contract are real defects that no amount of
// further waiting repairs, so they fail on the first attempt; a run that carries
// any one of them never retries, even alongside a propagation code.
export const TRANSIENT_LIVE_PROBLEMS=new Set(['http-health','release-mismatch','site-unreachable','site-release-mismatch']);
export const LIVE_RETRY_WAITS=[4000,8000,12000,16000];
// One real wall-clock budget for the whole check, reads included. Every request
// is aborted at the deadline and every wait is truncated to what is left, so the
// deploy job cannot be held open by slow reads rather than by sleeping.
export const LIVE_BUDGET_MS=60000;
const boundedFetcher=(fetcher,deadline,clock)=>async(url,options={})=>{
  const remaining=deadline-clock();
  if(remaining<=0) throw new Error('Live check budget exhausted');
  const signals=[options.signal,AbortSignal.timeout(remaining)].filter(Boolean);
  return fetcher(url,{...options,signal:AbortSignal.any(signals)});
};
/** Sanitized fixed codes for one live read of the deployed site and API. */
export async function liveProblems(environment,commit,{token=process.env.HEALTH_TOKEN,fetcher=fetch}={}) {
  let problems=await checkHealth(environment,{token,commit,fetcher}).then(result=>result.problems);
  // checkHealth reports a missing token and an admin endpoint that did not answer
  // usefully under one code. A token was supplied here, and the public endpoints
  // are unreachable too, so that is one outage rather than a second, permanent
  // configuration defect. If the outage clears while the admin answer is still
  // unusable, the code reappears on the next read and stops the run at once.
  if(token&&problems.includes('http-health')) problems=problems.filter(code=>code!=='invalid-delivery-health');
  const target=environmentConfig(environment);
  for(const [route,status] of [['/release.json',200],['/r/button.json',200],['/__cojeev_missing_release_probe__/',404]]) {
    let response;
    try {response=await fetcher(`${target.site}${route}`,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'}});}
    catch {problems.push('site-unreachable');continue;}
    if(response.status!==status||response.headers.get('x-content-type-options')!=='nosniff'||environment==='beta'&&!response.headers.get('x-robots-tag')?.includes('noindex')) {problems.push('site-contract');continue;}
    if(route!=='/release.json') continue;
    let value;
    try {value=await response.json();} catch {problems.push('site-contract');continue;}
    if(value.release!==commit||value.environment!==environment) problems.push('site-release-mismatch');
  }
  return [...new Set(problems)].sort();
}
/** Bounded propagation retries: at most five reads inside one wall-clock budget. */
export async function checkLiveRelease(environment,commit,{
  waits=LIVE_RETRY_WAITS,budgetMs=LIVE_BUDGET_MS,clock=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log,fetcher=fetch,...options
}={}) {
  const deadline=clock()+budgetMs;
  const bounded=boundedFetcher(fetcher,deadline,clock);
  for(let attempt=0;;attempt++) {
    const problems=await liveProblems(environment,commit,{...options,fetcher:bounded});
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
    if(command==='build-pair') {
      const source=process.cwd(),sha=environment,base=path.resolve(commit);
      assertCleanSource(source,sha);await fs.mkdir(base,{recursive:true});
      for(const name of ['beta','production']) {
        const prefix=name.toUpperCase();
        const hash=await buildRelease(source,name,sha,path.join(base,name),{
          NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:process.env[`${prefix}_POSTHOG_PROJECT_TOKEN`]??'',
          NEXT_PUBLIC_ANALYTICS_ENABLED:process.env[`${prefix}_ANALYTICS_ENABLED`]??'false',
          NEXT_PUBLIC_CONTACT_ENABLED:process.env.PUBLIC_CONTACT_ENABLED??'false',
        });
        console.log(`${name} ${sha} ${hash}`);
        if(process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,`${name}_digest=${hash}\n`);
      }
    } else if(command==='verify') {await readArtifact(path.resolve(directory),environment,commit,digest);console.log('Artifact verified');}
    else if(command==='deploy'||command==='rollback') console.log(JSON.stringify(await deployRelease(path.resolve(directory),environment,commit,digest,{rollback:command==='rollback'})));
    else if(command==='live') {await checkLiveRelease(environment,commit);console.log('Live release checks passed');}
    else throw new Error('Use build-pair SHA DIRECTORY | verify/deploy/rollback ENV SHA DIRECTORY DIGEST | live ENV SHA');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
