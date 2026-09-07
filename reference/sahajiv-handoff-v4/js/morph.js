/* Vriksha · morph.js — living outlines, v4 (organism + true shapes).
   [data-morph="fill|stroke|both"] gets an aria-hidden SVG body behind a real DOM control.
   Body = rounded rect (default) or a TRUE SHAPE via data-shape="heart|star-8|…" (see SHAPES), sampled densely by arc length.
   One attraction field: the cursor is a small magnet; the rim point nearest it grows a narrow lobe toward it (reach),
   crossing in merges with an under-damped overshoot and a soft hold-bulge follows the cursor, leaving lets go with one
   decaying wobble, press squashes on the pointer axis with one ripple on release. Rest is a sub-pixel breath.
   Smoothness: ~1 sample per cfg.quality px (adaptive), sheen/grain inset 0.75 px so only ONE anti-aliased edge exists.
   data-tier="pill|tile|nav|card|blob|spinner" · data-r radius · data-shape · data-reach/inside/amp/lobes/depth/spread/asym
   --mfill / --mstroke · data-colors (spinner) · class v-alive adds sheen+grain · prefers-reduced-motion → static body. */
(()=>{
/* Reduced motion is read live, not once: an OS preference change now takes effect without a reload. */
const rmQuery=matchMedia('(prefers-reduced-motion: reduce)');let RM=rmQuery.matches;
rmQuery.addEventListener('change',e=>{RM=e.matches;try{retune()}catch(err){}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){suspended=true;stop()}else{suspended=false;try{schedule()}catch(e){}}});
//                  rest%  reach px  inside px  lobe σ px  radius px  press%   arms
const RUNTIME={cfg:{rest:false,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,dots:0,grain:.08,sheen:.6,curve:1.2,lobeK:130,lobeZ:1,mergeZ:.8,arcK:40,holdK:80,pressK:170,jiggle:.35,jiggleDecay:1.6,restSpeed:1,drift:1,quality:2.5},
 tier:{pill:{amp:0,reach:3,inside:1.2,press:.02},tile:{amp:0,reach:2.4,inside:1,press:.02},nav:{amp:0,reach:1.2,inside:.5,press:.008},card:{amp:0,reach:1,inside:.4,press:.004},blob:{amp:.006,reach:3,inside:1.2,press:.03}}};
/* Per-tier authoring domains live with the profile, so a slider cannot offer a value the tier cannot mean
   (the spinner's amp .14 is legitimate and must not be clamped to the pill's 3 % ceiling). */
const DOMAIN={amp:{max:{pill:3,tile:3,nav:1,card:1,blob:8,spinner:20},min:0},reach:{max:{pill:24,tile:24,nav:12,card:12,blob:32,spinner:0},min:0},inside:{max:{pill:12,tile:12,nav:6,card:6,blob:16,spinner:0},min:0},press:{max:{pill:12,tile:12,nav:4,card:4,blob:16,spinner:0},min:0},R:{max:{pill:240,tile:240,nav:160,card:160,blob:320,spinner:0},min:0},sig:{max:{pill:120,tile:120,nav:80,card:160,blob:160,spinner:8},min:1}};
const TIER={pill:{amp:.008,reach:4,inside:2,sig:24,R:80,press:.03,lobes:0,depth:0,asym:0,spread:.55},tile:{amp:.008,reach:3.5,inside:1.6,sig:18,R:64,press:.035,lobes:0,depth:0,asym:0,spread:.55},nav:{amp:.0006,reach:3,inside:1.2,sig:24,R:64,press:.010,lobes:0,depth:0,asym:0,spread:.55},card:{amp:.0003,reach:2.5,inside:.9,sig:44,R:56,press:.004,lobes:0,depth:0,asym:0,spread:.55},blob:{amp:.012,reach:4,inside:1.8,sig:22,R:64,press:.05,lobes:0,depth:0,asym:0,spread:.55},spinner:{amp:.14,reach:0,inside:0,sig:1,R:0,press:0,lobes:0,depth:0,asym:0,spread:.55}};
const cfg={quality:2.5,grain:.12,sheen:1,curve:1,lobeK:90,lobeZ:.9,mergeZ:.62,arcK:26,holdK:55,pressK:140,jiggle:.45,jiggleDecay:1.35,restSpeed:1,drift:1,rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,echoOff:6,echoScale:1.04,dots:0};
const FACTORY=JSON.parse(JSON.stringify({cfg,TIER}));
const NUM=k=>typeof FACTORY.cfg[k]==='number';
function apply(saved){if(!saved||typeof saved!=='object')return;for(const k in saved.cfg||{}){if(k in FACTORY.cfg&&typeof saved.cfg[k]===typeof FACTORY.cfg[k]&&(!NUM(k)||isFinite(saved.cfg[k])))cfg[k]=saved.cfg[k]}for(const t in saved.TIER||{}){if(!TIER[t])continue;for(const k in saved.TIER[t]){if(k in FACTORY.TIER[t]&&typeof saved.TIER[t][k]==='number'&&isFinite(saved.TIER[t][k]))TIER[t][k]=saved.TIER[t][k]}}}
try{apply(JSON.parse(localStorage.getItem('v-morph-cfg-v3')||'null'))}catch(e){}
const P={x:-1e4,y:-1e4};/* handlers must not reference the later `const wake` by value at registration time (temporal dead zone kills the
   whole module); they call the hoisted schedule() through a wrapper instead. */
document.addEventListener('pointermove',e=>{P.x=e.clientX;P.y=e.clientY;nudge()},{passive:true});
document.addEventListener('pointerleave',()=>{P.x=P.y=-1e4;nudge()});
document.addEventListener('pointerdown',()=>nudge(),{passive:true});document.addEventListener('pointerup',()=>nudge(),{passive:true});
addEventListener('resize',()=>nudge(),{passive:true});addEventListener('scroll',()=>nudge(),{passive:true});
/* ---- reproducibility ----
   Seed: with data-seed on <html> (or V.seed(n) / VMorph.seed(n)) every body's seed is a hash of its DOM path and the
   global seed, so it does not depend on build order; without a seed it is Math.random() as before.
   Clock: VMorph.clock(t) (normally via V.clock) freezes the engine's time source at t ms and steps one frame;
   the loop no longer self-schedules until clock(null). t is on the same axis as requestAnimationFrame's
   timestamp / performance.now() (ms since time origin); frame delta is capped at 50 ms. */
let SEED=(()=>{const d=document.documentElement.dataset.seed;return d!=null&&d!==''&&isFinite(+d)?+d:null})();
/* Nodes the engines inject themselves (this engine's svg body, its defs, flow.js's glide layers) are not part of the
   authored document and arrive at build-dependent times, so they are not counted: the path must be the same
   whether a sibling's body or a group's glide layers were seated before or after this body was seeded. */
const INJECTED='svg.v-morph,#v-morph-defs,.v-glide__pill,.v-glide__hover,.v-glide__trail';
const domKey=el=>{let k='',n=el;while(n&&n.nodeType===1&&n!==document.documentElement){let i=0,s=n;while((s=s.previousElementSibling))if(!s.matches(INJECTED))i++;k=n.tagName+i+'/'+k;n=n.parentNode}return k};
const seedFor=el=>{if(SEED==null)return Math.random()*100;let h=2166136261;const s=domKey(el)+'#'+SEED;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return (h%100000)/1000};
let CLOCK=null;const nowMs=()=>CLOCK!=null?CLOCK:performance.now();
/* rewind(): every body back to its initial dynamic state (all springs at 0, no wobble/ripple/merge, pointer away), so a
   recording can start from a known frame. V.seed() calls it: seeding means "start over deterministically". */
function rewind(){P.x=P.y=-1e4;for(const b of bodies){for(const s of [b.lobe,b.arc,b.hold,b.press,b.dirS.x,b.dirS.y]){s.x=0;s.v=0;s.to=0}b.jiggle=0;b.ripple=0;b.mergeT=0;b.inside=false;b.near=false;b.focus=false;b.drawn=false;b.lastD=null;b.drawnAt=0;b.rAt=0;b.R=null}dirty=0;t0=nowMs();nudge()}
function reseed(n){SEED=n==null?null:+n;for(const b of bodies){b.seed=seedFor(b.el);b.lob=null}rewind()}
function clock(t){if(t==null){CLOCK=null;t0=performance.now();nudge();return}if(CLOCK==null)t0=t;CLOCK=t;stop();frame(t)}
const bodies=[];let t0=nowMs(),dirty=0;
let DEFS=null;function defs(){if(DEFS)return DEFS;const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.id='v-morph-defs';s.setAttribute('width','0');s.setAttribute('height','0');s.style.cssText='position:absolute;width:0;height:0;overflow:hidden';const grain=encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");s.innerHTML=`<defs><linearGradient id="v-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".03"/></linearGradient><pattern id="v-grain" patternUnits="userSpaceOnUse" width="160" height="160"><image href="data:image/svg+xml,${grain}" width="160" height="160"/></pattern></defs><path id="v-probe" d="M0 0"/>`;document.body.prepend(s);DEFS=s;return s}

/* ---------- shape library (0..100 box). Path strings or parametric fns t∈[0,1) → [x,y] ---------- */
const star=(n,ro,ri)=>{let a=[];for(let i=0;i<n*2;i++){const r=i%2?ri:ro,t=-Math.PI/2+i*Math.PI/n;a.push([50+r*Math.cos(t),50+r*Math.sin(t)])}return 'M'+a.map(p=>p.map(v=>v.toFixed(2)).join(' ')).join('L')+'Z'};
const polar=f=>t=>{const th=t*Math.PI*2;const r=f(th);return [50+r*Math.cos(th),50+r*Math.sin(th)]};
const SHAPES={
heart:'M50 90C22 68 6 52 6 33A20 20 0 0 1 50 21A20 20 0 0 1 94 33C94 52 78 68 50 90Z',
crescent:'M60 5A45 45 0 1 0 60 95A50 50 0 0 1 60 5Z',
'star-8':star(8,48,30),'star-5':star(5,48,22),'star-6':star(6,48,28),
'star-4':'M50 2Q58 42 98 50Q58 58 50 98Q42 58 2 50Q42 42 50 2Z',
'blob-4':'M50 4C62 4 70 14 70 24C70 30 66 34 66 34C66 34 70 30 76 30C86 30 96 38 96 50C96 62 86 70 76 70C70 70 66 66 66 66C66 66 70 70 70 76C70 86 62 96 50 96C38 96 30 86 30 76C30 70 34 66 34 66C34 66 30 70 24 70C14 70 4 62 4 50C4 38 14 30 24 30C30 30 34 34 34 34C34 34 30 30 30 24C30 14 38 4 50 4Z',
cross:'M36 4H64Q68 4 68 8V32H92Q96 32 96 36V64Q96 68 92 68H68V92Q68 96 64 96H36Q32 96 32 92V68H8Q4 68 4 64V36Q4 32 8 32H32V8Q32 4 36 4Z',
droplet:'M50 4C50 4 12 46 12 64A38 38 0 0 0 88 64C88 46 50 4 50 4Z',
circle:'M50 4A46 46 0 1 1 49.99 4Z',
triangle:'M46 10Q50 4 54 10L94 84Q97 90 90 90H10Q3 90 6 84Z',
hex:'M25 6.7L75 6.7L100 50L75 93.3L25 93.3L0 50Z',
'flower-5':polar(th=>36+10*Math.cos(5*th)),'flower-6':polar(th=>36+10*Math.cos(6*th)),'flower-8':polar(th=>38+8*Math.cos(8*th)),
'splat-4':polar(th=>33+13*Math.cos(4*th)+2*Math.cos(8*th)),'splat-5':polar(th=>34+12*Math.cos(5*th)),
scallop:polar(th=>44.5+3*Math.cos(16*th)),pebble:polar(th=>42+3*Math.cos(3*th+.6)+2*Math.sin(5*th)),
squircle:t=>{const th=t*Math.PI*2,c=Math.cos(th),s=Math.sin(th);return [50+46*Math.sign(c)*Math.pow(Math.abs(c),.5),50+46*Math.sign(s)*Math.pow(Math.abs(s),.5)]},
egg:t=>{const th=t*Math.PI*2;return [50+38*Math.cos(th)*(1-.16*Math.sin(th)),50+44*Math.sin(th)]},
bean:t=>{const th=t*Math.PI*2,s=Math.sin(th);return [50+42*Math.cos(th),50-(26*s+14*Math.cos(2*th)*(1+s)/2)]},
leaf:t=>{const th=t*Math.PI*2,s=Math.sin(th),x=46*Math.cos(th),y=28*s*Math.pow(Math.abs(s),.45),c=Math.SQRT1_2;return [50+(x-y)*c,50+(x+y)*c]}};
const shapeNames=Object.keys(SHAPES);
// dense raw polyline for a shape (≈600 points)
function rawShape(name){const s=SHAPES[name];const N=600,out=[];if(typeof s==='function'){for(let i=0;i<N;i++)out.push(s(i/N));return out}const pr=defs().querySelector('#v-probe');pr.setAttribute('d',s);const L=pr.getTotalLength();for(let i=0;i<N;i++){const p=pr.getPointAtLength(L*i/N);out.push([p.x,p.y])}return out}
// resample a closed polyline by arc length into n points, fitted (contain, centred) into w×h; returns [x,y,nx,ny,arc] + per
function fromShape(name,w,h,step){const raw=rawShape(name);let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;for(const [x,y] of raw){if(x<minx)minx=x;if(y<miny)miny=y;if(x>maxx)maxx=x;if(y>maxy)maxy=y}const sc=Math.min(w/(maxx-minx),h/(maxy-miny)),ox=(w-(maxx-minx)*sc)/2-minx*sc,oy=(h-(maxy-miny)*sc)/2-miny*sc;const pts=raw.map(([x,y])=>[x*sc+ox,y*sc+oy]);
const N=pts.length,cum=[0];for(let i=1;i<=N;i++){const a=pts[i-1],b=pts[i%N];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}const per=cum[N];const n=Math.max(48,Math.min(420,Math.round(per/step)));const out=[];let j=0;
for(let i=0;i<n;i++){const d=per*i/n;while(j<N-1&&cum[j+1]<d)j++;const a=pts[j],b=pts[(j+1)%N],t=(d-cum[j])/((cum[j+1]-cum[j])||1);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0,0,d])}
// normals from neighbours; orient outward using the centroid
let cx=0,cy=0;for(const p of out){cx+=p[0];cy+=p[1]}cx/=n;cy/=n;let sgn=0;for(let i=0;i<n;i++){const a=out[(i-1+n)%n],b=out[(i+1)%n];let tx=b[0]-a[0],ty=b[1]-a[1];const L=Math.hypot(tx,ty)||1;const nx=ty/L,ny=-tx/L;out[i][2]=nx;out[i][3]=ny;sgn+=nx*(out[i][0]-cx)+ny*(out[i][1]-cy)}if(sgn<0)for(const p of out){p[2]=-p[2];p[3]=-p[3]}
out.per=per;out.poly=true;return out}
// rounded rect, exact geometry; n adaptive to perimeter
function rim(w,h,r,step){const sw=Math.max(0,w-2*r),sh=Math.max(0,h-2*r),qa=Math.PI*r/2,per=2*sw+2*sh+4*qa,n=Math.max(64,Math.min(320,Math.round(per/step))),out=[];
for(let i=0;i<n;i++){let d=(i/n)*per;const arc=d;let x,y,nx,ny;
if(d<sw){x=r+d;y=0;nx=0;ny=-1}else if((d-=sw)<qa){const a=-Math.PI/2+d/r;x=w-r+r*Math.cos(a);y=r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sh){x=w;y=r+d;nx=1;ny=0}else if((d-=sh)<qa){const a=d/r;x=w-r+r*Math.cos(a);y=h-r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sw){x=w-r-d;y=h;nx=0;ny=1}else if((d-=sw)<qa){const a=Math.PI/2+d/r;x=r+r*Math.cos(a);y=h-r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sh){x=0;y=h-r-d;nx=-1;ny=0}else{d-=sh;const a=Math.PI+d/r;x=r+r*Math.cos(a);y=r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
out.push([x,y,nx,ny,arc])}out.per=per;return out}
const f2=v=>v.toFixed(2);
// Catmull-Rom for rounded bodies (dense → exact arcs); straight polyline for true shapes (keeps sharp tips)
function path(p,poly){const n=p.length;if(poly){let d='M'+f2(p[0][0])+' '+f2(p[0][1]);for(let i=1;i<n;i++)d+='L'+f2(p[i][0])+' '+f2(p[i][1]);return d+'Z'}
let d='';for(let i=0;i<n;i++){const p0=p[(i-1+n)%n],p1=p[i],p2=p[(i+1)%n],p3=p[(i+2)%n];d+=(i?'':`M${f2(p1[0])} ${f2(p1[1])}`)+`C${f2(p1[0]+(p2[0]-p0[0])/6)} ${f2(p1[1]+(p2[1]-p0[1])/6)} ${f2(p2[0]-(p3[0]-p1[0])/6)} ${f2(p2[1]-(p3[1]-p1[1])/6)} ${f2(p2[0])} ${f2(p2[1])}`}return d+'Z'}
const SETTLE=.0008;/* below this the spring is snapped to target and its velocity zeroed */
const spring=(s,dt)=>{const k=s.k||120,c=2*Math.sqrt(k)*(s.z??1);let t=Math.min(dt,.1);while(t>0){const h=Math.min(.004,t);s.v+=((s.to-s.x)*k-s.v*c)*h;s.x+=s.v*h;t-=h}if(Math.abs(s.to-s.x)<SETTLE&&Math.abs(s.v)<SETTLE){s.x=s.to;s.v=0}};
const guessTier=el=>el.dataset.tier||(el.dataset.shape?'blob':el.classList.contains('v-card')||el.getAttribute('role')==='tablist'?'card':el.classList.contains('v-nav__item')||el.classList.contains('v-tab')?'nav':el.classList.contains('v-ibtn')?'tile':'pill');
const tierOf=el=>{const name=guessTier(el),t=TIER[name],f=FACTORY.TIER[name]||t;const pick=k=>{const d=el.dataset[k];return (d!=null&&t[k]===f[k])?+d:t[k]};return {...t,reach:pick('reach'),inside:pick('inside'),amp:pick('amp'),lobes:pick('lobes'),depth:pick('depth'),asym:pick('asym'),spread:pick('spread')}};
const NS='http://www.w3.org/2000/svg',mk=(t,a={})=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e};
function make(el){const tier=tierOf(el);const alive=el.classList.contains('v-alive')||el.classList.contains('combo');
const b={el,tier,alive,shape:el.dataset.shape&&SHAPES[el.dataset.shape]?el.dataset.shape:null,seed:seedFor(el),lobe:{x:0,v:0,to:0,k:90,z:.9},arc:{x:0,v:0,to:0,k:26,z:1},dirS:{x:{x:0,v:0,to:0,k:40,z:1},y:{x:-1,v:0,to:-1,k:40,z:1}},dir:{x:0,y:-1},hold:{x:0,v:0,to:0,k:55,z:1},press:{x:0,v:0,to:0,k:140,z:.9},ripple:0,jiggle:0,mergeT:0,inside:false,near:false,focus:false,visible:true,w:0,h:0,base:null};
const R0=el.getBoundingClientRect();const svg=mk('svg',{class:'v-morph','aria-hidden':'true','shape-rendering':'geometricPrecision'});svg.style.cssText='position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;overflow:visible;z-index:-1';
const p=mk('path');const e=mk('path',{fill:'none',stroke:'var(--mstroke,var(--mfill,transparent))','stroke-width':'1.5','vector-effect':'non-scaling-stroke'});const dg=mk('g',{fill:'var(--mfill,transparent)'});svg.append(p,e,dg);
if(alive){defs();b.sheen=mk('path',{fill:'url(#v-sheen)'});b.grain=mk('path',{fill:'url(#v-grain)'});b.grain.style.mixBlendMode='soft-light';svg.append(b.sheen,b.grain)}
/* preserve focus while decorating: prepending the body re-parents nothing, but adding host classes and
     styles can still cost focus in some engines, and a person may click during boot. Restore it. */
 {const had=el.ownerDocument.activeElement===el||el.contains(el.ownerDocument.activeElement);
  const keep=had?el.ownerDocument.activeElement:null;
  el.prepend(svg);
  if(keep&&el.ownerDocument.activeElement!==keep&&typeof keep.focus==='function')keep.focus({preventScroll:true})};b.svg=svg;b.path=p;b.echo=e;b.dots=dg;
const mode=el.dataset.morph||'fill';p.setAttribute('fill',mode!=='stroke'?'var(--mfill,var(--v-beige))':'none');if(mode!=='fill'){p.setAttribute('stroke','var(--mstroke,transparent)');p.setAttribute('stroke-width',el.dataset.sw||1.5);p.setAttribute('stroke-linejoin','round');if(el.dataset.dash)p.setAttribute('stroke-dasharray',el.dataset.dash)}
el.classList.add('v-morph-host');if(getComputedStyle(el).position==='static')el.classList.add('v-morph-rel');el.classList.add('v-morph-live');
el.addEventListener('pointerenter',()=>el.setAttribute('data-hover',''));el.addEventListener('pointerleave',()=>el.removeAttribute('data-hover'));/* Every listener a body installs — on the element AND on document — is owned by one AbortController, so
   remove() disposes them all. Keyboard and focus also wake the demand-driven loop, otherwise a keyboard-only
   user could change spring targets while the loop stayed asleep. */
b.ac=new AbortController();const sig={signal:b.ac.signal};
el.addEventListener('focusin',()=>{b.focus=true;nudge()},sig);
el.addEventListener('focusout',()=>{b.focus=false;nudge()},sig);
el.addEventListener('pointerdown',()=>{b.press.to=1;b.press.k=260;nudge()},sig);
const up=()=>{if(b.press.to){b.press.to=0;b.press.k=110;b.ripple=1;nudge()}};
el.addEventListener('pointerup',up,sig);el.addEventListener('pointercancel',up,sig);document.addEventListener('pointerup',up,sig);
el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){b.press.to=1;b.press.k=260;nudge()}},sig);
el.addEventListener('keyup',up,sig);
if(el.dataset.colors)b.colors=el.dataset.colors.split(',').map(c=>c.trim());
b.visible=false;b.drawn=false;bodies.push(b);byEl.set(el,b);size(b,R0);sizeWatch(b);nudge();return b}
/* A body's geometry was measured once, at build, and `b.resize` was never set by anything — so a host that
   changed size without the WINDOW changing kept a desktop-sized path. Inside a container-query layout that is
   the normal case: the app shell's own width control resized the shell and left 600 px bodies painting out of
   a 390 px column (shell scrollWidth 605 against clientWidth 390). One shared observer keeps every body
   fitted to its host, whatever resized it, and the re-measure runs inside the existing frame loop so it
   batches instead of thrashing. */
const sizeIO='ResizeObserver' in window?new ResizeObserver(es=>{let any=false;
 es.forEach(en=>{const b=byEl.get(en.target);if(!b)return;
  const r=en.contentRect;if(Math.abs(Math.round(r.width)-b.w)<1&&Math.abs(Math.round(r.height)-b.h)<1)return;
  b.resize=1;b.R=null;any=true});
 if(any)nudge()}):null;
function sizeWatch(b){if(sizeIO)try{sizeIO.observe(b.el)}catch(e){}}
function size(b,R0){
 /* A host that scrolls its own content must not have its scrollable area enlarged by decoration: the body's
    overscan added ~25 px per axis and produced scrollbars on Table, Data Table, Message Scroller, Scroll
    Area, Command and the chat dock even when the content fitted. Clamp the body to the padding box there. */
 {const cs0=getComputedStyle(b.el);b.scrolls=/auto|scroll/.test(cs0.overflowX)||/auto|scroll/.test(cs0.overflowY)}
const R=R0||b.el.getBoundingClientRect();const w=Math.round(R.width),h=Math.round(R.height);if(!w||!h)return;b.R=R;b.w=w;b.h=h;b.r=b.el.dataset.r?+b.el.dataset.r:Math.min(w,h)/2;const step=Math.max(1,cfg.quality);b.base=b.shape?fromShape(b.shape,w,h,step*.7):rim(w,h,b.r,step);const m=Math.min(w,h);const pad=b.scrolls?0:Math.ceil(b.tier.reach+(b.tier.press+b.tier.depth*1.6)*m+(cfg.echo?cfg.echoOff+m*Math.abs(cfg.echoScale-1)+2:0)+(cfg.dots?16:0))+6;b.pad=pad;b.svg.setAttribute('viewBox',`${-pad} ${-pad} ${w+2*pad} ${h+2*pad}`);b.svg.style.cssText=`position:absolute;left:${-pad}px;top:${-pad}px;width:${w+2*pad}px;height:${h+2*pad}px;pointer-events:none;overflow:visible;z-index:-1`;b.el.style.setProperty('--mpad',pad+'px')}
const byEl=new Map(),pending=new Set();const io=new IntersectionObserver(es=>{const build=[];es.forEach(e=>{const b=byEl.get(e.target);if(b)b.visible=e.isIntersecting;else if(e.isIntersecting&&pending.has(e.target))build.push(e.target)});if(build.length){build.forEach(el=>{pending.delete(el);queue.push(el)});drain()}nudge()},{rootMargin:'160px'});
// build at most ~6 ms of bodies per frame so a scroll never stalls
const queue=[];let draining=false;function drain(){/* a built body has no geometry until a frame runs; a sleeping engine must still paint its first static frame */if(draining)return;draining=true;const step=()=>{const t0=performance.now();while(queue.length&&performance.now()-t0<12){const el=queue.shift();if(!byEl.has(el)&&el.isConnected){const b=make(el);b.visible=true}}if(queue.length){setTimeout(step,16);nudge()}else{draining=false;nudge()}};setTimeout(step,0)}
/* ---- WHAT IS NEVER DECORATED ----
   The rule was already written down for the auto-tagger — "a label is text, a field group is layout, and a
   pale ring around either reads as a ghost input" — but an EXPLICIT data-morph bypassed it, and the React
   `alive` prop is exactly that. So <Label alive>, <Field alive>, <Direction alive> and <Tooltip alive> each
   produced the control geometry the design forbids, and the coverage fixture then counted the ring as a pass.
   The gate now belongs to the engine, so the semantics hold however the host was tagged: a text or layout
   primitive is refused a body, and says so on itself rather than failing silently. */
/* Reuses the auto-tagger's own list (declared below as NEVER_SEL) rather than keeping a second copy that could
   drift — the rule is one rule. Referencing it from here is safe because `lazy` only ever runs after the
   module has finished evaluating. */
/* Three kinds of host are refused control geometry, and each for a stated reason:
   · NEVER_SEL — text and layout primitives (a label, a field group, .v-prose, a .v-marker rule). Note this
     list also catches label.v-check / label.v-radio, and that is deliberate: the label is the layout and the
     INPUT is the control, which is exactly what the auto-tagger's `controls` category decorates.
   · a floating text bubble (.v-tip / .v-tooltip) — a painted surface, but not a control, and the auto-tagger
     would never reach it either.
   · a host with no class of its own — a bare layout wrapper such as <Direction dir="rtl">. The library's own
     classes have to be discounted first, or an `alive` host is never recognised as bare. */
const OWN_CLASS=/^(v-alive|v-morph-host|v-morph-rel|v-morph-live)$/;
const bareHost=el=>{const cls=(el.getAttribute('class')||'').trim();
 if(cls&&!cls.split(/\s+/).every(c=>OWN_CLASS.test(c)))return false;
 return /^(DIV|SPAN)$/.test(el.tagName)&&!el.dataset.shape&&!el.dataset.tier};
const undecorated=el=>{try{
 if(el.matches(NEVER_SEL))return 'text-or-layout';
 if(el.matches('.v-tip,.v-tooltip'))return 'floating-text';
 if(bareHost(el))return 'bare-wrapper';
 return ''}catch(e){return ''}};
const lazy=el=>{
 const why=undecorated(el);
 if(why){el.dataset.morphRefused=why;el.removeAttribute('data-morph');
  el.classList.remove('v-morph-host','v-morph-rel','v-morph-live');return}
 if(byEl.has(el)||pending.has(el))return;pending.add(el);startScan();io.observe(el)};
/* The viewport scan is on demand: started when something is waiting to build, cleared the moment the queue
   empties. It used to poll forever. */
let scanId=0;
function startScan(){if(scanId||!pending.size)return;scanId=setInterval(()=>{
 if(!pending.size){clearInterval(scanId);scanId=0;return}
 const H=innerHeight+160,W=innerWidth+160;let n=0;
 for(const el of pending){if(n>=40)break;const r=el.getBoundingClientRect();
  if(r.bottom>-160&&r.top<H&&r.right>-160&&r.left<W&&r.width&&r.height){pending.delete(el);queue.push(el);n++}}
 if(n){drain();nudge()}},250)}
// visibility for built bodies when IO is silent
/* Visibility is owned by the IntersectionObserver (see io above). The 400 ms poller read b.R, which only
   frame() refreshes, so while the loop slept it judged visibility from stale geometry. Removed. */
function frame(now){const dt=Math.min(.05,(now-t0)/1000);t0=now;const T=now/1000;let work=false;
for(let i=bodies.length-1;i>=0;i--)if(!bodies[i].el.isConnected)remove(bodies[i].el);/* lifecycle: a detached host never keeps a body alive */
const nearAny=P.x>-1e3;for(const b of bodies){if(!b.visible)continue;const stale=!b.R||now-(b.rAt||0)>250;let near=false;if(b.R&&nearAny){const R=b.R,m2=b.tier.R+40;near=P.x>R.left-m2&&P.x<R.right+m2&&P.y>R.top-m2&&P.y<R.bottom+m2}if(stale||near||b.press.to||b.lobe.x>.02||b.jiggle>0){b.R=b.el.getBoundingClientRect();b.rAt=now}b.resize=(Math.round(b.R.width)!==b.w||Math.round(b.R.height)!==b.h)}
for(const b of bodies){if(b.resize){b.resize=0;b.base=null;b.lob=null;b.drawn=false;b.lastD=null;size(b)}if(!b.visible||!b.w||!b.base)continue;const tier=b.tier,base=b.base,per=base.per,m=Math.min(b.w,b.h);
const R=b.R;const sx=b.w/R.width,sy=b.h/R.height;const cx=(P.x-R.left)*sx,cy=(P.y-R.top)*sy;const inBox=P.x>R.left-tier.R&&P.x<R.right+tier.R&&P.y>R.top-tier.R&&P.y<R.bottom+tier.R;const has=P.x>-1e3&&!RM&&tier.reach>0&&inBox;
let ni=0,nd=1e9;if(has){for(let i=0;i<base.length;i+=2){const q=base[i];const dd=(q[0]-cx)**2+(q[1]-cy)**2;if(dd<nd){nd=dd;ni=i}}}
const ins=has&&cx>0&&cx<b.w&&cy>0&&cy<b.h;const dist=Math.sqrt(nd);const near=has&&!ins&&dist<tier.R;
if(has&&(near||ins)){const q=base[ni];let da=q[4]-b.arc.x;da-=Math.round(da/per)*per;b.arc.to=b.arc.x+da;const dx=cx-q[0],dy=cy-q[1],L=Math.hypot(dx,dy)||1;b.dirS.x.to=dx/L;b.dirS.y.to=dy/L}
b.lobe.to=(near&&cfg.reach)?tier.reach*Math.pow(.5*(1-Math.cos(Math.PI*(1-dist/tier.R))),cfg.curve):0;
b.arc.k=cfg.arcK;b.hold.k=cfg.holdK;b.press.k=b.press.to?260:cfg.pressK;if(b.mergeT>0){b.mergeT-=dt;b.lobe.z=cfg.mergeZ;b.lobe.k=105}else{b.lobe.z=cfg.lobeZ;b.lobe.k=cfg.lobeK}
b.hold.to=cfg.hold?(ins?tier.inside*Math.max(.35,1-Math.min(dist,60)/80):(b.focus?tier.inside*.6:0)):0;
if(ins&&!b.inside&&cfg.merge)b.mergeT=.6;if(b.near&&!near&&!ins&&!RM&&cfg.jiggleOn){b.jiggle=1;b.jArc=b.arc.x}
b.inside=ins;b.near=near;
const active=near||ins||b.lobe.x>.02||b.hold.x>.02||b.press.x>.002||b.press.to||b.ripple>0||b.jiggle>0||b.mergeT>0;/* Rest breath no longer keeps the loop alive: it only modulates a body that is ALREADY awake through
     reach, hover, press or an explicit decorative blob. A settled page redraws nothing. */
 const moving=(tier.depth&&tier.lobes&&cfg.drift&&(near||ins))||b.colors;if(active||moving||!b.drawn)work=true;/* an unpainted body counts as work in every mode, Still included */if(now>dirty&&!active&&!moving&&b.drawn&&(now-(b.drawnAt||0))<250)continue;b.drawn=true;b.drawnAt=now;
if(b.jiggle>0)b.jiggle=Math.max(0,b.jiggle-dt*cfg.jiggleDecay);if(b.ripple>0)b.ripple=Math.max(0,b.ripple-dt*1.25);
spring(b.lobe,dt);spring(b.arc,dt);spring(b.hold,dt);spring(b.press,dt);spring(b.dirS.x,dt);spring(b.dirS.y,dt);const dl=Math.hypot(b.dirS.x.x,b.dirS.y.x)||1;b.dir={x:b.dirS.x.x/dl,y:b.dirS.y.x/dl};
const idle=(RM||!cfg.rest)?0:tier.amp*m,lobe=b.lobe.x,hold=b.hold.x,pr=b.press.x,rip=b.ripple,jg=b.jiggle;const isSpin=guessTier(b.el)==='spinner';const sig2=2*tier.sig*tier.sig;const pa=Math.atan2(cy-b.h/2,(cx-b.w/2)*(b.h/b.w));
if(tier.depth&&tier.lobes&&(!b.lob||b.lob.n!==tier.lobes||b.lob.a!==tier.asym)){const L=[];let s=b.seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};for(let j=0;j<tier.lobes;j++)L.push({c:j/tier.lobes+(rnd()-.5)*tier.asym*.5/tier.lobes,a:1+(rnd()-.5)*tier.asym*.9,w:1+(rnd()-.5)*tier.asym*.6});b.lob={n:tier.lobes,a:tier.asym,L}}
const dr=RM?0:T*.05*cfg.drift,armSig=tier.lobes?(tier.spread||.55)/tier.lobes*.5:0;
const N=base.length,pts=new Array(N),inner=b.sheen?new Array(N):null;
for(let i=0;i<N;i++){const q=base[i],x=q[0],y=q[1],nx=q[2],ny=q[3],arc=q[4],u=arc/per;
 let k=idle*(Math.sin(u*Math.PI*2*(isSpin?3:2)+T*.38*cfg.restSpeed+b.seed)*.6+Math.sin(u*Math.PI*2*3-T*.26*cfg.restSpeed+b.seed*1.3)*.4);
 if(armSig){let bump=-.35;for(const l of b.lob.L){let du=u-l.c-dr*(1+l.a*.2);du-=Math.round(du);const s2=armSig*l.w;bump+=l.a*Math.exp(-(du*du)/(2*s2*s2))}k+=tier.depth*m*bump}
 let da=arc-b.arc.x;da-=Math.round(da/per)*per;const g=Math.exp(-(da*da)/sig2);
 k+=hold*(g*1.2-.15);
 if(pr&&cfg.press){const a=Math.atan2(ny,nx);const c=Math.cos(a-pa);k+=pr*tier.press*m*(-.9*c*c+.5*(1-c*c))}
 if(rip)k+=Math.sin(u*Math.PI*2*2-(1-rip)*Math.PI*4)*rip*rip*tier.press*m*.6;
 if(jg){let dj=arc-b.jArc;dj-=Math.round(dj/per)*per;const gj=Math.exp(-(dj*dj)/sig2);const t=1-jg;k+=gj*tier.reach*cfg.jiggle*Math.exp(-t*3.2)*Math.cos(t*Math.PI*3.4)}
 const lx=lobe*g*b.dir.x,ly=lobe*g*b.dir.y;const px=x+nx*k+lx,py=y+ny*k+ly;pts[i]=[px,py];if(inner)inner[i]=[px-nx*.75,py-ny*.75]}
const poly=!!base.poly;const dStr=path(pts,poly);if(b.lastD!==dStr){b.path.setAttribute('d',dStr);b.lastD=dStr}/* identical geometry is not re-serialised */
if(cfg.echo){const cx0=b.w/2,cy0=b.h/2,s=cfg.echoScale,ox=cfg.echoOff*Math.cos(b.seed),oy=cfg.echoOff*Math.sin(b.seed);b.echo.setAttribute('d',path(pts.map(([x,y])=>[cx0+(x-cx0)*s+ox,cy0+(y-cy0)*s+oy]),poly));b.echo.style.display=''}else b.echo.style.display='none';
if(cfg.dots){if(b.dots.childElementCount!==cfg.dots){b.dots.innerHTML='';for(let i=0;i<cfg.dots;i++)b.dots.appendChild(mk('circle',{r:(2+((i*7+b.seed)%3)).toFixed(1)}))}for(let i=0;i<cfg.dots;i++){const j=Math.floor((i/cfg.dots)*N+b.seed*3)%N;const q=base[j];const c=b.dots.children[i];c.setAttribute('cx',f2(pts[j][0]+q[2]*(8+i*3)));c.setAttribute('cy',f2(pts[j][1]+q[3]*(8+i*3)))}b.dots.style.display=''}else b.dots.style.display='none';
if(b.sheen){const inStr=path(inner,poly);if(b.lastIn!==inStr){b.sheen.setAttribute('d',inStr);b.lastIn=inStr}b.sheen.style.opacity=cfg.sheen;if(b.lastGrain!==inStr){b.grain.setAttribute('d',inStr);b.lastGrain=inStr}b.grain.style.opacity=cfg.grain}
if(b.colors&&!RM){const c=b.colors,f=(T*.35)%c.length,i=Math.floor(f);b.path.setAttribute('fill',mix(c[i],c[(i+1)%c.length],f-i))}
if(isSpin&&!RM)b.svg.style.transform=`rotate(${(T*40)%360}deg)`;
/* below the visible threshold the property is REMOVED, not set to a near-1 scale: a residual
   scale(0.999…) is what reads as permanently squashed after the press settles */
b.el.style.transform=pr>.004?`scale(${1-pr*.03},${1-pr*.015})`:(b.el.style.transform?(b.el.style.removeProperty('transform'),''):'')}
if(work)schedule();else stop()}
/* The loop is demand-driven. It used to re-arm unconditionally, so a page with zero live bodies still burned
   ~59 rAF callbacks per second. Now frame() only re-arms while something is actually moving, and any pointer
   move, press, tag or resize wakes it. */
/* ONE scheduling owner. rAF owns the tick; the timeout is only a watchdog for hosts that throttle rAF, and the
   rAF callback clears it before running so a stale watchdog can never cancel a newer frame or double-tick. */
let rafId=0,timerId=0,running=false,suspended=false;
function schedule(){if(running||suspended||CLOCK!=null)return;running=true;
 rafId=requestAnimationFrame(t=>{clearTimeout(timerId);timerId=0;running=false;rafId=0;frame(t)});
 timerId=setTimeout(()=>{if(!running)return;cancelAnimationFrame(rafId);rafId=0;timerId=0;running=false;frame(performance.now())},34)}
function stop(){running=false;cancelAnimationFrame(rafId);clearTimeout(timerId);rafId=timerId=0}
const nudge=()=>{try{schedule()}catch(e){}};

const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`};
function init(root=document){if(!(root instanceof Node))root=document;
 /* Include the root itself: a wrapper calls init on its OWN node, which carries data-morph when alive is
    set, and querySelectorAll never matches its own root — so that host was never queued to build. */
 if(root.nodeType===1&&root.matches&&root.matches('[data-morph]'))lazy(root);
 root.querySelectorAll('[data-morph]').forEach(lazy)}
function remove(el){pending.delete(el);io.unobserve(el);
const qi=tagQueue.findIndex(x=>x[1]===el);if(qi>=0)tagQueue.splice(qi,1);
const bi=queue.indexOf(el);if(bi>=0)queue.splice(bi,1);/* the build queue could otherwise recreate a removed body */
const i=bodies.findIndex(b=>b.el===el);if(i>=0){const b=bodies.splice(i,1)[0];byEl.delete(el);if(sizeIO)try{sizeIO.unobserve(el)}catch(e){}if(b.ac)b.ac.abort();b.svg.remove()}el.classList.remove('v-morph-live','v-morph-host','v-morph-rel','v-alive');el.removeAttribute('data-hover');delete el.dataset.morph;if(el.dataset.autoMorph){delete el.dataset.autoMorph;delete el.dataset.origBg;delete el.dataset.autoFill;delete el.dataset.tier;delete el.dataset.sw;delete el.dataset.dash;if(!el.dataset.keepR)delete el.dataset.r;el.style.removeProperty('--mfill');el.style.removeProperty('--mstroke');el.style.removeProperty('--mpad');el.style.transform=''}}
const rmQueue=[];let removing=false;function removeLater(el){rmQueue.push(el);if(removing)return;removing=true;const step=()=>{const t0=performance.now();while(rmQueue.length&&performance.now()-t0<8)remove(rmQueue.shift());if(rmQueue.length)setTimeout(step,16);else removing=false};setTimeout(step,0)}
/* Category auto-tagging: give whole families of existing controls a body without touching markup.
   cats: {buttons,icons,pills,cards,nav} · fills come from CSS (.v-btn[data-morph]{--mfill:…}) so hover/palette stay live; fallback = computed background. */
const CATS={
buttons:{sel:'.v-btn:not(.-ghost),.v-select,.v-toggle,.v-native,.v-dock__action,.v-menubar__trigger,.v-cal__month,.v-caption-pill',tier:'pill'},
icons:{sel:'.v-ibtn,.v-disk:not(.v-input>.v-disk):not(.v-igroup>.v-disk):not(.v-select .v-disk):not(.v-menu__item .v-disk),.v-search__disk,.v-collapse,.v-assist__close,.v-attached,.v-play,.v-edit,.v-node__port,.v-receipt__dot,.v-mood .v-face',tier:'tile'},
pills:{sel:'.v-badge:not(.-count):not(.-sm),.v-time,.v-stamp,.v-delta,.v-kbd,.v-capsule__name,.v-nav__count,.v-cal__wk.-on,.v-week__day,.v-bubble,.v-pager button,.v-marker,.v-prov',tier:'tile'},
cards:{sel:'.v-card,.v-record,.v-resource,.v-file,.v-alert,.v-state,.v-md__detail,.v-event,.v-needs,.v-upgrade,.v-node,.v-inspector,.v-palette__item,.v-validation,.v-compact,.v-widget,.v-capsule,.v-band,.v-kv.-panel,.v-quest__opt,.v-collapsible__body,.v-acc>details,.v-empty,.v-feature__body,.v-resizable,.v-table-wrap,.v-list.-grouped,.v-mobile,.v-notch',tier:'card'},
nav:{sel:'.v-nav__item[aria-current="page"],.v-tabs:not(.-underline) .v-tabs:not(.-underline) .v-tab[aria-selected="true"],.v-item,.v-tabs.-pills,.v-tabs.-lenses,.v-seg,.v-menubar,.v-dock__item[aria-current="page"],.v-datestrip button[aria-pressed="true"],.v-cal__d[aria-selected="true"],.v-menu__item[aria-selected="true"]',tier:'nav'},
inputs:{sel:'label.v-input,div.v-input,.v-igroup,.v-cmd__input,.v-combo .v-input,.v-otp input,.v-stepper button,.v-textarea',tier:'nav'},
controls:{sel:'.v-switch,.v-weekdays label,.v-iradio,.v-check input,.v-radio input,.v-slider,.v-track,.v-mood button,.v-hex,.v-avatar:not(.-square),.v-ratio,.v-file__thumb,.v-mask,.v-drops .v-drop',tier:'tile'},
surfaces:{sel:'.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-cmd,.v-toast,.v-assist,.v-dock,.v-dockpanel,.v-sidebar,.v-scroller,.v-scroll,.v-hovercard>.v-popover,.v-collage,.v-feature,.v-ring,.v-prose',tier:'card'},
/* skeletons are the loudest bodies in the library: blob tier, so they breathe at rest and reach for the pointer */
skeleton:{sel:'.v-skel',tier:'pill'}};
const VOID=/^(INPUT|SELECT|TEXTAREA|HR|IMG|BR)$/;
const FILL_SEL='.v-btn:not(.-outline):not(.-ghost):not(.v-seg .v-btn),.v-badge:not(.-dashed):not(.-test),.v-card,.v-disk,.v-ibtn.-ink,.v-ibtn.-pink,.v-ibtn.-beige,.v-ibtn.-cream,.v-select,.v-time,.v-stamp,.v-delta,.v-toggle[aria-pressed="true"],.v-alert,.v-state:not(.-filtered),.v-event,.v-item.-selected,.v-md__detail,.v-tabs:not(.-underline) .v-tab[aria-selected="true"],.v-nav__item[aria-current="page"],.v-dock__action,.v-kbd,.v-bubble,.v-capsule__name,.v-nav__count,.v-week__day,.v-cal__month,.v-caption-pill,.v-menubar__trigger[aria-expanded="true"],.v-search__disk,.v-collapse,.v-assist__close,.v-attached,.v-play,.v-receipt__dot,.v-mood .v-face,.v-pager button[aria-current="page"],.v-datestrip button[aria-pressed="true"],.v-cal__d[aria-selected="true"],.v-cal__wk.-on,.v-switch,.v-weekdays label,.v-iradio:has(input:checked),.v-hex,.v-avatar,.v-skel,.v-track,.v-quest__opt,.v-band,.v-compact,.v-widget,.v-capsule,.v-node,.v-inspector,.v-palette__item,.v-validation,.v-upgrade,.v-needs,.v-record,.v-resource,.v-file,.v-kv.-panel,.v-collapsible__body,.v-acc>details,.v-list.-grouped,.v-table-wrap,.v-mobile,.v-notch,.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-cmd,.v-toast,.v-assist,.v-dock,.v-dockpanel,.v-sidebar,.v-scroller,.v-collage,.v-feature__body,.v-feature,.v-ratio,.v-file__thumb,.v-mask,.v-igroup,label.v-input,div.v-input,.v-cmd__input,.v-item,.v-menu__item[aria-selected="true"],.v-dock__item[aria-current="page"],.v-toggle';
/* Text and layout wrappers are never given control geometry: a label is text, a field group is layout, and a
   pale ring around either reads as a ghost input. Only real controls and true outline variants are here. */
/* .v-tabs and .v-seg are OUT: a stroke body around a tab strip or a segmented group drew a hairline lozenge
   round the whole row — an outline nothing in the design asks for. The menubar keeps its body because it
   has a real filled surface of its own. */
const STROKE_SEL='.v-btn.-outline,.v-badge.-dashed,.v-badge.-test,.v-ibtn,.v-menubar,.v-otp,.v-ring,.v-pager button,.v-resizable,.v-scroll,.v-state.-filtered,.v-drops .v-drop,.v-mood button,.v-node__port,.v-hovercard>.v-popover';
const isClear=bg=>!bg||bg==='rgba(0, 0, 0, 0)'||bg==='transparent';
/* Relative luminance of a painted colour, and the nearest ancestor that actually paints one. Used to pick a
   fallback fill that suits the surface instead of assuming the cream canvas. */
const lumOf=c=>{const m=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c||'');if(!m)return 1;
 const [r,g,b]=[+m[1],+m[2],+m[3]].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
 return .2126*r+.7152*g+.0722*b};
const behindOf=el=>{for(let p=el.parentElement;p;p=p.parentElement){const bg=getComputedStyle(p).backgroundColor;if(!isClear(bg))return bg}
 return getComputedStyle(document.body).backgroundColor||'rgb(255,255,255)'};
const surfaceFill=el=>lumOf(behindOf(el))<.18?'rgba(251,244,230,.14)':'var(--v-beige)';
function autoTag(cats,root=document){try{sweepObsolete(cats)}catch(e){}if(!(root instanceof Node))root=document;const todo=[];for(const c in CATS){const on=!!cats[c];root.querySelectorAll(CATS[c].sel).forEach(el=>{if(VOID.test(el.tagName)||el.closest('.v-morph,svg,.tp,.ap,.code')||el.closest('[hidden]'))return;if(on){if(el.dataset.morph)return;todo.push([c,el])}else if(el.dataset.autoMorph===c)removeLater(el)})}
tagQueue.push(...todo);tagDrain()}
const tagQueue=[];let tagging=false;function tagDrain(){if(tagging)return;tagging=true;const step=()=>{const t0=performance.now();const batch=[];while(tagQueue.length&&performance.now()-t0<8){const [c,el]=tagQueue.shift();if(!el.isConnected||el.dataset.morph)continue;const w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)continue;const r=el.dataset.origR!=null?+el.dataset.origR:parseFloat(getComputedStyle(el).borderTopLeftRadius);batch.push([c,el,r,w,h])}tagWrite(batch);if(tagQueue.length)setTimeout(step,16);else tagging=false};setTimeout(step,0)}
/* SCROLLS_OWN_CONTENT — a host that scrolls its own content is never decorated. Clamping the body to pad:0
   still left it border-box wide (508) inside a client-box viewport (497), so it created both scrollbars on
   Scroll area, Table, Data Table, Message scroller, Command and the chat dock. Such panes take their
   surface from CSS instead, which also removes the fill-loss risk when a body is absent or unpainted. */
function scrollsOwnContent(el){const cs=getComputedStyle(el);return /auto|scroll/.test(cs.overflowX)||/auto|scroll/.test(cs.overflowY)}
const NEVER_SEL='.v-label,.v-field,.v-help,.v-prov,.v-marker,.v-prose,.v-caps,.v-meta,.v-quiet,.v-sr,label:not(.v-switch):not(.v-weekdays label),legend,dt,dd,p,h1,h2,h3,h4,caption,th';
function tagWrite(reads){for(const [c,el,r,w,h] of reads){if(!w||!h)continue;if(el.matches(NEVER_SEL))continue;if(scrollsOwnContent(el))continue;const stroke=!el.matches(FILL_SEL)&&el.matches(STROKE_SEL);if(!stroke&&!el.matches(FILL_SEL))continue;
if(el.dataset.r)el.dataset.keepR='1';el.dataset.autoMorph=c;el.dataset.morph=stroke?'stroke':'fill';if(!el.dataset.tier)el.dataset.tier=CATS[c].tier;el.dataset.origR=r;if(r&&r<200&&!el.dataset.r)el.dataset.r=Math.min(r,Math.min(w,h)/2);if(el.classList.contains('v-ring'))el.dataset.r=Math.min(w,h)/2;if(el.matches('.v-field,.v-sliderwrap,.v-prose,.v-check,.v-radio,.v-label,.v-marker'))el.dataset.r=14;
if(stroke){const test=el.matches('.v-badge.-test'),dash=el.matches('.v-badge.-dashed');el.style.setProperty('--mstroke',test?'var(--v-ink)':dash?'var(--v-text-2)':'var(--v-border)');el.dataset.sw=test?'1.5':'1';if(dash)el.dataset.dash='3 3'}else if(!el.dataset.origBg){
/* Colour: the element's OWN background always wins, written inline so it beats every class rule.
   Trusting the computed --mfill made a role default leak into descendant-filled controls — an unpressed
   .v-seg .v-btn matches only the generic .v-btn[data-morph]{--mfill:var(--primary)}, so its body painted ink
   behind ink text (1.04:1). The CSS value is now only a fallback for genuinely transparent hosts. */
/* Read the host's TRUE background: .v-morph-live makes it transparent, and on re-entry the class can still
   be present from the previous life — reading through it is what left a body with no concrete fill, so the
   path fell back to currentColor and painted near-black on near-black. Always end with an explicit value. */
const live=el.classList.contains('v-morph-live');if(live)el.classList.remove('v-morph-live');
let bg=getComputedStyle(el).backgroundColor;
if(isClear(bg)&&el.dataset.origBg&&!isClear(el.dataset.origBg))bg=el.dataset.origBg;
if(live)el.classList.add('v-morph-live');
if(!isClear(bg)){el.dataset.origBg=bg;el.dataset.autoFill='1';el.style.setProperty('--mfill',bg)}
else{const cssFill=getComputedStyle(el).getPropertyValue('--mfill').trim();
 /* A fixed `--v-beige` fallback is right on the cream canvas and WRONG wherever the host sits on ink: the
    rail's current destination painted #EEE7DA under a cream label — 1.12:1, the least readable state in the
    whole library on the most important item in a nav. The fallback is now derived from the surface actually
    behind the host, so a light panel still gets beige and a dark rail gets the cream tint its own CSS
    already uses for the active item. Correct in both modes, because it reads the painted ancestor rather
    than assuming one. */
 el.style.setProperty('--mfill',cssFill||surfaceFill(el))}
/* And whatever the fill came from — a CSS declaration, the computed background, or the fallback above — a body
   must never paint something the host's own ink cannot be read on. This is the invariant, not the source:
   the fill is the engine's; the FOREGROUND is owned once, in VLive's surface pass. */
}
lazy(el)}
}
const shown=new Set();let shownT=0;new MutationObserver(ms=>{ms.forEach(x=>{if(!x.target.hasAttribute('hidden'))shown.add(x.target)});if(shown.size&&!shownT)shownT=setTimeout(()=>{shownT=0;const cats=window.VAlive?window.VAlive.cats():null;if(!cats){shown.clear();return}const els=[...shown];shown.clear();els.slice(0,8).forEach(el=>{if(el.isConnected)autoTag(cats,el)})},120)}).observe(document.documentElement,{attributes:true,attributeFilter:['hidden'],subtree:true});
/* A palette or theme change must re-read the colour each live body cached at tag time, then wake the loop —
   setting `dirty` alone left a stale fill on anything already built. */
window.addEventListener('v-palette',()=>{for(const b of bodies){delete b.el.dataset.origBg;b.el.style.removeProperty('--mfill');
 const bg=getComputedStyle(b.el).backgroundColor;
 if(!isClear(bg)){b.el.dataset.origBg=bg;b.el.style.setProperty('--mfill',bg)}
 else b.el.style.setProperty('--mfill',surfaceFill(b.el))}
 dirty=nowMs()+400;nudge()});
/* An element tagged by an earlier build can keep its body and attributes after its category is narrowed;
   nothing else removes them, so a stale stroke silhouette survived on labels and field groups. */
function sweepObsolete(cats){document.querySelectorAll('[data-auto-morph]').forEach(el=>{const c=el.dataset.autoMorph;
 const sel=CATS[c]&&CATS[c].sel;const stillMatches=sel&&el.matches(sel)&&cats[c]!==false;
 if(!stillMatches)remove(el)})}
const retune=()=>{for(const b of bodies){b.tier=tierOf(b.el);b.shape=b.el.dataset.shape&&SHAPES[b.el.dataset.shape]?b.el.dataset.shape:null;b.lob=null;b.drawn=false;b.drawnAt=0;b.w=0;b.h=0;b.base=null;b.resize=true}dirty=performance.now()+400;schedule()};
const reset=()=>{for(const k in FACTORY.TIER)Object.assign(TIER[k],FACTORY.TIER[k]);Object.assign(cfg,FACTORY.cfg);try{localStorage.removeItem('v-morph-cfg-v3')}catch(e){}retune()};
const save=()=>{try{localStorage.setItem('v-morph-cfg-v3',JSON.stringify({cfg,TIER}))}catch(e){}};
const exportJSON=()=>JSON.stringify({version:4,cfg,TIER},null,1);const importJSON=s=>{const o=typeof s==='string'?JSON.parse(s):s;apply(o);retune();save()};
/* 10 shipped personalities: cfg deltas + optional per-tier deltas. Users pick one, then adjust. */
const PRESETS={
still:{cfg:{rest:false,reach:false,merge:false,hold:false,jiggleOn:false,press:true,echo:false,dots:0,grain:0,sheen:0}},
calm:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:.6,drift:.5,curve:1.4,lobeK:70,lobeZ:1,mergeZ:.85,arcK:20,holdK:40,pressK:120,jiggle:.2,jiggleDecay:1.6,grain:.08,sheen:.8},tier:{pill:{reach:3,inside:1.4}}},
breathe:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:1,drift:1,curve:1,lobeK:90,lobeZ:.9,mergeZ:.62,arcK:26,holdK:55,pressK:140,jiggle:.45,jiggleDecay:1.35,grain:.12,sheen:1}},
snappy:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:1,drift:.8,curve:.7,lobeK:220,lobeZ:.85,mergeZ:.6,arcK:60,holdK:120,pressK:220,jiggle:.4,jiggleDecay:2,grain:.1,sheen:1}},
gooey:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:.7,drift:1.4,curve:1.2,lobeK:45,lobeZ:.75,mergeZ:.45,arcK:14,holdK:30,pressK:70,jiggle:.6,jiggleDecay:.9,grain:.12,sheen:1},tier:{pill:{reach:5,inside:2.6,sig:30}}},
drift:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:.8,drift:2.2,curve:1,lobeK:60,lobeZ:.95,mergeZ:.7,arcK:22,holdK:45,pressK:120,jiggle:.3,jiggleDecay:1.2,grain:.12,sheen:1}},
lively:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:1.6,drift:1.6,curve:.85,lobeK:140,lobeZ:.7,mergeZ:.5,arcK:40,holdK:80,pressK:180,jiggle:.7,jiggleDecay:1.5,grain:.12,sheen:1},tier:{pill:{reach:5,inside:2.4}}},
playful:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:2,drift:2.5,curve:.6,lobeK:180,lobeZ:.5,mergeZ:.35,arcK:50,holdK:90,pressK:200,jiggle:1,jiggleDecay:1.1,grain:.14,sheen:1},tier:{pill:{reach:6,inside:3,press:.045},tile:{reach:5,inside:2.4}}},
crisp:{cfg:{rest:false,reach:true,merge:true,hold:true,jiggleOn:false,press:true,curve:1,lobeK:160,lobeZ:1,mergeZ:.8,arcK:45,holdK:90,pressK:200,quality:2,grain:0,sheen:0,echo:false,dots:0},tier:{pill:{reach:3,inside:1.2}}},
sketch:{cfg:{rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,restSpeed:.9,drift:1.2,curve:1,lobeK:80,lobeZ:.9,mergeZ:.6,arcK:24,holdK:50,pressK:130,jiggle:.4,jiggleDecay:1.3,grain:.2,sheen:.6,echo:true,echoOff:5,echoScale:1.05,dots:3}}};
const preset=name=>{const p=PRESETS[name];if(!p)return;for(const k in FACTORY.TIER)Object.assign(TIER[k],FACTORY.TIER[k]);Object.assign(cfg,FACTORY.cfg,p.cfg);for(const t in p.tier||{})Object.assign(TIER[t],p.tier[t]);retune();save()};
const destroy=root=>{const scope=root&&root.querySelectorAll?root:document;[...scope.querySelectorAll('[data-auto-morph],[data-morph]')].forEach(el=>remove(el));if(!root||scope===document){clearInterval(scanId);scanId=0;stop()}};

/* A fill body caches the host's own background as an inline --mfill, so a theme change must re-capture it or
   every painted surface stays frozen at the old theme's colour while CSS text flips (the dark-mode failure).
   We clear the inline value, let CSS repaint, then re-read the host's real background. */
function rethemeBodies(){const list=[...document.querySelectorAll('[data-auto-fill],[data-orig-bg]')];
 list.forEach(el=>{el.style.removeProperty('--mfill');el.removeAttribute('data-orig-bg')});
 requestAnimationFrame(()=>{list.forEach(el=>{if(el.dataset.morph!=='fill')return;
  const had=el.classList.contains('v-morph-live');if(had)el.classList.remove('v-morph-live');
  const bg=getComputedStyle(el).backgroundColor;if(had)el.classList.add('v-morph-live');
  if(bg&&!/rgba?\(0, 0, 0, 0/.test(bg)){el.dataset.origBg=bg;el.style.setProperty('--mfill',bg)}

  /* darkPrimary: a primary pill inverts to pink in dark mode, so its body follows the painted fill */});
  bodies.forEach(b=>{b.drawn=false;b.lastD=null});nudge()})}
new MutationObserver(()=>rethemeBodies()).observe(document.documentElement,{attributes:true,attributeFilter:['data-mode','data-skin']});
window.addEventListener('v-theme',rethemeBodies);
window.VMorph={seed:reseed,rewind,clock,get SEED(){return SEED},get CLOCK(){return CLOCK},destroy,sweepObsolete,retheme:rethemeBodies,RUNTIME,DOMAIN,init,remove,autoTag,CATS,bodies,TIER,cfg,retune,save,reset,FACTORY,PRESETS,preset,SHAPES,shapeNames,exportJSON,importJSON};
if(!document.getElementById('v-morph-kf')){const s=document.createElement('style');s.id='v-morph-kf';s.textContent='.v-morph-live[data-morph="stroke"],.v-morph-live[data-morph="both"]{box-shadow:none!important}[data-morph]{transition:transform 0s}.v-morph-host{isolation:isolate}.v-morph-rel{position:relative!important}svg.v-morph{max-width:none!important;max-height:none!important}';document.head.appendChild(s)}
const start=()=>{init();schedule()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
