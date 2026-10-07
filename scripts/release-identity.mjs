/** Dependency-free live identity readers shared by release and operations. */
import {environmentConfig} from './release-config.mjs';
import {WEBSITE_PHASES,API_PHASES} from './release-phases.mjs';

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
    const target=environmentConfig(environment);
    const expectedValue=field=>side==='api'&&field==='reportingBase'
      ? ({legacy:target.legacySite,canonical:target.canonicalSite}[expected.manifest.reportingBase])
      : expected.manifest[field];
    if(fields.some(field=>observation[field]!==expectedValue(field))) problems.push('stale-identity');
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
