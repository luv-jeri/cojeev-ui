import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the actual observer without starting its browser suite.
const source=await fs.readFile(new URL('./navigation-ui.browser.mjs',import.meta.url),'utf8');
const observer=source.slice(source.indexOf('function observe('),source.indexOf('\nasync function openPage'));
function failedRequest({url='http://127.0.0.1/ui/_next/static/chunks/required.js',type='script',method='GET',headers={},error='net::ERR_ABORTED'}={}) {
  return {url:()=>url,resourceType:()=>type,method:()=>method,headers:()=>headers,failure:()=>({errorText:error}),
    frame:()=>({page:()=>({url:()=> 'http://127.0.0.1/ui/docs/'})})};
}
function observeFailure(request) {
  const diagnostics=[],ignoredCancellations=[],handlers={};
  const observe=vm.runInNewContext(`(${observer})`,{URL,diagnostics,ignoredCancellations});
  observe({on:(event,handler)=>{handlers[event]=handler;}});
  handlers.requestfailed(request);
  return {diagnostics,ignoredCancellations};
}
test('aborted_required_chunk_produces_diagnostic',()=>{
  for(const type of ['script','stylesheet','document']) {
    assert.deepEqual(observeFailure(failedRequest({type,headers:{rsc:'1','next-router-prefetch':'1'}})),
      {diagnostics:['/ui/_next/static/chunks/required.js'],ignoredCancellations:[]});
  }
});
test('aborted_rsc_prefetch_is_exempted_and_counted',()=>{
  const request=failedRequest({url:'http://127.0.0.1/ui/docs/button/?_rsc=abc',type:'fetch',headers:{rsc:'1','next-router-prefetch':'1'}});
  assert.deepEqual(observeFailure(request),{diagnostics:[],ignoredCancellations:['/ui/docs/button/']});
  for(const overrides of [{headers:{}},{error:'net::ERR_FAILED'},{url:'https://other.example/ui/docs/?_rsc=a'}]) {
    assert.equal(observeFailure(failedRequest({url:request.url(),type:'fetch',headers:request.headers(),...overrides})).diagnostics.length,1);
  }
});
test('aborted_next_route_discovery_head_is_exempted',()=>{
  const discovery={url:'http://127.0.0.1/ui/docs/',type:'fetch',method:'HEAD'};
  assert.deepEqual(observeFailure(failedRequest(discovery)),
    {diagnostics:[],ignoredCancellations:['/ui/docs/']});
  for(const overrides of [
    {method:'GET'},
    {url:'http://127.0.0.1/docs/'},
    {url:'https://other.example/ui/docs/'},
    {error:'net::ERR_FAILED'},
    {type:'xhr'},
    {type:'script'},
    {type:'stylesheet'},
    {type:'document'},
  ]) {
    const request=failedRequest({...discovery,...overrides});
    assert.deepEqual(observeFailure(request),
      {diagnostics:[new URL(request.url()).pathname],ignoredCancellations:[]},JSON.stringify(overrides));
  }
});
