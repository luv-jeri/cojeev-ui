import {github} from './operations-health.mjs';
import {pathToFileURL} from 'node:url';

export async function verifyRollbackRun(runId,commit,client=github) {
  if(!/^[1-9][0-9]*$/.test(runId)||!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source run identity');
  const run=await client(`actions/runs/${runId}`);
  if(run.conclusion!=='success'||run.head_branch!=='main'||run.head_sha!==commit||run.event!=='push'||run.path!=='.github/workflows/verify.yml'||run.head_repository?.full_name!=='luv-jeri/cojeev-ui') throw new Error('Rollback requires successful trusted main release run');
  return true;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await verifyRollbackRun(...process.argv.slice(2));console.log('Rollback source run verified');}
  catch(error) {console.error(error.message);process.exitCode=1;}
}
