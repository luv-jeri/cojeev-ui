import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const config='workers/reporting/wrangler.jsonc';
const localConfig='workers/reporting/wrangler.local.jsonc';
const privateDir=resolve(root,'.work/reporting');
const secretPath=resolve(privateDir,'cloud-secrets.json');
const run=(args,{capture=false,input,env={}}={})=>new Promise((done,fail)=>{
  const child=spawn('rtk',['proxy',...args],{cwd:root,env:{...process.env,...env},stdio:[input===undefined?'inherit':'pipe',capture?'pipe':'inherit',capture?'pipe':'inherit']});
  let output='',errors='';child.stdout?.on('data',v=>output+=v);child.stderr?.on('data',v=>errors+=v);
  if(input!==undefined) child.stdin.end(input);
  child.on('error',fail);child.on('exit',code=>code===0?done(output):fail(new Error(`Command ${args.slice(0,4).join(' ')} failed (${code}).${capture?' See the provider CLI logs.':''}`)));
  // Captured output may contain provider secrets. Do not include it in errors.
  void errors;
});
async function loadSecrets(){try{return JSON.parse(await readFile(secretPath,'utf8'));}catch{return {};}}
async function saveSecrets(value){await mkdir(privateDir,{recursive:true,mode:0o700});await writeFile(secretPath,JSON.stringify(value,null,2)+'\n',{mode:0o600});}
async function provision(){
  await run(['npx','wrangler','whoami']);
  let cfg=JSON.parse(await readFile(resolve(root,config),'utf8'));
  if(!cfg.d1_databases?.some(v=>v.binding==='DB')) await run(['npx','wrangler','d1','create','sahajiv-ui-reports','--binding','DB','--update-config','--config',config]);
  cfg=JSON.parse(await readFile(resolve(root,config),'utf8'));
  if(!cfg.r2_buckets?.some(v=>v.binding==='MEDIA')) await run(['npx','wrangler','r2','bucket','create','sahajiv-ui-report-media','--binding','MEDIA','--update-config','--config',config]);
  const secrets=await loadSecrets();
  cfg=JSON.parse(await readFile(resolve(root,config),'utf8'));
  if(!cfg.vars.TURNSTILE_SITE_KEY){
    const widget=JSON.parse(await run(['npx','wrangler','turnstile','widget','create','SahaJiv UI reporting','--domain','luv-jeri.github.io','--mode','managed','--json'],{capture:true}));
    const result=widget.result??widget;
    if(!result.sitekey||!result.secret) throw new Error('Turnstile created without expected credentials. Inspect its dashboard before retrying provisioning.');
    cfg.vars.TURNSTILE_SITE_KEY=result.sitekey;secrets.TURNSTILE_SECRET=result.secret;
    await writeFile(resolve(root,config),JSON.stringify(cfg,null,2)+'\n');
  }
  for(const name of ['ADMIN_TOKEN','IP_HASH_SECRET','GITHUB_WEBHOOK_SECRET']) secrets[name]??=randomBytes(32).toString('hex');
  await saveSecrets(secrets);
  await run(['npx','wrangler','d1','migrations','apply','DB','--remote','--config',config]);
  console.log('D1, private R2 and Turnstile are ready. Secrets saved privately in .work/reporting/cloud-secrets.json.');
}
async function deploy(){
  const cfg=JSON.parse(await readFile(resolve(root,config),'utf8'));const secrets=await loadSecrets();
  if(cfg.vars.LOCAL_MODE!=='false'||!cfg.vars.TURNSTILE_SITE_KEY||!cfg.d1_databases?.length||!cfg.r2_buckets?.length||!secrets.TURNSTILE_SECRET||!secrets.ADMIN_TOKEN||!secrets.IP_HASH_SECRET) throw new Error('Run reporting:provision first. Production cannot deploy without protection.');
  await run(['npx','wrangler','deploy','--dry-run','--config',config]);
  await run(['npx','wrangler','secret','bulk','--config',config],{input:JSON.stringify(secrets)});
  await run(['npx','wrangler','deploy','--config',config]);
}
async function dev(){
  await mkdir(privateDir,{recursive:true,mode:0o700});
  const localSecretPath=resolve(privateDir,'local-admin-token');let admin;
  try{admin=(await readFile(localSecretPath,'utf8')).trim();}catch{admin=randomBytes(32).toString('hex');await writeFile(localSecretPath,admin+'\n',{mode:0o600});}
  await writeFile(resolve(root,'workers/reporting/.dev.vars'),`ADMIN_TOKEN=${admin}\n`,{mode:0o600});
  await run(['npx','wrangler','d1','migrations','apply','DB','--local','--config',localConfig]);
  console.log(`Local API: http://localhost:8787. Maintainer token file: ${localSecretPath}`);
  await run(['npx','wrangler','dev','--local','--ip','127.0.0.1','--port','8787','--config',localConfig]);
}
async function githubConnect(){
  const secrets=await loadSecrets();
  // Explicit operation: use a provided repository-scoped token; never read gh's broad login token.
  if(!process.env.REPORTING_GITHUB_TOKEN) throw new Error('Set REPORTING_GITHUB_TOKEN to a fine-grained GitHub token with Issues read/write on luv-jeri/sahajiv-ui.');
  secrets.GITHUB_TOKEN=process.env.REPORTING_GITHUB_TOKEN;await saveSecrets(secrets);
  await run(['npx','wrangler','secret','put','GITHUB_TOKEN','--config',config],{input:secrets.GITHUB_TOKEN});
  console.log('GitHub issue delivery is configured. Run the maintainer delivery retry to process saved reports.');
}
async function githubWebhook(){
  const cfg=JSON.parse(await readFile(resolve(root,config),'utf8'));const secrets=await loadSecrets();
  const origin=new URL(process.env.REPORTING_API_URL??'https://sahajiv-ui-reporting.unread-fyi.workers.dev');
  if(origin.protocol!=='https:'||!secrets.GITHUB_WEBHOOK_SECRET) throw new Error('Set the HTTPS REPORTING_API_URL and provision the webhook secret first.');
  const endpoint=`repos/${cfg.vars.GITHUB_REPOSITORY}/hooks`;
  const pages=JSON.parse(await run(['gh','api',endpoint,'--paginate','--slurp'],{capture:true}));
  const url=new URL('/v1/github/webhook',origin).href;
  const existing=pages.flat().find(hook=>hook.config?.url===url);
  const body={name:'web',active:true,events:['issues'],config:{url,content_type:'json',insecure_ssl:'0',secret:secrets.GITHUB_WEBHOOK_SECRET}};
  const hook=JSON.parse(await run(['gh','api',existing?`${endpoint}/${existing.id}`:endpoint,'--method',existing?'PATCH':'POST','--input','-'],{capture:true,input:JSON.stringify(body)}));
  console.log(`GitHub Issues webhook ${hook.id} is active for ${url}. The local GitHub login stays on this computer.`);
}
const command=process.argv[2];
try {
  if(command==='provision') await provision();
  else if(command==='deploy') await deploy();
  else if(command==='dev') await dev();
  else if(command==='github-connect') await githubConnect();
  else if(command==='github-webhook') await githubWebhook();
  else throw new Error('Use dev, provision, deploy, github-connect or github-webhook.');
}catch(error){console.error(error.message);process.exitCode=1;}
