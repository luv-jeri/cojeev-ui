import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assessHealth, checkHealth, updateAlert } from '../scripts/operations-health.mjs';
import { backupKey, assertRecoveryPolicy, composeSecretBundles, validateDeploymentConfig, validateRestore, validateSecrets,backup,restore } from '../scripts/operations.mjs';
import {createManifest,manifestDigest} from '../scripts/release-manifest.mjs';
import {deployRelease} from '../scripts/release.mjs';
import {verifyRollbackRun} from '../scripts/release-rollback-run.mjs';

const healthy={queue:[],usage:{daily:0,monthly:0},limits:{daily:95,monthly:2850},providers:{email:true,github:true,resendWebhook:true},activationCutoff:1};
test('delivery monitor detects stalled work, quota, failures and invalid responses without retaining private payloads',()=>{
  assert.deepEqual(assessHealth(healthy),[]);
  for(const row of [{state:'pending',oldestAgeMs:3600000,count:1},{state:'needs_review',count:1,oldestAgeMs:1},{state:'pending',delivery_status:'quota',count:1,oldestAgeMs:1}]) assert.ok(assessHealth({...healthy,queue:[row],privateText:'secret'}).length>0);
  assert.ok(assessHealth({}).includes('invalid-delivery-health'));
  assert.ok(assessHealth({...healthy,usage:{daily:95,monthly:1}}).includes('email-quota'));
});
test('health fetch pins origins, verifies matching release, refuses redirects and never prints response bodies',async()=>{
  const seen=[];
  const result=await checkHealth('beta',{token:'test-token',fetcher:async(url,options)=>{
    seen.push({url,options});
    return Response.json(url.endsWith('/v1/admin/health')?healthy:{status:'ok',environment:'beta',release:'a'.repeat(40)});
  }});
  assert.deepEqual(result.problems,[]);
  assert.equal(seen[2].url,'https://feedback-beta.cojeev.com/v1/admin/health');
  assert.equal(seen[2].options.redirect,'error');
  assert.equal(seen[2].options.headers.Authorization,'Bearer test-token');
  await assert.rejects(checkHealth('wrong',{token:'test-token'}),/environment/);
});
test('alerts contain only fixed reason codes and mention owner; repeated failures update and recovery closes',async()=>{
  const writes=[];
  const client=async(endpoint,options={})=>{
    if(!options.method) return [{number:12,body:'<!-- cojeev-health:beta -->',state:'open'}];
    writes.push({endpoint,...options});return {};
  };
  await updateAlert('beta',['email-quota','untrusted private text'],client);
  assert.equal(writes[0].method,'PATCH');
  assert.ok(writes[0].body.body.includes('@luv-jeri'));
  assert.ok(!JSON.stringify(writes).includes('untrusted private text'));
  await updateAlert('beta',[],client);
  assert.equal(writes[1].body.state,'closed');
});
test('the alert issue is found by one bounded labelled query, never a paginated scan of every open issue',async()=>{
  const reads=[],writes=[];
  const client=async(endpoint,options={})=>{
    if(!options.method) {reads.push(endpoint);return [];}
    writes.push({endpoint,...options});return {number:5};
  };
  await updateAlert('production',['http-health'],client);
  assert.equal(reads.length,1);
  assert.ok(reads[0].includes('labels=operations-alert')&&reads[0].includes('state=open'),reads[0]);
  assert.ok(!/[?&]page=/.test(reads[0]),reads[0]);
  const created=writes.find(write=>write.endpoint==='issues');
  assert.deepEqual(created.body.labels,['operations-alert']);
  assert.ok(created.body.body.includes('<!-- cojeev-health:production -->'));
});
test('recovery targets and retention fail closed on public buckets, bad keys, stale receipts and oversized exports',()=>{
  assert.equal(backupKey('beta',new Date('2026-09-12T00:00:00Z')),'beta/day-6.sql');
  assert.throws(()=>backupKey('invalid',new Date()),/environment/);
  const policy={managed:{enabled:false},custom:{domains:[]},lifecycle:{rules:[{enabled:true,conditions:{prefix:''},deleteObjectsTransition:{condition:{type:'Age',maxAge:604800}}}]}};
  assert.doesNotThrow(()=>assertRecoveryPolicy(policy));
  assert.throws(()=>assertRecoveryPolicy({...policy,managed:{enabled:true}}),/private/);
  const receipt={environment:'beta',key:'beta/day-6.sql',sha256:'a'.repeat(64),bytes:10,createdAt:'2026-09-12T00:00:00Z'};
  assert.doesNotThrow(()=>validateRestore('beta',receipt,'63aab6c0-4d49-4423-b3fc-c5c382290af7',new Date('2026-09-12T01:00:00Z')));
  assert.throws(()=>validateRestore('beta',receipt,'e2adf4c4-5ab0-434d-b90f-96ea451e3be7'),/scratch/);
  assert.throws(()=>validateRestore('beta',{...receipt,bytes:26*1024*1024},'63aab6c0-4d49-4423-b3fc-c5c382290af7'),/size/);
});
test('deployment configuration cannot redirect resources to the other environment and names the failing field',()=>{
  assert.throws(()=>validateDeploymentConfig('beta',{name:'cojeev-ui-reporting',account_id:'25369d7051a3d996a1bca81f462a1fbc'},'api'),/Deployment target mismatch: name/);
  const beta=JSON.parse(readFileSync(new URL('workers/reporting/wrangler.jsonc',sourceRoot),'utf8'));
  const config={...beta,...beta.env.beta,vars:{...beta.env.beta.vars}};delete config.env;
  assert.doesNotThrow(()=>validateDeploymentConfig('beta',config,'api'));
  assert.throws(()=>validateDeploymentConfig('beta',{...config,d1_databases:[{...config.d1_databases[0],database_id:'056bebac-a74e-403f-8d83-9734870d1ec1'}]},'api'),/mismatch: d1_databases/);
});
test('bootstrap secrets reject missing or test Turnstile configuration and only accept known secret names',()=>{
  assert.throws(()=>validateSecrets('{}','beta'),/secret/);
  const values={ADMIN_TOKEN:'a'.repeat(40),HEALTH_TOKEN:'h'.repeat(40),IP_HASH_SECRET:'b'.repeat(40),TURNSTILE_SECRET:'1x0000000000000000000000000000000AA',TURNSTILE_SITE_KEY:'1x00000000000000000000AA'};
  assert.throws(()=>validateSecrets(JSON.stringify(values),'beta'),/Turnstile/);
  assert.throws(()=>validateSecrets(JSON.stringify({...values,UNKNOWN:'oops'}),'beta'),/secret/);
});
test('production may preserve existing secrets but beta bootstrap still requires new credentials',()=>{
  assert.deepEqual(validateSecrets('{}','production'),{});
  assert.throws(()=>validateSecrets('{"HEALTH_TOKEN":"short"}','production'),/secret/);
});
test('a JSON scalar is never mistaken for an empty bundle, with or without a supplemental',()=>{
  // Object.entries(42) and Object.entries(true) are both empty, so without an
  // explicit object check these passed the production additive path.
  for(const environment of ['beta','production']) for(const scalar of ['42','true','false','0','"re_leaky_value"','[]','null']) {
    assert.throws(()=>validateSecrets(scalar,environment),error=>{
      assert.match(error.message,/Unknown or invalid reporting secret/);
      assert.ok(!error.message.includes('re_leaky'),error.message);
      return true;
    });
    // The missing-supplemental path hands the base through untouched, so it must
    // fail at the validator exactly as the single-bundle path always should have.
    assert.throws(()=>validateSecrets(composeSecretBundles(scalar,undefined),environment),/Unknown or invalid reporting secret/);
    assert.throws(()=>validateSecrets(composeSecretBundles(scalar,''),environment),/Unknown or invalid reporting secret/);
  }
  // Valid single-object callers are unaffected in both modes.
  assert.deepEqual(validateSecrets('{}','production'),{});
  assert.deepEqual(validateSecrets(JSON.stringify({RESEND_API_KEY:'re_dummy_'+'d'.repeat(24)}),'production'),{RESEND_API_KEY:'re_dummy_'+'d'.repeat(24)});
});
const dummyBootstrap={ADMIN_TOKEN:'a'.repeat(40),HEALTH_TOKEN:'h'.repeat(40),IP_HASH_SECRET:'b'.repeat(40),TURNSTILE_SECRET:'s'.repeat(40),TURNSTILE_SITE_KEY:'0x'+'a'.repeat(24)};
const dummyResend='re_dummy_'+'d'.repeat(24);
test('a supplemental bundle completes the protected base without overwriting it, and never echoes a value',()=>{
  const base=JSON.stringify({RESEND_API_KEY:dummyResend});
  // The already-provisioned Resend binding survives and the missing bindings arrive.
  assert.deepEqual(validateSecrets(composeSecretBundles(base,JSON.stringify(dummyBootstrap)),'beta'),{RESEND_API_KEY:dummyResend,...dummyBootstrap});
  // No supplemental value behaves exactly like the existing single-bundle path.
  assert.equal(composeSecretBundles(base,undefined),base);
  assert.equal(composeSecretBundles(base,''),base);
  assert.equal(composeSecretBundles(base,null),base);
  assert.throws(()=>validateSecrets(composeSecretBundles('not json',undefined),'beta'),/Invalid reporting secrets JSON/);
  const silent=pattern=>error=>{assert.match(error.message,pattern);assert.ok(!/dummy|leaky/.test(error.message),error.message);return true;};
  // An overlapping key is refused rather than silently resolved in either direction.
  assert.throws(()=>composeSecretBundles(base,JSON.stringify({RESEND_API_KEY:'re_leaky_'+'x'.repeat(24)})),silent(/Duplicate reporting secret across bundles: RESEND_API_KEY/));
  assert.throws(()=>composeSecretBundles(JSON.stringify(dummyBootstrap),JSON.stringify({HEALTH_TOKEN:'h'.repeat(40)})),silent(/Duplicate reporting secret across bundles: HEALTH_TOKEN/));
  // A key is checked against the allowlist BEFORE any duplicate is named, so pasted
  // text that lands in key position can never be echoed back by the duplicate error.
  const pasted='re_leaky_pasted_value_in_key_position';
  for(const bundle of [{[pasted]:'x'},{[pasted]:'x',...dummyBootstrap}]) assert.throws(()=>composeSecretBundles(JSON.stringify({[pasted]:'x'}),JSON.stringify(bundle)),error=>{
    assert.match(error.message,/Unknown or invalid reporting secret/);
    assert.ok(!error.message.includes('re_leaky'),error.message);
    return true;
  });
  // Malformed, array, null and scalar bundles fail closed without quoting the input.
  for(const malformed of ['re_leaky_value','[]','null','"re_leaky_value"','12','true',JSON.stringify([dummyBootstrap])]) assert.throws(()=>composeSecretBundles(base,malformed),silent(/Invalid reporting secrets JSON/));
  // Unknown keys stay a fixed refusal, on either side of the merge.
  assert.throws(()=>validateSecrets(composeSecretBundles(base,JSON.stringify({...dummyBootstrap,UNKNOWN:'oops'})),'beta'),/Unknown or invalid reporting secret/);
  // Production keeps preserving existing bindings when neither bundle adds anything.
  assert.deepEqual(validateSecrets(composeSecretBundles('{}','{}'),'production'),{});
  assert.deepEqual(validateSecrets(composeSecretBundles(base,'{}'),'production'),{RESEND_API_KEY:dummyResend});
});
const sourceRoot=new URL('../',import.meta.url);
async function fixture(environment='beta') {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-deploy-test-'));
  for(const [kind,worker] of [['api','reporting'],['website','registry-host']]) {
    await fs.mkdir(path.join(dir,kind));
    const source=JSON.parse(await fs.readFile(new URL(`workers/${worker}/wrangler.jsonc`,sourceRoot),'utf8'));
    const config={...source,...source.env[environment],main:'./index.js',vars:{...source.env[environment].vars,RELEASE:'a'.repeat(40)}};delete config.env;
    if(kind==='website')config.assets.directory='../site';
    await fs.writeFile(path.join(dir,kind,'wrangler.jsonc'),JSON.stringify(config));
    await fs.writeFile(path.join(dir,kind,'index.js'),'export default {}');
  }
  await fs.mkdir(path.join(dir,'site'));
  await fs.writeFile(path.join(dir,'site/index.html'),'<html>public</html>');
  await fs.writeFile(path.join(dir,'site/release.json'),JSON.stringify({environment,release:'a'.repeat(40)}));
  await fs.mkdir(path.join(dir,'api/migrations'));
  await fs.writeFile(path.join(dir,'api/migrations/0002_safe_delivery.sql'),'-- fixture');
  const manifest=await createManifest(dir,environment,'a'.repeat(40));
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
  return {dir,manifest};
}
const policyAPI=async endpoint=>endpoint.endsWith('/managed')?{enabled:false}:endpoint.endsWith('/custom')?{domains:[]}:{rules:[{enabled:true,conditions:{prefix:''},deleteObjectsTransition:{condition:{type:'Age',maxAge:604800}}}]};
test('backup is privately uploaded and verified before return; temporary report files are removed',async()=>{
  const {dir}=await fixture(),objects=new Map(),local=[];
  const run=args=>{
    if(args[0]==='d1') {const file=args[args.indexOf('--output')+1];local.push(file);writeFileSync(file,'CREATE TABLE reports(id);');}
    else if(args[2]==='put') objects.set(args[3],existsSync(args[args.indexOf('--file')+1]));
    else {const file=args[args.indexOf('--file')+1];local.push(file);writeFileSync(file,'CREATE TABLE reports(id);');}
  };
  try {
    const result=await backup('beta',path.join(dir,'api/wrangler.jsonc'),{run,cf:policyAPI,date:new Date('2026-09-12T00:00:00Z')});
    assert.equal(result.key,'beta/day-6.sql');
    assert.deepEqual([...objects.keys()],['cojeev-ui-private-recovery/beta/day-6.sql','cojeev-ui-private-recovery/beta/day-6.sql.json']);
    assert.ok(local.every(file=>!existsSync(file)));
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('tampered artifacts and failed backup stop deployment before any migration or deploy command',async()=>{
  const {dir,manifest}=await fixture(),original=process.env.REPORTING_SECRETS_JSON,calls=[];
  process.env.REPORTING_SECRETS_JSON=JSON.stringify({ADMIN_TOKEN:'a'.repeat(40),HEALTH_TOKEN:'h'.repeat(40),IP_HASH_SECRET:'b'.repeat(40),TURNSTILE_SECRET:'s'.repeat(40),TURNSTILE_SITE_KEY:'0x'+'a'.repeat(24)});
  try {
    const options={run:args=>calls.push(args),backupDatabase:async()=>{throw new Error('Backup readback mismatch');}};
    await assert.rejects(deployRelease(dir,'beta','a'.repeat(40),manifestDigest(manifest),options),/Backup/);
    assert.deepEqual(calls,[]);
    await fs.writeFile(path.join(dir,'website/index.js'),'changed');
    await assert.rejects(deployRelease(dir,'beta','a'.repeat(40),manifestDigest(manifest),options),/integrity/);
    assert.deepEqual(calls,[]);
  } finally {if(original===undefined)delete process.env.REPORTING_SECRETS_JSON;else process.env.REPORTING_SECRETS_JSON=original;await fs.rm(dir,{recursive:true,force:true});}
});
test('production promotion preflights existing secret names and preserves the configured Turnstile site key',async()=>{
  const {dir,manifest}=await fixture('production'),original=process.env.REPORTING_SECRETS_JSON;
  const provisioned=['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET','TURNSTILE_SECRET'];
  const commit='a'.repeat(40),endpoints=[],calls=[];
  const options=names=>({run:(args,input)=>calls.push({args,input}),backupDatabase:async()=>({}),cf:async endpoint=>{endpoints.push(endpoint);return names.map(name=>({name}));}});
  process.env.REPORTING_SECRETS_JSON='{}';
  try {
    await deployRelease(dir,'production',commit,manifestDigest(manifest),options(provisioned));
    assert.deepEqual(endpoints,['workers/scripts/cojeev-ui-reporting/secrets']);
    assert.deepEqual(calls[0].args.slice(0,3),['d1','migrations','apply']);
    const deploys=calls.filter(call=>call.args[0]==='deploy');
    assert.equal(deploys.length,2);
    assert.equal(deploys[0].input,'{}');
    await assert.rejects(deployRelease(dir,'production',commit,manifestDigest(manifest),options(provisioned.filter(name=>name!=='HEALTH_TOKEN'))),/provisioned/);
    const config=path.join(dir,'api/wrangler.jsonc');
    const parsed=JSON.parse(await fs.readFile(config,'utf8'));delete parsed.vars.TURNSTILE_SITE_KEY;
    await fs.writeFile(config,JSON.stringify(parsed));
    const updated=await createManifest(dir,'production',commit);
    await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(updated));
    await assert.rejects(deployRelease(dir,'production',commit,manifestDigest(updated),options(provisioned)),/Turnstile/);
  } finally {if(original===undefined)delete process.env.REPORTING_SECRETS_JSON;else process.env.REPORTING_SECRETS_JSON=original;await fs.rm(dir,{recursive:true,force:true});}
});
test('deployment ships the composed bundle and refuses an overlapping key before any command runs',async()=>{
  const {dir,manifest}=await fixture(),base=process.env.REPORTING_SECRETS_JSON,extra=process.env.REPORTING_ADDITIONAL_SECRETS_JSON,calls=[];
  process.env.REPORTING_SECRETS_JSON=JSON.stringify({RESEND_API_KEY:dummyResend});
  process.env.REPORTING_ADDITIONAL_SECRETS_JSON=JSON.stringify(dummyBootstrap);
  try {
    const options={run:(args,input)=>calls.push({args,input}),backupDatabase:async()=>({})};
    await deployRelease(dir,'beta','a'.repeat(40),manifestDigest(manifest),options);
    const deployed=JSON.parse(calls.find(call=>call.args[0]==='deploy').input);
    assert.deepEqual(Object.keys(deployed).sort(),['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET','RESEND_API_KEY','TURNSTILE_SECRET','TURNSTILE_SITE_KEY']);
    assert.equal(deployed.RESEND_API_KEY,dummyResend);
    calls.length=0;
    process.env.REPORTING_ADDITIONAL_SECRETS_JSON=JSON.stringify({...dummyBootstrap,RESEND_API_KEY:'re_leaky_'+'x'.repeat(24)});
    await assert.rejects(deployRelease(dir,'beta','a'.repeat(40),manifestDigest(manifest),options),error=>{
      assert.match(error.message,/Duplicate reporting secret/);
      assert.ok(!/dummy|leaky/.test(error.message),error.message);
      return true;
    });
    assert.deepEqual(calls,[]);
  } finally {
    for(const [name,value] of [['REPORTING_SECRETS_JSON',base],['REPORTING_ADDITIONAL_SECRETS_JSON',extra]]) if(value===undefined) delete process.env[name]; else process.env[name]=value;
    await fs.rm(dir,{recursive:true,force:true});
  }
});
test('rollback rejects any artifact beyond reviewed migration boundary',async()=>{
  const {dir}=await fixture(),original=process.env.REPORTING_SECRETS_JSON;
  process.env.REPORTING_SECRETS_JSON=JSON.stringify({ADMIN_TOKEN:'a'.repeat(40),HEALTH_TOKEN:'h'.repeat(40),IP_HASH_SECRET:'b'.repeat(40),TURNSTILE_SECRET:'s'.repeat(40),TURNSTILE_SITE_KEY:'0x'+'a'.repeat(24)});
  process.env.ROLLBACK_SCHEMA_ACK='0002_safe_delivery.sql';
  try {
    await fs.writeFile(path.join(dir,'api/migrations/0003_future.sql'),'-- incompatible');
    const manifest=await createManifest(dir,'beta','a'.repeat(40));await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));
    await assert.rejects(deployRelease(dir,'beta','a'.repeat(40),manifestDigest(manifest),{rollback:true,run:()=>{}}),/schema|migration/);
  } finally {delete process.env.ROLLBACK_SCHEMA_ACK;if(original===undefined)delete process.env.REPORTING_SECRETS_JSON;else process.env.REPORTING_SECRETS_JSON=original;await fs.rm(dir,{recursive:true,force:true});}
});
test('rollback run provenance rejects fork or failed runs before artifact download',async()=>{
  const trusted={conclusion:'success',head_branch:'main',head_sha:'a'.repeat(40),event:'push',path:'.github/workflows/verify.yml',head_repository:{full_name:'luv-jeri/cojeev-ui'}};
  assert.equal(await verifyRollbackRun('123','a'.repeat(40),async()=>trusted),true);
  await assert.rejects(verifyRollbackRun('123','a'.repeat(40),async()=>({...trusted,conclusion:'failure'})),/trusted/);
  await assert.rejects(verifyRollbackRun('123','a'.repeat(40),async()=>({...trusted,head_repository:{full_name:'fork/repo'}})),/trusted/);
});
test('isolated restore refuses nonempty scratch without issuing import',async()=>{
  const now=new Date(),key=`beta/day-${now.getUTCDay()}.sql`,commands=[];
  const sql='CREATE TABLE reports(id);';
  const {createHash}=await import('node:crypto');
  const receipt={environment:'beta',key,bytes:sql.length,sha256:createHash('sha256').update(sql).digest('hex'),createdAt:now.toISOString()};
  const run=args=>{
    commands.push(args);
    if(args[0]==='r2') writeFileSync(args[args.indexOf('--file')+1],args[3].endsWith('.json')?JSON.stringify(receipt):sql);
    else return JSON.stringify([{results:[{count:1}]}]);
  };
  await assert.rejects(restore('beta',key,{run,cf:policyAPI}),/empty/);
  assert.ok(!commands.some(args=>args[0]==='d1'&&args.includes('--file')));
});
