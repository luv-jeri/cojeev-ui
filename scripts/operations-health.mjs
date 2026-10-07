import {pathToFileURL} from 'node:url';
import {environmentConfig} from './release-config.mjs';
import {readIdentities,expectedId} from './release.mjs';
import {pairOf,readBaselineRecord} from './release-phases.mjs';

const codes=new Set(['http-health','release-mismatch','identity-malformed','website-identity-split','unlisted-pair','expected-identity-mismatch','legacy-registry','legacy-health','invalid-delivery-health','delivery-stalled','delivery-review','email-quota','provider-unconfigured','deployment-failed','recovery-failed']);
export function assessHealth(data) {
  if(!Array.isArray(data?.queue)||!data?.usage||!data?.limits||!data?.providers) return ['invalid-delivery-health'];
  const problems=new Set();
  for(const row of data.queue) {
    if(!Number.isFinite(row.count)||!Number.isFinite(row.oldestAgeMs)) { problems.add('invalid-delivery-health');continue; }
    if(row.count>0 && ['pending','processing'].includes(row.state) && row.oldestAgeMs>30*60*1000) problems.add('delivery-stalled');
    if(row.count>0 && ['failed','needs_review'].includes(row.state)) problems.add('delivery-review');
    if(row.count>0 && row.delivery_status==='quota') problems.add('email-quota');
  }
  if(data.usage.daily>=data.limits.daily || data.usage.monthly>=data.limits.monthly) problems.add('email-quota');
  // Held historical work and an environment that never declared itself active are not
  // an incident. A service declared active, or one already activated, must have every
  // delivery path configured — including the owner alert, whose absence is otherwise
  // silent: reports keep arriving and nobody is told.
  const ready=!!data.activationCutoff&&data.providers.email&&data.providers.github&&data.providers.resendWebhook&&data.providers.ownerNotification;
  if((data.deploymentIntent==='active'||data.activationCutoff)&&!ready) problems.add('provider-unconfigured');
  return [...problems].sort();
}
export async function checkHealth(environment,{token,expected={},fetcher=fetch}={}) {
  const target=environmentConfig(environment),problems=[];
  const observed=await readIdentities(environment,{fetcher});
  const {health,uiHealth,uiRelease}=observed.website,api=observed.api.health;
  for(const value of [health,uiHealth,uiRelease,api].filter(value=>value!==null)) {
    if(!value.ok) problems.push(value.reason.startsWith('http-')?'http-health':'identity-malformed');
    else if(value.environment!==environment) problems.push('identity-malformed');
  }
  if(!health.ok&&/^http-3\d\d$/.test(health.reason)) problems.push('legacy-health');
  if(health.ok&&health.deploymentId!==null) {
    const fields=['environment','release','deploymentId','phase','migrationStage','registryGraph'];
    for(const value of [uiHealth,uiRelease]) {
      if(!value) problems.push('identity-malformed');
      else if(value.ok&&fields.some(field=>value[field]!==health[field])) problems.push('website-identity-split');
    }
  }
  if(health.ok&&api.ok) {
    const websitePhase=health.deploymentId===null?'baseline':health.phase;
    const apiPhase=api.deploymentId===null?'baseline':api.phase;
    if(!pairOf(websitePhase,apiPhase)&&!(websitePhase==='baseline'&&apiPhase==='baseline')) problems.push('unlisted-pair');
  }
  for(const [side,value] of [['website',health],['api',api]]) {
    const wanted=expected[`${side}Id`];
    if(wanted===undefined) continue;
    let id=value.ok?value.deploymentId:null;
    if(value.ok&&id===null) {
      try {
        const baseline=await readBaselineRecord(environment);
        if(value.release===baseline.commit) id=expectedId({kind:'baseline',versionId:baseline[`${side}VersionId`]});
      } catch { /* An unpinned baseline cannot satisfy an expected ID. */ }
    }
    if(id!==wanted) problems.push('expected-identity-mismatch');
  }
  const get=async(url,headers={})=>{
    const response=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('HTTP check failed');
    return response.json();
  };
  if(!token) problems.push('invalid-delivery-health');
  else try {problems.push(...assessHealth(await get(`${target.api}/v1/admin/health`,{Authorization:`Bearer ${token}`})));} catch {problems.push('invalid-delivery-health');}
  try {
    const response=await fetcher(`${target.legacySite}/r/button.json`,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'}});
    if(response.status!==200||response.headers.get('location')) throw new Error('Legacy registry not direct');
    const registry=await response.json();
    if(!registry||typeof registry!=='object'||Array.isArray(registry)) throw new Error('Legacy registry not JSON object');
  } catch {problems.push('legacy-registry');}
  return {environment,problems:[...new Set(problems)].sort()};
}
export async function github(endpoint,options={}) {
  if(!process.env.GH_TOKEN) throw new Error('GitHub alert token missing');
  const response=await fetch(`https://api.github.com/repos/luv-jeri/cojeev-ui/${endpoint}`,{
    method:options.method??'GET',headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:options.body?JSON.stringify(options.body):undefined,redirect:'error',signal:AbortSignal.timeout(15000),
  });
  if(!response.ok) throw new Error('GitHub alert request failed');
  return response.json();
}
export const ALERT_LABEL='operations-alert';
export async function updateAlert(environment,problems,client=github) {
  environmentConfig(environment);
  const marker=`<!-- cojeev-health:${environment} -->`;
  const safe=[...new Set(problems.filter(code=>codes.has(code)))].sort();
  if(problems.length && !safe.length) safe.push('http-health');
  // One bounded labelled query, not a scan of every open issue: this repository
  // also receives mirrored public reports, so an unlabelled scan would grow with
  // adoption until it could no longer find the alert issue or close it.
  const open=await client(`issues?state=open&labels=${ALERT_LABEL}&per_page=100`);
  const existing=open.find(issue=>!issue.pull_request&&issue.body?.includes(marker));
  if(!safe.length) {
    if(existing) await client(`issues/${existing.number}`,{method:'PATCH',body:{state:'closed',state_reason:'completed',body:`${marker}\nRecovered: ${environment} checks pass. @luv-jeri`}});
    return;
  }
  const body={title:`Operations alert: ${environment}`,body:`${marker}\n@luv-jeri: ${environment} needs attention.\n\nChecks: ${safe.join(', ')}.\n\nInspect the protected operations run and authenticated inbox. No report contents are included.`,state:'open'};
  if(existing?.body===body.body) return;
  // An already-present label answers 422; the alert itself must still be filed.
  if(!existing) await client('labels',{method:'POST',body:{name:ALERT_LABEL,color:'b60205',description:'Automated release operations health alert'}}).catch(()=>{});
  // A PATCH carrying `labels` would replace whatever the owner added by hand, so
  // only the newly created issue asserts the label.
  await client(existing?`issues/${existing.number}`:'issues',{method:existing?'PATCH':'POST',body:existing?body:{...body,labels:[ALERT_LABEL]}});
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [environment]=process.argv.slice(2);
    const result=process.env.OPERATIONS_FAILURE
      ? {environment,problems:[process.env.OPERATIONS_FAILURE]}
      : await checkHealth(environment,{token:process.env.HEALTH_TOKEN,expected:{websiteId:process.env.EXPECTED_WEBSITE_ID,apiId:process.env.EXPECTED_API_ID}});
    if(process.env.UPDATE_ALERT==='true') await updateAlert(environment,result.problems);
    console.log(JSON.stringify(result));
    if(result.problems.length) process.exitCode=1;
  } catch {console.error('Operations health check failed; no private response was logged.');process.exitCode=1;}
}
