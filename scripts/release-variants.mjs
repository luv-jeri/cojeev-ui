/** Immutable side/phase layouts; all validation runs in temporary staging. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {environmentConfig} from './release-config.mjs';
import {readBaselineRecord,WEBSITE_PHASES,API_PHASES} from './release-phases.mjs';
import {createManifest,manifestDigest,verifyManifest} from './release-manifest.mjs';
import {validateDeploymentConfig} from './operations.mjs';
import {checkUiExport} from './check-ui-export.mjs';
import {retainedTextInventory,workerFirstList,workerFirstProblems} from './worker-first.mjs';
import {siteHeaders} from '../workers/registry-host/src/headers.mjs';

const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function readBaseline(environment,{
  record='scripts/release-baseline.json',
  directory=process.env[`BASELINE_${environment.toUpperCase()}_DIRECTORY`],
}={}) {
  const identity=await readBaselineRecord(environment,record);
  let manifest;
  try {
    if(!directory) throw new Error('missing directory');
    manifest=await json(path.join(directory,'manifest.json'));
  } catch(error) {
    if(!directory || ['ENOENT','ENOTDIR'].includes(error.code)) throw new Error(`Baseline artifact missing: ${environment}`);
    throw error;
  }
  await verifyManifest(directory,manifest,{environment,commit:identity.commit,digest:identity.digest,schema:1});
  return {...identity,siteRoot:path.join(directory,'site'),hashes:new Map(Object.entries(manifest.files))};
}

export function newDeploymentId(side,phase,commit) {
  return `${side}-${phase}-${commit.slice(0,12)}-${randomBytes(4).toString('hex')}`;
}

async function hashes(root,prefix='') {
  const entries=[];
  for(const entry of await fs.readdir(path.join(root,prefix),{withFileTypes:true})) {
    const file=path.posix.join(prefix,entry.name);
    if(entry.isDirectory()) entries.push(...await hashes(root,file));
    else if(entry.isFile()) entries.push([file,hash(await fs.readFile(path.join(root,file)))]);
    else throw new Error('Artifact symlink or unsupported registry entry');
  }
  return entries.sort(([a],[b])=>a<b?-1:a>b?1:0);
}
function requireEmpty(problems,label) {
  if(problems.length) throw new Error(`${label}: ${problems.join('; ')}`);
}

/** Package one already-built export and its bundles into a staging directory. */
export async function packageEnvironment(out,environment,commit,destination,{baseline,publicMetadata,workers}) {
  requireEmpty(await checkUiExport(out,'/ui'),'Invalid /ui export');
  const canonicalHashes=await hashes(path.join(out,'r'));
  const baselineHashes=[...baseline.hashes].filter(([file])=>file.startsWith('site/r/'))
    .map(([file,hash])=>[file.slice('site/r/'.length),hash]).sort(([a],[b])=>a<b?-1:a>b?1:0);
  const result={};
  for(const [side,phases] of [['website',WEBSITE_PHASES],['api',API_PHASES]]) {
    for(const [phase,row] of Object.entries(phases)) {
      const variant=`${side}-${phase}`,directory=path.join(destination,variant);
      const deploymentId=newDeploymentId(side,phase,commit);
      const identity={side,phase,deploymentId,baseline:{commit:baseline.commit,digest:baseline.digest,hashes:baseline.hashes}};
      const config=structuredClone(workers[side].config);
      Object.assign(config.vars,{RELEASE:commit,PHASE:phase,DEPLOYMENT_ID:deploymentId});
      await fs.mkdir(path.join(directory,side),{recursive:true});
      await fs.copyFile(workers[side].bundle,path.join(directory,side,'index.js'));
      if(side==='website') {
        Object.assign(identity,{migrationStage:row.MIGRATION_STAGE,registryGraph:row.REGISTRY_GRAPH});
        Object.assign(config.vars,row);
        const site=path.join(directory,'site');
        await fs.mkdir(site);
        // Retain the same environment's original root export in every phase.
        for(const entry of await fs.readdir(baseline.siteRoot)) {
          if(['r','release.json','_headers','404.html'].includes(entry)) continue;
          await fs.cp(path.join(baseline.siteRoot,entry),path.join(site,entry),{recursive:true});
        }
        await fs.cp(out,path.join(site,'ui'),{recursive:true});
        await fs.rm(path.join(site,'ui/r'),{recursive:true,force:true});
        const registry=phase==='mounted'?path.join(baseline.siteRoot,'r'):path.join(out,'r');
        await fs.cp(registry,path.join(site,'r'),{recursive:true});
        await fs.cp(registry,path.join(site,'ui/r'),{recursive:true});
        await fs.copyFile(path.join(out,'404.html'),path.join(site,'404.html'));
        await fs.writeFile(path.join(site,'_headers'),siteHeaders(environment));
        await fs.writeFile(path.join(site,'ui/release.json'),JSON.stringify({
          ...publicMetadata,deploymentId,phase,migrationStage:row.MIGRATION_STAGE,registryGraph:row.REGISTRY_GRAPH,
        })+'\n');
        const inventory=await retainedTextInventory(site),list=workerFirstList(inventory);
        requireEmpty(workerFirstProblems(list,inventory),'Invalid Worker-first inventory');
        config.assets={...config.assets,directory:'../site',run_worker_first:list};
        const expected=phase==='mounted'?baselineHashes:canonicalHashes;
        if(!isDeepStrictEqual(await hashes(path.join(site,'r')),expected) ||
          !isDeepStrictEqual(await hashes(path.join(site,'ui/r')),expected)) throw new Error(`Registry byte mismatch: ${variant}`);
      } else {
        identity.reportingBase=row.reportingBase;
        const target=environmentConfig(environment);
        config.vars.LEGACY_SITE_URL=target.legacySite;
        config.vars.SITE_URL=phase==='prepared'?target.legacySite:target.canonicalSite;
        await fs.cp(workers.api.migrations,path.join(directory,'api/migrations'),{recursive:true});
      }
      validateDeploymentConfig(environment,config,side);
      await fs.writeFile(path.join(directory,side,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
      const manifest=await createManifest(directory,environment,commit,identity);
      await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
      const digest=manifestDigest(manifest);
      await readVariant(directory,environment,commit,digest);
      result[variant]={directory,digest,deploymentId};
    }
  }
  return result;
}

export async function readVariant(directory,environment,commit,digest) {
  const manifest=await json(path.join(directory,'manifest.json'));
  await verifyManifest(directory,manifest,{environment,commit,digest,schema:2});
  const {side,phase,deploymentId}=manifest;
  const config=await json(path.join(directory,side,'wrangler.jsonc'));
  validateDeploymentConfig(environment,config,side);
  if(config.main!=='./index.js' || config.vars.RELEASE!==commit || config.vars.PHASE!==phase ||
    config.vars.DEPLOYMENT_ID!==deploymentId || !deploymentId.startsWith(`${side}-${phase}-${commit.slice(0,12)}-`))
    throw new Error('Artifact release/config identity mismatch');
  if(side==='website') {
    const release=await json(path.join(directory,'site/ui/release.json'));
    if(typeof release.analyticsEnabled!=='boolean' || !isDeepStrictEqual(release,{
      environment,release:commit,deploymentId,phase,migrationStage:manifest.migrationStage,
      registryGraph:manifest.registryGraph,analyticsEnabled:release.analyticsEnabled,
    })) throw new Error('Public release identity mismatch');
  }
  return {manifest,config,side,phase,deploymentId};
}
