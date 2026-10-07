/** Candidate registries are served only from one disposable local origin. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readVariant} from './release.mjs';
import {rewriteDependency, rewriteNamespace} from './registry-dependency.mjs';

const verifier=path.resolve(import.meta.dirname,'verify-install.mjs');
export async function verifyInstall(baseURL,receipt,{quiet=false,run=spawn}={}) {
  const code=await new Promise((resolve,reject)=>{
    const child=run(process.execPath,[verifier,`--url=${baseURL}`,'--components=button,cojeev,bento-builder',`--receipt=${receipt}`],{stdio:quiet?'ignore':'inherit'});
    child.on('error',reject);child.on('exit',(code)=>resolve(code));
  });
  const result=JSON.parse(await fs.readFile(receipt,'utf8'));
  return {...result,build:code===0 && result.build==='PASS'?'PASS':'FAIL'};
}
export async function releaseInstall(environment,commit,directory,digest,{verify=verifyInstall}={}) {
  const root=path.resolve(directory);
  const {side}=await readVariant(root,environment,commit,digest);
  if(side!=='website') throw new Error('Candidate installs require a website variant');
  const items=new Map();
  const server=createServer((request,response)=>{
    const item=items.get(request.url);
    if(!item) {response.writeHead(404).end();return;}
    response.setHeader('Content-Type','application/json');response.end(item);
  });
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin=`http://127.0.0.1:${server.address().port}`;
    // Prepare both complete graphs before invoking a CLI. Unknown/missing
    // dependencies fail here; a missing HTTP request is a local 404, never a proxy.
    for(const mount of ['', '/ui']) {
      const registry=path.join(root,`site${mount}/r`),base=`${origin}${mount}`;
      const available=new Set((await fs.readdir(registry)).filter(file=>/^[a-z0-9-]+\.json$/.test(file)));
      for(const file of available) {
        const item=JSON.parse(await fs.readFile(path.join(registry,file),'utf8'));
        if(item.registryDependencies) item.registryDependencies=item.registryDependencies.map(value=>rewriteDependency(value,base,available));
        rewriteNamespace(item,base);
        // Other namespace templates must not provide a route back to the network.
        for(const [name,template] of Object.entries(item.config?.registries??{})) {
          if(template!==`${base}/r/{name}.json`) throw new Error(`Namespace escapes candidate registry: ${name}`);
        }
        items.set(`${mount}/r/${file}`,JSON.stringify(item));
      }
      for(const id of ['button','cojeev','bento-builder'])
        if(!available.has(`${id}.json`)) throw new Error(`Missing candidate registry item: ${id}`);
    }
    const results=[];
    for(const [mount,label] of [['','legacy'],['/ui','canonical']]) {
      const receipt=`artifacts/stranger/${environment}-${commit}-${label}.json`;
      const result=await verify(`${origin}${mount}`,receipt);
      if(result?.build!=='PASS') throw new Error(`Fresh ${label} consumer installation failed`);
      results.push({label,receipt,result});
    }
    return results;
  } finally {
    await new Promise(resolve=>server.close(resolve));
    server.closeAllConnections();
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [environment,commit,directory,digest]=process.argv.slice(2);
    if(!directory || !digest) throw new Error('Pass ENV SHA ARTIFACT_DIRECTORY MANIFEST_DIGEST');
    await releaseInstall(environment,commit,directory,digest);
    console.log(`Both candidate registry paths installed for ${environment}`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
