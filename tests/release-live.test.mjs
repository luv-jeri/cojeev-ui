import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLiveRelease,liveProblems,LIVE_BUDGET_MS,LIVE_RETRY_WAITS,TRANSIENT_LIVE_PROBLEMS} from '../scripts/release.mjs';

const commit='a'.repeat(40),token='t'.repeat(40);
const site='https://beta.000h.cojeev.com',api='https://feedback-beta.cojeev.com';
const headers={'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
const delivery={queue:[],usage:{daily:0,monthly:0},limits:{daily:95,monthly:2850},providers:{email:true,github:true,resendWebhook:true},activationCutoff:1};

/** One simulated edge. `release` is what this edge currently serves. */
function edge({release=commit,unreachable=false,contract=false,stalled=false}={}) {
  return async url=>{
    if(unreachable) throw new Error('connect ECONNREFUSED 127.0.0.1:443');
    if(url===`${site}/health`||url===`${api}/health`) return Response.json({status:'ok',environment:'beta',release},{headers});
    if(url===`${api}/v1/admin/health`) return Response.json(stalled?{...delivery,queue:[{state:'pending',count:4,oldestAgeMs:3600000}]}:delivery,{headers});
    if(url===`${site}/release.json`) return Response.json({environment:'beta',release},{headers:contract?{}:headers});
    if(url===`${site}/r/button.json`) return Response.json({name:'button'},{headers});
    if(url===`${site}/__cojeev_missing_release_probe__/`) return new Response('not found',{status:404,headers});
    throw new Error(`unexpected live request: ${url}`);
  };
}
/** Serve `stale` for the first `after` attempts, then serve the new release. */
function propagating(after,stale='b'.repeat(40)) {
  let attempts=0;
  // The site health probe is the first request of every attempt, so counting it
  // counts attempts rather than individual reads.
  return async url=>{
    if(url===`${site}/health`) attempts++;
    return edge({release:attempts>after?commit:stale})(url);
  };
}

test('a fully propagated release passes on the first read with no waiting',async()=>{
  const waited=[];
  const problems=await checkLiveRelease('beta',commit,{token,fetcher:edge(),sleep:async ms=>waited.push(ms),log:()=>{}});
  assert.deepEqual(problems,[]);
  assert.deepEqual(waited,[]);
});

test('propagation lag is retried within the bounded window and passes once the edge catches up',async()=>{
  const waited=[],lines=[];
  await checkLiveRelease('beta',commit,{token,fetcher:propagating(2),sleep:async ms=>waited.push(ms),log:line=>lines.push(line)});
  assert.deepEqual(waited,LIVE_RETRY_WAITS.slice(0,2));
  assert.equal(lines.length,2);
  // Sanitized: fixed codes and the attempt counter only, never a token or a body.
  for(const line of lines) {
    assert.match(line,/^Live checks attempt [12]\/5: release-mismatch, site-release-mismatch; retrying in \d+s$/);
    assert.ok(!line.includes(token)&&!line.includes(commit),line);
  }
});

test('an unreachable site is treated as propagation and retried, not reported as a defect',async()=>{
  const waited=[];
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:edge({unreachable:true}),sleep:async ms=>waited.push(ms),log:()=>{}}),
    /Live checks failed after 5 attempts within the 60s propagation budget: http-health, site-unreachable/);
  assert.deepEqual(waited,LIVE_RETRY_WAITS);
});

test('the budget is wall-clock time including the reads, not only the sleeping',async()=>{
  // Every read takes 18s of the budget; the waits alone would still allow five
  // attempts, so only a real deadline can stop this.
  let now=0;
  const waited=[],clock=()=>now;
  const slow=async url=>{now+=18000;return edge({release:'b'.repeat(40)})(url);};
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:slow,clock,sleep:async ms=>{waited.push(ms);now+=ms;},log:()=>{}}),
    /within the 60s propagation budget/);
  assert.ok(waited.length<LIVE_RETRY_WAITS.length,`stopped after ${waited.length} waits`);
  assert.ok(now<=LIVE_BUDGET_MS+18000,`total ${now}ms stayed inside the budget plus one in-flight read`);
  // A wait is truncated to what is left rather than overrunning the deadline.
  assert.ok(waited.every(wait=>wait>0));
  assert.equal(waited.reduce((total,wait)=>total+wait,0)+18000*(waited.length+1)<=LIVE_BUDGET_MS+18000,true);
});

test('every request is aborted at the deadline rather than waiting out its own timeout',async()=>{
  const signals=[];
  const fetcher=async(url,options)=>{signals.push(options.signal);return edge()(url);};
  await checkLiveRelease('beta',commit,{token,fetcher,sleep:async()=>{},log:()=>{}});
  assert.ok(signals.length>=4);
  for(const signal of signals) assert.ok(signal instanceof AbortSignal);
});

test('a permanent failure is reported on the first read and is never retried',async()=>{
  const cases=[
    // A missing health token is configuration, not propagation.
    {options:{fetcher:edge()},expected:/invalid-delivery-health/},
    // A stalled delivery queue and a broken header contract are real defects.
    {options:{token,fetcher:edge({stalled:true})},expected:/delivery-stalled/},
    {options:{token,fetcher:edge({contract:true})},expected:/site-contract/},
  ];
  for(const {options,expected} of cases) {
    const waited=[];
    await assert.rejects(checkLiveRelease('beta',commit,{...options,sleep:async ms=>waited.push(ms),log:()=>{}}),error=>{
      assert.match(error.message,/^Live checks failed after 1 attempt: /);
      assert.match(error.message,expected);
      return true;
    });
    assert.deepEqual(waited,[]);
  }
});

test('a permanent code alongside a propagation code stops immediately',async()=>{
  const waited=[];
  const fetcher=async url=>url===`${api}/v1/admin/health`
    ? Response.json({...delivery,usage:{daily:95,monthly:1}},{headers})
    : edge({release:'b'.repeat(40)})(url);
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher,sleep:async ms=>waited.push(ms),log:()=>{}}),
    /after 1 attempt: email-quota, release-mismatch, site-release-mismatch/);
  assert.deepEqual(waited,[]);
});

test('the transient set stays narrow and every site probe code is accounted for',async()=>{
  assert.deepEqual([...TRANSIENT_LIVE_PROBLEMS].sort(),['http-health','release-mismatch','site-release-mismatch','site-unreachable']);
  assert.ok(!TRANSIENT_LIVE_PROBLEMS.has('site-contract'));
  assert.deepEqual(await liveProblems('beta',commit,{token,fetcher:edge()}),[]);
  assert.deepEqual(await liveProblems('beta',commit,{token,fetcher:edge({contract:true})}),['site-contract']);
});
