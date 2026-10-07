/** Permanent acceptance defects, checked only after both live identities match. */
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {environmentConfig} from './release-config.mjs';
import {followChain,chainProblems} from './asset-router-harness.mjs';
import {robotsProblems} from './check-discovery.mjs';
import {securityHeaders} from '../workers/registry-host/src/headers.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const media=response=>(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
const jsonType=response=>/^application\/(?:json|[\w.-]+\+json)$/.test(media(response));
const revalidate='public, max-age=0, must-revalidate';
const seoPages=['/','/docs/','/docs/button/','/docs/aspect-ratio/','/getting-started/','/about/','/privacy/','/work-with-me/'];
const redirectPages=['/','/about/','/work-with-me/','/requests/','/track/','/feedback-admin/','/docs/button/?utm_source=move&x=a%2Fb','/nope/'];
const rscFile=file=>/(?:^|\/)(?:index|__next\.[^/]+)\.txt$/.test(file);

function mounted(value,canonicalSite) {
  if(typeof value!=='string'||!value.startsWith(canonicalSite+'/')||!URL.canParse(value)) return false;
  const url=new URL(value);
  return url.origin===new URL(canonicalSite).origin&&url.pathname.split('/').filter(part=>part==='ui').length===1;
}
function structuredDataValid(value,canonicalSite) {
  if(Array.isArray(value)) return value.every(child=>structuredDataValid(child,canonicalSite));
  if(!value||typeof value!=='object') return true;
  return Object.entries(value).every(([key,child])=>{
    // A Person/Organization may link to the creator's separate website. Their
    // website-owned @id and references to it still obey the canonical mount.
    const externalProfile=key==='url'&&['Person','Organization'].includes(value['@type'])&&
      typeof child==='string'&&URL.canParse(child)&&!/^https:\/\/(?:beta\.)?000h\.cojeev\.com(?:\/|$)/.test(child)&&!new URL(child).pathname.startsWith('/ui');
    if(['@id','url','item'].includes(key)&&typeof child==='string'&&!externalProfile&&!mounted(child,canonicalSite)) return false;
    return structuredDataValid(child,canonicalSite);
  });
}

export async function contractProblems(environment,{website,api},{fetcher=fetch,baseline,robotsBefore=''}={}) {
  const {canonicalSite,legacySite,origin}=environmentConfig(environment);
  const variant=website.kind==='variant';
  if(!variant&&!(baseline?.hashes instanceof Map)) throw new Error(`Baseline artifact missing: ${environment}`);
  const entries=(variant?Object.entries(website.manifest.files??{}):[...baseline.hashes])
    .map(([file,entry])=>[file,typeof entry==='string'?entry:entry.sha256]);
  const problems=[];
  const add=code=>problems.push(code);
  const request=async(url,code,options={})=>{
    try {
      const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'x-cojeev-probe':'1'},...options});
      if(environment==='beta'&&!response.headers.get('x-robots-tag')?.toLowerCase().includes('noindex')) add(code);
      return response;
    } catch {add(code);return null;}
  };
  const direct=response=>response&&!response.headers.has('location');
  const check=async(url,code,accept,options)=>{
    const response=await request(url,code,options);
    if(response) {
      try {if(!await accept(response)) add(code);} catch {add(code);}
    }
    return response;
  };
  const redirect=(response,location)=>response.status===301&&response.headers.get('location')===location&&response.headers.get('cache-control')==='no-store';

  if(variant) {
    await check(origin+'/ui?x=1','canonical-bare',response=>redirect(response,canonicalSite+'/?x=1'));
    await check(canonicalSite+'/__cojeev_missing_release_probe__/','canonical-missing',response=>direct(response)&&response.status===404);
    await check(canonicalSite+'/sitemap.xml','canonical-sitemap',response=>direct(response)&&response.status===200&&['application/xml','text/xml'].includes(media(response)));
    await check(canonicalSite+'/robots.txt','canonical-robots',response=>direct(response)&&response.status===200);
    await check(canonicalSite+'/health','canonical-health',response=>direct(response)&&response.status===200&&response.headers.get('cache-control')==='no-store');
    const images=new Set();
    for(const route of seoPages) {
      const code='seo-page:'+route,response=await request(canonicalSite+route,code);
      if(!response) continue;
      if(!direct(response)||response.status!==200||media(response)!=='text/html') {add(code);continue;}
      let $;
      try {$=load(await response.text());} catch {add(code);continue;}
      const canonical=$('link[rel="canonical"]');
      const expectedPath=route==='/docs/aspect-ratio/'?'/docs/bento-grid/':route==='/work-with-me/'?'/about/':route;
      if(canonical.length!==1||canonical.attr('href')!==canonicalSite+expectedPath) add(code);
      for(const selector of ['meta[property="og:url"]','meta[property="og:image"]','meta[name="twitter:image"]']) {
        const tags=$(selector),values=tags.toArray().map(tag=>$(tag).attr('content'));
        if(!values.length||values.some(value=>!mounted(value,canonicalSite))) add(code);
        if(selector!=='meta[property="og:url"]') for(const value of values) if(mounted(value,canonicalSite)) images.add(value);
      }
      for(const script of $('script[type="application/ld+json"]').toArray()) {
        try {if(!structuredDataValid(JSON.parse($(script).text()),canonicalSite)) add(code);} catch {add(code);}
      }
      if(route==='/') {
        if(response.headers.get('cache-control')!==revalidate||response.headers.get('x-content-type-options')!=='nosniff'||canonical.length!==1||canonical.attr('href')!==canonicalSite+'/') add('canonical-home');
        if($('script[src]').toArray().filter(script=>{
          try {return new URL($(script).attr('src'),canonicalSite+'/').hostname==='static.cloudflareinsights.com';} catch {return false;}
        }).length>1) add('beacon-duplicate');
      }
    }
    for(const image of images) await check(image,'seo-image:'+new URL(image).pathname,response=>direct(response)&&response.status===200&&media(response)==='image/png');
    for(const [route,required] of [['/track/',['noindex','nofollow']],['/feedback-admin/',['noindex']]]) {
      const code='private-page:'+route,response=await request(canonicalSite+route,code);
      if(!response) continue;
      if(!direct(response)||response.status!==200||media(response)!=='text/html') {add(code);continue;}
      try {
        const $=load(await response.text()),robots=$('meta[name="robots"]').toArray().flatMap(tag=>($(tag).attr('content')??'').toLowerCase().split(/[\s,]+/));
        if(required.some(directive=>!robots.includes(directive))||route==='/track/'&&$('meta[name="referrer"]').attr('content')!=='no-referrer') add(code);
      } catch {add(code);}
    }
    for(const mount of ['canonical','legacy']) {
      const entry=entries.find(([file])=>file.startsWith('site/')&&(mount==='canonical'?file.startsWith('site/ui/'):!file.startsWith('site/ui/'))&&rscFile(file));
      const code='rsc-'+mount;
      if(!entry) {add(code);continue;}
      const [file,digest]=entry,start=(mount==='canonical'?origin:legacySite)+'/'+file.slice(5),query=new URL(start).search;
      const urls=[];
      try {
        const router={fetch:async(url,options)=>{
          urls.push(new URL(url));const response=await request(url,code,options);
          if(!response) throw new Error('RSC unavailable');return response;
        }};
        const {hops,final}=await followChain(router,start);
        const correctPrefix=url=>mount==='canonical'?url.origin===origin&&url.pathname.startsWith('/ui/'):url.origin===legacySite&&!/^\/ui(?:\/|$)/.test(url.pathname);
        if(chainProblems(hops,{mount,query,canonicalBase:canonicalSite}).length||urls.some(url=>!correctPrefix(url)||url.search!==query)||final.status!==200||!direct(final)||!['text/plain','text/x-component'].includes(media(final))||hash(Buffer.from(await final.arrayBuffer()))!==digest) add(code);
      } catch {add(code);}
    }
  }

  for(const [file,digest] of entries.filter(([file])=>/^site\/(?:ui\/)?r\//.test(file))) {
    const pathname='/'+file.slice(5),url=(file.startsWith('site/ui/')?origin:legacySite)+pathname;
    await check(url,'registry-response:'+pathname,async response=>{
      if(!direct(response)||response.status!==200||!jsonType(response)) return false;
      try {if(hash(Buffer.from(await response.arrayBuffer()))!==digest) add('registry-hash-mismatch:'+pathname);} catch {return false;}
      return true;
    });
  }
  await check(legacySite+'/r/button.json','registry-head',async response=>direct(response)&&response.status===200&&(await response.arrayBuffer()).byteLength===0,{method:'HEAD'});
  for(const base of variant?[legacySite,canonicalSite]:[legacySite]) await check(base+'/r/__cojeev_missing__.json','registry-missing:'+new URL(base+'/r/__cojeev_missing__.json').pathname,response=>direct(response)&&response.status===404);
  if(variant&&website.manifest.migrationStage==='redirect') {
    for(const route of redirectPages) for(const method of ['GET','HEAD']) await check(legacySite+route,'legacy-redirect:'+method+':'+route,response=>redirect(response,canonicalSite+route),{method});
  } else for(const route of ['/','/docs/button/']) await check(legacySite+route,'legacy-page:'+route,response=>direct(response)&&response.status===200&&media(response)==='text/html');
  await check(legacySite+'/health','legacy-health',response=>direct(response)&&response.status===200);
  await check(legacySite+'/__cojeev_missing__.txt','legacy-missing-text',response=>direct(response)&&response.status===404);
  if(variant) {
    const asset=entries.find(([file])=>file.startsWith('site/_next/'));
    if(!asset) add('legacy-asset');
    else await check(legacySite+'/'+asset[0].slice(5),'legacy-asset',response=>direct(response)&&response.status===200);
  }
  if(environment==='production') {
    if(!baseline?.apexProbes||!Object.keys(baseline.apexProbes).length) add('apex-record');
    for(const [pathname,probe] of Object.entries(baseline?.apexProbes??{})) {
      const code=pathname==='/robots.txt'?'apex-robots':'apex-probe:'+pathname;
      await check(origin+pathname,code,async response=>{
        if(response.headers.get('content-security-policy')===securityHeaders('production')['content-security-policy']||response.headers.has('x-robots-tag')) return false;
        if(pathname==='/robots.txt') {
          const body=await response.text(),before=probe.robots==='absent'?'':robotsBefore;
          return response.status===probe.status&&response.headers.get('content-type')===probe.contentType&&(probe.robots==='absent'||body===before)||
            response.status===200&&media(response)==='text/plain'&&robotsProblems(before,body).length===0;
        }
        return response.status===probe.status&&response.headers.get('content-type')===probe.contentType&&(!probe.sha256||hash(Buffer.from(await response.arrayBuffer()))===probe.sha256);
      });
    }
  }
  return [...new Set(problems)].sort();
}
