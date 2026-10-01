import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash, randomUUID, createHmac } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

let mf, db, backend, media;
const admin = 'a'.repeat(64), token='b'.repeat(64), healthToken='h'.repeat(64), origin='http://localhost:3000';
const ipSecret='local-test-contact-salt-'.repeat(3);
const githubActor={id:101,login:'reporting-maintainer'};
const hash = value => createHash('sha256').update(value).digest('hex');
const payload = (more={}) => ({id:randomUUID(),kind:'bug',title:'Dark mode button',description:'Switch to dark mode, then the menu disappears.',email:'person@example.com',references:[],pins:[],attachments:[],diagnostics:null,...more});
const request = (path, method='GET', body, auth, headers={}) => mf.dispatchFetch(`http://localhost${path}`,{method,headers:{Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:`Bearer ${auth}`} : {}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const queueGitHub = id => db.batch([db.prepare("UPDATE reports SET triage_state='approved',triage_by='ai',triage_title='Verdict title',triage_body='Verdict body' WHERE id=?").bind(id),db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at) VALUES(?,?,'github',?,?)").bind(`${id}:github`,id,Date.now(),Date.now())]);
const submit = p => request('/v1/reports','POST',{report:p,token,turnstileToken:''},null,{'CF-Connecting-IP':p.id});
before(async()=>{
  const compiled=await build({entryPoints:['workers/reporting/src/index.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{ENVIRONMENT:'production',ALLOWED_ORIGINS:origin,SITE_URL:'https://library.example.com/ui',LOCAL_MODE:'true',ADMIN_TOKEN:admin,HEALTH_TOKEN:healthToken,IP_HASH_SECRET:ipSecret,GITHUB_REPOSITORY:'owner/library',GITHUB_WEBHOOK_SECRET:'webhook-test-secret',DELIVERY_ACTIVATED_AT:'2020-01-01T00:00:00Z',RESEND_WEBHOOK_SECRET:'whsec_'+Buffer.from('test-webhook-secret').toString('base64')}}));
  db=await mf.getD1Database('DB');
  for(const name of (await readdir('workers/reporting/migrations')).filter(n=>n.endsWith('.sql')).sort()) await db.exec((await readFile(`workers/reporting/migrations/${name}`,'utf8')).replace(/\n/g,' '));
  media=await mf.getR2Bucket('MEDIA');
  const helpers=await build({stdin:{contents:'export { cleanup, updateFromAdmin } from "./workers/reporting/src/lifecycle.ts"; export { accept, componentURL, receipt } from "./workers/reporting/src/reports.ts"; export { mirrorIssue, deliver, drain, publicIssue, scrubPublic, emailMessage, ownerMessage } from "./workers/reporting/src/delivery.ts";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
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
  await db.prepare("UPDATE reports SET triage_state='approved' WHERE id IN (?,?)").bind(a.id,b.id).run();
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',{status:'resolved'},admin)).status,422);
  assert.equal((await request(`/v1/admin/reports/${a.id}`,'PATCH',{status:'resolved',componentUrl:'https://evil.test/docs/button/'},admin)).status,422);
  const update={status:'resolved',componentUrl:'https://library.example.com/ui/docs/button/'};
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

const backendEnv=more=>({DB:db,MEDIA:media,LOCAL_MODE:'true',SITE_URL:'https://library.example.com/ui',IP_HASH_SECRET:ipSecret,DELIVERY_ACTIVATED_AT:'2020-01-01T00:00:00Z',...more});
test('joining a resolved request returns its live URL and sends an already-available acknowledgment',async()=>{
  const first=payload({kind:'request',title:'Already available component'});await submit(first);
  const componentUrl='https://library.example.com/ui/docs/timeline/';
  assert.equal((await request(`/v1/admin/reports/${first.id}`,'PATCH',{status:'resolved',componentUrl},admin)).status,200);
  const joined=payload({kind:'request',title:first.title,topicId:first.id,email:'late-requester@example.com'});
  const response=await submit(joined);assert.equal(response.status,201);const receipt=await response.json();
  const emails=[];
  await backend.drain(resendEnv(),joined.id,async(_url,init)=>{emails.push(JSON.parse(init.body));return Response.json({id:'already-available-ack'});});
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
  assert.equal(backend.componentURL('https://library.example.com/ui/docs/button/',backendEnv({LOCAL_MODE:'false'})),'https://library.example.com/ui/docs/button/');
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
test('cleanup retires normalized private request titles without collisions and preserves explicit subscriptions',async()=>{
  const a=payload({kind:'request',title:'Confidential Meridian acquisition'});
  const b=payload({kind:'request',title:'Confidential Juniper acquisition'});
  await submit(a);await submit(b);
  await db.prepare('UPDATE topics SET created_at=? WHERE id IN (?,?)').bind(Date.now()-181*86400000,a.id,b.id).run();
  await db.prepare('UPDATE reports SET created_at=? WHERE id IN (?,?)').bind(Date.now()-181*86400000,a.id,b.id).run();
  await db.prepare('UPDATE topics SET public_title=? WHERE id=?').bind('Comparison timeline',a.id).run();
  await backend.cleanup(backendEnv());
  const expired=await db.prepare('SELECT title,title_key,public_title FROM topics WHERE id IN (?,?)').bind(a.id,b.id).all();
  assert.ok(!JSON.stringify(expired.results).toLowerCase().includes('confidential'),'both original and normalized private title must expire');
  assert.equal(new Set(expired.results.map(topic=>topic.title_key)).size,2,'retired keys must respect the unique index');
  assert.ok(expired.results.some(topic=>topic.public_title==='Comparison timeline'),'approved public title remains');
  const fresh=payload({kind:'request',title:a.title});const response=await submit(fresh);
  assert.equal(response.status,201);assert.equal((await response.json()).topicId,fresh.id,'expired automatic title deduplication ends');
  const joined=await submit(payload({kind:'request',title:a.title,topicId:a.id,email:'subscriber@example.com'}));
  assert.equal(joined.status,201);assert.equal((await joined.json()).topicId,a.id,'explicit subscriptions retain the old topic identity');
  await backend.cleanup(backendEnv());
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM topics WHERE id IN (?,?)').bind(a.id,b.id).first()).n,2,'repeated cleanup is safe');
});
test('GitHub reconciliation binds markers to the report actor and creation window and keeps prose private',async()=>{
  const p=payload({title:'Private bug title',description:'Private description',email:'private-address@example.com',references:['https://private.example.com/secret']});
  await submit(p);const row={...await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first(),triage_title:'Public verdict title',triage_body:'Verdict body'};
  const env=backendEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library'});
  let original;
  await backend.mirrorIssue(env,row,async(url,init)=>{
    if(url==='https://api.github.com/user') return Response.json(githubActor);
    assert.ok(url.startsWith('https://api.github.com/repos/owner/library/issues'));
    if(init.method!=='POST') return Response.json([]);
    const outgoing=JSON.parse(init.body);
    for(const secret of [p.title,p.description,p.email,p.references[0],token]) assert.ok(!init.body.includes(secret));
    assert.ok(outgoing.body.includes('Reported by a visitor.'));
    assert.ok(/<!-- cojeev-report:[^>]+ -->$/.test(outgoing.body));
    assert.ok(!outgoing.body.includes('/feedback-admin/'));
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
  const p=payload();await submit(p);await queueGitHub(p.id);
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
  const env=resendEnv(),provider=async()=>{sends++;throw new Error('Response lost after provider acceptance');};
  await backend.drain(env,p.id,provider);await backend.drain(env,p.id,provider);
  const job=await db.prepare("SELECT * FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first();
  assert.equal(job.state,'needs_review');assert.equal(job.attempts,1);assert.equal(sends,1);
  assert.ok(await db.prepare('SELECT id FROM reports WHERE id=?').bind(p.id).first());
});
test('email rate limits retry safely and concurrent drains claim each email once',async()=>{
  const p=payload();await submit(p);let sends=0;
  const env=resendEnv(),provider=async()=>{sends++;return sends===1?Response.json({name:'rate_limit_exceeded'},{status:429}):Response.json({id:'email-accepted'});};
  await backend.drain(env,p.id,provider);
  let job=await db.prepare("SELECT * FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first();
  assert.equal(job.state,'pending');assert.ok(job.due_at>Date.now());
  await db.prepare('UPDATE outbox SET due_at=0 WHERE id=?').bind(job.id).run();
  await Promise.all([backend.drain(env,p.id,provider),backend.drain(env,p.id,provider)]);
  job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(job.id).first();
  assert.equal(job.state,'done');assert.equal(job.provider_id,'email-accepted');assert.equal(sends,2);
});
test('expired processing leases require explicit review instead of resending',async()=>{
  const p=payload();await submit(p);let sends=0;
  await db.prepare("UPDATE outbox SET state='processing',lease_until=0 WHERE report_id=? AND kind='email_received'").bind(p.id).run();
  await backend.drain(resendEnv(),p.id,async()=>{sends++;return Response.json({id:'unexpected'});});
  assert.equal((await db.prepare("SELECT state FROM outbox WHERE report_id=? AND kind='email_received'").bind(p.id).first()).state,'needs_review');
  assert.equal(sends,0);
});
test('disabled email backlog cannot starve a configured GitHub delivery',async()=>{
  const p=payload();await submit(p);await queueGitHub(p.id);
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
  await db.prepare("UPDATE reports SET issue_number=91,triage_state='approved' WHERE id=?").bind(p.id).run();
  const base={action:'closed',repository:{full_name:'owner/library'},issue:{number:91,state:'closed',state_reason:'completed',updated_at:new Date().toISOString(),labels:[],body:''}};
  const send=async(body,id=randomUUID())=>{
    const raw=JSON.stringify(body);const sig='sha256='+createHmac('sha256','webhook-test-secret').update(raw).digest('hex');
    return request('/v1/github/webhook','POST',raw,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':id});
  };
  assert.equal((await send(base)).status,202);
  assert.equal((await db.prepare('SELECT status FROM reports WHERE id=?').bind(p.id).first()).status,'received');
  const released={...base,issue:{...base.issue,labels:[{name:'feedback:released'}]}};
  assert.equal((await send(released)).status,422);
  released.issue.body='Component: https://library.example.com/ui/docs/timeline/';
  const eventId=randomUUID();assert.equal((await send(released,eventId)).status,202);
  const replay=await send(released,eventId);assert.equal((await replay.json()).duplicate,true);
  assert.equal((await db.prepare('SELECT status FROM reports WHERE id=?').bind(p.id).first()).status,'resolved');
  assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(p.id).first()).n,1);
});

const resendEnv=more=>backendEnv({ENVIRONMENT:'production',DELIVERY_ACTIVATED_AT:'2020-01-01T00:00:00Z',EMAIL_ENABLED:'true',EMAIL_FROM:'updates@cojeev.com',RESEND_API_KEY:'test-only-resend-key',...more});
test('health discloses only release identity publicly and requires admin for queue diagnostics',async()=>{
  const response=await request('/health');assert.equal(response.status,200);
  assert.deepEqual(Object.keys(await response.json()).sort(),['deploymentId','environment','phase','release','reportingBase','status']);
  assert.equal((await request('/v1/admin/health')).status,401);
  const health=await request('/v1/admin/health','GET',undefined,admin);assert.equal(health.status,200);
  assert.ok((await health.json()).queue);
});
test('health-only credential can read diagnostics but cannot read reports, attachments or mutate admin state',async()=>{
  assert.equal((await request('/v1/admin/health','GET',undefined,healthToken)).status,200);
  for(const [url,method,body] of [['/v1/admin/reports','GET'],['/v1/admin/reports/example','GET'],['/v1/admin/reports/example/attachments/example','GET'],['/v1/admin/reports/example','PATCH',{status:'resolved'}],['/v1/admin/deliveries/example/retry','POST',{}],['/v1/admin/health','POST',{}],['/v1/admin/health','HEAD']]) {
    assert.equal((await request(url,method,body,healthToken)).status,401);
  }
});
test('free text request titles remain private until a maintainer publishes a safe title',async()=>{
  const p=payload({kind:'request',title:'Secret acquisition of Acme'});await submit(p);
  assert.ok(!(await (await request('/v1/requests')).text()).includes(p.title));
  const row={...await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first(),triage_title:'Comparison verdict',triage_body:'Verdict body'};
  await backend.mirrorIssue(backendEnv({GITHUB_TOKEN:'test',GITHUB_REPOSITORY:'owner/library'}),row,async(url,init)=>{
    if(url.endsWith('/user')) return Response.json(githubActor);
    if(init.method!=='POST') return Response.json([]);
    assert.ok(!init.body.includes(p.title));return Response.json({number:201,node_id:'I_safe',html_url:'https://github.com/owner/library/issues/201'});
  });
  assert.equal((await request(`/v1/admin/reports/${p.id}`,'PATCH',{publicTitle:'Comparison timeline'},admin)).status,200);
  assert.ok((await (await request('/v1/requests')).text()).includes('Comparison timeline'));
});
test('provider activation alone cannot drain historical jobs',async()=>{
  const p=payload();await submit(p);let sends=0;
  const provider=async()=>{sends++;return Response.json({id:'unexpected'});};
  await backend.drain(resendEnv({DELIVERY_ACTIVATED_AT:undefined}),p.id,provider);
  await backend.drain(resendEnv({DELIVERY_ACTIVATED_AT:new Date(Date.now()+1000).toISOString()}),p.id,provider);
  assert.equal(sends,0);
  assert.equal((await db.prepare("SELECT state FROM outbox WHERE id=?").bind(`${p.id}:email_received`).first()).state,'held');
});
test('the receipt separates a held GitHub job from a queued one and from an unconfigured tracker',async()=>{
  const p=payload();await submit(p);await queueGitHub(p.id);
  const configured=backendEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library'});
  const read=async env=>await backend.receipt(env,await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first(),token);
  let issued=await read(configured);
  assert.equal(issued.issue,'pending');assert.equal(issued.issueDelivery,'pending');
  // No activation cutoff holds every pending job, GitHub included: the held update has no kind filter.
  await backend.drain({...configured,DELIVERY_ACTIVATED_AT:undefined},p.id);
  assert.equal((await db.prepare('SELECT state FROM outbox WHERE id=?').bind(`${p.id}:github`).first()).state,'held');
  issued=await read(configured);
  assert.equal(issued.issue,'pending','the legacy enum still reports pending for a configured tracker');
  assert.equal(issued.issueDelivery,'held','a held job must be distinguishable from a queued one');
  // The same held row on a build with no GitHub credentials is setup required, not queued.
  assert.equal((await read(backendEnv())).issue,'setup_required');
  // The receipt route must carry the new field to the browser, not only the internal helper.
  const overWire=await (await request(`/v1/reports/${p.id}`,'GET',undefined,token)).json();
  assert.equal(overWire.issueDelivery,'held');
  await db.prepare("UPDATE outbox SET state='needs_review' WHERE id=?").bind(`${p.id}:github`).run();
  assert.equal((await read(configured)).issue,'needs_review');
  await db.prepare('UPDATE reports SET issue_number=?,issue_url=? WHERE id=?').bind(4321,'https://github.com/owner/library/issues/4321',p.id).run();
  issued=await read(configured);
  assert.equal(issued.issue,'created');assert.equal(issued.issueDelivery,'needs_review','a created issue keeps the job state visible for review');
});
test('Resend persists one payload and key, records acceptance, and rejects payload drift',async()=>{
  const p=payload();await submit(p);const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
  const job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first();
  const calls=[];const provider=async(url,init)=>{calls.push(init);assert.equal(url,'https://api.resend.com/emails');return Response.json({id:'resend-accepted'});};
  assert.equal(await backend.deliver(resendEnv(),job,row,provider),'resend-accepted');
  const sent=JSON.parse(calls[0].body);assert.equal(sent.from,'000h by Cojeev <updates@cojeev.com>');assert.equal(sent.reply_to,'hello@cojeev.com');
  assert.equal(calls[0].headers['Idempotency-Key'],`cojeev/${job.id}`);
  await assert.rejects(backend.deliver(resendEnv({EMAIL_FROM:'different@cojeev.com'}),job,row,provider),/payload/i);
  assert.equal(calls.length,1);
});
test('uncertain sends cannot be replayed after the 24 hour provider window',async()=>{
  const p=payload();await submit(p);let sends=0;
  const provider=async()=>{sends++;throw new Error('lost response');};
  await backend.drain(resendEnv(),p.id,provider);
  let job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first();
  assert.equal(job.state,'needs_review');assert.equal(sends,1);
  await db.prepare("UPDATE outbox SET first_attempt_at=?,state='pending',due_at=0 WHERE id=?").bind(Date.now()-86400001,job.id).run();
  await backend.drain(resendEnv(),p.id,provider);assert.equal(sends,1);
  job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(job.id).first();assert.equal(job.state,'needs_review');
  assert.equal((await request(`/v1/admin/deliveries/${encodeURIComponent(job.id)}/retry`,'POST',{},admin)).status,409);
});
test('beta blocks non-testers and concurrent drains respect a reduced UTC quota',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  const outsider=payload();await submit(outsider);let sends=0;
  const provider=async()=>{sends++;return Response.json({id:`beta-${sends}`});};
  const env=resendEnv({ENVIRONMENT:'beta',EMAIL_DAILY_LIMIT:'1'});
  await backend.drain(env,outsider.id,provider);assert.equal(sends,0);
  const a=payload({email:'unread.fyi@gmail.com'}),b=payload({email:'unread.fyi@gmail.com'});await submit(a);await submit(b);
  await Promise.all([backend.drain(env,a.id,provider),backend.drain(env,b.id,provider)]);
  assert.equal(sends,1);
  const jobs=await db.prepare("SELECT state,delivery_status FROM outbox WHERE report_id IN (?,?) AND kind='email_received'").bind(a.id,b.id).all();
  assert.deepEqual(jobs.results.map(j=>j.state).sort(),['done','pending']);assert.ok(jobs.results.some(j=>j.delivery_status==='quota'));
});

const resendHook=(body,more={})=>{
  const raw=typeof body==='string'?body:JSON.stringify(body),id=more.id??'msg_'+randomUUID(),timestamp=String(more.timestamp??Math.floor(Date.now()/1000));
  const signature=createHmac('sha256','test-webhook-secret').update(`${id}.${timestamp}.${raw}`).digest('base64');
  return request('/v1/resend/webhook','POST',raw,null,{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':more.signature??`v1,${signature}`});
};
test('signed Resend events tolerate replay and ordering without treating acceptance as delivery',async()=>{
  const p=payload();await submit(p);const providerId='webhook-'+p.id;
  const event={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:providerId,tags:{}}};
  const id='msg_'+randomUUID();let early;
  // Provider events can win the race with the send response. The early event is accepted
  // because the send itself carried this environment's correlation tags, not merely because
  // it is signed: before that send there is no job this deployment can prove is its own.
  await backend.drain(resendEnv(),p.id,async(_url,init)=>{
    event.data.tags=Object.fromEntries(JSON.parse(init.body).tags.map(tag=>[tag.name,tag.value]));
    early=[(await resendHook(event,{id})).status,(await resendHook(event,{id})).status];
    return Response.json({id:providerId});
  });
  assert.deepEqual(early,[202,202]);
  assert.deepEqual(event.data.tags,{environment:'production',report:p.id,kind:'email_received'});
  assert.equal((await db.prepare('SELECT delivery_status FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first()).delivery_status,'delivered');
  await resendHook({...event,type:'email.sent'});
  let receipt=await (await request(`/v1/reports/${p.id}`,'GET',undefined,token)).json();assert.equal(receipt.emailDelivery,'delivered');assert.equal(receipt.email,'sent');
  await Promise.all([resendHook({...event,type:'email.bounced'}),resendHook(event),resendHook({...event,type:'email.sent'})]);
  receipt=await (await request(`/v1/reports/${p.id}`,'GET',undefined,token)).json();assert.equal(receipt.emailDelivery,'bounced');assert.equal(receipt.email,'needs_review');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM email_events WHERE id=?').bind(id).first()).n,1);
});
test('Resend webhook rejects bad signatures, stale/future timestamps and invalid signed bodies generically',async()=>{
  const event={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:'private@example.com'}};
  for(const options of [{signature:'v1,garbage'},{timestamp:Math.floor(Date.now()/1000)-301},{timestamp:Math.floor(Date.now()/1000)+301}]) {
    const response=await resendHook(event,options);assert.equal(response.status,401);assert.equal((await response.json()).error,'Webhook not accepted.');
  }
  assert.equal((await resendHook('null')).status,400);
});
test('monthly ceiling retains jobs when the daily budget remains available',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  const date=new Date(),month=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1);
  await db.prepare('INSERT INTO email_attempts VALUES(?,?,?)').bind(randomUUID(),'another-job',month).run();
  const p=payload();await submit(p);let sends=0;
  await backend.drain(resendEnv({EMAIL_MONTHLY_LIMIT:'1'}),p.id,async()=>{sends++;return Response.json({id:'unexpected'});});
  assert.equal(sends,0);assert.equal((await db.prepare('SELECT state FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first()).state,'pending');
});
test('beta intake rejects non-testers without storing their report',async()=>{
  const p=payload();
  const incoming=new Request('http://localhost/v1/reports',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':p.id},body:JSON.stringify({report:p,token})});
  await assert.rejects(backend.accept(incoming,resendEnv({ENVIRONMENT:'beta'})),error=>error.status===403);
  assert.equal(await db.prepare('SELECT id FROM reports WHERE id=?').bind(p.id).first(),null);
});
test('identical reviewed retries keep the payload/key and conflicts never auto-retry',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  const p=payload();await submit(p);const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
  const job=await db.prepare('SELECT * FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first();
  const requests=[];
  await assert.rejects(backend.deliver(resendEnv(),job,row,async(_url,init)=>{requests.push(init);throw new Error('lost');}),error=>error.ambiguous);
  assert.equal(await backend.deliver(resendEnv(),job,row,async(_url,init)=>{requests.push(init);return Response.json({id:'safe-retry'});}),'safe-retry');
  assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
  const other=payload();await submit(other);let sends=0;
  await backend.drain(resendEnv(),other.id,async()=>{sends++;return Response.json({name:'invalid_idempotent_request'},{status:409});});
  await backend.drain(resendEnv(),other.id,async()=>{sends++;return Response.json({id:'unexpected'});});
  assert.equal(sends,1);assert.equal((await db.prepare('SELECT state FROM outbox WHERE id=?').bind(`${other.id}:email_received`).first()).state,'needs_review');
});
test('production cannot raise the hard daily ceiling and previous UTC days do not consume today',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  await db.prepare('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<100) INSERT INTO email_attempts SELECT CAST(x AS TEXT),\'seed\',? FROM n').bind(Date.now()).run();
  const p=payload();await submit(p);let sends=0;
  const provider=async()=>{sends++;return Response.json({id:'utc-success'});};
  await backend.drain(resendEnv({EMAIL_DAILY_LIMIT:'9999'}),p.id,provider);assert.equal(sends,0);
  await db.prepare('UPDATE email_attempts SET attempted_at=?').bind(Math.floor(Date.now()/86400000)*86400000-1).run();
  await db.prepare('UPDATE outbox SET due_at=0 WHERE id=?').bind(`${p.id}:email_received`).run();
  await backend.drain(resendEnv(),p.id,provider);assert.equal(sends,1);
});
test('provider quota responses retain a job after many attempts',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  const p=payload();await submit(p);await db.prepare('UPDATE outbox SET attempts=99 WHERE id=?').bind(`${p.id}:email_received`).run();
  await backend.drain(resendEnv(),p.id,async()=>Response.json({name:'daily_quota_exceeded'},{status:429}));
  const job=await db.prepare('SELECT state,delivery_status FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first();
  assert.deepEqual(job,{state:'pending',delivery_status:'quota'});
});
test('migration holds legacy pending/processing jobs without erasing receipts or approving legacy titles',async()=>{
  const legacy=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-09-01',d1Databases:['DB']}));
  try {
    const old=await legacy.getD1Database('DB');await old.exec((await readFile('workers/reporting/migrations/0001_reporting.sql','utf8')).replace(/\n/g,' '));
    const p=payload({kind:'request'});await submit(p);
    const topic=await db.prepare('SELECT id,title,title_key,status,component_url,created_at,updated_at FROM topics WHERE id=?').bind(p.id).first();
    await old.prepare('INSERT INTO topics VALUES(?,?,?,?,?,?,?)').bind(...Object.values(topic)).run();
    const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
    for(const key of ['triage_state','triage_by','triage_model','triage_reason','triage_title','triage_body','triaged_at','verified_at','status_key']) delete row[key];
    await old.prepare(`INSERT INTO reports VALUES(${Object.keys(row).map(()=>'?').join(',')})`).bind(...Object.values(row)).run();
    for(const [kind,state] of [['github','pending'],['email_received','processing'],['email_resolved','done']]) await old.prepare('INSERT INTO outbox(id,report_id,kind,state,due_at,created_at) VALUES(?,?,?,?,0,0)').bind(`${p.id}:${kind}`,p.id,kind,state).run();
    await old.exec((await readFile('workers/reporting/migrations/0002_safe_delivery.sql','utf8')).replace(/\n/g,' '));
    assert.deepEqual((await old.prepare('SELECT state FROM outbox ORDER BY kind').all()).results.map(j=>j.state),['needs_review','done','held']);
    assert.equal((await old.prepare('SELECT public_title FROM topics').first()).public_title,null);
    assert.equal((await old.prepare('SELECT token_hash FROM reports').first()).token_hash,hash(token));
  } finally {await legacy.dispose();}
});

const legacyDb=async()=>{
  const legacy=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-09-01',d1Databases:['DB']}));
  const old=await legacy.getD1Database('DB');
  for(const name of ['0001_reporting.sql','0002_safe_delivery.sql']) await old.exec((await readFile(`workers/reporting/migrations/${name}`,'utf8')).replace(/\n/g,' '));
  return {legacy,old};
};
test('migration 0003 adds triage columns with pending default and cancels historical held jobs',async()=>{
  const {legacy,old}=await legacyDb();
  try {
    const p=payload();await submit(p);
    const row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(p.id).first();
    for(const key of ['triage_state','triage_by','triage_model','triage_reason','triage_title','triage_body','triaged_at','verified_at','status_key']) delete row[key];
    await old.prepare(`INSERT INTO reports VALUES(${Object.keys(row).map(()=>'?').join(',')})`).bind(...Object.values(row)).run();
    for(const [kind,state] of [['github','held'],['email_received','held'],['email_owner_received','pending'],['email_resolved','done']]) await old.prepare('INSERT INTO outbox(id,report_id,kind,state,due_at,created_at) VALUES(?,?,?,?,0,0)').bind(`${p.id}:${kind}`,p.id,kind,state).run();
    await old.exec((await readFile('workers/reporting/migrations/0003_triage.sql','utf8')).replace(/\n/g,' '));
    const report=await old.prepare('SELECT triage_state,triage_by,triaged_at FROM reports').first();
    assert.deepEqual(report,{triage_state:'pending',triage_by:null,triaged_at:null});
    const jobs=Object.fromEntries((await old.prepare('SELECT kind,state,last_error FROM outbox').all()).results.map(j=>[j.kind,j]));
    for(const kind of ['github','email_received','email_owner_received']) assert.deepEqual([jobs[kind].state,jobs[kind].last_error],['cancelled','Superseded by triage V1.']);
    assert.equal(jobs.email_resolved.state,'done');
  } finally {await legacy.dispose();}
});
test('a new report queues only the received email and owner alert, never a GitHub job',async()=>{
  const p=payload();
  await backend.accept(new Request('http://localhost/v1/reports',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':p.id},body:JSON.stringify({report:p,token,turnstileToken:''})}),ownerEnv());
  const kinds=(await db.prepare('SELECT kind FROM outbox WHERE report_id=? ORDER BY kind').bind(p.id).all()).results.map(j=>j.kind);
  assert.deepEqual(kinds,['email_owner_received','email_received']);
  assert.equal((await db.prepare('SELECT triage_state FROM reports WHERE id=?').bind(p.id).first()).triage_state,'pending');
});
test('joining a request whose topic already has an issue is approved by join and queues one accepted email',async()=>{
  const a=payload({kind:'request',title:'Kanban lanes'});await submit(a);
  await db.prepare("UPDATE reports SET triage_state='approved',triage_by='ai',issue_number=55,issue_node_id='I_55',issue_url='https://github.com/owner/library/issues/55' WHERE id=?").bind(a.id).run();
  const b=payload({kind:'request',title:'Kanban lanes',topicId:a.id,email:'b@example.com'});assert.equal((await submit(b)).status,201);
  const row=await db.prepare('SELECT triage_state,triage_by,triaged_at,issue_number,issue_node_id,issue_url FROM reports WHERE id=?').bind(b.id).first();
  assert.equal(row.triage_state,'approved');assert.equal(row.triage_by,'join');assert.ok(row.triaged_at>0);
  assert.deepEqual([row.issue_number,row.issue_node_id,row.issue_url],[55,'I_55','https://github.com/owner/library/issues/55']);
  const jobs=(await db.prepare('SELECT id,kind,reviewed_at FROM outbox WHERE report_id=? ORDER BY kind').bind(b.id).all()).results;
  assert.deepEqual(jobs.map(j=>j.kind),['email_accepted','email_received']);
  assert.equal(jobs[0].id,`${b.id}:email_accepted`);assert.ok(jobs[0].reviewed_at>0);
  const c=payload({kind:'request',title:'Kanban lanes',topicId:a.id});await submit(c);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE report_id=? AND kind='github'").bind(c.id).first()).n,0);
});

const ownerEnv=more=>resendEnv({REPORT_NOTIFICATION_EMAIL:'owner@example.com',...more});
const acceptLocal=(env,p)=>backend.accept(new Request('http://localhost/v1/reports',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':p.id},body:JSON.stringify({report:p,token})}),env);
const ownerJobs=async id=>(await db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE report_id=? AND kind='email_owner_received'").bind(id).first()).n;
test('a saved report queues exactly one owner alert, never a duplicate and never a backfill',async()=>{
  const configured=ownerEnv();const p=payload();
  await acceptLocal(configured,p);
  assert.equal(await ownerJobs(p.id),1);
  await acceptLocal(configured,p);
  assert.equal(await ownerJobs(p.id),1,'a duplicate submission must not add a second alert');
  // A report saved before an owner address existed is never backfilled by configuring one.
  const historical=payload();await acceptLocal(resendEnv(),historical);
  assert.equal(await ownerJobs(historical.id),0);
  await backend.drain(configured,historical.id,async()=>Response.json({id:'historical-ack'}));
  assert.equal(await ownerJobs(historical.id),0,'activation must not manufacture historical owner alerts');
});
test('the owner alert reaches only the configured owner and carries no private report content',async()=>{
  const env=ownerEnv();
  const p=payload({title:'Private acquisition title',description:'Private acquisition details',email:'reporter-one@example.com',references:['https://private.example.com/secret']});
  await acceptLocal(env,p);
  const sent=[];
  await backend.drain(env,p.id,async(_url,init)=>{sent.push(JSON.parse(init.body));return Response.json({id:`sent-${sent.length}`});});
  const owner=sent.filter(message=>message.to[0]==='owner@example.com');
  assert.equal(owner.length,1,'exactly one owner alert');
  assert.deepEqual(owner[0].to,['owner@example.com']);
  const body=JSON.stringify(owner[0]);
  for(const secret of [p.title,p.description,p.email,p.references[0],token,env.RESEND_API_KEY,env.IP_HASH_SECRET]) assert.ok(!body.includes(secret),'owner alert must not carry private text or secrets');
  assert.ok(owner[0].text.includes(p.id)&&owner[0].text.includes(`/feedback-admin/?report=${p.id}`),'owner alert carries a reference and an authenticated inbox link');
  assert.ok(sent.some(message=>message.to[0]===p.email),'the reporter still receives their own acknowledgment');
});
test('a failing owner alert never discards the reporter or GitHub job',async()=>{
  const env=ownerEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library'});
  const p=payload({email:'reporter-two@example.com'});
  await acceptLocal(env,p);await queueGitHub(p.id);
  await db.prepare('UPDATE reports SET issue_number=55,issue_node_id=?,issue_url=? WHERE id=?').bind('I_owner','https://github.com/owner/library/issues/55',p.id).run();
  await backend.drain(env,p.id,async(url,init)=>url==='https://api.resend.com/emails'&&JSON.parse(init.body).to[0]==='owner@example.com'
    ?Response.json({name:'internal_server_error'},{status:500}):Response.json({id:'reporter-accepted'}));
  const jobs=Object.fromEntries((await db.prepare('SELECT kind,state FROM outbox WHERE report_id=?').bind(p.id).all()).results.map(job=>[job.kind,job.state]));
  assert.deepEqual({...jobs},{github:'done',email_received:'done',email_owner_received:'needs_review',email_accepted:'pending'});
  assert.ok(await db.prepare('SELECT id FROM reports WHERE id=?').bind(p.id).first(),'the saved report survives an owner alert failure');
});
test('an unset or malformed owner address queues nothing and never guesses a recipient',async()=>{
  for(const value of [undefined,'','not-an-address','owner@example.invalid']) {
    const p=payload();await acceptLocal(resendEnv({REPORT_NOTIFICATION_EMAIL:value}),p);
    assert.equal(await ownerJobs(p.id),0,`address ${String(value)} must not queue an owner alert`);
  }
  const p=payload();await acceptLocal(ownerEnv(),p);let sends=0;
  await backend.drain(resendEnv(),p.id,async()=>{sends++;return Response.json({id:'reporter-only'});});
  assert.equal((await db.prepare('SELECT state FROM outbox WHERE id=?').bind(`${p.id}:email_owner_received`).first()).state,'needs_review');
  assert.equal(sends,1,'only the reporter acknowledgment may send when the owner address is gone');
});
test('beta restricts the owner alert to an allowlisted recipient',async()=>{
  await db.prepare('DELETE FROM email_attempts').run();
  const beta=more=>ownerEnv({ENVIRONMENT:'beta',EMAIL_DAILY_LIMIT:'5',...more});
  const blocked=beta({BETA_TESTER_EMAILS:'unread.fyi@gmail.com'});
  const p=payload({email:'unread.fyi@gmail.com'});await acceptLocal(blocked,p);let sends=0;
  await backend.drain(blocked,p.id,async()=>{sends++;return Response.json({id:`beta-${sends}`});});
  assert.equal(sends,1,'an unlisted owner address must not receive beta mail');
  assert.equal((await db.prepare('SELECT state FROM outbox WHERE id=?').bind(`${p.id}:email_owner_received`).first()).state,'needs_review');
  const allowed=beta({BETA_TESTER_EMAILS:'unread.fyi@gmail.com,owner@example.com'});
  const q=payload({email:'unread.fyi@gmail.com'});await acceptLocal(allowed,q);const recipients=[];
  await backend.drain(allowed,q.id,async(_url,init)=>{recipients.push(JSON.parse(init.body).to[0]);return Response.json({id:`beta-ok-${recipients.length}`});});
  assert.deepEqual(recipients.sort(),['owner@example.com','unread.fyi@gmail.com']);
});
test('admin health publishes reporting readiness without disclosing any address',async()=>{
  const body=await (await request('/v1/admin/health','GET',undefined,healthToken)).text();
  const health=JSON.parse(body);
  assert.equal(health.deploymentIntent,'staged','an environment that has not declared itself active stays staged');
  assert.equal(health.providers.ownerNotification,false);
  assert.equal(typeof health.activationCutoff,'number');
  assert.ok(!body.includes('@'),'health must never disclose an address');
});
test('the maintainer alert is signed with the same identity it is sent from',async()=>{
  const env=ownerEnv();const p=payload();await acceptLocal(env,p);const sent=[];
  await backend.drain(env,p.id,async(_url,init)=>{sent.push(JSON.parse(init.body));return Response.json({id:`brand-${sent.length}`});});
  const owner=sent.find(message=>message.to[0]==='owner@example.com');
  assert.equal(owner.from,'000h by Cojeev <updates@cojeev.com>');
  assert.ok(owner.subject.includes('000h by Cojeev'),owner.subject);
  for(const part of [owner.subject,owner.text,owner.html]) assert.ok(!/cojeev ui/i.test(part),'the alert must not carry a second brand name');
});
test('a team-wide provider webhook retains only this environment\'s own messages',async()=>{
  const events=async()=>(await db.prepare('SELECT COUNT(*) AS n FROM email_events').first()).n;
  const start=await events();
  const unrelated={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:'another-application-message'}};
  assert.equal((await resendHook(unrelated)).status,202,'an unrelated signed event is acknowledged');
  assert.equal((await resendHook({...unrelated,data:{...unrelated.data,tags:{environment:'production',report:randomUUID(),kind:'email_received'}}})).status,202);
  assert.equal(await events(),start,'another portfolio message must never be retained here');
  const p=payload();await submit(p);
  await backend.drain(resendEnv(),p.id,async()=>Response.json({id:`local-message-${p.id}`}));
  const foreign={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:`beta-message-${p.id}`,tags:{environment:'beta',report:p.id,kind:'email_received'}}};
  assert.equal((await resendHook(foreign)).status,202);
  assert.equal(await events(),start,'the other environment sent that message, so it is not retained here');
  const queued=payload();await submit(queued);
  assert.equal((await resendHook({...unrelated,data:{email_id:'not-sent-yet',tags:{environment:'production',report:queued.id,kind:'email_received'}}})).status,202);
  assert.equal(await events(),start,'a queued job that has contacted no provider owns no event');
  // The provider identity this deployment actually recorded is accepted with no tags at all.
  assert.equal((await resendHook({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:`local-message-${p.id}`}})).status,202);
  assert.equal(await events(),start+1);
  assert.equal((await db.prepare('SELECT delivery_status FROM outbox WHERE id=?').bind(`${p.id}:email_received`).first()).delivery_status,'delivered');
});
test('a tag alone cannot adopt a second provider identity or a body that never carried tags',async()=>{
  const events=async()=>(await db.prepare('SELECT COUNT(*) AS n FROM email_events').first()).n;
  const hook=(email_id,report)=>resendHook({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id,tags:{environment:'production',report,kind:'email_received'}}});
  const bound=payload();await submit(bound);
  await backend.drain(resendEnv(),bound.id,async()=>Response.json({id:`bound-${bound.id}`}));
  let start=await events();
  assert.equal((await hook(`other-message-${bound.id}`,bound.id)).status,202);
  assert.equal(await events(),start,'a job already bound to one provider message cannot own another');
  // A job attempted by an earlier release stored a body with no tags in it at all.
  const legacy=payload();await submit(legacy);
  const job=`${legacy.id}:email_received`;
  await db.prepare("UPDATE outbox SET payload_json=?,first_attempt_at=?,state='needs_review' WHERE id=?")
    .bind(JSON.stringify({to:['person@example.com'],subject:'Thanks for reporting this'}),Date.now(),job).run();
  start=await events();
  assert.equal((await hook(`legacy-message-${legacy.id}`,legacy.id)).status,202);
  assert.equal(await events(),start,'a body that never carried tags cannot be adopted by a tag');
});

const put = (id,body,auth=admin,headers={}) => request(`/v1/admin/reports/${id}/triage`,'PUT',body,auth,headers);
const ai = (decision='approved',more={}) => ({decision,by:'ai',reason:'Clear steps.',title:'Menu disappears in dark mode',body:'Steps to reproduce the problem.',model:'gpt-5.6-sol',...more});
const owner = (decision,more={}) => ({decision,by:'owner',...more});
const triageJobs = id => db.prepare("SELECT id,kind,state,payload_json,reviewed_at FROM outbox WHERE report_id=? AND kind IN ('github','github_state','email_accepted','email_rejected') ORDER BY kind,id").bind(id).all().then(r=>r.results);
const fresh = async more => {const p=payload(more);assert.equal((await submit(p)).status,201);return p;};
const triaged = id => db.prepare('SELECT * FROM reports WHERE id=?').bind(id).first();
const listed = async id => (await (await request('/v1/requests')).json()).requests.find(r=>r.id===id);
const topicOf = async id => (await triaged(id)).topic_id;
test('request list shows an approved topic under its AI-cleaned title and marks it approved',async()=>{
  const p=await fresh({kind:'request',title:'Private working title'});
  assert.equal((await put(p.id,{decision:'approved',by:'owner',reason:'ok',title:'Calendar range',body:'Verdict body'})).status,200);
  const response=await request('/v1/requests');const text=await response.text();
  const tid=await topicOf(p.id);const row=JSON.parse(text).requests.find(r=>r.id===tid);
  assert.equal(row.title,'Calendar range');assert.strictEqual(row.approved,true);
  assert.ok(!text.includes('Private working title'));
});
test('request list keeps pending and rejected triage titles private and unsearchable',async()=>{
  const a=await fresh({kind:'request',title:'Pending working title'});
  await db.prepare("UPDATE reports SET triage_title='Pending secret' WHERE id=?").bind(a.id).run();
  const b=await fresh({kind:'request',title:'Rejected working title'});
  assert.equal((await put(b.id,{decision:'rejected',by:'owner',reason:'no',title:'Rejected secret',body:'x'})).status,200);
  await db.prepare("UPDATE reports SET triage_title='Rejected secret' WHERE id=?").bind(b.id).run();
  const [ta,tb]=[await topicOf(a.id),await topicOf(b.id)];
  for(const t of [ta,tb]){const row=await listed(t);assert.equal(row.title,`Component request ${t.slice(0,8)}`);assert.strictEqual(row.approved,false);}
  const found=(await (await request('/v1/requests?q=secret')).json()).requests.map(r=>r.id);
  assert.ok(!found.includes(ta)&&!found.includes(tb));
});
test('a maintainer public title wins over the triage title',async()=>{
  const p=await fresh({kind:'request',title:'Another working title'});
  await put(p.id,{decision:'approved',by:'owner',reason:'ok',title:'Triage wording',body:'Verdict body'});
  assert.equal((await request(`/v1/admin/reports/${p.id}`,'PATCH',{publicTitle:'Comparison timeline'},admin)).status,200);
  const row=await listed(await topicOf(p.id));assert.equal(row.title,'Comparison timeline');assert.strictEqual(row.approved,true);
});
test('request search never matches text that redaction removed from an approved title',async()=>{
  const p=await fresh({kind:'request',title:'Chart working title'});
  await put(p.id,{decision:'approved',by:'owner',reason:'ok',title:'Chart',body:'Verdict body'});
  await db.prepare("UPDATE reports SET triage_title='Chart for person@example.com' WHERE id=?").bind(p.id).run();
  const t=await topicOf(p.id);assert.equal((await listed(t)).title,'Chart for [email]');
  const ids=async q=>(await (await request(`/v1/requests?q=${q}`)).json()).requests.map(r=>r.id);
  assert.ok(!(await ids('person%40example')).includes(t));assert.ok((await ids('Chart')).includes(t));
});
test('joining a listed topic with its listed title is accepted',async()=>{
  const p=await fresh({kind:'request',title:'Teams working title'});
  await put(p.id,{decision:'approved',by:'owner',reason:'ok',title:'Calendar range for teams @work',body:'Verdict body'});
  const row=await listed(await topicOf(p.id));
  const join=payload({kind:'request',title:row.title,topicId:row.id,email:'joiner@example.com'});
  const response=await submit(join);assert.equal(response.status,201);assert.equal((await response.json()).id,join.id);
});
test('the receipt carries the public issue number only once an approved report has an issue',async()=>{
  const receiptOf=async p=>(await request(`/v1/reports/${p.id}`,'GET',undefined,token)).json();
  const p=await fresh({kind:'request',title:'Issue receipt request'});
  let r=await receiptOf(p);assert.ok(!('issueNumber' in r)&&!('issueUrl' in r));
  assert.equal((await put(p.id,ai('approved'))).status,200);
  await backend.drain(ghEnv(),p.id,fakeGitHub([]));
  r=await receiptOf(p);assert.equal(r.issueNumber,314);assert.equal(r.issueUrl,'https://github.com/owner/library/issues/314');
  const q=await fresh({kind:'request',title:'Rejected receipt request'});
  assert.equal((await put(q.id,owner('rejected',{reason:'no'}))).status,200);
  r=await receiptOf(q);assert.ok(!('issueNumber' in r)&&!('issueUrl' in r));
});
test('triage list returns untriaged reports without email and excludes purged reports',async()=>{
  await db.prepare("UPDATE reports SET triage_state='rejected',triage_by='owner' WHERE triage_state='pending'").run();
  const a=await fresh(),b=await fresh();await db.prepare('UPDATE reports SET private_purged=1 WHERE id=?').bind(b.id).run();
  const response=await request('/v1/admin/triage','GET',undefined,admin);const text=await response.text();
  assert.equal(response.status,200);assert.ok(!text.includes('example.com'));
  const ids=JSON.parse(text).reports.map(r=>r.id);assert.ok(ids.includes(a.id));assert.ok(!ids.includes(b.id));
  assert.ok(JSON.parse(text).reports.length<=50);
});
test('an AI verdict is recorded once; a second AI verdict returns 409',async()=>{
  const p=await fresh();const first=await put(p.id,ai());assert.equal(first.status,200);
  assert.deepEqual(await first.json(),{ok:true,triage_state:'approved',queued:['github']});
  const row=await triaged(p.id);assert.equal(row.triage_by,'ai');assert.equal(row.triage_model,'gpt-5.6-sol');assert.equal(row.verified_at,null);assert.equal(row.triage_title,'Menu disappears in dark mode');
  assert.equal((await put(p.id,ai('rejected'))).status,409);
  assert.equal((await triaged(p.id)).triage_state,'approved');assert.equal((await triageJobs(p.id)).length,1);
});
test('an owner decision on a pending report blocks a later AI verdict',async()=>{
  const p=await fresh();const r=await put(p.id,owner('rejected',{reason:'Not a bug'}));assert.equal(r.status,200);
  assert.equal((await put(p.id,ai('approved'))).status,409);
  const row=await triaged(p.id);assert.equal(row.triage_state,'rejected');assert.equal(row.triage_by,'owner');assert.ok(row.verified_at>0);
});
test('approved and rejected verdicts queue the right job with reviewed_at set',async()=>{
  const a=await fresh(),b=await fresh();
  await put(a.id,ai('approved'));await put(b.id,ai('rejected'));
  const [ja]=await triageJobs(a.id),[jb]=await triageJobs(b.id);
  assert.equal(ja.kind,'github');assert.ok(ja.reviewed_at>0);assert.equal(jb.kind,'email_rejected');assert.ok(jb.reviewed_at>0);
  // Reports older than the activation cutoff must not hold verdict jobs.
  await db.prepare('UPDATE reports SET created_at=1000 WHERE id IN (?,?)').bind(a.id,b.id).run();
  await backend.drain(backendEnv({EMAIL_ENABLED:'true',RESEND_API_KEY:'k',EMAIL_FROM:'a@b.co',GITHUB_TOKEN:'t',GITHUB_REPOSITORY:'o/r'}),undefined,async()=>new Response('{}',{status:500}));
  for(const id of [a.id,b.id]) for(const job of await triageJobs(id)) assert.notEqual(job.state,'held');
});
test('owner overturn follows the state table',async()=>{
  // pending + ai + approved, topic has an issue: copy it and queue email_accepted
  const t=await fresh({kind:'request',title:'Topic with an issue'});await put(t.id,ai('approved'));
  await db.prepare("UPDATE reports SET issue_number=7,issue_node_id='n7',issue_url='https://github.com/o/r/issues/7' WHERE id=?").bind(t.id).run();
  const j=await fresh({kind:'request',title:t.title,topicId:t.id,email:'j@example.com'});
  assert.equal((await triaged(j.id)).triage_by,'join');
  // pending + ai + approved, topic gains an issue after this report arrived: copy it + email_accepted
  const pend=await fresh({kind:'request',title:'Pending sibling',topicId:t.id,email:'p@example.com'});
  assert.equal((await triaged(pend.id)).triage_state,'approved','joined at intake');
  const late=await fresh({kind:'request',title:'Late joiner'});const later=await fresh({kind:'request',title:late.title,topicId:late.id,email:'l@example.com'});
  await put(late.id,ai('approved'));await db.prepare("UPDATE reports SET issue_number=8,issue_node_id='n8',issue_url='u8' WHERE id=?").bind(late.id).run();
  const copy=await put(later.id,ai('approved'));assert.deepEqual(await copy.json(),{ok:true,triage_state:'approved',queued:['email_accepted']});
  assert.equal((await triaged(later.id)).issue_number,8);
  // pending + owner + approved with no stored draft needs a title and body
  const bare=await fresh();assert.equal((await put(bare.id,owner('approved'))).status,422);
  // pending + owner + approved keeps the stored draft when omitted, verified now
  const kept=await fresh();await db.prepare("UPDATE reports SET triage_title='Draft',triage_body='Draft body' WHERE id=?").bind(kept.id).run();
  assert.equal((await put(kept.id,owner('approved'))).status,200);const kr=await triaged(kept.id);assert.equal(kr.triage_title,'Draft');assert.ok(kr.verified_at>0);
  // rejected + owner + approved, own issue: github_state open, no email
  const o1=await fresh();await put(o1.id,ai('rejected'));await db.prepare("UPDATE reports SET issue_number=11 WHERE id=?").bind(o1.id).run();
  const r1=await put(o1.id,owner('approved',{title:'Now valid',body:'Body'}));assert.deepEqual((await r1.json()).queued,['github_state']);
  const g1=(await triageJobs(o1.id)).find(x=>x.kind==='github_state');assert.deepEqual(JSON.parse(g1.payload_json),{state:'open'});assert.ok(g1.reviewed_at>0);
  assert.equal((await triageJobs(o1.id)).filter(x=>x.kind==='email_accepted').length,0);
  // rejected + owner + approved, no own issue, topic issue: copy + email_accepted
  const o2=await fresh({kind:'request',title:'Another sibling',topicId:t.id,email:'o2@example.com'});
  await db.prepare("UPDATE reports SET triage_state='rejected',triage_by='ai',triage_title='T3',triage_body='B',issue_number=NULL WHERE id=?").bind(o2.id).run();
  const r2=await put(o2.id,owner('approved'));assert.deepEqual((await r2.json()).queued,['email_accepted']);assert.equal((await triaged(o2.id)).issue_number,7);
  // rejected + owner + approved, nothing: github
  const o3=await fresh();await put(o3.id,ai('rejected',{title:'Kept title'}));
  assert.deepEqual((await (await put(o3.id,owner('approved'))).json()).queued,['github']);
  // approved + owner + rejected, own issue: github_state closed, no email
  const o4=await fresh();await put(o4.id,ai('approved'));await db.prepare("UPDATE reports SET issue_number=12 WHERE id=?").bind(o4.id).run();
  const r4=await put(o4.id,owner('rejected'));assert.deepEqual((await r4.json()).queued,['github_state']);
  const g4=(await triageJobs(o4.id)).find(x=>x.kind==='github_state');assert.deepEqual(JSON.parse(g4.payload_json),{state:'closed'});
  assert.equal((await triageJobs(o4.id)).filter(x=>x.kind==='email_rejected').length,0);
  // approved + owner + rejected, issue not created yet: cancel pending jobs, queue email_rejected
  const o5=await fresh();await put(o5.id,ai('approved'));
  const r5=await put(o5.id,owner('rejected'));assert.deepEqual((await r5.json()).queued,['email_rejected']);
  const jobs5=await triageJobs(o5.id);assert.equal(jobs5.find(x=>x.kind==='github').state,'cancelled');assert.equal(jobs5.find(x=>x.kind==='email_rejected').state,'pending');
  // and back to approved revives the cancelled github job
  await put(o5.id,owner('approved'));assert.equal((await triageJobs(o5.id)).find(x=>x.kind==='github').state,'pending');
  // same decision from the owner only verifies
  const o6=await fresh();await put(o6.id,ai('approved'));const before=await triaged(o6.id);
  const r6=await put(o6.id,owner('approved'));assert.deepEqual(await r6.json(),{ok:true,triage_state:'approved',queued:[]});
  const after=await triaged(o6.id);assert.ok(after.verified_at>0);assert.equal(after.triaged_at,before.triaged_at);assert.equal(after.triage_by,'ai');
  // a verdict on a purged report is gone (410), whatever the state
  const gone=await fresh();await db.prepare('UPDATE reports SET private_purged=1 WHERE id=?').bind(gone.id).run();
  assert.equal((await put(gone.id,owner('rejected'))).status,410);
});
test('verify sets verified_at and the unverified count drops',async()=>{
  const p=await fresh();assert.equal((await request(`/v1/admin/reports/${p.id}/verify`,'POST',{},admin)).status,409);
  await put(p.id,ai('approved'));const count=async()=>(await (await request('/v1/admin/reports','GET',undefined,admin)).json()).counts.unverified;
  const before=await count();assert.equal((await request(`/v1/admin/reports/${p.id}/verify`,'POST',{},admin)).status,200);
  assert.equal(await count(),before-1);assert.ok((await triaged(p.id)).verified_at>0);
});
test('admin list filters by triage state and returns counts',async()=>{
  const p=await fresh();await put(p.id,ai('rejected'));
  const list=async q=>(await request(`/v1/admin/reports${q}`,'GET',undefined,admin)).json();
  const rej=await list('?triage=rejected');assert.ok(rej.reports.length>0&&rej.reports.every(r=>r.triage_state==='rejected'));
  assert.ok(rej.reports.some(r=>r.id===p.id&&r.triage_by==='ai'&&r.triage_model==='gpt-5.6-sol'&&'email' in r));
  assert.ok((await list('?triage=unverified')).reports.every(r=>r.triage_state!=='pending'&&r.triage_by!=='join'&&r.verified_at===null));
  const all=await list('');for(const k of ['pending','approved','rejected','unverified']) assert.equal(typeof all.counts[k],'number');
  assert.equal((await request('/v1/admin/reports?triage=bogus','GET',undefined,admin)).status,422);
});
test('triage routes require the admin token and an allowed Origin for writes',async()=>{
  const p=await fresh();
  assert.equal((await request('/v1/admin/triage')).status,401);
  assert.equal((await put(p.id,ai(),null)).status,401);
  assert.equal((await put(p.id,ai(),'wrong')).status,401);
  assert.equal((await put(p.id,ai(),admin,{Origin:'https://evil.test'})).status,403);
  assert.equal((await request(`/v1/admin/reports/${p.id}/verify`,'POST',{},admin,{Origin:'https://evil.test'})).status,403);
  assert.equal((await request(`/v1/admin/reports/${p.id}/verify`,'POST',{})).status,401);
  assert.equal((await triaged(p.id)).triage_state,'pending');
});
test('verdict validation rejects a bad decision, a short title and an oversized body',async()=>{
  const p=await fresh();
  for(const bad of [ai('maybe'),ai('approved',{title:'ab'}),ai('approved',{body:'x'.repeat(20001)}),ai('approved',{body:'   '}),ai('approved',{reason:'x'.repeat(501)}),{decision:'approved',by:'ai'},{...ai(),extra:1},{...ai(),by:'join'}])
    assert.equal((await put(p.id,bad)).status,422,JSON.stringify(bad).slice(0,80));
  assert.equal((await put(p.id,ai('approved',{body:'x'.repeat(20000)}))).status,200);
});
test('a verdict on an expired report returns 410',async()=>{
  const p=await fresh();await db.prepare('UPDATE reports SET private_purged=1 WHERE id=?').bind(p.id).run();
  const r=await put(p.id,ai());assert.equal(r.status,410);assert.equal((await r.json()).error,'This report has expired.');
});
test('rejecting one holder of a shared issue only detaches it; the sole holder closes the issue',async()=>{
  const t=await fresh({kind:'request',title:'Shared issue topic'});await put(t.id,ai('approved'));
  await db.prepare("UPDATE reports SET issue_number=21,issue_node_id='n21',issue_url='u21' WHERE id=?").bind(t.id).run();
  const j=await fresh({kind:'request',title:t.title,topicId:t.id,email:'join@example.com'});
  assert.equal((await triaged(j.id)).issue_number,21);
  const r=await put(j.id,owner('rejected'));assert.deepEqual(await r.json(),{ok:true,triage_state:'rejected',queued:[]});
  const row=await triaged(j.id);assert.equal(row.issue_number,null);assert.equal(row.issue_node_id,null);assert.equal(row.issue_url,null);
  assert.deepEqual((await triageJobs(j.id)).filter(x=>['github_state','email_rejected'].includes(x.kind)),[]);
  assert.equal((await triageJobs(j.id)).find(x=>x.kind==='email_accepted').state,'cancelled');
  assert.equal((await triaged(t.id)).issue_number,21);
  // now the original is the only holder: rejecting it closes the issue
  const r2=await put(t.id,owner('rejected'));assert.deepEqual((await r2.json()).queued,['github_state']);
  assert.deepEqual(JSON.parse((await triageJobs(t.id)).find(x=>x.kind==='github_state').payload_json),{state:'closed'});
  // a detached report re-approved follows the normal paths (no topic issue left: github)
  assert.deepEqual((await (await put(j.id,owner('approved',{title:'Rejoined',body:'Body'}))).json()).queued,['github']);
});
test('an overturned rejection cancels the unsent rejection email',async()=>{
  const p=await fresh();await put(p.id,ai('rejected'));
  assert.equal((await triageJobs(p.id)).find(x=>x.kind==='email_rejected').state,'pending');
  const r=await put(p.id,owner('approved',{title:'Valid after all',body:'Body'}));assert.deepEqual((await r.json()).queued,['github']);
  const jobs=await triageJobs(p.id);assert.equal(jobs.find(x=>x.kind==='email_rejected').state,'cancelled');assert.equal(jobs.find(x=>x.kind==='github').state,'pending');
  const q=await fresh({kind:'request',title:'Accepted then rejected',topicId:undefined});await put(q.id,ai('approved'));await put(q.id,owner('rejected'));
  assert.equal((await triageJobs(q.id)).find(x=>x.kind==='email_accepted')?.state??'cancelled','cancelled');
});

const approve = (id,more={}) => db.prepare("UPDATE reports SET triage_state='approved',triage_by='ai',triage_title=?,triage_body=? WHERE id=?").bind(more.title??'Menu disappears in dark mode',more.body??'Steps to reproduce the problem.',id).run();
const ghEnv = more => resendEnv({GITHUB_TOKEN:'test-only-github-token',GITHUB_REPOSITORY:'owner/library',...more});
const fakeGitHub = (log,extra=()=>undefined) => async (url,init={}) => {
  if(url.startsWith('https://api.resend.com')) return Response.json({id:'resend-x'});
  const method=init.method??'GET';log.push({url,method,body:init.body});
  const custom=extra(url,method,init);if(custom) return custom;
  if(url==='https://api.github.com/user') return Response.json(githubActor);
  if(method==='POST'&&url.endsWith('/issues')) return Response.json({number:314,node_id:'I_314',html_url:'https://github.com/owner/library/issues/314',body:JSON.parse(init.body).body,user:githubActor,created_at:new Date().toISOString()},{status:201});
  if(method==='GET') return Response.json([]);
  return Response.json({});
};
test('approved report creates a public issue from the scrubbed verdict with the visitor footer and kind label',async()=>{
  const p=await fresh({email:'leaky-person@example.com',description:'Original private description text'});await queueGitHub(p.id);await approve(p.id);
  const log=[];await backend.drain(ghEnv(),p.id,fakeGitHub(log));
  const post=log.find(c=>c.method==='POST'&&c.url.endsWith('/issues'));const out=JSON.parse(post.body);
  assert.equal(out.title,'Menu disappears in dark mode');
  assert.ok(out.body.startsWith('Steps to reproduce the problem.\n\n---\nReported by a visitor.\n\n<!-- cojeev-report:'));
  assert.deepEqual(out.labels,['bug']);
  assert.ok(!post.body.includes('leaky-person@example.com')&&!post.body.includes('Original private description'));
  const r=await fresh({kind:'request',title:'A timeline component'});await queueGitHub(r.id);await approve(r.id);
  const log2=[];await backend.drain(ghEnv(),r.id,fakeGitHub(log2));
  assert.deepEqual(JSON.parse(log2.find(c=>c.method==='POST'&&c.url.endsWith('/issues')).body).labels,['enhancement']);
});
test('public scrub removes emails, tokens and user paths and neutralises @mentions',async()=>{
  const dirty='Mail a.b@example.com with _john.smith@gmail.com_ and (jane@x.io) and Bearer abcdef123456 and ghp_abcdefgh12345 at /Users/sanjay/secret ping @octocat and @some-team';
  const clean=backend.scrubPublic(dirty,1000);
  for(const bad of ['john.smith@gmail.com','jane@x.io','a.b@example.com','abcdef123456','ghp_abcdefgh12345','/Users/sanjay']) assert.ok(!clean.includes(bad),bad);
  assert.ok(clean.includes('@\u200Boctocat')&&clean.includes('@\u200Bsome-team'));assert.ok(!/@[a-z]/.test(clean));
  assert.equal(backend.scrubPublic('x'.repeat(500),120).length,120);
  const issue=backend.publicIssue({kind:'bug',triage_title:'Hi @octocat',triage_body:'Body a@b.co'},'<!-- m -->');
  assert.equal(issue.title,'Hi @\u200Boctocat');assert.ok(issue.body.endsWith('\n\n---\nReported by a visitor.\n\n<!-- m -->'));assert.ok(!issue.body.includes('a@b.co'));
});
test('issue creation queues exactly one accepted email carrying #N and the issue URL',async()=>{
  const p=await fresh();await queueGitHub(p.id);await approve(p.id);
  const log=[],sent=[];const provider=async(url,init)=>url==='https://api.resend.com/emails'?(sent.push(JSON.parse(init.body)),Response.json({id:`acc-${sent.length}`})):fakeGitHub(log)(url,init);
  await backend.drain(ghEnv(),p.id,provider);await backend.drain(ghEnv(),p.id,provider);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_accepted'").bind(p.id).first()).n,1);
  const accepted=sent.filter(m=>m.subject.startsWith("We're tracking"));assert.equal(accepted.length,1);
  assert.ok(accepted[0].subject.includes('#314')&&accepted[0].text.includes('https://github.com/owner/library/issues/314'));
  await backend.drain(ghEnv(),p.id,provider);assert.equal(sent.filter(m=>m.subject.startsWith("We're tracking")).length,1);
});
test('a github job for an untriaged report never creates an issue',async()=>{
  const p=await fresh();await db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'github',?,?,?)").bind(`${p.id}:github`,p.id,Date.now(),Date.now(),Date.now()).run();
  for(const state of ['pending','rejected']) {
    await db.prepare("UPDATE reports SET triage_state=? WHERE id=?").bind(state,p.id).run();
    await db.prepare("UPDATE outbox SET state='pending',due_at=0 WHERE id=?").bind(`${p.id}:github`).run();
    const log=[];await backend.drain(ghEnv(),p.id,fakeGitHub(log));
    assert.equal(log.length,0,'no GitHub request');
    assert.equal((await db.prepare("SELECT state FROM outbox WHERE id=?").bind(`${p.id}:github`).first()).state,'needs_review');
  }
});
test('github_state closes as not planned with the invalid label, and reopens',async()=>{
  const p=await fresh();await approve(p.id);
  await db.prepare("UPDATE reports SET issue_number=77,issue_node_id='I_77',issue_url='https://github.com/owner/library/issues/77' WHERE id=?").bind(p.id).run();
  const job=async(suffix,state)=>db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at,payload_json) VALUES(?,?,'github_state',?,?,?,?)").bind(`${p.id}:github_state:${suffix}`,p.id,Date.now(),Date.now(),Date.now(),JSON.stringify({state})).run();
  await job(1,'closed');let log=[];await backend.drain(ghEnv(),p.id,fakeGitHub(log));
  const calls=log.map(c=>`${c.method} ${c.url.replace('https://api.github.com','')}`);
  assert.deepEqual(calls,['PATCH /repos/owner/library/issues/77','POST /repos/owner/library/issues/77/labels']);
  assert.deepEqual(JSON.parse(log[0].body),{state:'closed',state_reason:'not_planned'});assert.deepEqual(JSON.parse(log[1].body),{labels:['invalid']});
  await job(2,'open');log=[];await backend.drain(ghEnv(),p.id,fakeGitHub(log,(url,method)=>method==='DELETE'?new Response('{}',{status:404}):undefined));
  assert.deepEqual(log.map(c=>`${c.method} ${c.url.replace('https://api.github.com','')}`),['PATCH /repos/owner/library/issues/77','DELETE /repos/owner/library/issues/77/labels/invalid']);
  assert.deepEqual(JSON.parse(log[0].body),{state:'open'});
  assert.deepEqual((await db.prepare("SELECT state FROM outbox WHERE report_id=? AND kind='github_state' ORDER BY id").bind(p.id).all()).results.map(j=>j.state),['done','done']);
});
test('email copy matches the spec for received, accepted and rejected and signs as 000h by Cojeev',async()=>{
  const cases=[
    [{kind:'bug'},'email_received','Thanks for reporting this · 000h by Cojeev','Thank you for reporting the issue. We\'re looking into it and will let you know.'],
    [{kind:'request'},'email_received','Thanks for your request · 000h by Cojeev','Thank you for your request. We\'re looking into it and will let you know.'],
    [{kind:'bug',issue_number:9,issue_url:'https://github.com/o/r/issues/9'},'email_accepted','We\'re tracking your report as #9 · 000h by Cojeev','Thanks for reporting the issue. We checked it, and it\'s now tracked as #9. We\'ll email you again when it\'s fixed.'],
    [{kind:'request',issue_number:9,issue_url:'https://github.com/o/r/issues/9'},'email_accepted','We\'re tracking your request as #9 · 000h by Cojeev','Thanks for your request. We checked it, and it\'s now tracked as #9. We\'ll email you again when it\'s live.'],
    [{kind:'bug'},'email_rejected','About your report · 000h by Cojeev','Thanks for taking the time to write to us. We checked your report, but it isn\'t something we can act on, so we\'ve closed it. If we misunderstood, just reply to this email and tell us more.'],
    [{kind:'bug',status:'resolved'},'email_resolved','The issue you reported is fixed · 000h by Cojeev',undefined]];
  for(const [more,kind,subject,text] of cases) {
    const m=backend.emailMessage({id:'rid',status:'received',component_url:null,issue_number:null,issue_url:null,triage_reason:'AI SECRET REASON',...more},kind,'https://library.example.com/ui');
    assert.equal(m.subject,subject,kind);if(text) assert.ok(m.text.includes(text),kind);
    assert.ok(m.text.includes('Reference: rid')&&m.text.trimEnd().endsWith('000h by Cojeev'),kind);assert.ok(!m.text.includes('Cojeev UI')&&!m.html.includes('COJEEV UI'));assert.ok(!m.text.includes('Follow progress here'),kind);assert.ok(!m.html.includes('Follow progress here'),kind);if(kind==='email_accepted'){assert.ok(m.text.includes('Follow on GitHub (#9)')&&m.text.includes(more.issue_url),'text has the GitHub link');assert.ok(m.html.includes('Follow on GitHub (#9)')&&m.html.includes(`href="${more.issue_url}"`),'html has the GitHub link');}
  }
});
test('the rejection email never contains the AI reason',async()=>{
  const p=await fresh();await db.prepare("UPDATE reports SET triage_state='rejected',triage_by='ai',triage_reason='INTERNAL AI REASON' WHERE id=?").bind(p.id).run();
  await db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'email_rejected',?,?,?)").bind(`${p.id}:email_rejected`,p.id,Date.now(),Date.now(),Date.now()).run();
  const sent=[];await backend.drain(ghEnv(),p.id,async(_u,init)=>{sent.push(JSON.parse(init.body));return Response.json({id:'rej'});});
  const m=sent.find(x=>x.subject.startsWith('About your report'));assert.ok(m);assert.ok(!JSON.stringify(m).includes('INTERNAL AI REASON'));
});
test('receipt reports Being reviewed while pending, created after the issue, not planned after rejection',async()=>{
  const p=await fresh();const env=ghEnv();
  const read=async()=>backend.receipt(env,await triaged(p.id),token);
  let r=await read();assert.equal(r.issueDelivery,'triage');
  await approve(p.id);await queueGitHub(p.id);r=await read();assert.equal(r.issue,'pending');assert.equal(r.issueDelivery,'pending');
  await db.prepare("UPDATE reports SET triage_state='rejected' WHERE id=?").bind(p.id).run();r=await read();assert.equal(r.issue,'not_planned');
  await db.prepare("UPDATE reports SET triage_state='approved',issue_number=5,issue_url='https://github.com/owner/library/issues/5' WHERE id=?").bind(p.id).run();r=await read();assert.equal(r.issue,'created');
});
test('releasing a shared issue marks every joined report resolved and emails each reporter',async()=>{
  const a=await fresh(),b=await fresh({email:'second-person@example.com'});
  await db.prepare("UPDATE reports SET issue_number=9191,triage_state='approved' WHERE id IN (?,?)").bind(a.id,b.id).run();
  await db.prepare('UPDATE reports SET updated_at=? WHERE id=?').bind(Date.now()+3600000,b.id).run();
  const body=id=>JSON.stringify({action:'closed',repository:{full_name:'owner/library'},issue:{number:9191,state:'closed',state_reason:'completed',updated_at:new Date().toISOString(),labels:[{name:'feedback:released'}],body:''}});
  const raw=body();const sig='sha256='+createHmac('sha256','webhook-test-secret').update(raw).digest('hex');
  const eventId=randomUUID();
  assert.equal((await request('/v1/github/webhook','POST',raw,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':eventId})).status,202);
  assert.equal((await triaged(a.id)).status,'resolved');assert.equal((await triaged(b.id)).status,'received','a report edited after the issue update is stale');
  await db.prepare('UPDATE reports SET updated_at=1 WHERE id=?').bind(b.id).run();
  const raw2=raw.replace('"labels"','"x":1,"labels"');const sig2='sha256='+createHmac('sha256','webhook-test-secret').update(raw2).digest('hex');
  assert.equal((await request('/v1/github/webhook','POST',raw2,null,{'X-Hub-Signature-256':sig2,'X-GitHub-Event':'issues','X-GitHub-Delivery':randomUUID()})).status,202);
  assert.equal((await triaged(b.id)).status,'resolved');
  for(const id of [a.id,b.id]) assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(id).first()).n,1);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM webhook_events WHERE id=?').bind(eventId).first()).n,1);
});

test('releasing an issue never resolves or emails a rejected report that shares the number',async()=>{
  const a=await fresh(),b=await fresh({email:'rejected-person@example.com'});
  await db.prepare("UPDATE reports SET issue_number=9292,triage_state='approved' WHERE id=?").bind(a.id).run();
  await db.prepare("UPDATE reports SET issue_number=9292,triage_state='rejected' WHERE id=?").bind(b.id).run();
  const raw=JSON.stringify({action:'closed',repository:{full_name:'owner/library'},issue:{number:9292,state:'closed',state_reason:'completed',updated_at:new Date().toISOString(),labels:[{name:'feedback:released'}],body:''}});
  const sig='sha256='+createHmac('sha256','webhook-test-secret').update(raw).digest('hex');
  assert.equal((await request('/v1/github/webhook','POST',raw,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':randomUUID()})).status,202);
  assert.equal((await triaged(a.id)).status,'resolved');assert.equal((await triaged(b.id)).status,'received');
  assert.equal((await db.prepare("SELECT count(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(b.id).first()).n,0);
});
test('re-approving a report with its own issue revives a cancelled accepted email; a sent one stays done',async()=>{
  for(const sent of [false,true]) {
    const p=await fresh();await put(p.id,ai('approved'));
    await db.prepare("UPDATE reports SET issue_number=?,issue_node_id='I_x',issue_url='https://github.com/owner/library/issues/5' WHERE id=?").bind(sent?6001:6000,p.id).run();
    await db.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'email_accepted',?,?,?)").bind(`${p.id}:email_accepted`,p.id,Date.now(),Date.now(),Date.now()).run();
    if(sent) await db.prepare("UPDATE outbox SET state='done' WHERE id=?").bind(`${p.id}:email_accepted`).run();
    assert.equal((await put(p.id,owner('rejected'))).status,200);
    assert.equal((await db.prepare("SELECT state FROM outbox WHERE id=?").bind(`${p.id}:email_accepted`).first()).state,sent?'done':'cancelled');
    assert.equal((await put(p.id,owner('approved'))).status,200);
    const mails=(await db.prepare("SELECT state FROM outbox WHERE report_id=? AND kind='email_accepted'").bind(p.id).all()).results;
    assert.deepEqual(mails.map(m=>m.state),[sent?'done':'pending']);
  }
});

// Final-review fixes (R22-R31).
const releaseIssue = async (n,body='Component: https://library.example.com/ui/docs/final-fix/') => {
  const raw=JSON.stringify({action:'closed',repository:{full_name:'owner/library'},issue:{number:n,state:'closed',state_reason:'completed',updated_at:new Date(Date.now()+5000).toISOString(),labels:[{name:'feedback:released'}],body}});
  const sig='sha256='+createHmac('sha256','webhook-test-secret').update(raw).digest('hex');
  return request('/v1/github/webhook','POST',raw,null,{'X-Hub-Signature-256':sig,'X-GitHub-Event':'issues','X-GitHub-Delivery':randomUUID()});
};
const kindsOf = async id => (await db.prepare("SELECT kind FROM outbox WHERE report_id=? AND state<>'cancelled'").bind(id).all()).results.map(j=>j.kind);
test('release emails only the approved reporters of a request topic',async()=>{
  const a=await fresh({kind:'request',title:'Final fix topic one'});
  const rej=await fresh({kind:'request',title:a.title,topicId:a.id,email:'rej@example.com'}),pen=await fresh({kind:'request',title:a.title,topicId:a.id,email:'pen@example.com'});
  await db.prepare("UPDATE reports SET issue_number=9601,triage_state='approved',triage_by='ai' WHERE id=?").bind(a.id).run();
  await db.prepare("UPDATE reports SET triage_state='rejected' WHERE id=?").bind(rej.id).run();
  assert.equal((await releaseIssue(9601)).status,202);
  assert.ok((await kindsOf(a.id)).includes('email_resolved'));
  assert.ok(!(await kindsOf(rej.id)).includes('email_resolved'));assert.ok(!(await kindsOf(pen.id)).includes('email_resolved'));
});
test('a release email pending when the owner rejects the report is never sent',async()=>{
  const p=await fresh();await db.prepare("UPDATE reports SET issue_number=9606,triage_state='approved',triage_by='ai',created_at=1000 WHERE id=?").bind(p.id).run();
  assert.equal((await releaseIssue(9606,'')).status,202);
  assert.equal((await db.prepare("SELECT state FROM outbox WHERE id=?").bind(`${p.id}:email_resolved`).first()).state,'pending');
  await db.prepare("UPDATE reports SET triage_state='rejected' WHERE id=?").bind(p.id).run();
  let sends=0;await backend.drain(ghEnv({DELIVERY_ACTIVATED_AT:new Date(Date.now()-1000).toISOString()}),p.id,async(url)=>{if(url.includes('resend'))sends++;return Response.json({id:'x'});});
  assert.equal(sends,0);
});
test('joining a released topic promises no tracking email, on intake and on approval',async()=>{
  const a=await fresh({kind:'request',title:'Final fix topic two'});
  const early=await fresh({kind:'request',title:a.title,topicId:a.id,email:'early@example.com'});
  assert.equal((await triaged(early.id)).triage_state,'pending');
  await db.prepare("UPDATE reports SET issue_number=9602,issue_node_id='I_9602',issue_url='https://github.com/owner/library/issues/9602',triage_state='approved',triage_by='ai' WHERE id=?").bind(a.id).run();
  assert.equal((await releaseIssue(9602)).status,202);
  const late=await fresh({kind:'request',title:a.title,topicId:a.id,email:'late@example.com'});
  const lateRow=await triaged(late.id);assert.equal(lateRow.issue_number,9602);assert.ok(!(await kindsOf(late.id)).includes('email_accepted'));
  assert.ok((await kindsOf(late.id)).includes('email_received'));
  const r=await put(early.id,ai('approved'));assert.equal(r.status,200);
  assert.ok(!(await kindsOf(early.id)).includes('email_accepted'));assert.ok(!(await r.json()).queued.includes('email_accepted'));assert.ok((await kindsOf(early.id)).includes('email_resolved'));
});
test('redaction removes emails wrapped in underscores or brackets',()=>{
  for(const c of ['_john.smith@gmail.com_','(jane@x.io)']) assert.ok(!/@/.test(backend.scrubPublic(c,100).replace(/@\u200B/g,'')),c);
});
test('package versions survive the scrub, and a request naming one is accepted',async()=>{
  for(const v of ['react@18.2.0','next@15.1.0','@radix-ui/react-dialog@1.1.2']) assert.equal(backend.scrubPublic(v,100),v.replace(/@(?=[A-Za-z0-9_])/g,'@\u200B'),v);
  const p=payload({kind:'request',title:'Support react@19.1.0 in the date picker'});assert.equal((await submit(p)).status,201);
});
test('approving revives a github job the old code left held',async()=>{
  const p=await fresh();
  await db.prepare("INSERT INTO outbox(id,report_id,kind,state,due_at,created_at) VALUES(?,?,'github','held',?,?)").bind(`${p.id}:github`,p.id,Date.now(),Date.now()).run();
  const r=await put(p.id,ai('approved'));assert.deepEqual((await r.json()).queued,['github']);
  const job=(await triageJobs(p.id)).find(x=>x.kind==='github');assert.equal(job.state,'pending');
  assert.ok((await db.prepare("SELECT reviewed_at FROM outbox WHERE id=?").bind(job.id).first()).reviewed_at);
});
test('the release email of an approved reporter is born reviewed',async()=>{
  const p=await fresh();await db.prepare("UPDATE reports SET issue_number=9603,triage_state='approved',triage_by='ai',created_at=1000 WHERE id=?").bind(p.id).run();
  assert.equal((await releaseIssue(9603,'')).status,202);
  const e=ghEnv({DELIVERY_ACTIVATED_AT:new Date(Date.now()-1000).toISOString()});await backend.drain(e,p.id,fakeGitHub([]));
  assert.equal((await db.prepare("SELECT state,reviewed_at FROM outbox WHERE id=?").bind(`${p.id}:email_resolved`).first()).state,'done');
});
test('two requests approved on one topic before delivery share a single issue',async()=>{
  const a=await fresh({kind:'request',title:'Final fix topic three'}),b=await fresh({kind:'request',title:a.title,topicId:a.id,email:'b3@example.com'});
  assert.equal((await put(a.id,ai('approved'))).status,200);assert.equal((await put(b.id,ai('approved'))).status,200);
  const log=[];await backend.drain(ghEnv(),a.id,fakeGitHub(log));await backend.drain(ghEnv(),b.id,fakeGitHub(log));
  assert.equal(log.filter(c=>c.method==='POST'&&c.url.endsWith('/issues')).length,1);
  const [ra,rb]=[await triaged(a.id),await triaged(b.id)];assert.ok(ra.issue_number);assert.equal(ra.issue_number,rb.issue_number);
  for(const id of [a.id,b.id]) assert.ok((await kindsOf(id)).includes('email_accepted'));
});
test('admin detail says whether another approved report shares the issue',async()=>{
  const a=await fresh(),b=await fresh();
  await db.prepare("UPDATE reports SET issue_number=9604,triage_state='approved' WHERE id IN (?,?)").bind(a.id,b.id).run();
  assert.equal((await (await request(`/v1/admin/reports/${a.id}`,'GET',undefined,admin)).json()).shared,true);
  await db.prepare("UPDATE reports SET triage_state='rejected' WHERE id=?").bind(b.id).run();
  assert.equal((await (await request(`/v1/admin/reports/${a.id}`,'GET',undefined,admin)).json()).shared,false);
});
test('approving a pending report into a released topic sends only the it\'s-live email',async()=>{
  const first=await fresh({kind:'request',title:'Final fix topic four'});
  const mate=await fresh({kind:'request',title:first.title,topicId:first.id,email:'mate4@example.com'});
  assert.equal((await triaged(first.id)).triage_state,'pending');
  await db.prepare("UPDATE reports SET issue_number=9605,issue_node_id='I_9605',issue_url='https://github.com/owner/library/issues/9605',triage_state='approved',triage_by='ai' WHERE id=?").bind(mate.id).run();
  assert.equal((await releaseIssue(9605)).status,202);
  const r=await put(first.id,ai('approved'));assert.equal(r.status,200);assert.ok((await r.json()).queued.includes('email_resolved'));
  const jobs=(await db.prepare("SELECT kind,state,reviewed_at FROM outbox WHERE report_id=? AND kind IN ('email_resolved','email_accepted')").bind(first.id).all()).results;
  assert.deepEqual(jobs.map(j=>j.kind),['email_resolved']);assert.equal(jobs[0].state,'pending');assert.ok(jobs[0].reviewed_at);
});
// Captured from ownerMessage before this task touched delivery.ts.
const OWNER_LITERAL={"subject":"New bug report saved · 000h by Cojeev","text":"New bug report saved\n\nOpen the private report to read its details. This alert carries no report content.\n\nReference: rid\nOpen the private report: https://library.example.com/ui/feedback-admin/?report=rid\n\n000h by Cojeev","html":"<!doctype html><html><body style=\"margin:0;background:#fbf4e6;color:#111;font:16px/1.6 Arial,sans-serif\"><main style=\"max-width:560px;margin:36px auto;padding:32px\"><p style=\"font-size:13px;letter-spacing:2px\">000H BY COJEEV</p><h1 style=\"font-size:30px;line-height:1.2\">New bug report saved</h1><p>Open the private report to read its details. This alert carries no report content.</p><p><a href=\"https://library.example.com/ui/feedback-admin/?report=rid\" style=\"display:inline-block;background:#f5b8db;color:#111;padding:12px 20px;border-radius:30px;text-decoration:none\">Open the private report</a></p><p style=\"font-size:12px;color:#5f5b55\">Reference: rid</p></main></body></html>"};
const statusOf=(id,key)=>request(`/v1/status/${id}`,'GET',undefined,key);
const keyOf=async id=>(await triaged(id)).status_key;
test('status_key_is_minted_at_insert',async()=>{
  const p=payload({kind:'request',title:'Mint a key'});const r=await (await submit(p)).json();
  const stored=(await triaged(p.id)).status_key;
  assert.match(stored,/^[a-f0-9]{64}$/);assert.equal(r.statusKey,stored);assert.equal(r.kind,'request');
  const again=await submit(p);assert.equal(again.status,200);assert.equal((await again.json()).statusKey,stored);assert.equal((await triaged(p.id)).status_key,stored);
  const q=payload();const rq=await (await submit(q)).json();assert.equal(rq.kind,'bug');assert.notEqual(rq.statusKey,stored);
  await db.prepare('UPDATE reports SET status_key=NULL WHERE id=?').bind(q.id).run();
  const old=await (await request(`/v1/reports/${q.id}`,'GET',undefined,token)).json();assert.ok(!('statusKey' in old));assert.equal(old.kind,'bug');
});
test('status_endpoint_shows_only_public_facts',async()=>{
  const url='https://github.com/owner/library/issues/7001';
  const states=[['received',"triage_state='pending'",[]],['reviewing',"triage_state='approved'",[]],
    ['tracked',`triage_state='approved',issue_number=7001,issue_url='${url}'`,['issueNumber','issueUrl']],
    ['fixed',`triage_state='approved',status='resolved',issue_number=7001,issue_url='${url}'`,['issueNumber','issueUrl']],
    ['tracked',`triage_state='pending',issue_number=7001,issue_url='${url}'`,[]],
    ['closed',"triage_state='rejected'",[]],['closed',`triage_state='approved',status='declined',issue_number=7001,issue_url='${url}'`,[]]];
  const fileId=randomUUID(),bytes=new Uint8Array([137,80,78,71]);
  for(const [stage,set,extra] of states) {
    const p=payload({title:'PRIVATE-TITLE-xyz',description:'PRIVATE-DESC-xyz',email:'private-xyz@example.com',attachments:[{id:fileId,name:'a.png',type:'image/png',size:bytes.length,sha256:hash(bytes)}]});
    const res0=await submit(p);assert.equal(res0.status,201,stage+await res0.clone().text());const r=await res0.json();
    await db.prepare(`UPDATE reports SET ${set},diagnostics_json='{"note":"PRIVATE-DIAG-xyz"}',triage_reason='PRIVATE-REASON-xyz',triage_model='PRIVATE-MODEL-xyz' WHERE id=?`).bind(p.id).run();
    const key=await keyOf(p.id),res=await statusOf(p.id,key),raw=await res.text();
    assert.equal(res.status,200,stage);assert.equal(res.headers.get('Cache-Control'),'no-store');
    const body=JSON.parse(raw);assert.equal(body.stage,stage);
    assert.deepEqual(Object.keys(body).sort(),['attachments','kind','sentAt','stage',...extra].sort(),stage+set);
    assert.equal(body.attachments,1);assert.equal(body.kind,'bug');
    for(const secret of ['PRIVATE-','private-xyz',r.token,hash(r.token),key]) assert.ok(!raw.includes(secret),`${stage} leaks ${secret}`);
    if(extra.length) assert.deepEqual([body.issueNumber,body.issueUrl],[7001,url]);
    await db.prepare('DELETE FROM attachments WHERE report_id=?').bind(p.id).run();
  }
});
test('status_endpoint_rejects_a_wrong_key_like_a_missing_report',async()=>{
  const p=await fresh(),q=await fresh(),key=await keyOf(p.id);
  await db.prepare('UPDATE reports SET status_key=NULL WHERE id=?').bind(q.id).run();
  const shape=async res=>JSON.stringify([res.status,await res.text(),[...res.headers].sort()]);
  const five=[await statusOf(p.id,'c'.repeat(64)),await statusOf(p.id),await statusOf(randomUUID(),key),await statusOf('not-a-uuid',key),await statusOf(q.id,'0'.repeat(64))];
  const shapes=await Promise.all(five.map(shape));
  assert.equal(five[0].status,404);for(const s of shapes) assert.equal(s,shapes[0]);
  assert.equal(await shape(await statusOf(p.id,token)),shapes[0]);
  assert.equal(await shape(await request(`/v1/reports/${p.id}`,'GET',undefined,key)),shapes[0]);
  assert.equal((await statusOf(p.id,key)).status,200);
});
test('every_customer_email_links_to_its_tracking_page',()=>{
  const site='https://library.example.com/ui/',key='d'.repeat(64),url=`https://library.example.com/ui/track/#rid.${key}`;
  const comp='https://library.example.com/ui/docs/timeline/',gh='https://github.com/o/r/issues/9';
  const base={id:'rid',status:'received',component_url:null,issue_number:null,issue_url:null,status_key:key};
  const cases=[
    [{kind:'bug'},'email_received','Track your report',url,false],
    [{kind:'request'},'email_received','Track your request',url,false],
    [{kind:'request',status:'resolved',component_url:comp},'email_received','Open your component',comp,false],
    [{kind:'bug',issue_number:9,issue_url:gh},'email_accepted','Track your report',url,true],
    [{kind:'request',issue_number:9,issue_url:gh},'email_accepted','Track your request',url,true],
    [{kind:'bug'},'email_rejected','Track your report',url,false],
    [{kind:'bug',status:'resolved'},'email_resolved','Track your report',url,false],
    [{kind:'request',status:'resolved',component_url:comp},'email_resolved','Open your component',comp,false],
    [{kind:'request',status:'resolved'},'email_resolved','Track your request',url,false]];
  for(const [more,kind,label,target,follow] of cases) {
    const m=backend.emailMessage({...base,...more},kind,site),tag=`${kind} ${label}`;
    assert.ok(m.html.includes(`href="${target}"`)&&m.html.includes(`>${label}</a>`),tag);
    assert.ok(m.text.includes(`${label}: ${target}`),tag);
    assert.equal(m.text.includes('Follow on GitHub (#9)'),follow,tag);assert.equal(m.html.includes('Follow on GitHub (#9)'),follow,tag);
    assert.ok(m.html.includes('000h by Cojeev · Reply to this email if you need help.')&&m.html.includes('<html lang="en">')&&m.html.includes('prefers-color-scheme: dark'),tag);
    assert.equal(m.text.includes('/track/'),target===url,tag);
  }
  for(const [more,kind] of [[{kind:'bug'},'email_received'],[{kind:'bug'},'email_rejected'],[{kind:'bug'},'email_resolved'],[{kind:'bug',issue_number:9,issue_url:gh},'email_accepted']]) {
    const m=backend.emailMessage({...base,...more,status_key:null},kind,site);
    assert.ok(!m.html.includes('/track/')&&!m.text.includes('/track/'),kind);
    assert.equal(m.html.includes('Follow on GitHub'),kind==='email_accepted');
  }
  const noKeyLive=backend.emailMessage({...base,kind:'request',status:'resolved',component_url:comp,status_key:null},'email_resolved',site);assert.ok(noKeyLive.html.includes(`href="${comp}"`));
  assert.deepEqual(backend.ownerMessage({...base,kind:'bug'},site),OWNER_LITERAL);
  assert.ok(!JSON.stringify(backend.ownerMessage({...base,kind:'bug'},site)).includes('/track/'));
});
test('email_html_escapes_every_value',()=>{
  const evil='https://x.test/"><script>alert(1)</script>&a=\'b\'',site='https://s.test/"><img src=x>';
  const m=backend.emailMessage({id:'rid',kind:'request',status:'resolved',component_url:evil,issue_number:9,issue_url:evil,status_key:'e'.repeat(64)},'email_accepted',site);
  const r=backend.emailMessage({id:'rid',kind:'request',status:'resolved',component_url:evil,issue_number:9,issue_url:evil,status_key:'e'.repeat(64)},'email_resolved',site);
  const esc=v=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  for(const html of [m.html,r.html]) for(const raw of ['<script>','"><img','"><script','&a=\'b\'']) assert.ok(!html.includes(raw),raw);
  assert.ok(m.html.includes(`href="${esc(evil)}"`)&&m.html.includes(`href="${esc(`${site}/track/#rid.${'e'.repeat(64)}`)}"`));
  assert.ok(r.html.includes(`href="${esc(evil)}"`));
});
