// Only sanitized diagnostics are retained. Never persist the raw subprocess error:
// execFileSync errors contain command arguments, stdout, stderr and sometimes input.
import {appendFileSync} from 'node:fs';

function secretValues(input, env) {
  const values=[];
  const collect=value=>{
    if(typeof value==='string'&&value) values.push(value);
    else if(value&&typeof value==='object') Object.values(value).forEach(collect);
  };
  for(const [name,value] of Object.entries(env)) {
    if(/TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|PRIVATE_KEY/i.test(name)) {
      collect(value);
      try {collect(JSON.parse(value));} catch { /* Not a JSON bundle. */ }
    }
  }
  if(input) {collect(input);try {collect(JSON.parse(input));} catch { /* Not JSON. */ }}
  return [...new Set(values)].sort((a,b)=>b.length-a.length);
}

export function deploymentDiagnostic(error,args,input,env=process.env) {
  const operation=args.slice(0,args[0]==='deploy'?1:2).join(' ');
  let output=[error.stderr,error.stdout].map(value=>String(value??'')).join('\n')
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g,'');
  for(const value of secretValues(input,env)) output=output.split(value).join('[redacted]');
  output=output
    .replace(/(?:Bearer|Basic)\s+\S+/gi,'[redacted authorization]')
    .replace(/https?:\/\/\S+/gi,'[service URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
    .replace(/\b(?:github_pat_|gh[pousr]_|sk-|re_)[A-Za-z0-9_-]+/g,'[redacted token]');
  const apiCode=output.match(/\[code:\s*(\d{3,6})\]/)?.[1];
  const systemCode=output.match(/\b(ENXIO|ENOENT|EACCES|EPERM|ENOSPC|EPIPE|ECONNRESET|ETIMEDOUT)\b/)?.[1];
  let explanation;
  if(systemCode==='ENXIO'&&output.includes('/dev/stdin')) {
    explanation='Uploader cannot open /dev/stdin as a file. Use a protected real secrets file instead of the Node subprocess input socket.';
  } else if(args[0]==='deploy') {
    // Upload errors contain configuration diagnostics, not report query/export
    // output. Keep only error headlines and code lines, never the whole response.
    explanation=output.split('\n').filter(line=>/\[ERROR\]|\[code:\s*\d+\]|\b(?:ENXIO|ENOENT|EACCES|EPERM)\b/.test(line))
      .slice(0,4).map(line=>line.trim()).join(' ').slice(0,1000);
  }
  return {
    operation,status:'failed',
    exitCode:Number.isInteger(error.status)?error.status:null,
    ...(apiCode?{apiCode}:{}),...(systemCode?{systemCode}:{}),
    explanation:explanation||'No safe error headline was available; raw output was not published. Inspect the uploader configuration and credential scope privately.',
  };
}

export function recordDeploymentEvent(event) {
  const line=JSON.stringify({time:new Date().toISOString(),...event});
  console.error(line);
  if(process.env.GITHUB_STEP_SUMMARY) {
    // HTML-escape diagnostic text before writing it into a public job summary.
    const escaped=line.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    try {appendFileSync(process.env.GITHUB_STEP_SUMMARY,`<pre>${escaped}</pre>\n`);}
    catch {console.error('Could not append sanitized deployment event to the job summary.');}
  }
}
