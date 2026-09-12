import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {environmentConfig} from './release-config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function copyCommittedSource(root,commit,destination) {
  assertCleanSource(root,commit);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
  if(git('write-tree')!==git('rev-parse',`${commit}^{tree}`)) throw new Error('Index tree does not match requested commit');
  const entries=git('ls-files','--stage','-z').split('\0').filter(Boolean);
  for(const entry of entries) {
    const match=entry.match(/^(100644|100755) ([a-f0-9]{40}) 0\t(.+)$/s);
    if(!match) throw new Error('Snapshot permits only regular tracked files; symlinks/submodules refused');
    const [,mode,oid,file]=match;
    if(path.isAbsolute(file)||file.split('/').includes('..')) throw new Error('Invalid snapshot path');
    const source=path.join(root,file),target=path.join(destination,file);
    if(!(await fs.lstat(source)).isFile()) throw new Error('Snapshot entry is not a regular file');
    const bytes=await fs.readFile(source);
    const actual=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if(actual!==oid) throw new Error(`Snapshot blob mismatch: ${file}`);
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target,bytes,{mode:mode==='100755'?0o755:0o644});
  }
  assertCleanSource(root,commit);
}
export const manifestDigest = manifest => hash(JSON.stringify(manifest));
export function assertCleanSource(root, commit) {
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  if(!/^[a-f0-9]{40}$/.test(commit) || git('rev-parse','HEAD')!==commit) throw new Error('Source commit mismatch');
  if(git('status','--porcelain','--untracked-files=all')) throw new Error('Source must be clean; dirty snapshot refused');
  return commit;
}
const LOCAL_HOSTS=['localhost','127.0.0.1','[::1]'];
export function validateContent(file, content, environment) {
  const target=environmentConfig(environment);
  const opposite=environmentConfig(environment==='beta'?'production':'beta');
  const forbidden=[new URL(opposite.site).hostname,new URL(opposite.api).hostname,'luv-jeri.github.io'];
  // A dependency position: a malformed value here is reported by name instead of
  // surfacing as a bare TypeError from the URL parser.
  const reject=url=>{
    const value=url.replaceAll('\\/','/');
    if(!URL.canParse(value)) throw new Error(`Malformed URL dependency in ${file}`);
    const {hostname}=new URL(value);
    if(LOCAL_HOSTS.includes(hostname)||forbidden.includes(hostname)) throw new Error(`Cross-environment URL in ${file}`);
  };
  // Bundled and quoted source legitimately teaches localhost development, so only
  // its executable uses count as dependencies there. An opposite-environment
  // origin is never legitimate and is rejected wherever it appears.
  const scanSource=text=>{
    for(const match of text.matchAll(/https?:\/\/[^\s"'<>`\\)]+/g)) {
      const executable=/(?:fetch|import|WebSocket|EventSource|url)\s*\(\s*["']?$/.test(text.slice(Math.max(0,match.index-40),match.index));
      if(!executable && (LOCAL_HOSTS.some(host=>match[0].includes(host)) || !URL.canParse(match[0]))) continue;
      reject(match[0]);
    }
  };
  if(file.endsWith('.html')) {
    for(const match of content.matchAll(/(?:src|href|action)=["'](https?:\/\/[^"']+)["']/g)) reject(match[1]);
    for(const match of content.matchAll(/(?:fetch|import|WebSocket|EventSource)\s*\(\s*["'](https?:\/\/[^"']+)["']/g)) reject(match[1]);
  } else if(file.startsWith('site/') && file.endsWith('.json')) {
    const data=JSON.parse(content);
    // `content` and `description` carry registry component source and prose, so
    // they are walked as source rather than skipped.
    const walk=(value,source=false)=>{
      if(typeof value==='string') {if(source) scanSource(value);else if(/^https?:\/\//.test(value)) reject(value);}
      else if(Array.isArray(value)) value.forEach(child=>walk(child,source));
      else if(value && typeof value==='object') for(const [key,child] of Object.entries(value)) walk(child,source||key==='content'||key==='description');
    };walk(data);
  } else if(file.startsWith('site/') && /\.(js|css|json)$/.test(file)) scanSource(content);
  // Sitemap XML and the RSC .txt payloads declare no executable dependency, so only
  // an opposite-environment origin is rejected here: inert localhost documentation
  // and prose that merely looks like a URL stay legitimate in served prose. Escaped
  // slashes are normalised first because RSC payloads carry JSON-escaped strings.
  else if(file.startsWith('site/') && /\.(xml|txt)$/.test(file)) {
    for(const match of content.replaceAll('\\/','/').matchAll(/https?:\/\/[^\s"'<>`\\)]+/g))
      if(URL.canParse(match[0]) && forbidden.includes(new URL(match[0]).hostname)) throw new Error(`Cross-environment URL in ${file}`);
  }
  return target;
}
async function inventory(root, directory='') {
  const files=[];
  for(const entry of await fs.readdir(path.join(root,directory),{withFileTypes:true})) {
    const file=path.posix.join(directory,entry.name);
    if(entry.isSymbolicLink()) throw new Error('Artifact symlink forbidden');
    if(entry.isDirectory()) files.push(...await inventory(root,file));
    else if(entry.isFile() && file!=='manifest.json') files.push(file);
    else if(!entry.isFile()) throw new Error('Unsupported artifact entry');
  }
  return files.sort();
}
export async function createManifest(root, environment, commit) {
  environmentConfig(environment);
  if(!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid release commit');
  const files={};
  for(const file of await inventory(root)) {
    if(/(^|\/)(?:\.|private|backup|reports|secrets)/i.test(file) || /\.(?:sql|sqlite|db|pem|key|map)$/i.test(file) && !/^api\/migrations\/\d{4}_[a-z_]+\.sql$/.test(file)) throw new Error(`Private/forbidden artifact path: ${file}`);
    if(!/^(site\/|api\/|website\/)/.test(file)) throw new Error(`Unexpected artifact path: ${file}`);
    const bytes=await fs.readFile(path.join(root,file));
    // Scanned: every public `site/**` .html/.js/.css/.json byte served to browsers,
    // plus sitemap.xml, robots.txt and the __next RSC .txt payloads for an
    // opposite-environment origin only (they carry no executable dependency).
    // Not scanned, deliberately: `website/index.js` compiles BOTH API hostnames into
    // the CSP it chooses at runtime from env.ENVIRONMENT, and `api/index.js` compiles
    // localhost/127.0.0.1 into its LOCAL_MODE guard, so a URL scan of either bundle
    // can only produce false positives. `api/wrangler.jsonc` and
    // `website/wrangler.jsonc` (.jsonc misses this test) also stay unscanned. What
    // each deployed Worker actually targets is controlled by
    // validateDeploymentConfig, which checks name, account, route hostname, D1, R2 and
    // allowed origins against this environment; live cross-origin behaviour is Task 4.
    if(/\.(html|js|css|json|xml|txt)$/.test(file)) validateContent(file,bytes.toString('utf8'),environment);
    files[file]=hash(bytes);
  }
  if(!files['site/index.html']) throw new Error('Missing website artifact');
  return {schema:1,environment,commit,files};
}
export async function verifyManifest(root, manifest, expected) {
  if(manifest.schema!==1 || manifest.environment!==expected.environment || manifest.commit!==expected.commit || !/^[a-f0-9]{64}$/.test(expected.digest) || manifestDigest(manifest)!==expected.digest) throw new Error('Artifact identity or manifest digest mismatch');
  const actual=await createManifest(root,expected.environment,expected.commit);
  if(JSON.stringify(actual)!==JSON.stringify(manifest)) throw new Error('Artifact integrity mismatch');
}
