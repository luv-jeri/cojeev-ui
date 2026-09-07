import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {PNG} from 'pngjs'
import pixelmatch from 'pixelmatch'
import {instrumentMotion,checkBehavior} from './gate-motion-behavior.mjs'
import {probeSourceCancellation} from './gate-motion-source-probe.mjs'
import {writeMotionReport} from './gate-motion-report.mjs'

const port=Number(process.env.MOTION_GATE_PORT||4325),base=`http://127.0.0.1:${port}`,output='artifacts/gate-motion'
const requested=(process.env.MOTION_CASES||'').split(',').filter(Boolean),widths=(process.env.MOTION_WIDTHS||'360,390,768,1024,1440,1920').split(',').map(Number),modes=(process.env.MOTION_MODES||'light,dark').split(',')
let fixtures
const referenceRoot='/reference/sahajiv-handoff-v4'
const sourceScripts=['v','flow','morph','motion','alive']
const commonScript=`
const g=document.getElementById('group');if(SCENARIO.vertical)g?.classList.add('-vertical');if(SCENARIO.pin)g?.setAttribute('data-flow',SCENARIO.pin);
document.addEventListener('click',event=>{if(!(event.target instanceof Element))return;if(event.target.closest('#opener'))motionGate.open(true);const item=event.target.closest('[data-item]'),host=item?.closest('[data-flow-group]');if(item&&host&&!host.hasAttribute('data-flow-fields')&&!item.querySelector('input[type=checkbox]'))host.querySelectorAll('[data-item]').forEach(child=>{if(child.closest('[data-flow-group]')===host)child.setAttribute(child.classList.contains('v-step')?'aria-current':'aria-selected',child===item?(child.classList.contains('v-step')?'step':'true'):'false')})});
window.motionGate={clock:V.clock,rewind:VMorph.rewind,flow:VFlow.set,mode:VMotion.setMode,category:VMotion.setCat,profile:VMorph.importJSON,replace:VFlow.replace,open:value=>{document.getElementById('surface').hidden=!value},arrive:()=>{document.getElementById('feedback').hidden=false},appearance:(id,grow)=>VFlow.appear(document.getElementById(id),grow),enable:id=>VMotion.enable(document.getElementById(id)),disable:id=>VMotion.disable(document.getElementById(id)),rerender:()=>{const el=document.getElementById('group');[...el.children].filter(x=>!x.classList.contains('v-glide__pill')&&!x.classList.contains('v-glide__hover')&&!x.classList.contains('v-glide__trail')).forEach(x=>{const copy=x.cloneNode(true);x.replaceWith(copy)})}};
addEventListener('load',()=>{VFlow.replace();document.documentElement.dataset.ready='1'});
`
const server=await createServer({configFile:false,plugins:[react(),tailwindcss(),{name:'sahajiv-motion-gate',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url||'/',base)
 if(url.pathname.startsWith(referenceRoot+'/')){const file=path.resolve('.','.'+decodeURIComponent(url.pathname)),root=path.resolve('.'+referenceRoot);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return}const types={'.css':'text/css','.js':'text/javascript','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml'};res.setHeader('Content-Type',types[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));return}
 if(url.pathname!=='/motion')return next()
 const scenario=fixtures.motionScenarios.find(value=>value.id===url.searchParams.get('case'));if(!scenario){res.statusCode=400;res.end('Unknown scenario');return}
 const candidate=url.searchParams.get('side')==='candidate',mode=url.searchParams.get('mode')||'light',payload=JSON.stringify(scenario).replaceAll('<','\\u003c')
 const markup=fixtures.fixtureMarkup(scenario)
 const sourceCSS=scenario.family==='roles'||scenario.fullCascade?`<link rel="stylesheet" href="${referenceRoot}/css/vriksha.css">`:`<style>@layer vriksha;@import url("${referenceRoot}/fonts/fonts.css") layer(vriksha);@import url("${referenceRoot}/tokens/tokens.css") layer(vriksha);@import url("${referenceRoot}/css/base.css") layer(vriksha);@import url("${referenceRoot}/css/alive.css") layer(vriksha);@import url("${referenceRoot}/css/flow.css");</style>`
 const scripts=candidate?'<script type="module" src="/apps/gate/motion-candidate.tsx"></script>':sourceScripts.map(name=>`<script src="${referenceRoot}/js/${name}.js" data-base="${referenceRoot}"></script>`).join('')+`<script>const SCENARIO=${payload};${commonScript}</script>`
 const html=`<!doctype html><html lang="en" data-mode="${mode}" data-seed="42"><head><meta charset="utf-8"><style>@layer theme,base,components,utilities,sahajiv-states,accessibility,vriksha,motion-fixture;</style>${candidate?'':sourceCSS}<style>@layer motion-fixture{${fixtures.fixtureCSS}}</style></head><body><div id="v-sprites" style="display:none"></div><main id="motion-stage">${candidate?'':markup}</main><script id="motion-fixture" type="application/json">${payload}</script>${scripts}</body></html>`
 res.setHeader('Content-Type','text/html');res.end(candidate?await server.transformIndexHtml(req.url,html):html)
 })}}],resolve:{alias:{'@':path.resolve('.')}},css:{postcss:{plugins:[]}},server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null}})
fixtures=await server.ssrLoadModule('/apps/gate/motion-fixtures.ts')
const store=await server.ssrLoadModule('/registry/sahajiv/motion/settings.ts'),authored=store.getMorphProfile()
Object.assign(authored.cfg,{rest:true,echo:true,dots:3,grain:.12,sheen:1});Object.assign(authored.TIER.blob,{reach:9,inside:3,amp:.01,lobes:5,depth:.08,asym:.6,spread:.55})
const scenarios=fixtures.motionScenarios.filter(s=>!requested.length||requested.includes(s.id))
if(requested.some(id=>!scenarios.some(s=>s.id===id)))throw Error('Unknown requested case')
await server.listen();console.log(`Motion gate listening at ${base}; ${scenarios.length} scenarios × ${widths.length} widths × ${modes.length} themes`)
const browser=await chromium.launch(),rows=[]
fs.mkdirSync(output,{recursive:true})
const cancellationProbe=await probeSourceCancellation();fs.writeFileSync(output+'/source-cancellation-probe.json',JSON.stringify(cancellationProbe,null,2)+'\n');if(!cancellationProbe.pass)throw Error('Source clock adapter self-check failed')
const properties=['background-color','color','opacity','transform','border-radius','outline','box-shadow','transition-property','transition-duration','transition-timing-function','animation-name','animation-duration','animation-delay','animation-timing-function','transform-origin']
const difference=(a,b,prefix='')=>{if(JSON.stringify(a)===JSON.stringify(b))return[];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>difference(a[key],b[key],prefix?prefix+'.'+key:key));return[{property:prefix,reference:a,candidate:b}]}
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex')
async function capture(side,scenario,width,mode,pass){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:scenario.reduced?'reduce':'no-preference'})
 if(side==='candidate')await context.addInitScript(instrumentMotion)
 await context.addInitScript(({scenario,authored,side})=>{
  if(side==='oracle'){const nativeClear=window.clearTimeout;window.clearTimeout=function(handle){if(handle&&typeof handle==='object'&&typeof handle.at==='number'&&typeof handle.fn==='function'){handle.fn=()=>{};return}return nativeClear.call(window,handle)}}
  localStorage.setItem('v-motion',JSON.stringify({v:3,mode:scenario.off?'off':'subtle',cats:{buttons:true,icons:true,pills:true,cards:false,skeleton:true}}))
  localStorage.setItem('v-flow-v1',JSON.stringify({variant:scenario.variant||'glide',speed:scenario.speed||1,intensity:scenario.intensity??1,hover:scenario.hover??true,hoverStrength:scenario.hoverStrength??1}))
  if(scenario.profile)localStorage.setItem('v-morph-cfg-v3',JSON.stringify(authored))
 },{scenario,authored,side})
 const page=await context.newPage(),errors=[],frames=[],pngs=[];let at=100000

 page.on('pageerror',error=>errors.push(error.message))
 const tick=async time=>{await page.evaluate(({time,at})=>{for(let t=at+16;t<time;t+=16)motionGate.clock(t);motionGate.clock(time);window.motionGateTime=time;for(const svg of document.querySelectorAll('svg:has(animate)')){svg.pauseAnimations();svg.setCurrentTime((time-100000)/1000)}},{time,at});at=time}
 async function sample(label,time=at,picture=false){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  await tick(time)
  const state=await page.evaluate(properties=>{
   const styles=el=>{if(!el)return null;const cs=getComputedStyle(el);return Object.fromEntries(properties.map(name=>[name,cs.getPropertyValue(name)]))}
   const groups=[...document.querySelectorAll('[data-flow-group]')].map(g=>({id:g.id,variant:g.dataset.flowV??null,kind:g.dataset.flowKind??null,dir:g.dataset.dir??null,active:[...g.querySelectorAll('[data-glide-active]')].filter(el=>el.closest('[data-flow-group]')===g).map(el=>el.id),vars:Object.fromEntries(['glide-x','glide-y','glide-w','glide-h','glide-r','glide-o','glide-d','hov-x','hov-y','hov-w','hov-h','hov-r','hov-o'].map(name=>[name,g.style.getPropertyValue('--'+name)])),layers:['pill','hover','trail'].map(name=>{const layer=g.querySelector(':scope>.v-glide__'+name);return {name,count:g.querySelectorAll(':scope>.v-glide__'+name).length,phase:layer?[...layer.classList].filter(c=>c.startsWith('-')).sort():[],style:styles(layer),inner:styles(layer?.firstElementChild),after:layer?.firstElementChild?Object.fromEntries(properties.map(name=>[name,getComputedStyle(layer.firstElementChild,'::after').getPropertyValue(name)])):null}})}))
   const bodies=[...document.querySelectorAll('[data-slot^="motion-"]')].filter(el=>el.querySelector(':scope>svg.v-morph')||el.hasAttribute('data-category')).map(el=>({id:el.id,mode:el.dataset.morph??null,style:{transform:getComputedStyle(el).transform,fill:getComputedStyle(el).getPropertyValue('--mfill'),stroke:getComputedStyle(el).getPropertyValue('--mstroke')},svg:el.querySelector(':scope>svg.v-morph')?.getAttribute('viewBox')??null,rotation:el.querySelector(':scope>svg.v-morph')?.style.transform??'',paths:[...el.querySelectorAll(':scope>svg.v-morph>path')].map(p=>({d:p.getAttribute('d'),fill:getComputedStyle(p).fill.replace(/v-(sheen|grain)-\d+/g,'v-$1'),stroke:getComputedStyle(p).stroke,opacity:getComputedStyle(p).opacity,blend:getComputedStyle(p).mixBlendMode,display:getComputedStyle(p).display})),dots:[...el.querySelectorAll(':scope>svg.v-morph circle')].map(c=>['cx','cy','r'].map(a=>c.getAttribute(a)))}))
   const roles=[...document.querySelectorAll('#press,#toggle,#surface,#feedback,#disclosure,#loader,#loader .seed,#loader .core')].map(el=>({id:el.id||el.className.baseVal||el.className,hidden:el.hidden??false,in:el.dataset?.flowIn??null,land:el.dataset?.flowLand??null,style:styles(el),path:el.getAttribute('d'),animations:el.querySelectorAll('animate').length}))
   return {groups,bodies,roles,root:Object.fromEntries(['flow','flowHover'].map(name=>[name,document.documentElement.dataset[name]])),rootVars:Object.fromEntries(['flow-speed','flow-intensity','flow-hover','flow-ease','flow-dur','flow-land','flow-glow'].map(name=>[name,document.documentElement.style.getPropertyValue('--'+name)]))}
  },properties)
  frames.push({label,time,...state})
  if(picture){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const file=`${output}/${scenario.id}-${width}-${mode}-${side}-${pass}-${frames.length}.png`;const png=await page.screenshot({path:file,clip:{x:0,y:0,width,height:600},animations:'allow'});pngs.push({label,file,digest:hash(png.toString('base64'))})}
 }
 try{
  await page.goto(`${base}/motion?side=${side}&case=${scenario.id}&mode=${mode}`,{waitUntil:'load'})
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='1');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800)
  await page.evaluate(()=>{motionGate.rewind();motionGate.clock(100000);window.motionGateTime=100000;for(const event of ['pointerup','pointerdown','keyup','input','change'])document.addEventListener(event,()=>motionGate.clock(window.motionGateTime))})
  if(scenario.family==='behavior'){const checks=await checkBehavior({page,context,scenario,tick,getTime:()=>at});return {frames:[],pngs:[],checks,errors}}
  if(scenario.family==='adjuster'){
   if(side==='oracle')return {frames:[],pngs:[],checks:[],errors}
   const checks=[];await page.getByRole('button',{name:'Export JSON',exact:true}).click();const textarea=page.getByRole('textbox',{name:'Exported or imported profile'});const json=JSON.parse(await textarea.inputValue());checks.push({name:'export version',pass:json.version===4})
   await page.getByRole('combobox',{name:/^Tier/}).selectOption('spinner');checks.push({name:'spinner amp percent',pass:await page.getByLabel('Rest breath value in %',{exact:true}).inputValue()==='14'})
   const saved=await page.evaluate(()=>localStorage.getItem('v-morph-cfg-v3'));await textarea.fill('{invalid');await page.getByRole('button',{name:'Import JSON',exact:true}).click();checks.push({name:'visible atomic import error',pass:await page.getByRole('alert').count()===1&&await page.evaluate(()=>localStorage.getItem('v-morph-cfg-v3'))===saved})
   json.cfg.lobeK=215;json.TIER.spinner.amp=.14;await textarea.fill(JSON.stringify(json));await page.getByRole('button',{name:'Import JSON',exact:true}).click();await page.getByLabel('Cards',{exact:true}).check();checks.push({name:'authored values survive category change',pass:await page.evaluate(()=>JSON.parse(localStorage.getItem('v-morph-cfg-v3')).cfg.lobeK===215)})
   await page.getByRole('button',{name:'Reset morph to runtime',exact:true}).click();checks.push({name:'reset removes only profile',pass:await page.evaluate(()=>localStorage.getItem('v-morph-cfg-v3')===null&&localStorage.getItem('v-motion')!==null&&localStorage.getItem('v-flow-v1')!==null)})
   checks.push({name:'narrow bounds',pass:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)})
   return {frames:[],pngs:[],checks,errors}
  }
  await sample('rest',at,true)
  if(scenario.family==='group'){
   if(scenario.shape==='hidden'){await page.locator('#group').evaluate(el=>{el.hidden=false;motionGate.replace()});await sample('shown',at+80,true)}
   const target=page.locator('#item-1');if(scenario.shape==='fields')await page.locator('#item-0').focus()
   await target.hover();await sample('ghost',at+16,true)
   if(scenario.shape==='fields')await target.focus();else await target.click()
   const start=at
   const deadlines=await page.evaluate(()=>{const g=document.getElementById('group'),from=g.querySelector('#item-0').getBoundingClientRect(),to=g.querySelector('#item-1').getBoundingClientRect(),scale=Math.min(1.25,Math.max(.8,.8+Math.hypot(to.x-from.x,to.y-from.y)/600)),sp=+getComputedStyle(document.documentElement).getPropertyValue('--flow-speed'),ms=(key,fallback)=>{const value=getComputedStyle(document.documentElement).getPropertyValue(key).trim(),n=parseFloat(value);return Number.isFinite(n)?n*(value.endsWith('ms')?1:1000):fallback};return [16,16+ms('--t-flow-stretch-p1',165)*scale/sp,16+ms('--t-flow-drop-gather',140)*scale/sp,16+(ms('--t-flow-drop-gather',140)+ms('--t-flow-drop-shoot',180))*scale/sp,16+ms('--t-flow-rubber-lead',200)*scale/sp]})
   for(const dt of [...new Set([0,15,16,17,...deadlines.flatMap(d=>[d-.1,d,d+.1]),80,160,400,1000])].filter(t=>t>=0).sort((a,b)=>a-b))await sample('selection',start+dt,[16,80,160,400,1000].includes(dt))
   await page.locator('#item-2').click();await sample('long-hop',at+16,true);await page.locator('#item-0').click();await sample('interrupted-reverse',at+16);await sample('reverse-settled',at+1500,true)
   await page.evaluate(()=>motionGate.replace());await sample('same-target-replace',at+16)
   await page.locator('#group').evaluate(el=>{el.setAttribute('data-flow-hover','off')});await page.locator('#item-1').hover();await sample('group-hover-off',at+16)
  }else if(scenario.family==='morph'){
   const rect=await page.locator('#body').boundingBox();await page.mouse.move(rect.x+rect.width+10,rect.y+rect.height/2)
   for(const dt of [16,32,80,160,320])await sample('reach',100000+dt,dt===320)
   await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.5);await sample('inside',at+300,true);await page.mouse.down();await sample('press',at+200,true);await page.mouse.up();await sample('release',at+320,true)
   await page.evaluate(()=>motionGate.category('cards',true));await page.waitForTimeout(50);await sample('cards-enabled',at+320)
   await page.evaluate(()=>{document.getElementById('body').dataset.tier='tile';window.VMorph?.retune()});await sample('tier-change',at+320,true)
   await page.locator('#body').evaluate(el=>el.style.width='180px');await page.waitForTimeout(50);await sample('resize',at+320)
   await page.evaluate(()=>{document.documentElement.dataset.mode=document.documentElement.dataset.mode==='dark'?'light':'dark';window.VMorph?.retheme?.()});await sample('theme',at+320,true)
  }else{
   await page.locator('#press').click();await sample('press-release',at+16,true);await sample('press-land',at+180,true)
   await page.locator('#toggle input').check();await sample('toggle-change',at+16)
   await page.locator('#slider').fill('80');await page.locator('#slider').dispatchEvent('change');await sample('slider-output',at+16)
   await page.locator('#opener').click();await sample('surface-grow',at+16,true);await sample('surface-settled',at+900,true)
   await page.evaluate(()=>motionGate.arrive());await sample('arrival',at+16,true)
   await page.locator('#disclosure summary').click();await sample('disclosure',at+160)
   await page.locator('#press').focus();await page.keyboard.press('Space');await sample('keyboard-press',at+16)
  }
  if(errors.length)throw Error(errors.join('\n'))
  return {frames,pngs,errors}
 }finally{await context.close()}
}
function write(){writeMotionReport({rows,scenarios,fixtures,widths,modes,output})}
try{
 outer:for(const scenario of scenarios)for(const width of widths)for(const mode of modes){
  try{
   if(scenario.family==='adjuster'||scenario.family==='behavior'){const a=await capture('candidate',scenario,width,mode,1),b=await capture('candidate',scenario,width,mode,2);const row={id:scenario.id,width,mode,verdict:a.checks.every(c=>c.pass)&&b.checks.every(c=>c.pass)?'PASS':'FAIL',checks:a.checks,candidateStable:JSON.stringify(a.checks)===JSON.stringify(b.checks)};rows.push(row);write();console.log(row.verdict,scenario.id,width,mode);if(row.verdict!=='PASS')process.exitCode=1;continue}
   const a=await capture('oracle',scenario,width,mode,1),a2=await capture('oracle',scenario,width,mode,2),b=await capture('candidate',scenario,width,mode,1),b2=await capture('candidate',scenario,width,mode,2)
   const oracleDifferences=difference(a.frames,a2.frames),candidateDifferences=difference(b.frames,b2.frames),differences=difference(a.frames,b.frames)
   const pixels=a.pngs.map((image,index)=>{const pa=PNG.sync.read(fs.readFileSync(image.file)),pb=PNG.sync.read(fs.readFileSync(b.pngs[index].file));return {label:image.label,reference:image.file,candidate:b.pngs[index].file,pixels:pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:.1,includeAA:true}),rawPixels:pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:0,includeAA:true})}})
   const selfPixels=(first,second)=>first.pngs.map((image,i)=>{const pa=PNG.sync.read(fs.readFileSync(image.file)),pb=PNG.sync.read(fs.readFileSync(second.pngs[i].file));return {label:image.label,byteEqual:image.digest===second.pngs[i].digest,pixels:pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:.1,includeAA:true}),rawPixels:pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:0,includeAA:true})}})
   const oraclePixels=selfPixels(a,a2),candidatePixels=selfPixels(b,b2),oracleStable=!oracleDifferences.length&&oraclePixels.every(p=>!p.pixels),candidateStable=!candidateDifferences.length&&candidatePixels.every(p=>!p.pixels),verdict=!oracleStable||!candidateStable?'HARNESS_UNSTABLE':differences.length||pixels.some(p=>p.pixels)?'FAIL':'PASS'
   rows.push({id:scenario.id,width,mode,verdict,oracleStable,candidateStable,oracleDifferences,candidateDifferences,oraclePixels,candidatePixels,differences,pixels,reference:a,candidate:b});write();console.log(`${verdict} ${scenario.id} ${width} ${mode}: self=${oracleStable}/${candidateStable} fields=${differences.length} pixelSamples=${pixels.filter(p=>p.pixels).length}`)
   if(verdict!=='PASS'){process.exitCode=1;if(process.env.MOTION_FAIL_FAST==='1')break outer}
  }catch(error){rows.push({id:scenario.id,width,mode,verdict:'ERROR',message:error.stack});write();console.error(error);process.exitCode=1;if(process.env.MOTION_FAIL_FAST==='1')break outer}
 }
}finally{await browser.close();await server.close()}
