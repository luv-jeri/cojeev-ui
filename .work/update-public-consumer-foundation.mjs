/** Upgrade only the deployed foundation in the existing fresh-origin public consumer. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const install=JSON.parse(fs.readFileSync('.work/public-consumer-install-receipt.json','utf8'));
const expectedManifest=process.argv.find(value=>value.startsWith('--manifest-sha='))?.slice('--manifest-sha='.length);
if(!expectedManifest)throw new Error('Pass --manifest-sha with the root-confirmed corrected public manifest hash');
const started=Date.now(),deadline=started+600000;
const receipt={startedAt:new Date().toISOString(),directory:install.directory,publicRegistryURL:install.baseURL+'/r/',previousManifestSHA256:install.publicManifest.sha256,attempts:[],scope:'Real public CLI foundation update and rebuild; no local registry copies'};
const env={...process.env,PATH:`${path.dirname(process.execPath)}:${process.env.PATH}`,CI:'true'};
try {
 while(true){
  try {
   const values=await Promise.all(['registry.json','r/sahajiv.json'].map(async file=>{const url=`${install.baseURL}/${file}`,response=await fetch(url,{signal:AbortSignal.timeout(Math.min(10000,Math.max(1,deadline-Date.now())))}),text=await response.text();assertJSON(response);return {url,status:response.status,sha256:createHash('sha256').update(text).digest('hex'),data:JSON.parse(text)};}));
   const [manifest,foundation]=values;const ready=manifest.sha256===expectedManifest;receipt.attempts.push({at:new Date().toISOString(),ready:!!ready,manifestSHA256:manifest.sha256});
   if(ready){receipt.publicManifest={url:manifest.url,status:manifest.status,sha256:manifest.sha256,entryCount:manifest.data.items.length};receipt.publicFoundation={url:foundation.url,status:foundation.status,sha256:foundation.sha256,cssVars:foundation.data.cssVars,css:foundation.data.css};break;}
  }catch(error){receipt.attempts.push({at:new Date().toISOString(),error:error.message});}
  if(Date.now()>=deadline)throw new Error('Corrected public foundation was not ready within10minutes');console.log(JSON.stringify(receipt.attempts.at(-1)));await new Promise(resolve=>setTimeout(resolve,Math.min(30000,deadline-Date.now())));
 }
 receipt.readinessSeconds=(Date.now()-started)/1000;
 execFileSync('npx',['--yes','shadcn@latest','add',`${install.baseURL}/r/sahajiv.json`,'--yes','--overwrite'],{cwd:install.directory,stdio:'inherit',env});receipt.publicCLIUpdate='PASS';
 execFileSync('npm',['run','build'],{cwd:install.directory,stdio:'inherit',env});receipt.typecheckAndBuild='PASS';receipt.status='PASS';
}catch(error){receipt.status='FAIL';receipt.error=error.stack;process.exitCode=1;console.error(error.message);}finally{receipt.finishedAt=new Date().toISOString();receipt.runtimeSeconds=(Date.parse(receipt.finishedAt)-started)/1000;fs.writeFileSync('.work/public-consumer-foundation-update-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));}
function assertJSON(response){if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw new Error(`Expected HTTP200JSON:${response.url} returned${response.status}`);}
