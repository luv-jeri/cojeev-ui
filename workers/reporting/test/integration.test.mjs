import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID, createHmac } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

let mf, db, backend, media;
const admin = 'a'.repeat(64), token='b'.repeat(64), origin='http://localhost:3000';
const ipSecret='local-test-contact-salt-'.repeat(3);
const githubActor={id:101,login:'reporting-maintainer'};
const hash = value => createHash('sha256').update(value).digest('hex');
const payload = (more={}) => ({id:randomUUID(),kind:'bug',title:'Dark mode button',description:'Switch to dark mode, then the menu disappears.',email:'person@example.com',references:[],pins:[],attachments:[],diagnostics:null,...more});
const request = (path, method='GET', body, auth, headers={}) => mf.dispatchFetch(`http://localhost${path}`,{method,headers:{Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:`Bearer ${auth}`} : {}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const submit = p => request('/v1/reports','POST',{report:p,token,turnstileToken:''},null,{'CF-Connecting-IP':p.id});
before(async()=>{
  const compiled=await build({entryPoints:['workers/reporting/src/index.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{ALLOWED_ORIGINS:origin,SITE_URL:'https://library.example.com/sahajiv-ui',LOCAL_MODE:'true',ADMIN_TOKEN:admin,IP_HASH_SECRET:ipSecret,GITHUB_REPOSITORY:'owner/library',GITHUB_WEBHOOK_SECRET:'webhook-test-secret'}}));
  db=await mf.getD1Database('DB'); await db.exec((await readFile('workers/reporting/migrations/0001_reporting.sql','utf8')).replace(/\n/g,' '));
  media=await mf.getR2Bucket('MEDIA');
  const helpers=await build({stdin:{contents:'export { cleanup, updateFromAdmin } from "./workers/reporting/src/lifecycle.ts"; export { componentURL } from "./workers/reporting/src/reports.ts"; export { mirrorIssue, deliver, drain } from "./workers/reporting/src/delivery.ts";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
  backend=await import(`data:text/javascript;base64,${Buffer.from(helpers.outputFiles[0].text).toString('base64')}`);
});
after(async()=>{await mf?.dispose();});
test('saves first, returns stable receipt, refuses changed retry and wrong token',async()=>{
  const p=payload(); const first=await submit(p); assert.equal(first.status,201); const receipt=await first.json();
  assert.equal(receipt.id,p.id); assert.equal(receipt.email,'setup_required'); assert.equal(receipt.token,token);
  assert.equal((await submit(p)).status,200);
  assert.equal((await submit({...p,description:'Changed after acceptance'})).status,409);
  assert.equal((await request(`/v1/reports/${p.id}`,'GET',undefined,'wrong')).status,404);
  const row=await db.prepare('SELECT count(*) AS n FROM reports WHERE id=?').bind(p.id).first();assert.equal(row.n,1);
});
test('rejects oversized and malformed reports without storing them',async()=>{
  const p=payload({email:''});assert.equal((await submit(p)).status,422);
  assert.equal(await db.prepare('SELECT id FROM reports WHERE id=?').bind(p.id).first(),null);
  assert.equal((await request('/v1/reports','POST','x'.repeat(200000))).status,413);
  assert.equal((await request('/v1/reports','POST',{report:payload(),token},null,{Origin:'https://evil.test'})).status,403);
});
test('attachment checks preserve accepted text and enforce receipt authorization',async()=>{
  const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);const fileId=randomUUID();
  const p=payload({attachments:[{id:fileId,name:'capture.png',type:'image/png',size:bytes.length,sha256:hash(bytes)}]});
  assert.equal((await submit(p)).status,201); const url=`http://localhost/v1/reports/${p.id}/attachments/${fileId}`;
  const upload=(data,auth=token)=>mf.dispatchFetch(url,{method:'PUT',headers:{Origin:origin,Authorization:`Bearer ${auth}`,'Content-Type':'image/png'},body:data});
  assert.equal((await upload(bytes,'wrong')).status,404);
  assert.equal((await upload(new Uint8Array(bytes.length))).status,422);
  assert.equal((await request(`/v1/reports/${p.id}`,'GET',undefined,token)).status,200);
  assert.equal((await upload(bytes)).status,200);assert.equal((await upload(bytes)).status,200);
  const media=await request(`/v1/admin/reports/${p.id}/attachments/${fileId}`,'GET',undefined,admin);
  assert.equal(media.status,200);assert.deepEqual(new Uint8Array(await media.arrayBuffer()),bytes);
  assert.equal((await request(`/v1/admin/reports/${p.id}/attachments/${fileId}`)).status,401);
});
test('public demand counts distinct email while private details stay out of responses',async()=>{
  const a=payload({kind:'request',title:'Timeline comparison',description:'Private client name',email:'a@example.com'});
  await submit(a);const b=payload({...a,id:randomUUID(),email:'b@example.com',topicId:a.id});await submit(b);await submit(payload({...a,id:randomUUID(),topicId:a.id}));
  const response=await request('/v1/requests'); const raw=await response.text();const topic=JSON.parse(raw).requests.find(x=>x.id===a.id);
  assert.equal(topic.demand,2);assert.ok(!raw.includes('example.com')&&!raw.includes('Private client'));
  assert.equal((await request(`/v1/admin/reports/${a.id}`)).status,401);
});
test('completion updates all topic subscribers and queues one notification each',async()=>{
  const a=payload({kind:'request',title:'Complete topic'});await submit(a);
  const b=payload({kind:'request',title:a.title,topicId:a.id,email:'second@example.com'});await submit(b);
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',{status:'resolved'},admin)).status,422);
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',{status:'resolved',componentUrl:'https://evil.test/docs/button/'},admin)).status,422);
  const update={status:'resolved',componentUrl:'https://library.example.com/sahajiv-ui/docs/button/'};
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',update,admin)).status,200);
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',update,admin)).status,200);
  const jobs=await db.prepare("SELECT * FROM outbox WHERE kind='email_resolved' AND report_id IN (?,?)").bind(a.id,b.id).all();assert.equal(jobs.results.length,2);
  assert.equal((await db.prepare('SELECT status FROM reports WHERE id=?').bind(b.id).first()).status,'resolved');
});
test('production protection fails closed and GitHub signatures are mandatory',async()=>{
  const closed=await mf.dispatchFetch('https://api.example.com/v1/reports',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({report:payload(),token})});assert.equal(closed.status,503);
  assert.equal((await request('/v1/github/webhook','POST',{})).status,401);
  const body=JSON.stringify({action:'closed',repository:{full_name:'other/repo'},issue:{number:123}});
  const sig='sha256='+createHmac('sha256','webhook-test-secret').update(body).digest('hex');
  assert.equal((await request('/v1/github/webhook','POST',body,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':randomUUID()})).status,202);
});

const backendEnv=more=>({DB:db,MEDIA:media,LOCAL_MODE:'true',SITE_URL:'https://library.example.com/sahajiv-ui',IP_HASH_SECRET:ipSecret,...more});
test('joining a resolved request returns its live URL and sends an already-available acknowledgment',async()=>{
  const first=payload({kind:'request',title:'Already available component'});await submit(first);
  const componentUrl='https://library.example.com/sahajiv-ui/docs/timeline/';
  assert.equal((await request(`/v1/admin/reports/${first.id}`,'PATCH',{status:'resolved',componentUrl},admin)).status,200);
  const joined=payload({kind:'request',title:first.title,topicId:first.id,email:'late-requester@example.com'});
  const response=await submit(joined);assert.equal(response.status,201);const receipt=await response.json();
  const emails=[];
  await backend.drain(backendEnv({EMAIL_ENABLED:'true',EMAIL_FROM:'updates@example.com',EMAIL:{async send(message){emails.push(message);return {messageId:'already-available-ack'};}}}),joined.id);
  assert.equal(emails.length,1);
  const refreshed=await (await request(`/v1/reports/${joined.id}`,'GET',undefined,token)).json();
  assert.deepEqual({status:receipt.status,componentUrl:receipt.componentUrl,refreshedUrl:refreshed.componentUrl,ackHasURL:emails[0].text.includes(componentUrl),ackHasLink:emails[0].html.includes(`href="${componentUrl}"`),ackSaysAvailable:/already available/i.test(emails[0].subject),promisesFuture:/notify you when the component is live/i.test(emails[0].text)},
    {status:'resolved',componentUrl,refreshedUrl:componentUrl,ackHasURL:true,ackHasLink:true,ackSaysAvailable:true,promisesFuture:false});
  assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(joined.id).first()).n,0);
});
test('local request resolution permits matching loopback HTTP while all other HTTP stays forbidden',async()=>{
  const p=payload({kind:'request',title:'Local component release'});await submit(p);
  for(const site of ['http://localhost:3100','http://127.0.0.1:3100','http://[::1]:3100']) {
    const componentUrl=`${site}/docs/button/`;
    await backend.updateFromAdmin(backendEnv({SITE_URL:site}),p.id,{status:'resolved',componentUrl});
    const row=await db.prepare('SELECT status,component_url FROM reports WHERE id=?').bind(p.id).first();
    assert.deepEqual(row,{status:'resolved',component_url:componentUrl});
  }
  const cases=[
    {site:'http://localhost:3100',url:'http://localhost:3100/docs/button/',local:'false'},
    {site:'http://library.example.com',url:'http://library.example.com/docs/button/',local:'true'},
    {site:'http://localhost:3100',url:'http://127.0.0.1:3100/docs/button/',local:'true'},
    {site:'http://localhost:3100',url:'http://localhost:3200/docs/button/',local:'true'},
    {site:'http://localhost:3100',url:'http://user@localhost:3100/docs/button/',local:'true'},
  ];
  for(const item of cases) assert.throws(()=>backend.componentURL(item.url,backendEnv({SITE_URL:item.site,LOCAL_MODE:item.local})),error=>error.status===422);
  assert.equal(backend.componentURL('https://library.example.com/sahajiv-ui/docs/button/',backendEnv({LOCAL_MODE:'false'})),'https://library.example.com/sahajiv-ui/docs/button/');
});
test('contact expiry preserves distinct demand across old and new contributions',async()=>{
  const a=payload({kind:'request',title:'Retention demand example',email:'retention-a@example.com'});
  await submit(a);
  const b=payload({...a,id:randomUUID(),topicId:a.id,email:'retention-b@example.com'});
  const duplicate=payload({...a,id:randomUUID(),topicId:a.id});
  await submit(b);await submit(duplicate);
  await db.prepare('UPDATE reports SET created_at=? WHERE topic_id=?').bind(Date.now()-181*86400000,a.id).run();
  await backend.cleanup(backendEnv());
  const topics=await (await request('/v1/requests')).json();
  assert.equal(topics.requests.find(topic=>topic.id===a.id).demand,2);
  await submit(payload({...a,id:randomUUID(),topicId:a.id}));
  const after=await (await request('/v1/requests')).json();
  assert.equal(after.requests.find(topic=>topic.id===a.id).demand,2);
  assert.equal((await db.prepare('SELECT email FROM reports WHERE id=?').bind(a.id).first()).email,'');
});
test('cleanup removes expired attachment metadata as well as objects',async()=>{
  const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  const file={id:randomUUID(),name:'private-client-acquisition.png',type:'image/png',size:bytes.length,sha256:hash(bytes)};
  const p=payload({title:'Private acquisition report title',description:'Private acquisition details',attachments:[file]});
  await submit(p);
  await mf.dispatchFetch(`http://localhost/v1/reports/${p.id}/attachments/${file.id}`,{method:'PUT',headers:{Origin:origin,Authorization:`Bearer ${token}`,'Content-Type':file.type},body:bytes});
  await db.prepare('UPDATE reports SET created_at=? WHERE id=?').bind(Date.now()-31*86400000,p.id).run();
  await backend.cleanup(backendEnv());
  assert.equal(await media.get(`${p.id}/${file.id}`),null);
  const technical=await (await request(`/v1/admin/reports/${p.id}`,'GET',undefined,admin)).text();
  assert.ok(!technical.includes(file.name),'attachment filename must expire with its media');
  assert.equal(await db.prepare('SELECT sha256 FROM attachments WHERE report_id=?').bind(p.id).first(),null);
});
test('cleanup removes expired private bug titles along with other private prose',async()=>{
  const p=payload({title:'Private acquisition report title',description:'Private acquisition details'});
  await submit(p);
  await db.prepare('UPDATE reports SET created_at=? WHERE id=?').bind(Date.now()-181*86400000,p.id).run();
  await backend.cleanup(backendEnv());
  const privateData=await (await request(`/v1/admin/reports/${p.id}`,'GET',undefined,admin)).text();
  assert.ok(!privateData.includes(p.title)&&!privateData.includes(p.description)&&!privateData.includes(p.email));
});
test('GitHub reconciliation binds markers to the report actor and creation window and keeps prose private',async()=>{
  const p=payload({title:'Private bug title',description:'Private description',email:'private-address@example.com',references:['https://private.example.com/secret']});
  await submit(p);const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
  const env=backendEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library'});
  let original;
  await backend.mirrorIssue(env,row,async(url,init)=>{
    if(url==='https://api.github.com/user') return Response.json(githubActor);
    assert.ok(url.startsWith('https://api.github.com/repos/owner/library/issues'));
    if(init.method!=='POST') return Response.json([]);
    const outgoing=JSON.parse(init.body);
    for(const secret of [p.title,p.description,p.email,p.references[0],token]) assert.ok(!init.body.includes(secret));
    assert.ok(outgoing.body.includes('/feedback-admin/?report='));
    original={number:21,node_id:'I_original',html_url:'https://github.com/owner/library/issues/21',body:outgoing.body,user:githubActor,created_at:new Date(row.created_at).toISOString()};
    return Response.json(original,{status:201});
  });
  const copied={...original,number:232,node_id:'I_copy',html_url:'https://github.com/owner/library/issues/232'};
  const olderAttacker={...original,number:5,user:{id:999,login:'attacker'}};
  const preexistingOwn={...original,number:6,created_at:new Date(row.created_at-86400000).toISOString()};
  const firstPage=[copied,...Array.from({length:99},(_,index)=>({number:231-index,body:'Another report'}))];
  const reconciled=await backend.mirrorIssue(env,row,async(url,init)=>{
    if(url==='https://api.github.com/user') return Response.json(githubActor);
    assert.notEqual(init.method,'POST','must reconcile the original accepted issue');
    return Response.json(new URL(url).searchParams.get('page')==='1'?firstPage:[original,olderAttacker,preexistingOwn]);
  });
  assert.equal(reconciled.number,21);
});
test('ambiguous GitHub POST is reconciled before another issue can be created',async()=>{
  const p=payload();await submit(p);
  const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
  const job=await db.prepare("SELECT * FROM outbox WHERE report_id=? AND kind='github'").bind(p.id).first();
  const env=backendEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library'});
  let accepted,posts=0;
  const provider=async(url,init)=>{
    if(url==='https://api.github.com/user') return Response.json(githubActor);
    if(init.method!=='POST') return Response.json(accepted?[accepted]:[]);
    posts++;accepted={number:42,node_id:'I_accepted',html_url:'https://github.com/owner/library/issues/42',body:JSON.parse(init.body).body,user:githubActor,created_at:new Date(row.created_at).toISOString()};
    throw new Error('Connection lost after GitHub accepted');
  };
  await assert.rejects(backend.deliver(env,job,row,provider),error=>error.ambiguous===true);
  assert.equal(await backend.deliver(env,job,row,provider),'42');
  assert.equal(posts,1);
  assert.equal((await db.prepare('SELECT issue_number FROM reports WHERE id=?').bind(p.id).first()).issue_number,42);
});
test('ambiguous email outcome is held for review without automatic duplicate sends',async()=>{
  const p=payload();await submit(p);let sends=0;
  const env=backendEnv({EMAIL_ENABLED:'true',EMAIL_FROM:'updates@example.com',EMAIL:{async send(){sends++;throw new Error('Response lost after provider acceptance');}}});
  await backend.drain(env,p.id);await backend.drain(env,p.id);
  const job=await db.prepare("SELECT * FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first();
  assert.equal(job.state,'needs_review');assert.equal(job.attempts,1);assert.equal(sends,1);
  assert.ok(await db.prepare('SELECT id FROM reports WHERE id=?').bind(p.id).first());
});
test('email rate limits retry safely and concurrent drains claim each email once',async()=>{
  const p=payload();await submit(p);let sends=0;
  const env=backendEnv({EMAIL_ENABLED:'true',EMAIL_FROM:'updates@example.com',EMAIL:{async send(){sends++;if(sends===1) throw Object.assign(new Error('Rate limited'),{code:'E_RATE_LIMIT_EXCEEDED'});return {messageId:'email-accepted'};}}});
  await backend.drain(env,p.id);
  let job=await db.prepare("SELECT * FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first();
  assert.equal(job.state,'pending');assert.ok(job.due_at>Date.now());
  await db.prepare('UPDATE outbox SET due_at=0 WHERE id=?').bind(job.id).run();
  await Promise.all([backend.drain(env,p.id),backend.drain(env,p.id)]);
  job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(job.id).first();
  assert.equal(job.state,'done');assert.equal(job.provider_id,'email-accepted');assert.equal(sends,2);
});
test('expired processing leases require explicit review instead of resending',async()=>{
  const p=payload();await submit(p);let sends=0;
  await db.prepare("UPDATE outbox SET state='processing',lease_until=0 WHERE report_id=? AND kind='email_received'").bind(p.id).run();
  await backend.drain(backendEnv({EMAIL_ENABLED:'true',EMAIL_FROM:'updates@example.com',EMAIL:{async send(){sends++;return {messageId:'unexpected'};}}}),p.id);
  assert.equal((await db.prepare("SELECT state FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first()).state,'needs_review');
  assert.equal(sends,0);
});
test('disabled email backlog cannot starve a configured GitHub delivery',async()=>{
  const p=payload();await submit(p);
  await db.prepare('UPDATE reports SET issue_number=77,issue_node_id=?,issue_url=? WHERE id=?').bind('I_existing','https://github.com/owner/library/issues/77',p.id).run();
  await db.batch(Array.from({length:25},(_,index)=>db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at) VALUES(?,?,'email_received',0,0)").bind(`${p.id}:old-email-${index}`,p.id)));
  // The persisted GitHub receipt needs no external call when its outbox completion is recovered.
  const result=await backend.drain(backendEnv({GITHUB_TOKEN:'test-only-token',GITHUB_REPOSITORY:'owner/library'}),p.id);
  assert.equal(result.processed,1);
  const job=await db.prepare("SELECT state,provider_id FROM outbox WHERE report_id=? AND kind='github'").bind(p.id).first();
  assert.equal(job.state,'done');assert.equal(job.provider_id,'77');
});
test('GitHub release automation requires release label and component URL and deduplicates replays',async()=>{
  const p=payload({kind:'request',title:'Webhook release example'});await submit(p);
  await db.prepare('UPDATE reports SET issue_number=91 WHERE id=?').bind(p.id).run();
  const base={action:'closed',repository:{full_name:'owner/library'},issue:{number:91,state:'closed',state_reason:'completed',updated_at:new Date().toISOString(),labels:[],body:''}};
  const send=async(body,id=randomUUID())=>{
    const raw=JSON.stringify(body);const sig='sha256='+createHmac('sha256','webhook-test-secret').update(raw).digest('hex');
    return request('/v1/github/webhook','POST',raw,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':id});
  };
  assert.equal((await send(base)).status,202);
  assert.equal((await db.prepare('SELECT status FROM reports WHERE id=?').bind(p.id).first()).status,'received');
  const released={...base,issue:{...base.issue,labels:[{name:'feedback:released'}]}};
  assert.equal((await send(released)).status,422);
  released.issue.body='Component: https://library.example.com/sahajiv-ui/docs/timeline/';
  const eventId=randomUUID();assert.equal((await send(released,eventId)).status,202);
  const replay=await send(released,eventId);assert.equal((await replay.json()).duplicate,true);
  assert.equal((await db.prepare('SELECT status FROM reports WHERE id=?').bind(p.id).first()).status,'resolved');
  assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(p.id).first()).n,1);
});
