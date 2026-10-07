/** Live acceptance deliberately leaves the published dependency graph untouched. */
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {environmentConfig} from './release-config.mjs';
import {verifyInstall} from './release-install.mjs';

export async function liveInstall(environment,{verify=verifyInstall}={}) {
  const target=environmentConfig(environment),results=[];
  for(const [label,base] of [['legacy',target.legacySite],['canonical',target.canonicalSite]]) {
    try {
      const result=await verify(base,`artifacts/stranger/${environment}-live-${label}.json`,{quiet:true});
      results.push({label,...result});
    } catch {results.push({label,build:'FAIL',installer:'shadcn@4.21.0'});}
  }
  const installers=[...new Set(results.map(result=>result.installer))].join(',');
  return {ok:results.every(result=>result.build==='PASS'),results,
    line:`${installers} ${environment} legacy=${results[0].build} canonical=${results[1].build}`};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result=await liveInstall(process.argv[2]);
    console.log(result.line);
    if(!result.ok) process.exitCode=1;
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
