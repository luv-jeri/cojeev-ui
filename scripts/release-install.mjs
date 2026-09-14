/** Isolated consumer fixture rewrites dependency URLs only in its temporary copy. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readArtifact} from './release.mjs';

const [environment,commit,directory,digest]=process.argv.slice(2);
if(!directory) throw new Error('Pass ENV SHA ARTIFACT_DIRECTORY MANIFEST_DIGEST');
await readArtifact(path.resolve(directory),environment,commit,digest);
const registry=path.join(directory,'site/r');

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-registry-install-'));
const server=createServer(async(request,response)=>{
  const match=request.url?.match(/^\/r\/([a-z0-9-]+)\.json$/);
  if(!match) {response.writeHead(404).end();return;}
  try {response.setHeader('Content-Type','application/json');response.end(await fs.readFile(path.join(temp,`${match[1]}.json`)));}
  catch {response.writeHead(404).end();}
});
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const file of await fs.readdir(registry)) {
    if(!file.endsWith('.json')) continue;
    const item=JSON.parse(await fs.readFile(path.join(registry,file),'utf8'));
    if(item.registryDependencies) item.registryDependencies=item.registryDependencies.map(value=>/^https?:\/\/[^/]+(?:\/cojeev-ui)?\/r\//.test(value)?`${origin}/r/${value.split('/r/')[1]}`:value);
    await fs.writeFile(path.join(temp,file),JSON.stringify(item));
  }
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/verify-install.mjs',`--url=${origin}`,`--receipt=artifacts/stranger/${environment}-${commit}.json`],{stdio:'inherit'});
    child.on('error',reject);child.on('exit',resolve);
  });
  if(code!==0) throw new Error('Fresh consumer installation failed');
} finally {server.close();await fs.rm(temp,{recursive:true,force:true});}
