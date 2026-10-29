import {pathToFileURL} from 'node:url';
import {ALERT_LABEL,github} from './operations-health.mjs';

// The shadcn directory orders registries by its own hourly monitor (shadcn-ui/ui
// apps/v4/lib/registry-health). The leaders sit within a tenth of a point, so one
// failed hourly check costs about ten places for seven days. This watches what that
// monitor recorded about our registries and fetches each index the way it does.
export const FEED='https://ui.shadcn.com/r/registries.json';
export const WATCHED=['@000h-cojeev','@0nlytype'];
const HEALTH_MAX_AGE_MS=6*60*60*1000, BUDGET_MS=10_000, SLOW_MS=5_000, MAX_REDIRECTS=5, MAX_BYTES=10*1024*1024;
const codes=new Set(['missing','missed-check','not-healthy','hygiene','items','probe-failed','probe-slow']);

// Mirrors getRankingGroup and createRegistryDirectoryView in directory.ts.
export function directoryOrder(feed,now=Date.now()) {
  const fresh=entry=>{const age=now-new Date(entry.health?.checkedAt).getTime();return age>=0&&age<=HEALTH_MAX_AGE_MS;};
  const group=entry=>!fresh(entry)?1:entry.health.status==='unavailable'?2
    :entry.health.status==='observing'||entry.health.monitoringLimited||!entry.ranking||entry.ranking.itemCount===0?1:0;
  return feed.filter(entry=>typeof entry?.name==='string').toSorted((a,b)=>group(a)-group(b)
    ||(group(a)===0?(b.ranking.score-a.ranking.score):0)
    ||a.name.toLowerCase().localeCompare(b.name.toLowerCase(),'en'));
}

export function assessStanding(feed,now=Date.now()) {
  const order=directoryOrder(feed,now);
  const ranked=order.filter(entry=>entry.ranking&&entry.health?.status==='healthy');
  // score.ts smooths availability as (successes + 24 * mean) / (checks + 24). The best
  // value in the feed is a perfect week (168 checks), which gives the mean back, and
  // with it what a perfect record is worth for a registry younger than a week.
  const best7d=Math.max(...ranked.map(entry=>entry.health.availability7d)), prior=best7d*192-168;
  const perfect7d=entry=>{const checks=Math.max(0,Math.min(168,Math.floor((now-new Date(entry.health.firstObservedAt).getTime())/3_600_000)));return (checks+prior)/(checks+24);};
  return WATCHED.map(name=>{
    const position=order.findIndex(entry=>entry.name===name), entry=order[position], problems=[];
    if(!entry?.health||now-new Date(entry.health.checkedAt).getTime()>HEALTH_MAX_AGE_MS) return {name,problems:['missing']};
    // One failed check costs at least 1/192 (0.0052), far above this margin.
    if(entry.health.availability7d<perfect7d(entry)-0.002) problems.push('missed-check');
    if(entry.health.status!=='healthy') problems.push('not-healthy');
    if(entry.health.breakdown?.hygiene!==10) problems.push('hygiene');
    if(!(entry.ranking?.itemCount>=500)) problems.push('items');
    return {name,url:entry.url,rank:position+1,score:entry.ranking?.score,availability7d:entry.health.availability7d,best7d,problems};
  });
}

// Same limits as the monitor's network.ts: manual redirects, one 10 s budget, 10 MB body.
export async function probeIndex(name,template,{fetcher=fetch,clock=Date.now}={}) {
  const started=clock(), deadline=AbortSignal.timeout(BUDGET_MS);
  let url=template.replace('{name}','registry');
  try {
    for(let redirects=0;redirects<=MAX_REDIRECTS;redirects++) {
      const response=await fetcher(url,{headers:{'User-Agent':'cojeev-directory-watch'},redirect:'manual',signal:deadline});
      if([301,302,303,307,308].includes(response.status)) {
        const location=response.headers.get('location');await response.body?.cancel();
        if(!location) break;
        url=new URL(location,url).href;continue;
      }
      if(response.status!==200||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')) break;
      const text=await response.text();
      if(Buffer.byteLength(text)>MAX_BYTES) break;
      const index=JSON.parse(text);
      if(String(index?.name).toLowerCase()!==name.replace(/^@/,'').toLowerCase()||!Array.isArray(index.items)||!index.items.length) break;
      return {ok:true,redirects,ms:clock()-started};
    }
  } catch {}
  return {ok:false,ms:clock()-started};
}

export async function checkStanding({fetcher=fetch,clock=Date.now}={}) {
  const response=await fetcher(FEED,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error('Directory feed unavailable');
  const standing=assessStanding(await response.json(),clock());
  for(const entry of standing) {
    if(!entry.url) continue;
    const probe=await probeIndex(entry.name,entry.url,{fetcher,clock});
    entry.probe=probe;
    if(!probe.ok) entry.problems.push('probe-failed');
    else if(probe.ms>SLOW_MS) entry.problems.push('probe-slow');
  }
  return standing;
}

const marker='<!-- cojeev-directory -->';
// The body names only the problem codes, so it changes when a problem starts or
// ends, not every run as the scores drift.
export async function updateDirectoryAlert(standing,client=github) {
  const lines=standing.map(entry=>[entry.name,entry.problems.filter(code=>codes.has(code)).sort()]).filter(([,problems])=>problems.length);
  const open=await client(`issues?state=open&labels=${ALERT_LABEL}&per_page=100`);
  const existing=open.find(issue=>!issue.pull_request&&issue.body?.includes(marker));
  if(!lines.length) {
    if(existing) await client(`issues/${existing.number}`,{method:'PATCH',body:{state:'closed',state_reason:'completed',body:`${marker}\nRecovered: every watched registry passes the shadcn directory checks. @luv-jeri`}});
    return;
  }
  const body={title:'Directory alert: shadcn ranking at risk',body:`${marker}\n@luv-jeri: the shadcn directory monitor is costing us places.\n\n${lines.map(([name,problems])=>`- ${name}: ${problems.join(', ')}`).join('\n')}\n\nmissed-check: the monitor recorded a failed hourly index check in the last 7 days. probe-failed or probe-slow: our index fails, or nears, the monitor's 10 s budget right now. Feed: ${FEED}`,state:'open'};
  if(existing?.body===body.body) return;
  if(!existing) await client('labels',{method:'POST',body:{name:ALERT_LABEL,color:'b60205',description:'Automated release operations health alert'}}).catch(()=>{});
  await client(existing?`issues/${existing.number}`:'issues',{method:existing?'PATCH':'POST',body:existing?body:{...body,labels:[ALERT_LABEL]}});
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const standing=await checkStanding();
    if(process.env.UPDATE_ALERT==='true') await updateDirectoryAlert(standing);
    console.log(JSON.stringify(standing));
    // A missed check stays in the feed for seven days; the open issue carries it,
    // so only a broken watcher turns the scheduled run red.
  } catch {console.error('Directory standing check failed.');process.exitCode=1;}
}
