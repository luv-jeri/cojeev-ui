import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

/** Keep Tailwind's registry scan aligned with this consumer's real imports. */
export function componentSources(root,repository) {
 const output=path.join(root,'src/component-sources.css');
 async function update() {
  const entries=[];
  for(const page of ['index.html','resident.html','mind.html']) {
   const html=await readFile(path.join(root,page),'utf8');
   for(const match of html.matchAll(/<script type="module" src="([^"]+)"/g))entries.push(match[1].replace(/^\//,''));
  }
  if(!entries.length)throw new Error('No page entries found for component style scanning.');
  // Follow local imports, including lazy scenes and shared motion helpers.
  // Packages supply their own styles; CSS files do not contain JSX utilities.
  const {metafile}=await build({absWorkingDir:root,entryPoints:entries,bundle:true,
   write:false,metafile:true,outdir:path.join(root,'.source-scan'),packages:'external',
   alias:{'@':repository},loader:{'.css':'empty'},logLevel:'silent',
  });
  const files=Object.keys(metafile.inputs).map(file=>path.resolve(root,file))
   .filter(file=>file.startsWith(path.join(repository,'registry/cojeev')+path.sep)&&/\.[cm]?[jt]sx?$/.test(file))
   .map(file=>path.relative(path.dirname(output),file).split(path.sep).join('/')).sort();
  if(!files.length)throw new Error('No Cojeev components found; refusing to generate incomplete styles.');
  const css='/* Generated from page imports by scripts/component-sources.mjs. */\n'+files.map(file=>`@source ${JSON.stringify(file)};`).join('\n')+'\n';
  let previous='';
  try{previous=await readFile(output,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(previous!==css)await writeFile(output,css);
 }
 return {name:'cojeev-component-sources',buildStart:update,
  async handleHotUpdate(context) {
   if(/\.[cm]?[jt]sx?$|\.html$/.test(context.file))await update();
  },
 };
}
