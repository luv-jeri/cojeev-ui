import fs from 'node:fs/promises';
import {readFileSync,realpathSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ACCOUNT,RECOVERY_BUCKET,RESTORE_DATABASE,environmentConfig} from './release-config.mjs';

const maxBytes=25*1024*1024;
export function validateSecrets(input,environment) {
  environmentConfig(environment);
  let secrets;try {secrets=JSON.parse(input);} catch {throw new Error('Invalid reporting secrets JSON');}
  const allowed=['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET','TURNSTILE_SECRET','TURNSTILE_SITE_KEY','GITHUB_TOKEN','GITHUB_WEBHOOK_SECRET','RESEND_API_KEY','RESEND_WEBHOOK_SECRET'];
  if(!secrets||Array.isArray(secrets)||Object.entries(secrets).some(([key,value])=>!allowed.includes(key)||typeof value!=='string'||!value.trim())) throw new Error('Unknown or invalid reporting secret');
  for(const key of ['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET','TURNSTILE_SECRET','TURNSTILE_SITE_KEY']) if((environment==='beta'&&!secrets[key])||(secrets[key]&&secrets[key].length<(['ADMIN_TOKEN','HEALTH_TOKEN','IP_HASH_SECRET'].includes(key)?32:20))) throw new Error('Missing or short reporting secret');
  if(secrets.TURNSTILE_SITE_KEY&&!/^0x[A-Za-z0-9_-]{20,}$/.test(secrets.TURNSTILE_SITE_KEY)||secrets.TURNSTILE_SECRET&&/^[123]x0+/.test(secrets.TURNSTILE_SECRET)) throw new Error('Real environment-specific Turnstile configuration required');
  return secrets;
}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function wrangler(args,input) {
  const executable=process.env.WRANGLER_BIN;
  if(!executable||!path.isAbsolute(executable)) throw new Error('Canonical external WRANGLER_BIN required');
  const canonical=realpathSync(executable),root=realpathSync(process.cwd());
  if(canonical.startsWith(`${root}${path.sep}`)||JSON.parse(readFileSync(path.resolve(canonical,'../../package.json'),'utf8')).version!=='4.131.1') throw new Error('External Wrangler 4.131.1 required');
  // Secrets stay in the stdin pipe and protected environment, never a file,
  // argument, artifact or emitted subprocess diagnostic.
  const logs=mkdtempSync(path.join(os.tmpdir(),'cojeev-log-sink-'));
  const sink=path.join(logs,'discard.log');symlinkSync('/dev/null',sink);
  try {return execFileSync(process.execPath,[canonical,...args],{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:4*1024*1024,env:{...process.env,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG:'error',WRANGLER_LOG_PATH:sink,WRANGLER_LOG_SANITIZE:'true'}});}
  catch {throw new Error(`Cloudflare operation failed (${args[0]}); private output suppressed`);}
  finally {rmSync(logs,{recursive:true,force:true});}
}
export async function cloudflare(endpoint) {
  if(!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Cloudflare token missing');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/${endpoint}`,{headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error('Cloudflare preflight failed');
  const data=await response.json();
  if(!data.success) throw new Error('Cloudflare preflight refused');
  return data.result;
}
export function validateDeploymentConfig(environment,config,kind) {
  const target=environmentConfig(environment),api=kind==='api';
  const allowed=api?[target.site,target.api,...(environment==='production'?['https://luv-jeri.github.io']:[])]:[];
  // This guardrail exists to catch an environment mixup minutes before a deploy,
  // so it names the field that failed instead of one undifferentiated refusal.
  const checks=[
    ['kind',['api','website'].includes(kind)],
    ['name',config.name===(api?target.worker:target.website)],
    ['account_id',config.account_id===ACCOUNT],
    ['vars.ENVIRONMENT',config.vars?.ENVIRONMENT===environment],
    ['workers_dev',config.workers_dev===false],
    ['preview_urls',config.preview_urls===false],
    ['routes',config.routes?.length===1&&config.routes[0].pattern===new URL(api?target.api:target.site).hostname&&config.routes[0].custom_domain===true],
    ...(api?[
      ['d1_databases',config.d1_databases?.length===1&&config.d1_databases[0].database_id===target.databaseId],
      ['r2_buckets',config.r2_buckets?.length===1&&config.r2_buckets[0].bucket_name===target.media],
      ['vars.LOCAL_MODE',config.vars?.LOCAL_MODE==='false'],
      ['vars.SITE_URL',config.vars?.SITE_URL===target.site],
      ['vars.ALLOWED_ORIGINS',JSON.stringify(config.vars?.ALLOWED_ORIGINS?.split(',').sort())===JSON.stringify(allowed.sort())],
    ]:[
      ['website d1_databases',!config.d1_databases?.length],
      ['website r2_buckets',!config.r2_buckets?.length],
      ['assets.directory',config.assets?.directory==='../site'],
      ['assets.run_worker_first',config.assets?.run_worker_first===true],
      ['assets.not_found_handling',config.assets?.not_found_handling==='404-page'],
    ]),
  ];
  const failed=checks.find(([,passed])=>!passed);
  if(failed) throw new Error(`Deployment target mismatch: ${failed[0]}`);
}
export function backupKey(environment,date=new Date()) {environmentConfig(environment);return `${environment}/day-${date.getUTCDay()}.sql`;}
export function assertRecoveryPolicy({managed,custom,lifecycle}) {
  if(managed?.enabled!==false||!Array.isArray(custom?.domains)||custom.domains.some(domain=>domain.enabled!==false)) throw new Error('Recovery bucket must be private');
  if(!lifecycle?.rules?.some(rule=>rule.enabled===true&&(rule.conditions?.prefix??'')===''&&rule.deleteObjectsTransition?.condition?.type==='Age'&&rule.deleteObjectsTransition.condition.maxAge>0&&rule.deleteObjectsTransition.condition.maxAge<=604800)) throw new Error('Recovery retention must be bounded to seven days');
}
async function recoveryPolicy(cf) {
  const base=`r2/buckets/${RECOVERY_BUCKET}`;
  const [managed,custom,lifecycle]=await Promise.all([cf(`${base}/domains/managed`),cf(`${base}/domains/custom`),cf(`${base}/lifecycle`)]);
  assertRecoveryPolicy({managed,custom,lifecycle});
}
export function validateRestore(environment,receipt,target=RESTORE_DATABASE,date=new Date()) {
  environmentConfig(environment);
  if(target!==RESTORE_DATABASE) throw new Error('Restore is restricted to isolated scratch D1');
  if(!Number.isInteger(receipt.bytes)||receipt.bytes<1||receipt.bytes>maxBytes) throw new Error('Recovery size limit exceeded');
  if(receipt.environment!==environment||!new RegExp(`^${environment}/day-[0-6]\\.sql$`).test(receipt.key)||!/^[a-f0-9]{64}$/.test(receipt.sha256)) throw new Error('Recovery receipt identity invalid');
  const age=date.getTime()-Date.parse(receipt.createdAt);
  if(!Number.isFinite(age)||age<0||age>604800000) throw new Error('Recovery receipt expired');
}
export async function backup(environment,configPath,{run=wrangler,cf=cloudflare,date=new Date()}={}) {
  const target=environmentConfig(environment);
  const config=JSON.parse(await fs.readFile(configPath,'utf8'));validateDeploymentConfig(environment,config,'api');
  await recoveryPolicy(cf);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-private-backup-'));
  await fs.chmod(temp,0o700);
  try {
    const sql=path.join(temp,'export.sql');
    run(['d1','export',target.database,'--remote','--config',configPath,'--output',sql]);
    const bytes=await fs.readFile(sql);
    const receipt={environment,key:backupKey(environment,date),bytes:bytes.length,sha256:digest(bytes),createdAt:date.toISOString()};
    validateRestore(environment,receipt,RESTORE_DATABASE,date);
    const record=path.join(temp,'receipt.json');await fs.writeFile(record,JSON.stringify(receipt),{mode:0o600});
    run(['r2','object','put',`${RECOVERY_BUCKET}/${receipt.key}`,'--file',sql,'--remote']);
    run(['r2','object','put',`${RECOVERY_BUCKET}/${receipt.key}.json`,'--file',record,'--remote']);
    const downloaded=path.join(temp,'verified.sql');
    run(['r2','object','get',`${RECOVERY_BUCKET}/${receipt.key}`,'--file',downloaded,'--remote']);
    if(digest(await fs.readFile(downloaded))!==receipt.sha256) throw new Error('Private backup readback mismatch');
    return receipt;
  } finally {await fs.rm(temp,{recursive:true,force:true});}
}
export async function restore(environment,key,{run=wrangler,cf=cloudflare}={}) {
  environmentConfig(environment);
  if(!new RegExp(`^${environment}/day-[0-6]\\.sql$`).test(key)) throw new Error('Recovery key invalid');
  await recoveryPolicy(cf);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-private-restore-'));await fs.chmod(temp,0o700);
  try {
    const sql=path.join(temp,'restore.sql'),record=path.join(temp,'receipt.json'),config=path.join(temp,'wrangler.json');
    await fs.writeFile(config,JSON.stringify({name:'cojeev-restore-tool',account_id:ACCOUNT,d1_databases:[{binding:'SCRATCH',database_name:'cojeev-ui-restore-check',database_id:RESTORE_DATABASE}]}));
    run(['r2','object','get',`${RECOVERY_BUCKET}/${key}.json`,'--file',record,'--remote']);
    const receipt=JSON.parse(await fs.readFile(record,'utf8'));validateRestore(environment,receipt);
    if(receipt.key!==key) throw new Error('Recovery slot mismatch');
    run(['r2','object','get',`${RECOVERY_BUCKET}/${key}`,'--file',sql,'--remote']);
    const bytes=await fs.readFile(sql);
    if(bytes.length!==receipt.bytes||digest(bytes)!==receipt.sha256) throw new Error('Recovery integrity mismatch');
    const result=JSON.parse(run(['d1','execute','SCRATCH','--remote','--config',config,'--command',"SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",'--json']));
    if(result[0]?.results?.[0]?.count!==0) throw new Error('Scratch D1 must be empty; no overwrite permitted');
    run(['d1','execute','SCRATCH','--remote','--config',config,'--file',sql,'--yes']);
    const check=JSON.parse(run(['d1','execute','SCRATCH','--remote','--config',config,'--command','PRAGMA quick_check','--json']));
    if(check[0]?.results?.[0]?.quick_check!=='ok') throw new Error('Isolated restore integrity check failed');
    return {environment,restored:true,target:RESTORE_DATABASE};
  } finally {await fs.rm(temp,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [command,environment,input]=process.argv.slice(2);
    if(command!=='restore') throw new Error('Only isolated restore is exposed; backups run before verified migrations');
    console.log(JSON.stringify(await restore(environment,input)));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
