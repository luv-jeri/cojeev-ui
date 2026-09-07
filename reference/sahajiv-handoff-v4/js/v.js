/* Vriksha · v.js — tiny runtime: inline icon/shape sprites, count-up, ring draw, dock toggle. No framework. */
(()=>{
const base=document.currentScript?.getAttribute('data-base')||'..';
const sym=id=>document.getElementById(id)?.innerHTML||'';
/* The icon's identity is kept on the element (data-icon-name), so a render that happens before the sprites
   resolve is recoverable: fillIcons() completes it later instead of leaving a permanently blank circle. */
const I=(n,cls='')=>`<svg class="v-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" data-icon-name="${n}">${sym('vi-'+n)}</svg>`;
const fillIcons=(root=document)=>{const scope=root&&root.querySelectorAll?root:document;
 scope.querySelectorAll('svg.v-icon[data-icon-name]').forEach(s=>{if(s.childElementCount)return;const c=sym('vi-'+s.dataset.iconName);if(c)s.innerHTML=c});
 scope.querySelectorAll('svg.v-shapesvg[data-shape-name]').forEach(s=>{if(s.childElementCount)return;const c=sym('vs-'+s.dataset.shapeName);if(c)s.innerHTML=c})};
const S=(n,style='')=>`<svg class="v-shapesvg" viewBox="0 0 100 100" aria-hidden="true" style="${style}"><use href="${base}/assets/shapes/sprite.svg#${n}"/></svg>`;
window.V={icon:I,shape:S,destroy};
// <i data-icon="name" class="v-icon"> → inline svg
const hydrate=root=>{root.querySelectorAll('[data-icon]').forEach(el=>{const n=el.getAttribute('data-icon');const cls=el.className.replace('v-icon','').trim();el.outerHTML=I(n,cls)});
root.querySelectorAll('[data-shape]:not([data-morph])').forEach(el=>{const n=el.getAttribute('data-shape');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');svg.setAttribute('class',el.className);svg.setAttribute('style',el.getAttribute('style')||'');svg.dataset.shapeName=n;svg.innerHTML=sym('vs-'+n);el.replaceWith(svg)})};
// inline both sprites once (external <use> is unreliable across origins/previews)
let spritePromise=null;
const inlineSprites=()=>{
 if(document.getElementById('v-sprites'))return Promise.resolve(true);
 if(spritePromise)return spritePromise;                       /* concurrent init calls share one fetch */
 const wrap=document.createElement('div');wrap.id='v-sprites';wrap.style.display='none';
 document.body.prepend(wrap);                                 /* claim the id BEFORE awaiting, or two inits duplicate every symbol */
 spritePromise=(window.V_SPRITES?Promise.resolve([V_SPRITES.icons,V_SPRITES.shapes]):Promise.all([
  fetch(base+'/assets/icons.svg').then(r=>{if(!r.ok)throw new Error('icons '+r.status);return r.text()}),
  fetch(base+'/assets/shapes/sprite.svg').then(r=>{if(!r.ok)throw new Error('shapes '+r.status);return r.text()})
 ])).then(([ic,sh])=>{wrap.innerHTML=ic.replace(/id="([^"]+)"/g,'id="vi-$1"')+sh.replace(/id="([^"]+)"/g,'id="vs-$1"');return true})
 .catch(e=>{console.warn('v.js: sprites unavailable',e);wrap.remove();spritePromise=null;return false});/* failure stays retryable */
 return spritePromise};
// count-up numbers
const countUp=el=>{const raw=el.getAttribute('data-count-to')??el.getAttribute('data-count');const to=parseFloat(raw);if(!isFinite(to))return;const dec=(String(raw).split('.')[1]||'').length;const dur=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-count'))||0;if(!dur){el.textContent=to.toFixed(dec);return}/* zero duration (reduced motion) wrote dataset.count, which is blank for the explicit data-count-to hook */const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);el.textContent=(to*e).toFixed(dec);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)};
const watched=new Set();
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){countUp(e.target);io.unobserve(e.target);watched.delete(e.target)}})):null;
/* destroy(root) — release pending count-up observations inside a subtree a consumer is unmounting, so a
   removed node is not held by the observer and a re-mount starts clean. */
function destroy(root=document){const scope=root&&root.querySelectorAll?root:document;
 [...watched].forEach(el=>{if(scope===el||(scope.contains&&scope.contains(el))){if(io)io.unobserve(el);watched.delete(el);delete el.dataset.counted}});
 return true}
// ring: data-segs="yellow:30,pink:25,blue:20,olive:15" data-gap="8"
const ring=el=>{const segs=(el.dataset.segs||'').split(',').filter(Boolean).map(s=>{const [c,val]=s.split(':');return{c,v:+val}});
const clean=segs.filter(s=>isFinite(s.v)&&s.v>0);const total=clean.reduce((a,s)=>a+s.v,0);
if(!total){/* an empty or all-zero dataset is unavailable, not a full ring reporting 100 % */
 el.setAttribute('data-empty','');const t=el.querySelector('[data-total]');if(t)t.textContent='—';
 const cap=document.createElement('p');cap.className='v-meta';cap.textContent='No data to plot.';el.appendChild(cap);return}const gap=+(el.dataset.gap||6);const sw=+(el.dataset.sw||12);const r=50-sw/2;const C=2*Math.PI*r;let off=0;
let svg='<svg viewBox="0 0 100 100" aria-hidden="true">';svg+='<circle class="-track" cx="50" cy="50" r="'+r+'" style="--sw:'+sw+'"/>';
for(const s of clean){const len=C*s.v/total-gap;svg+='<circle cx="50" cy="50" r="'+r+'" stroke="var(--v-'+s.c+')" style="--sw:'+sw+'" stroke-dasharray="'+Math.max(0,len)+' '+C+'" stroke-dashoffset="'+(-off)+'"/>';off+=C*s.v/total}
svg+='</svg>';el.insertAdjacentHTML('afterbegin',svg);
// the centre value and the data alternative are generated from the same numbers, so they cannot disagree
const labels=(el.dataset.legend||'').split(',').filter(Boolean);const unit=el.dataset.unit||'';
const tot=el.querySelector('[data-total]');if(tot)tot.textContent=total.toFixed(total%1?1:0);
/* Build the alternative as nodes (labels are text, not markup) and keep it OUT of the role="img" subtree:
   a table inside an img is presentational to assistive technology. */
const tbl=document.createElement('table');tbl.className='v-sr';
const cap=document.createElement('caption');cap.textContent=(el.getAttribute('aria-label')||'Ring chart')+' — illustrative demo data, total '+total.toFixed(1)+' '+unit;
tbl.appendChild(cap);
const thead=tbl.insertRow();['Area','Value','Share'].forEach(h=>{const th=document.createElement('th');th.textContent=h;thead.appendChild(th)});
clean.forEach((s,i)=>{const tr=tbl.insertRow();[labels[i]||s.c,s.v.toFixed(1)+' '+unit,Math.round(s.v/total*100)+'%'].forEach(t2=>{const td=tr.insertCell();td.textContent=t2})});
const tr=tbl.insertRow();['Total',total.toFixed(1)+' '+unit,'100%'].forEach(t2=>{const td=tr.insertCell();td.textContent=t2});
(el.parentElement||el).appendChild(tbl);const svgEl=el.querySelector(':scope>svg');
if(svgEl){svgEl.setAttribute('role','img');svgEl.setAttribute('aria-label',(el.dataset.legend||'ring')+' — total '+total.toFixed(1)+' '+unit+'; a data table follows')}};
// dock toggle
const dock=(root=document)=>(root.querySelectorAll?root:document).querySelectorAll('[data-dock-toggle]').forEach(b=>{if(b.dataset.dockBound)return;b.dataset.dockBound='1';b.addEventListener('click',()=>{const d=b.closest('.v-dock');const open=d.classList.toggle('-open');const panel=document.querySelector(b.dataset.dockToggle);if(panel)panel.hidden=!open;const scrim=panel?.previousElementSibling?.classList.contains('v-mobile-scrim')?panel.previousElementSibling:null;if(scrim)scrim.hidden=!open;b.setAttribute('aria-expanded',open)})});
const initTail=(root=document)=>{/* Count-up animates ONLY an explicit finite number. `data-count` is also used as a semantic hook for
   result/status prose (see catalog/demo-behaviour.js), so a non-numeric value must be left untouched —
   writing parseFloat('') into it is what produced <p data-count role="status">NaN</p>. */
root.querySelectorAll('[data-count-to],[data-count]').forEach(el=>{if(el.dataset.counted)return;
 const raw=el.getAttribute('data-count-to')??el.getAttribute('data-count');
 if(raw===null||raw.trim()===''||!isFinite(parseFloat(raw))||!/^-?\d*\.?\d+$/.test(raw.trim()))return;
 el.dataset.counted=1;io?(watched.add(el),io.observe(el)):countUp(el)});root.querySelectorAll('.v-ring[data-segs]').forEach(el=>{if(!el.querySelector('svg'))ring(el)});dock(root)};
let readyP=null;
const init=(root=document)=>{if(!(root instanceof Node))root=document;
 hydrate(root);                                    /* markup appears immediately, identity retained */
 initTail(root);                                   /* count-up, rings, dock — none of them need sprites */
 mirrorAll(root);partsAll(root);                   /* data-state + data-part vocabulary */
 readyP=inlineSprites().then(ok=>{fillIcons(root);fillIcons(document);return ok});
 return readyP};

window.V=window.V||{};window.V.icon=I;window.V.fillIcons=fillIcons;
Object.defineProperty(window.V,'ready',{get:()=>readyP||inlineSprites().then(ok=>{fillIcons(document);return ok})});
window.V.retrySprites=()=>{spritePromise=null;return inlineSprites().then(ok=>{fillIcons(document);return ok})};
/* ---- reproducibility: one seed and one clock for every animation in the system (see MOTION.md §Reproducibility) ---- */
window.V.seed=n=>{document.documentElement.dataset.seed=String(n);if(window.VMorph&&VMorph.seed)VMorph.seed(+n)};
window.V.now=null;
window.V.clock=t=>{V.now=t;if(window.VMorph&&VMorph.clock)VMorph.clock(t);if(window.VFlow&&VFlow.clock)VFlow.clock(t);
 if(document.getAnimations){document.getAnimations().forEach(a=>{if(t==null){if(a.__vz!=null){delete a.__vz;try{a.play()}catch(e){}}return}if(a.__vz==null){a.__vz=t;try{a.pause()}catch(e){}}try{a.currentTime=Math.max(0,t-a.__vz)}catch(e){}})}
 dispatchEvent(new CustomEvent('v-clock',{detail:t}))};
/* a duration token in ms: V.timing('--t-tooltip',250) */
window.V.timing=(name,fallback)=>{try{const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();if(!v)return fallback;const n=parseFloat(v);if(!isFinite(n))return fallback;return /ms$/.test(v)?n:n*1000}catch(e){return fallback}};
/* ---- data-state: the Radix vocabulary mirrored from the aria / DOM truth (aria stays the source) ---- */
const ST_SEL='[aria-expanded],[aria-pressed],[aria-selected],[aria-current],[aria-checked],details,input[type=checkbox],input[type=radio],[data-dialog],[data-sheet],[data-drawer],.v-menu,.v-popover';
const stateOf=el=>{if(el.hasAttribute('aria-expanded'))return el.getAttribute('aria-expanded')==='true'?'open':'closed';
 if(el.matches('details'))return el.open?'open':'closed';
 if(el.matches('[data-dialog],[data-sheet],[data-drawer],.v-menu,.v-popover'))return el.hidden?'closed':'open';
 if(el.matches('input[type=checkbox],input[type=radio]'))return el.indeterminate?'indeterminate':el.checked?'checked':'unchecked';
 if(el.hasAttribute('aria-checked')){const v=el.getAttribute('aria-checked');return v==='true'?'checked':v==='mixed'?'indeterminate':'unchecked'}
 if(el.hasAttribute('aria-pressed'))return el.getAttribute('aria-pressed')==='true'?'on':'off';
 if(el.hasAttribute('aria-selected'))return el.getAttribute('aria-selected')==='true'?'active':'inactive';
 if(el.hasAttribute('aria-current')){const v=el.getAttribute('aria-current');return v&&v!=='false'?'active':'inactive'}
 return null};
const mirror=el=>{const s=stateOf(el);if(s&&el.dataset.state!==s)el.dataset.state=s};
const mirrorAll=root=>{const r=root&&root.querySelectorAll?root:document;r.querySelectorAll(ST_SEL).forEach(mirror);if(r.matches&&r.matches(ST_SEL))mirror(r)};
/* ---- data-part: the compound-component vocabulary, applied from the class map in window.VPARTS (catalog/spec.js) ---- */
const partsAll=root=>{const map=window.VPARTS;if(!map)return;const r=root&&root.querySelectorAll?root:document;for(const sel in map){let els;try{els=r.querySelectorAll(sel)}catch(e){continue}els.forEach(e=>{if(!e.dataset.part)e.dataset.part=map[sel]})}};
let mirT=0;const mirQ=()=>{if(mirT)return;mirT=setTimeout(()=>{mirT=0;mirrorAll(document);partsAll(document)},0)};
new MutationObserver(ms=>{let hit=false;for(const m of ms){if(m.type==='attributes')mirror(m.target);else hit=true}if(hit)mirQ()}).observe(document.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:['aria-expanded','aria-pressed','aria-selected','aria-current','aria-checked','hidden','open']});
document.addEventListener('change',e=>{if(e.target&&e.target.matches&&e.target.matches('input'))mirror(e.target)},true);
document.addEventListener('toggle',e=>{if(e.target&&e.target.matches&&e.target.matches('details'))mirror(e.target)},true);
window.V.mirrorState=mirrorAll;window.V.parts=partsAll;
window.V=window.V||{};window.V.init=init;window.V.destroy=root=>{(root&&root.querySelectorAll?root:document).querySelectorAll('[data-dock-bound]').forEach(b=>delete b.dataset.dockBound)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>init()):init();
})();
