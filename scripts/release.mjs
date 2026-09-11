/** Verified static release packaging and promotion. No deployment occurs on build. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {buildEnvironment,environmentConfig} from './release-config.mjs';
import {assertCleanSource,copyCommittedSource,createManifest,manifestDigest,verifyManifest} from './release-manifest.mjs';
import {backup,cloudflare,validateDeploymentConfig,validateSecrets,wrangler} from './operations.mjs';
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
export async function deployRelease(directory,environment,commit,digest,{rollback=false,run=wrangler,backupDatabase=backup,cf=cloudflare}={}) {
  const manifest=await readArtifact(directory,environment,commit,digest);
  const target=environmentConfig(environment);
  const secrets=validateSecrets(process.env.REPORTING_SECRETS_JSON,environment);
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
  run(['deploy','--config',config,'--no-bundle','--secrets-file','/dev/stdin'],JSON.stringify(secrets));
  run(['deploy','--config',path.join(directory,'website/wrangler.jsonc'),'--no-bundle']);
  return {environment,commit,manifestDigest:digest,rollback};
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
    else if(command==='live') {
      const result=await checkHealth(environment,{token:process.env.HEALTH_TOKEN,commit});
      if(result.problems.length) throw new Error(`Live checks failed: ${result.problems.join(', ')}`);
      const target=environmentConfig(environment);
      for(const [route,status] of [['/release.json',200],['/r/button.json',200],['/__cojeev_missing_release_probe__/',404]]) {
        const response=await fetch(`${target.site}${route}`,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'}});
        if(response.status!==status||response.headers.get('x-content-type-options')!=='nosniff'||environment==='beta'&&!response.headers.get('x-robots-tag')?.includes('noindex')) throw new Error('Live website contract failed');
        if(route==='/release.json') {const value=await response.json();if(value.release!==commit||value.environment!==environment) throw new Error('Live artifact identity failed');}
      }
      console.log('Live release checks passed');
    } else throw new Error('Use build-pair SHA DIRECTORY | verify/deploy/rollback ENV SHA DIRECTORY DIGEST | live ENV SHA');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
