import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStanding,directoryOrder,probeIndex,updateDirectoryAlert,checkStanding,FEED} from '../scripts/directory-standing.mjs';

const now=Date.parse('2026-10-29T10:00:00Z');
const checkedAt='2026-10-29T09:24:47.066Z';
function entry(name,score,{availability7d=0.98945,status='healthy',hygiene=10,itemCount=900,firstObservedAt='2026-08-24T00:00:00Z',url=`https://${name.slice(1)}.example/r/{name}.json`}={}) {
  return {name,url,health:{status,availability7d,firstObservedAt,checkedAt,monitoringLimited:false,breakdown:{hygiene}},ranking:{score,itemCount}};
}

test('directory order follows directory.ts: ranked groups first, score descending, ties by lowercase name',()=>{
  const feed=[entry('@b',99.1),entry('@A',99.1),entry('@down',99.9,{status:'unavailable'}),entry('@new',99.9,{status:'observing'}),entry('@top',99.2),{...entry('@stale',99.95),health:{...entry('@stale',1).health,checkedAt:'2026-10-28T00:00:00Z'}}];
  assert.deepEqual(directoryOrder(feed,now).map(item=>item.name),['@top','@A','@b','@new','@stale','@down']);
});

test('one failed hourly check is flagged; a young registry with a perfect record is not',()=>{
  const feed=[entry('@leader',99.18),entry('@000h-cojeev',99.036,{availability7d:0.984242,itemCount:1876}),entry('@0nlytype',97.222,{availability7d:0.97147,itemCount:848,firstObservedAt:'2026-10-27T11:29:08.685Z'})];
  const [ours,young]=assessStanding(feed,now);
  assert.deepEqual(ours.problems,['missed-check']);
  assert.equal(ours.rank,2);
  assert.deepEqual(young.problems,[]);
  // The same young registry with one failure among its 46 checks: (45 + prior) / 70.
  const failed=assessStanding([...feed.slice(0,2),entry('@0nlytype',97,{availability7d:0.956778,firstObservedAt:'2026-10-27T11:29:08.685Z'})],now)[1];
  assert.deepEqual(failed.problems,['missed-check']);
});

test('lost hygiene, a shrunken catalogue, an unhealthy status and an absent entry are each named',()=>{
  const feed=[entry('@leader',99.18),entry('@000h-cojeev',98,{hygiene:7.5,itemCount:174,status:'degraded'})];
  assert.deepEqual(assessStanding(feed,now)[0].problems,['not-healthy','hygiene','items']);
  assert.deepEqual(assessStanding(feed,now)[1].problems,['missing']);
});

function server(routes) {
  const seen=[];
  return {seen,fetcher:async url=>{seen.push(url);const route=routes[url];return route?route():new Response('missing',{status:404});}};
}
const index=name=>()=>Response.json({name,items:[{name:'button'}]});

test('the probe follows redirects like the monitor and checks the index it lands on',async()=>{
  const {fetcher,seen}=server({
    'https://000h.cojeev.com/r/registry.json':()=>new Response(null,{status:301,headers:{location:'https://cojeev.com/ui/r/registry.json'}}),
    'https://cojeev.com/ui/r/registry.json':index('000h-cojeev'),
  });
  const result=await probeIndex('@000h-cojeev','https://000h.cojeev.com/r/{name}.json',{fetcher});
  assert.equal(result.ok,true);assert.equal(result.redirects,1);
  assert.deepEqual(seen,['https://000h.cojeev.com/r/registry.json','https://cojeev.com/ui/r/registry.json']);
  assert.equal((await probeIndex('@0nlytype','https://x.example/r/{name}.json',{fetcher:server({'https://x.example/r/registry.json':index('0nlyType')}).fetcher})).ok,true);
});

test('the probe fails on HTML, a wrong name, an empty index, six redirects and a thrown fetch',async()=>{
  const url='https://x.example/r/registry.json', template='https://x.example/r/{name}.json';
  for(const route of [
    ()=>new Response('<html>',{headers:{'content-type':'text/html'}}),
    index('someone-else'),
    ()=>Response.json({name:'x',items:[]}),
    ()=>new Response(null,{status:302,headers:{location:url}}),
    ()=>{throw new Error('reset');},
  ]) assert.equal((await probeIndex('@x',template,{fetcher:server({[url]:route}).fetcher})).ok,false);
});

test('a slow index is flagged before it reaches the monitor budget',async()=>{
  let time=0;
  const {fetcher}=server({[FEED]:()=>Response.json([entry('@000h-cojeev',99.1),entry('@0nlytype',99.1)].map(item=>({...item,health:{...item.health,checkedAt:new Date(time).toISOString()}}))),
    'https://000h-cojeev.example/r/registry.json':()=>{time+=6000;return index('000h-cojeev')();},
    'https://0nlytype.example/r/registry.json':index('0nlytype')});
  const standing=await checkStanding({fetcher,clock:()=>time});
  assert.deepEqual(standing.map(item=>item.problems),[['probe-slow'],[]]);
});

test('the alert opens once, changes only with the problem set, and closes on recovery',async()=>{
  const calls=[];let issues=[];
  const client=async(endpoint,options={})=>{
    calls.push([options.method??'GET',endpoint]);
    if(endpoint.startsWith('issues?')) return issues;
    if(options.method==='POST'&&endpoint==='issues') issues=[{number:7,...options.body}];
    if(options.method==='PATCH') issues=options.body.state==='closed'?[]:[{number:7,...options.body}];
    return {};
  };
  const bad=[{name:'@000h-cojeev',problems:['missed-check']},{name:'@0nlytype',problems:[]}];
  await updateDirectoryAlert(bad,client);
  assert.ok(issues[0].body.includes('- @000h-cojeev: missed-check'));
  assert.ok(!issues[0].body.includes('@0nlytype'));
  assert.deepEqual(issues[0].labels,['operations-alert']);
  calls.length=0;await updateDirectoryAlert(bad,client);
  assert.deepEqual(calls.map(call=>call[0]),['GET']);
  await updateDirectoryAlert([{name:'@000h-cojeev',problems:[]},{name:'@0nlytype',problems:[]}],client);
  assert.equal(calls.at(-1)[0],'PATCH');assert.deepEqual(issues,[]);
});
