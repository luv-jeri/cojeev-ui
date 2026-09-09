import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Component interaction gate. GATE_URL optionally selects an existing server.
const base = process.env.GATE_URL || 'http://127.0.0.1:4317';
const server=process.env.GATE_URL?null:await createServer({configFile:'apps/gate/vite.config.ts'});
if(server)await server.listen();
const properties = ['color','background-color','border-color','box-shadow','outline','outline-offset','opacity','transform','transition-duration','transition-timing-function','--mfill','--mstroke'];
const digest = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rows = [];
const browser = await chromium.launch();
const report = 'GATE-INTERACTIONS.md';
const limit = Number(process.env.GATE_INTERACTION_LIMIT || Infinity);
const modes = (process.env.GATE_INTERACTION_MODES || 'light,dark').split(',');
const motions = (process.env.GATE_INTERACTION_MOTIONS || 'reduce,no-preference').split(',');
const catalog = JSON.parse(fs.readFileSync('reference/cojeev-handoff-v4/data/registry.json','utf8')).entries;
const ids = (process.env.GATE_INTERACTION_COMPONENTS || 'button,card').split(',');
if (ids.some(id=>!['button','card'].includes(id))) throw new Error('This interaction gate currently covers Button and Card.');
const compare = (a,b,prefix='') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>compare(a[k],b[k],prefix?`${prefix}.${k}`:k));
  return [{property:prefix,reference:a,candidate:b}];
};
async function capture(side,id,variant,size,mode,motion) {
  const context = await browser.newContext({viewport:{width:480,height:900},reducedMotion:motion});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  const filename=`${variant}-${size}-rest${mode==='dark'?'-dark':''}.html`;
  const url = side==='oracle'?`${base}/reference/cojeev-handoff-v4/isolation/${id}/${filename}`:`${base}/candidate?id=${id}&file=${filename}`;
  try {
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='1');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1800);
    await page.evaluate(()=>{window.VMorph?.rewind();window.__cojeevGate?.rewind();(window.V?.clock||window.__cojeevGate.clock)(100000);});
    const point=await page.locator('[data-gate]').first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width*.75,y:r.y+r.height*.5};});
    const frames=[];
    let previous=100000;
    async function frame(state,t) {
      const snapshot=await page.evaluate(({t,previous,properties})=>{
        const tick=window.V?.clock||window.__cojeevGate.clock;
        for(let time=previous+16;time<t;time+=16)tick(time);
        tick(t);
        const el=document.querySelector('[data-gate]'), cs=getComputedStyle(el);
        return {styles:Object.fromEntries(properties.map(p=>[p,cs.getPropertyValue(p)])),semantic:{tag:el.tagName,text:el.textContent,disabled:el.disabled,focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),hover:el.matches(':hover'),active:el.matches(':active'),ariaPressed:el.getAttribute('aria-pressed')},paths:[...el.querySelectorAll('svg.v-morph path')].map(p=>({d:p.getAttribute('d'),fill:getComputedStyle(p).fill,stroke:getComputedStyle(p).stroke,display:getComputedStyle(p).display})),animations:document.getAnimations().map(a=>({type:a.constructor.name,playState:a.playState,currentTime:a.currentTime}))};
      },{t,previous,properties});
      previous=t;
      frames.push({state,t,...snapshot});
    }
    await frame('rest',100000);
    await page.mouse.move(point.x,point.y);
    for(const dt of [0,16,32,64,120,200,400]) await frame('hover',100000+dt);
    if (id==='button') {
    await page.mouse.down();
    for(const dt of [0,16,32,64,120,200]) await frame('pointerdown',100400+dt);
    await page.mouse.up();
    for(const dt of [0,16,32,64,120,200,400,700]) await frame('release',100600+dt);
    await page.mouse.move(470,800);
    await page.locator('[data-gate]').first().evaluate(el=>el.blur());
    await page.evaluate(()=>{window.VMorph?.rewind();window.__cojeevGate?.rewind();});
    await frame('focus-rest',101300);
    await page.keyboard.press('Tab');
    for(const dt of [0,16,32,64,120,200,400]) await frame('keyboard-focus',101300+dt);
    await page.keyboard.down('Space');
    for(const dt of [0,16,32,64,120,200]) await frame('keyboard-space-down',101700+dt);
    await page.keyboard.up('Space');
    for(const dt of [0,16,32,64,120,200,400,700]) await frame('keyboard-space-release',101900+dt);
    await page.keyboard.down('Enter');
    for(const dt of [0,16,32,64,120,200]) await frame('keyboard-enter-down',102600+dt);
    await page.keyboard.up('Enter');
    for(const dt of [0,16,32,64,120,200,400,700]) await frame('keyboard-enter-release',102800+dt);
    } else {
      await page.mouse.move(470,800);
      for(const dt of [0,16,32,64,120,200,400]) await frame('pointer-exit',100400+dt);
    }
    if(errors.length)throw new Error(errors.join('\n'));
    return {url,frames};
  } finally {await context.close();}
}
function write() {
  fs.mkdirSync('artifacts/gate-interactions',{recursive:true});
  fs.writeFileSync('artifacts/gate-interactions/results.json',JSON.stringify(rows,null,2)+'\n');
  fs.writeFileSync(report,['# Component interaction gate','',
    'Button and lift-Card interaction coverage at 480px. One page per fresh browser context, sequential loads, fonts.ready + 1800ms settle, fully built before rewind, no reseed. Actual pointer hover/down/up and keyboard Tab, Space and Enter; fixed engine clock instants. Each side is loaded twice. This harness does not modify source. This covers Button pointer and keyboard states plus the Card hover-lift modifier; group travel and other motion categories are separate gates.',
    '', '| Component | Variant | Size | Mode | Motion preference | Verdict | Oracle stable | Candidate stable | Differing fields |','| --- | --- | --- | --- | --- | --- | --- | --- | ---: |',
    ...rows.map(r=>`| ${r.id} | ${r.variant} | ${r.size} | ${r.mode} | ${r.motion} | ${r.verdict} | ${r.oracleStable} | ${r.candidateStable} | ${r.differences?.length??0} |`),
    '', 'Raw evidence: [results.json](artifacts/gate-interactions/results.json). Full SVG strings retained; animation time is included so an unfrozen CSS clock invalidates self-consistency.',
    '', 'Each target sample is reached with intermediate clock steps no larger than 16ms. Keyboard focus starts after pointer exit, blur, and engine rewind. Reduced-motion ACCEPTED rows retain raw differences and use the owner-approved static-body rule only for host transform and SVG path d, and only when every candidate frame proves those values remain static; all other fields remain exact.',''].join('\n'));
}
try {
  outer: for(const id of ids) for(const motion of motions) for(const mode of modes) for(const variant of (process.env.GATE_INTERACTION_VARIANTS || (id==='card'?'lift':['default',...catalog[id].variants].join(','))).split(',')) for(const size of (process.env.GATE_INTERACTION_SIZES || ['default',...catalog[id].sizes].join(',')).split(',')) {
    if(rows.length>=limit)break outer;
    const a=await capture('oracle',id,variant,size,mode,motion),a2=await capture('oracle',id,variant,size,mode,motion),b=await capture('candidate',id,variant,size,mode,motion),b2=await capture('candidate',id,variant,size,mode,motion);
    const oracleDifferences=compare(a.frames,a2.frames),candidateDifferences=compare(b.frames,b2.frames),differences=compare(a.frames,b.frames);
    const oracleStable=!oracleDifferences.length,candidateStable=!candidateDifferences.length;
    const restingBodyMatches=a.frames[0].styles.transform===b.frames[0].styles.transform&&JSON.stringify(a.frames[0].paths.map(p=>p.d))===JSON.stringify(b.frames[0].paths.map(p=>p.d));
    const candidateStatic=restingBodyMatches&&b.frames.every(f=>f.styles.transform===b.frames[0].styles.transform && JSON.stringify(f.paths.map(p=>p.d))===JSON.stringify(b.frames[0].paths.map(p=>p.d)));
    const acceptedDifferences=id==='button'&&motion==='reduce'&&candidateStatic?differences.filter(d=>/^\d+\.(styles\.transform|paths\.\d+\.d)$/.test(d.property)):[];
    const failures=differences.filter(d=>!acceptedDifferences.includes(d));
    const verdict=!oracleStable||!candidateStable?'HARNESS_UNSTABLE':failures.length?'FAIL':acceptedDifferences.length?'ACCEPTED':'PASS';
    rows.push({id,variant,size,mode,motion,verdict,oracleStable,candidateStable,restingBodyMatches,candidateStatic,acceptedDifferences,failures,oracleDigest:digest(a.frames),candidateDigest:digest(b.frames),oracleDifferences,candidateDifferences,differences,reference:a,candidate:b});
    write();console.log(`${verdict} ${id}/${variant}/${size}/${mode}/${motion}: oracleStable=${oracleStable} candidateStable=${candidateStable} differences=${differences.length}`);
    if(!['PASS','ACCEPTED'].includes(verdict)){process.exitCode=1;break outer;}
  }
} catch(e) {rows.push({verdict:'ERROR',message:e.message});write();console.error(e);process.exitCode=1;}
finally {await browser.close();await server?.close();}
