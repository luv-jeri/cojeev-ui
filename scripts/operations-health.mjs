import {pathToFileURL} from 'node:url';
import {environmentConfig} from './release-config.mjs';

const codes=new Set(['http-health','release-mismatch','invalid-delivery-health','delivery-stalled','delivery-review','email-quota','provider-unconfigured','deployment-failed','recovery-failed']);
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
  // Held historical work and intentional disabled rollout are not an incident.
  if(data.activationCutoff && (!data.providers.email||!data.providers.github||!data.providers.resendWebhook)) problems.add('provider-unconfigured');
  return [...problems].sort();
}
export async function checkHealth(environment,{token,commit,fetcher=fetch}={}) {
  const target=environmentConfig(environment),problems=[];
  const get=async(url,headers={})=>{
    const response=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('HTTP check failed');
    return response.json();
  };
  let site,api;
  try {
    site=await get(`${target.site}/health`);api=await get(`${target.api}/health`);
    if([site,api].some(value=>value.status!=='ok'||value.environment!==environment||!/^[a-f0-9]{40}$/.test(value.release))||site.release!==api.release||(commit&&site.release!==commit)) problems.push('release-mismatch');
  } catch {problems.push('http-health');}
  if(!token) problems.push('invalid-delivery-health');
  else try {problems.push(...assessHealth(await get(`${target.api}/v1/admin/health`,{Authorization:`Bearer ${token}`})));} catch {problems.push('invalid-delivery-health');}
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
    const [environment,commit]=process.argv.slice(2);
    const result=process.env.OPERATIONS_FAILURE
      ? {environment,problems:[process.env.OPERATIONS_FAILURE]}
      : await checkHealth(environment,{token:process.env.HEALTH_TOKEN,commit});
    if(process.env.UPDATE_ALERT==='true') await updateAlert(environment,result.problems);
    console.log(JSON.stringify(result));
    if(result.problems.length) process.exitCode=1;
  } catch {console.error('Operations health check failed; no private response was logged.');process.exitCode=1;}
}
