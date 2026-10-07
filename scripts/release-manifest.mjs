import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {environmentConfig} from './release-config.mjs';
import {WEBSITE_PHASES, API_PHASES} from './release-phases.mjs';
import {load} from 'cheerio';
import ts from 'typescript';

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
export function validateContent(file, content, environment, context) {
  if(context) return validateContextualContent(file,content,environment,context);
  const target=environmentConfig(environment);
  const opposite=environmentConfig(environment==='beta'?'production':'beta');
  const forbidden=[new URL(opposite.legacySite).hostname,new URL(opposite.api).hostname,'luv-jeri.github.io'];
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
const BETA_HOMEPAGE_ANCHOR = 'https://cojeev.com/';
// Static files at these Worker-owned routes could bypass the Worker's 404.
const reservedPath = file => /^site\/(?:ui\/)?(?:media|backups|private|v1)(?:\/|$)/.test(file);

// Parse the element, not a nearby property name. Only direct props of the
// specified RSC tuple or parenthesized JSX-runtime call can grant an allowance.
function anchorRanges(file, text) {
  const ranges=[];
  if(!file.endsWith('.txt') && !/^site\/ui\/_next\/.*\.js$/.test(file)) return ranges;
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const literal=(node,value)=>node && ts.isStringLiteral(node) && node.text===value;
  const visit=node=>{
    let props;
    if(file.endsWith('.txt') && ts.isArrayLiteralExpression(node) && node.elements.length===4 &&
      literal(node.elements[0],'$') && literal(node.elements[1],'a')) props=node.elements[3];
    if(file.endsWith('.js') && ts.isCallExpression(node) && ts.isParenthesizedExpression(node.expression) &&
      literal(node.arguments[0],'a')) {
      const callee=node.expression.expression;
      const runtime=ts.isBinaryExpression(callee) && callee.operatorToken.kind===ts.SyntaxKind.CommaToken ? callee.right : callee;
      if(ts.isPropertyAccessExpression(runtime) && ['jsx','jsxs'].includes(runtime.name.text)) props=node.arguments[1];
    }
    if(props && ts.isObjectLiteralExpression(props)) for(const property of props.properties) {
      if(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
        property.name.text==='href' && literal(property.initializer,BETA_HOMEPAGE_ANCHOR))
        ranges.push([property.initializer.getStart(source),property.initializer.end]);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
  return ranges;
}
function validateContextualContent(file, content, environment, {origin,registryGraph}) {
  const target=environmentConfig(environment);
  if(!['build','baseline'].includes(origin) || !['baseline','canonical',null].includes(registryGraph))
    throw new Error(`Invalid scan origin or registryGraph in ${file}`);
  if(!file.startsWith('site/')) return target;
  const opposite=environmentConfig(environment==='beta'?'production':'beta');
  const forbidden=[new URL(opposite.legacySite).hostname,new URL(opposite.origin).hostname,new URL(opposite.api).hostname,'luv-jeri.github.io'];
  const scoped=origin==='build' && file.startsWith('site/ui/');
  const fail=(reason,context)=>{throw new Error(`${reason} in ${file} (${context})`);};
  const canonical=value=>value.startsWith(`${target.canonicalSite}/`);
  const legacyRegistry=value=>value.startsWith(`${target.legacySite}/r/`) && /^https:\/\/[^/]+\/r\/[^/?#]+\.json$/.test(value);
  const check=(value,context,anchor=false,dependency=false,executable=false)=>{
    if(!/^https?:\/\//i.test(value)) return;
    if(!URL.canParse(value)) {
      if(executable || dependency) fail('Malformed URL dependency',context);
      return;
    }
    const url=new URL(value);
    if(LOCAL_HOSTS.includes(url.hostname)) {
      if(executable || dependency) fail('Cross-environment URL',context);
      return;
    }
    if(anchor && value===BETA_HOMEPAGE_ANCHOR && !dependency) return;
    if(forbidden.includes(url.hostname)) fail('Cross-environment URL',context);
    if(dependency && registryGraph==='canonical' && !canonical(value)) fail('Non-canonical registry dependency',context);
    if(origin==='build' && url.hostname===new URL(target.legacySite).hostname &&
      // Beta's legacy and canonical origins share a host: canonical /ui URLs remain valid.
      !(environment==='beta' && canonical(value)) &&
      !legacyRegistry(value))
      fail('Legacy page URL',context);
    if(scoped && url.origin===target.origin && !canonical(value) && !legacyRegistry(value) &&
      !(environment==='production' && anchor && value===BETA_HOMEPAGE_ANCHOR))
      fail('Wrong canonical base path',context);
  };
  const base=(value,context)=>{
    if(scoped && value.startsWith('/') && value!=='/ui' && !value.startsWith('/ui/')) fail('Wrong base path',context);
    check(value,context,false,false,true);
  };
  const scan=(text,context,ranges=[])=>{
    for(const match of text.matchAll(/https?:\/\/[^\s"'<>`\\)\]}]+/gi)) {
      const allowed=ranges.some(([start,end])=>match.index>=start && match.index+match[0].length<=end);
      const prefix=text.slice(Math.max(0,match.index-80),match.index);
      const executable=/(?:fetch|import|WebSocket|EventSource|url)\s*\(\s*["']?$/.test(prefix);
      const kind=executable ? 'fetch dependency' : /(?:link|meta|application\/ld\+json)/.test(prefix) ? 'metadata' : context;
      check(match[0],kind,allowed,false,executable);
    }
  };
  const css=text=>{
    for(const match of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi))
      base(match[1]??match[2]??match[3],'CSS url');
  };
  const text=content.replaceAll('\\/','/');
  if(file.endsWith('.html')) {
    const $=load(text,{sourceCodeLocationInfo:true});
    const ranges=[];
    $('*').each((_,element)=>{
      for(const [name,value] of Object.entries(element.attribs)) {
        const context=element.name==='a' ? 'anchor variant' : ['meta','link','script'].includes(element.name) ? 'metadata' : `HTML ${name}`;
        const anchor=element.name==='a' && name==='href' && value===BETA_HOMEPAGE_ANCHOR;
        if(anchor) {
          const location=element.sourceCodeLocation?.attrs?.[name];
          if(location) ranges.push([location.startOffset,location.endOffset]);
        }
        if(['href','src','action'].includes(name)) {
          if(!anchor) base(value,context); else check(value,context,true);
        } else if(name==='srcset') {
          for(const candidate of value.split(',')) base(candidate.trim().split(/\s+/)[0],context);
        } else if(name==='style') css(value);
        // Decoded HTML entities must not conceal another environment's URL.
        if(!anchor) scan(value,context);
      }
    });
    $('style').each((_,element)=>css($(element).text()));
    scan(text,'anchor variant or metadata',ranges);
  } else if(file.endsWith('.json')) {
    const walk=(value,context='JSON URL',dependency=false,source=false)=>{
      if(typeof value==='string') {
        if(dependency) {
          check(value,'registry dependency',false,true,true);
          if(registryGraph==='canonical' && !canonical(value)) fail('Non-canonical registry dependency','registry dependency');
        } else {
          if(!source && /^https?:\/\//i.test(value)) check(value,context,false,false,true);
          scan(value.replaceAll('\\/','/'),context);
        }
      } else if(Array.isArray(value)) value.forEach(child=>walk(child,context,dependency,source));
      else if(value && typeof value==='object') for(const [key,child] of Object.entries(value))
        walk(child,key==='registryDependencies' ? 'registry dependency' : context,dependency || key==='registryDependencies',source || key==='content' || key==='description');
    };
    walk(JSON.parse(content));
  } else {
    if(file.endsWith('.css')) css(text);
    scan(text,file.endsWith('.xml') ? 'sitemap' : 'anchor variant or metadata',anchorRanges(file,text));
  }
  return target;
}

function manifestIdentity(identity) {
  const {side,phase,deploymentId}=identity;
  const phases=side==='website' ? WEBSITE_PHASES : side==='api' ? API_PHASES : {};
  if(!Object.hasOwn(phases,phase) || typeof deploymentId!=='string' ||
    !new RegExp(`^${side}-${phase}-[a-f0-9]{12}-[a-f0-9]{8}$`).test(deploymentId))
    throw new Error('Artifact identity phase or deploymentId mismatch');
  const fields={side,phase,deploymentId,migrationStage:identity.migrationStage??null,registryGraph:identity.registryGraph??null,reportingBase:identity.reportingBase??null};
  if(side==='website' ? fields.migrationStage!==phases[phase].MIGRATION_STAGE || fields.registryGraph!==phases[phase].REGISTRY_GRAPH || fields.reportingBase!==null :
    fields.reportingBase!==phases[phase].reportingBase || fields.migrationStage!==null || fields.registryGraph!==null)
    throw new Error('Artifact identity fields disagree with phase');
  if(identity.baseline!==undefined) {
    if(!identity.baseline || !/^[a-f0-9]{40}$/.test(identity.baseline.commit) || !/^[a-f0-9]{64}$/.test(identity.baseline.digest))
      throw new Error('Artifact baseline identity mismatch');
    fields.baseline={commit:identity.baseline.commit,digest:identity.baseline.digest};
  }
  return fields;
}
async function inventory(root, directory='') {
  const files=[];
  for(const entry of await fs.readdir(path.join(root,directory),{withFileTypes:true})) {
    const file=path.posix.join(directory,entry.name);
    if(reservedPath(file)) throw new Error(`Reserved website path: ${file}`);
    if(entry.isSymbolicLink()) throw new Error('Artifact symlink forbidden');
    if(entry.isDirectory()) files.push(...await inventory(root,file));
    else if(entry.isFile() && file!=='manifest.json') files.push(file);
    else if(!entry.isFile()) throw new Error('Unsupported artifact entry');
  }
  return files.sort();
}
export async function createManifest(root, environment, commit, identity) {
  environmentConfig(environment);
  if(!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid release commit');
  const fields=identity ? manifestIdentity(identity) : undefined;
  const files={};
  for(const file of await inventory(root)) {
    if(/(^|\/)(?:\.|private|backup|reports|secrets)/i.test(file) || /\.(?:sql|sqlite|db|pem|key|map)$/i.test(file) && !/^api\/migrations\/\d{4}_[a-z_]+\.sql$/.test(file)) throw new Error(`Private/forbidden artifact path: ${file}`);
    if(!/^(site\/|api\/|website\/)/.test(file)) throw new Error(`Unexpected artifact path: ${file}`);
    const bytes=await fs.readFile(path.join(root,file));
    const sha256=hash(bytes);
    const hashes=identity?.baseline?.hashes;
    const samePath=hashes?.get(file)===sha256;
    const mountedCopy=identity?.registryGraph==='baseline' && file.startsWith('site/ui/r/') && hashes?.get(file.replace('site/ui/r/','site/r/'))===sha256;
    // Canonical registry copies always belong to the build, even if their bytes
    // happen to coincide with a retained baseline path.
    const origin=file.startsWith('site/ui/r/') && identity?.registryGraph==='canonical' ? 'build' : samePath || mountedCopy ? 'baseline' : 'build';
    // Schema 1 keeps the original scan; schema 2 adds contextual host, canonical
    // dependency and mounted base-path checks to public site text.
    // Not scanned, deliberately: `website/index.js` compiles BOTH API hostnames into
    // the CSP it chooses at runtime from env.ENVIRONMENT, and `api/index.js` compiles
    // localhost/127.0.0.1 into its LOCAL_MODE guard, so a URL scan of either bundle
    // can only produce false positives. `api/wrangler.jsonc` and
    // `website/wrangler.jsonc` (.jsonc misses this test) also stay unscanned. What
    // each deployed Worker actually targets is controlled by
    // validateDeploymentConfig, which checks name, account, route hostname, D1, R2 and
    // allowed origins against this environment; live cross-origin behaviour is Task 4.
    if(/\.(html|js|css|json|xml|txt)$/.test(file)) validateContent(file,bytes.toString('utf8'),environment,identity ? {origin,registryGraph:fields.registryGraph} : undefined);
    files[file]=identity ? {sha256,origin} : sha256;
  }
  if(!identity && !files['site/index.html'] || fields?.side==='website' && (!files['site/ui/index.html'] || !files['site/ui/release.json'])) throw new Error('Missing website artifact');
  return identity ? {schema:2,environment,commit,...fields,files} : {schema:1,environment,commit,files};
}
export async function verifyManifest(root, manifest, expected) {
  if(![1,2].includes(manifest.schema) || manifest.environment!==expected.environment || manifest.commit!==expected.commit || !/^[a-f0-9]{40}$/.test(manifest.commit) || !/^[a-f0-9]{64}$/.test(expected.digest) || manifestDigest(manifest)!==expected.digest) throw new Error('Artifact identity or manifest digest mismatch');
  if(expected.schema!==undefined && manifest.schema!==expected.schema) {
    if(expected.schema===2 && manifest.schema===1) throw new Error('Unversioned artifact: migration artifacts need manifest schema 2');
    throw new Error('Artifact identity or manifest digest mismatch');
  }
  if(manifest.schema===1) {
    const actual=await createManifest(root,expected.environment,expected.commit);
    if(JSON.stringify(actual)!==JSON.stringify(manifest)) throw new Error('Artifact integrity mismatch');
    return;
  }
  const fields=manifestIdentity(manifest);
  if(['migrationStage','registryGraph','reportingBase'].some(key=>manifest[key]!==fields[key])) throw new Error('Artifact identity fields missing');
  const files=await inventory(root);
  if(!manifest.files || files.length!==Object.keys(manifest.files).length) throw new Error('Artifact integrity mismatch');
  for(const file of files) {
    if(/(^|\/)(?:\.|private|backup|reports|secrets)/i.test(file) || /\.(?:sql|sqlite|db|pem|key|map)$/i.test(file) && !/^api\/migrations\/\d{4}_[a-z_]+\.sql$/.test(file)) throw new Error(`Private/forbidden artifact path: ${file}`);
    if(!/^(site\/|api\/|website\/)/.test(file)) throw new Error(`Unexpected artifact path: ${file}`);
    const entry=manifest.files[file],bytes=await fs.readFile(path.join(root,file));
    if(!entry || entry.sha256!==hash(bytes) || !['build','baseline'].includes(entry.origin) || Object.keys(entry).sort().join(',')!=='origin,sha256') throw new Error(`Artifact integrity or origin mismatch: ${file}`);
    if(/\.(html|js|css|json|xml|txt)$/.test(file)) validateContent(file,bytes.toString('utf8'),expected.environment,{origin:entry.origin,registryGraph:fields.registryGraph});
  }
  if(fields.side==='website' && (!manifest.files['site/ui/index.html'] || !manifest.files['site/ui/release.json'])) throw new Error('Missing website artifact');
}
