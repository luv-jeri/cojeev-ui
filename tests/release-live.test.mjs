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

/** Every endpoint answers `status` until `after` attempts have happened. */
function unavailable(after,status=503) {
  let attempts=0;
  return async url=>{
    if(url===`${site}/health`) attempts++;
    if(attempts>after) return edge()(url);
    return new Response('unavailable',{status,headers});
  };
}

test('a site that answers 503 everywhere is a propagation failure, not a contract failure',async()=>{
  const waited=[];
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:unavailable(Infinity),sleep:async ms=>waited.push(ms),log:()=>{}}),
    error=>{
      // The route contract belongs to whatever release is being served. While
      // public health says this release is not ready, that is not this release,
      // so its headers and 404 behaviour must not be reported as a defect here.
      assert.ok(!error.message.includes('site-contract'),error.message);
      assert.match(error.message,/after 5 attempts within the 60s propagation budget/);
      return true;
    });
  assert.deepEqual(waited,LIVE_RETRY_WAITS);
});

test('a fully propagated release passes on the first read with no waiting',async()=>{
  const waited=[];
  const problems=await checkLiveRelease('beta',commit,{token,fetcher:edge(),sleep:async ms=>waited.push(ms),log:()=>{}});
  assert.deepEqual(problems,[]);
  assert.deepEqual(waited,[]);
});

test('propagation lag is retried within the bounded window and passes once the edge catches up',async()=>{
  const waited=[],lines=[],requested=[];
  const stale=propagating(2);
  await checkLiveRelease('beta',commit,{token,sleep:async ms=>waited.push(ms),log:line=>lines.push(line),
    fetcher:async(url,options)=>{requested.push(url);return stale(url,options);}});
  assert.deepEqual(waited,LIVE_RETRY_WAITS.slice(0,2));
  assert.equal(lines.length,2);
  // Sanitized: fixed codes and the attempt counter only, never a token or a body.
  for(const line of lines) {
    assert.match(line,/^Live checks attempt [12]\/5: release-mismatch; retrying in \d+s$/);
    assert.ok(!line.includes(token)&&!line.includes(commit),line);
  }
  // The stale edge's routes were never read: its headers and 404 behaviour belong
  // to the previous release. They are read exactly once, on the ready attempt.
  assert.equal(requested.filter(url=>url===`${site}/release.json`).length,1);
  assert.equal(requested.filter(url=>url===`${site}/r/button.json`).length,1);
});

test('an unreachable site is treated as propagation and retried, not reported as a defect',async()=>{
  const waited=[];
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:edge({unreachable:true}),sleep:async ms=>waited.push(ms),log:()=>{}}),
    /Live checks failed after 5 attempts within the 60s propagation budget: http-health/);
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

test('the deadline actually fires: a read that never answers is aborted, not waited out',async()=>{
  // Real clock, real timers, no network. The stub never resolves on its own, so
  // only the budget's own AbortSignal can end this. Its 15s per-request timeout
  // and the 4s first wait are both far longer than the budget below, so the test
  // finishing at all is the evidence.
  const aborted=[];
  const hanging=(url,options)=>new Promise((resolve,reject)=>{
    options.signal.addEventListener('abort',()=>{aborted.push(url);reject(new Error('aborted'));},{once:true});
  });
  const started=Date.now();
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:hanging,budgetMs:50,log:()=>{}}),
    /Live checks failed after 1 attempt within the 0.05s propagation budget/);
  const elapsed=Date.now()-started;
  assert.ok(elapsed<2000,`the deadline fired after ${elapsed}ms, not the 15s request timeout`);
  assert.ok(aborted.length>0,'at least one in-flight read was aborted by the budget');
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
    /after 1 attempt: email-quota, release-mismatch/);
  assert.deepEqual(waited,[]);
});

test('the transient set stays narrow and every site probe code is accounted for',async()=>{
  assert.deepEqual([...TRANSIENT_LIVE_PROBLEMS].sort(),['http-health','release-mismatch','site-release-mismatch','site-unreachable']);
  assert.ok(!TRANSIENT_LIVE_PROBLEMS.has('site-contract'));
  assert.deepEqual(await liveProblems('beta',commit,{token,fetcher:edge()}),[]);
  assert.deepEqual(await liveProblems('beta',commit,{token,fetcher:edge({contract:true})}),['site-contract']);
});

test('the site recovers after a 503 or a 404 health outage and then passes on the real routes',async()=>{
  for(const status of [503,404]) {
    const waited=[],requested=[];
    const recovering=unavailable(2,status);
    const problems=await checkLiveRelease('beta',commit,{token,sleep:async ms=>waited.push(ms),log:()=>{},
      fetcher:async(url,options)=>{requested.push(url);return recovering(url,options);}});
    assert.deepEqual(problems,[],`status ${status}`);
    assert.deepEqual(waited,LIVE_RETRY_WAITS.slice(0,2),`status ${status}`);
    // The routes were read once, after readiness — never against the failing edge.
    assert.equal(requested.filter(url=>url===`${site}/r/button.json`).length,1,`status ${status}`);
  }
});

test('after readiness the route contract is authoritative again and fails permanently',async()=>{
  // A broken header and a wrong status are both real defects once public health
  // confirms this release: they stop on the first ready read, with no waiting.
  const broken=async url=>url===`${site}/r/button.json`
    ? new Response('{}',{status:500,headers})
    : edge()(url);
  for(const [fetcher,expected] of [[edge({contract:true}),/site-contract/],[broken,/site-contract/]]) {
    const waited=[];
    await assert.rejects(checkLiveRelease('beta',commit,{token,fetcher,sleep:async ms=>waited.push(ms),log:()=>{}}),error=>{
      assert.match(error.message,/^Live checks failed after 1 attempt: /);
      assert.match(error.message,expected);
      assert.ok(!/http-health|release-mismatch/.test(error.message),error.message);
      return true;
    });
    assert.deepEqual(waited,[]);
  }
  // The same wrong status is reported by one read of liveProblems too, so the
  // guard never turns a real status defect into a skipped check.
  assert.deepEqual(await liveProblems('beta',commit,{token,fetcher:broken}),['site-contract']);
});

test('a permanent delivery or configuration failure survives a transient public outage',async()=>{
  // The public endpoints are down, but the admin endpoint answers and reports a
  // stalled queue. No amount of waiting repairs that, so the run stops at once.
  const waited=[];
  const outage=async(url,options)=>url===`${api}/v1/admin/health`
    ? edge({stalled:true})(url,options)
    : new Response('unavailable',{status:503,headers});
  await assert.rejects(
    checkLiveRelease('beta',commit,{token,fetcher:outage,sleep:async ms=>waited.push(ms),log:()=>{}}),
    /after 1 attempt: delivery-stalled, http-health/);
  assert.deepEqual(waited,[]);
  // And a missing token stays permanent during an outage: the filter that folds
  // invalid-delivery-health into one outage applies only when a token was given.
  const noToken=[];
  await assert.rejects(
    checkLiveRelease('beta',commit,{fetcher:unavailable(Infinity),sleep:async ms=>noToken.push(ms),log:()=>{}}),
    /after 1 attempt: http-health, invalid-delivery-health/);
  assert.deepEqual(noToken,[]);
});

test('an unready read can never be mistaken for a clean one',async()=>{
  // The invariant the guard rests on, and the reason it needs no extra code:
  // every unready read already carries http-health or release-mismatch, so
  // liveProblems cannot return an empty list without having probed the routes.
  for(const fetcher of [unavailable(Infinity),unavailable(Infinity,404),edge({release:'b'.repeat(40)}),edge({unreachable:true})]) {
    const problems=await liveProblems('beta',commit,{token,fetcher});
    assert.ok(problems.length>0);
    assert.ok(problems.includes('http-health')||problems.includes('release-mismatch'),problems.join(', '));
    // And every code it did report is one a later read can resolve, so it retries.
    assert.ok(problems.every(code=>TRANSIENT_LIVE_PROBLEMS.has(code)),problems.join(', '));
  }
});
