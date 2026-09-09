/* Vriksha · ui.js — behaviour for base components. No framework. Progressive: markup works without it; this adds keyboard, focus and ARIA.
   Hooks: [data-tabs] · [data-dialog-open="#id"] / .v-dialog[data-dialog] · [data-sheet-open] · [data-menu] · [data-combo] · [data-command]
          [data-select] · [data-tooltip] · [data-hovercard="#id"] · [data-otp] · [data-toast] · [data-carousel] · [data-resizable] · [data-scroller]
          [data-slider-out] · [data-pager] · [data-cal] · [data-datepicker] · [data-toggle] · [data-togglegroup] · [data-context="#id"] */
(()=>{
const TM=(n,f)=>window.V&&V.timing?V.timing(n,f):f;/* durations from tokens.css, in ms */
/* Clear names, no sigils: query() returns one node, queryAll() returns an array. The old $ / $$ pair was
   corrupted three times by regex replacement strings (where "$$" means a literal "$"), silently turning list
   iteration into a single-node call and crashing VUI.init. The regression harness now guards this. */
/* Repeated init must not stack handlers: every binding is claimed once per element and key. The harness
   proved this — four VUI.init(document) calls made one click fire five toasts. */
const BOUND=new WeakMap();
function once(el,key){let s=BOUND.get(el);if(!s){s=new Set();BOUND.set(el,s)}if(s.has(key))return false;s.add(key);return true}
const query=(s,r=document)=>r.querySelector(s),queryAll=(s,r=document)=>[...r.querySelectorAll(s)];
const FOCUS='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/* One ownership layer for every behaviour: each instance is registered once and owns an AbortController, so
   init() is idempotent (a second call is a no-op) and destroy(root) releases element AND document listeners,
   observers and timers instead of leaking a closure per mount. */
let UID=0;const uid=p=>p+'-'+(++UID);
const REG=new WeakMap();
const claim=(el,kind)=>{let s=REG.get(el);if(!s){s={};REG.set(el,s)}if(s[kind])return null;const ac=new AbortController();s[kind]={ac,extra:[]};return s[kind]};
const owned=(el,kind)=>{const s=REG.get(el);return s&&s[kind]?s[kind]:null};
const release=el=>{const s=REG.get(el);if(!s)return;for(const k in s){try{s[k].ac.abort()}catch(e){}(s[k].extra||[]).forEach(d=>{try{d()}catch(e){}})}REG.delete(el)};
const isFocusable=el=>{if(el.disabled||el.getAttribute('aria-hidden')==='true')return false;if(el.closest('[hidden],[inert]'))return false;const r=el.getBoundingClientRect();return r.width>0||r.height>0||el===document.activeElement};
const focusables=root=>[...root.querySelectorAll(FOCUS)].filter(isFocusable);
const esc=s=>String(s==null?'':s);
const on=(el,ev,fn,o)=>el.addEventListener(ev,fn,o);
/* ---- Tabs: roving arrow keys, aria-selected, panels via aria-controls ---- */
function tabs(root){if(!once(root,'tabs'))return;const tabsEl=queryAll('[role="tab"]',root);const sel=t=>{tabsEl.forEach(x=>{const on_=x===t;x.setAttribute('aria-selected',on_);x.tabIndex=on_?0:-1;const p=x.getAttribute('aria-controls')&&document.getElementById(x.getAttribute('aria-controls'));if(p)p.hidden=!on_});t.focus({preventScroll:true})};
tabsEl.forEach((t,i)=>{t.tabIndex=t.getAttribute('aria-selected')==='true'?0:-1;on(t,'click',()=>sel(t));on(t,'keydown',e=>{const k=e.key;let j=i;if(k==='ArrowRight'||k==='ArrowDown')j=(i+1)%tabsEl.length;else if(k==='ArrowLeft'||k==='ArrowUp')j=(i-1+tabsEl.length)%tabsEl.length;else if(k==='Home')j=0;else if(k==='End')j=tabsEl.length-1;else return;e.preventDefault();sel(tabsEl[j])})})}
/* ---- Modal layer: dialog / sheet / drawer. Focus trap + return + Escape + scrim click ---- */
const stack=[];
function openLayer(layer,opener){
 if(!(layer instanceof Element)){console.error('VUI.openLayer: layer must be an Element, got',layer);return}  /* a list here means a query/queryAll mix-up upstream */
 if(stack.some(s=>s.layer===layer))return;                       /* a second open must not stack another scrim */
 /* A fixed layer must be positioned by the VIEWPORT. Any ancestor with layout containment (content-visibility,
    contain:layout, a transform) becomes its containing block instead, which pinned the catalog's dialogs inside
    their own entry — off-screen, clipped, and under the scrim. The layer is portalled to <body> for the time it
    is open and put back exactly where it came from on close. */
 let mark=null;
 const trapped=(()=>{for(let a=layer.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(/layout|paint|strict|content/.test(cs.contain)||(cs.contentVisibility&&cs.contentVisibility!=='visible')||cs.transform!=='none'||cs.filter!=='none'||cs.perspective!=='none')return true}return false})();
 if(trapped&&layer.parentNode&&layer.parentNode!==document.body){mark=document.createComment('v-layer');layer.parentNode.insertBefore(mark,layer);document.body.appendChild(layer)}
 const scrim=document.createElement('div');scrim.className='v-scrim';
 scrim.style.zIndex=String((parseInt(getComputedStyle(layer).zIndex,10)||40)-1);
 document.body.appendChild(scrim);
 layer.hidden=false;layer.setAttribute('aria-modal','true');
 if(!layer.getAttribute('role'))layer.setAttribute('role','dialog');
 const inert=[...document.body.children].filter(el=>el!==layer&&el!==scrim&&!el.contains(layer));
 inert.forEach(el=>{el.setAttribute('data-ui-inert','');el.setAttribute('inert','');el.setAttribute('aria-hidden','true')});
 const focusFirst=()=>{const f=focusables(layer);
  if(f.length)f[0].focus({preventScroll:true});
  else{if(!layer.hasAttribute('tabindex'))layer.setAttribute('data-ui-tabindex',''),layer.setAttribute('tabindex','-1');layer.focus({preventScroll:true})}};
 focusFirst();
 /* Verify the landing: a focus() issued while the engine is decorating this subtree can be a no-op, and no
    focusout fires from inside because focus never got there — so the focusout heal alone cannot see it.
    Re-assert over the next two frames, and once more after a beat, while this layer is still topmost. */
 {let tries=0;const confirm=()=>{
   if(layer.hidden||!stack.some(s=>s.layer===layer))return;
   if(!layer.contains(document.activeElement)){focusFirst();
    if(++tries<3)requestAnimationFrame(confirm)}
   else if(++tries<2)requestAnimationFrame(confirm)};
  requestAnimationFrame(confirm);setTimeout(()=>{if(!layer.hidden&&stack.some(s=>s.layer===layer)&&!layer.contains(document.activeElement))focusFirst()},TM('--t-focus-settle',120))}
 /* self-healing trap: a focusout whose relatedTarget is null or outside the layer means focus was lost, not
    moved — commonly because the focused node was detached, hidden or disabled underneath us. Take it back. */
 const heal=e=>{
  if(!stack.length||stack[stack.length-1].layer!==layer||layer.hidden)return;
  const to=e.relatedTarget;
  if(to&&layer.contains(to))return;
  requestAnimationFrame(()=>{
   if(!stack.length||stack[stack.length-1].layer!==layer||layer.hidden)return;
   const a=document.activeElement;
   if(a&&a!==document.body&&layer.contains(a))return;
   const f2=focusables(layer);
   if(f2.length)f2[0].focus({preventScroll:true});
   else layer.focus({preventScroll:true})})};
 layer.addEventListener('focusout',heal);
 stack.push({layer,opener,scrim,inert,heal,mark});
 on(scrim,'click',()=>closeLayer(layer));
 layer.dispatchEvent(new CustomEvent('v-open'))}
function closeLayer(layer){
 const i=stack.findIndex(s=>s.layer===layer);if(i<0)return;
 const {opener,scrim,inert,heal,mark}=stack.splice(i,1)[0];
 if(heal)layer.removeEventListener('focusout',heal);
 layer.hidden=true;scrim.remove();
 if(mark&&mark.parentNode){mark.parentNode.insertBefore(layer,mark);mark.remove()}else if(mark&&!mark.isConnected&&layer.parentNode===document.body)layer.remove();/* the home it came from was unmounted while it was open: do not leak an orphan into <body> */
 layer.removeAttribute('aria-modal');
 if(layer.hasAttribute('data-ui-tabindex')){layer.removeAttribute('tabindex');layer.removeAttribute('data-ui-tabindex')}
 (inert||[]).forEach(el=>{el.removeAttribute('data-ui-inert');el.removeAttribute('inert');el.removeAttribute('aria-hidden')});
 const back=opener&&opener.isConnected&&isFocusable(opener)?opener:document.body;
 if(back!==document.body){
  back.focus({preventScroll:true});
  /* verify the return, same reason as the landing in openLayer: a focus() issued while the engine is
     decorating the opener can be a no-op, and the class churn can blur it with no successor. Re-assert over
     the next frames, and stop if anything else has deliberately taken focus since. */
  let tries=0;const confirmBack=()=>{
   if(!back.isConnected||stack.some(s=>s.opener===back))return;
   const a=document.activeElement;
   if(a===back)return;
   /* Stand down only for a genuinely competing focus: a node inside another OPEN layer, or one the person
      moved to deliberately. "Anything that isn't body" was too broad — mid-decoration activeElement is
      routinely some other node, so the restore never re-asserted. */
   if(a&&a!==back&&stack.some(s=>s.layer.contains(a)))return;
   if(a&&a!==back&&a.dataset&&a.dataset.uiUserFocus)return;
   back.focus({preventScroll:true});
   if(++tries<3)requestAnimationFrame(confirmBack)};
  requestAnimationFrame(confirmBack);
  setTimeout(()=>{if(back.isConnected&&document.activeElement===document.body)back.focus({preventScroll:true})},TM('--t-focus-settle',120))}
 layer.dispatchEvent(new CustomEvent('v-close'))}
on(document,'keydown',e=>{if(!stack.length)return;const {layer}=stack[stack.length-1];if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeLayer(layer)}if(e.key==='Tab'){const f=focusables(layer);if(!f.length){e.preventDefault();return}const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
/* ---- Menus (dropdown, context, menubar): roving focus, typeahead, outside click ---- */
let openMenu=null;function showMenu(menu,anchor,at){closeMenu();menu.hidden=false;menu.setAttribute('role',menu.getAttribute('role')||'menu');const items=queryAll('.v-menu__item',menu);items.forEach(i=>{i.setAttribute('role','menuitem');i.tabIndex=-1});if(at){menu.style.position='fixed';menu.style.left=at.x+'px';menu.style.top=at.y+'px';menu.style.zIndex='var(--z-dialog)'}openMenu={menu,anchor,items};anchor&&anchor.setAttribute('aria-expanded','true');(items[0]||menu).focus();
const key=e=>{const live=items.filter(x=>!x.disabled&&x.getAttribute('aria-disabled')!=='true');if(!live.length){if(e.key==='Escape'){closeMenu();anchor&&anchor.focus()}return}
 if(e.key==='Tab'){closeMenu();anchor&&anchor.focus();return}
 const items2=live;const i=items2.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();items2[(i+1+items2.length)%items2.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();items2[(i-1+items2.length)%items2.length].focus()}else if(e.key==='Home'){items2[0].focus()}else if(e.key==='End'){items2[items2.length-1].focus()}else if(e.key==='Escape'){closeMenu();anchor&&anchor.focus()}else if(e.key.length===1){const m=items.find(x=>x.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));m&&m.focus()}};menu._key=key;on(menu,'keydown',key)}
function closeMenu(){if(!openMenu)return;const {menu,anchor}=openMenu;menu.hidden=true;menu.removeEventListener('keydown',menu._key);anchor&&anchor.setAttribute('aria-expanded','false');openMenu=null}
on(document,'pointerdown',e=>{if(openMenu&&!openMenu.menu.contains(e.target)&&e.target!==openMenu.anchor&&!openMenu.anchor?.contains(e.target))closeMenu()});
on(document,'click',e=>{const t=e.target.closest('[data-menu]');if(t){const m=query(t.dataset.menu);if(!m)return;openMenu&&openMenu.menu===m?closeMenu():showMenu(m,t);return}if(openMenu&&e.target.closest('.v-menu__item'))closeMenu()});
on(document,'contextmenu',e=>{const t=e.target.closest('[data-context]');if(!t)return;e.preventDefault();const m=query(t.dataset.context);/* one menu, not a list: queryAll here handed showMenu an array and the menu never opened */if(m)showMenu(m,t,{x:e.clientX,y:e.clientY})});
/* keyboard and touch have no right-click: Shift+F10 / the ContextMenu key on the host, or a long-press, open the same menu at the host */
on(document,'keydown',e=>{const t=e.target.closest&&e.target.closest('[data-context]');if(!t)return;if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const m=query(t.dataset.context);const r=t.getBoundingClientRect();if(m)showMenu(m,t,{x:r.left+24,y:r.top+24})}});
queryAll('.v-menubar').forEach(bar=>{queryAll('.v-menubar__trigger',bar).forEach(tr=>on(tr,'pointerenter',()=>{if(openMenu&&openMenu.anchor!==tr&&openMenu.anchor?.closest('.v-menubar')===bar)showMenu(query(tr.dataset.menu),tr)}))});
/* ---- Combobox: filter + highlight + keyboard ---- */
function combo(root){const input=query('input',root),list=query('.v-menu',root),items=queryAll('.v-menu__item',list);input.setAttribute('role','combobox');input.setAttribute('aria-expanded','false');list.setAttribute('role','listbox');let idx=-1;
const setOpen=o=>{list.hidden=!o;input.setAttribute('aria-expanded',String(!!o));if(!o)input.removeAttribute('aria-activedescendant')};
 /* Instance-scoped ids so several combos on one page cannot collide, and a real control relationship. */
 if(!root.id)root.id=uid('v-combo');
 if(!list.id)list.id=root.id+'-list';
 list.setAttribute('role','listbox');
 input.setAttribute('role','combobox');input.setAttribute('aria-controls',list.id);
 input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-haspopup','listbox');
 items.forEach((it,n)=>{if(!it.id)it.id=root.id+'-opt-'+n;it.setAttribute('role','option')});
 const render=()=>{const q=input.value.trim().toLowerCase();let vis=0;
  items.forEach(it=>{const txt=it.dataset.label||it.textContent.trim();it.dataset.label=txt;
   const hit=!q||txt.toLowerCase().includes(q);it.hidden=!hit;if(!hit)return;vis++;
   /* highlighting builds text nodes — interpolating the label into HTML rendered any angle bracket as markup */
   it.textContent='';const lab=document.createElement('span');lab.className='v-combo__label';it.append(lab);if(!q){lab.textContent=txt;return}
   const i=txt.toLowerCase().indexOf(q);const mk=document.createElement('mark');mk.textContent=txt.slice(i,i+q.length);
   lab.append(document.createTextNode(txt.slice(0,i)),mk,document.createTextNode(txt.slice(i+q.length)))});
  /* an unmatched query must explain itself rather than making the list vanish — the same pattern command()
     uses. The list stays open with a non-selectable row, so aria-expanded stays truthful. */
  let none=query('.v-combo__empty',list);
  if(!vis){if(!none){none=document.createElement('div');none.className='v-combo__empty v-cmd__empty';
    none.setAttribute('role','presentation');list.append(none)}
   none.textContent='Nothing matches “'+input.value.trim()+'”.';none.hidden=false;setOpen(true)}
  else{if(none)none.hidden=true;setOpen(true)}
  if(!vis&&!input.value.trim())setOpen(false);
  idx=-1;hl()};
const hl=()=>{const vis=items.filter(i=>!i.hidden);items.forEach(i=>i.removeAttribute('aria-selected'));
  if(idx>=0&&vis[idx]){vis[idx].setAttribute('aria-selected','true');input.setAttribute('aria-activedescendant',vis[idx].id)}
  else input.removeAttribute('aria-activedescendant')};
const pick=it=>{input.value=it.dataset.label||it.textContent.trim();list.hidden=true;input.setAttribute('aria-expanded','false');root.dispatchEvent(new CustomEvent('v-pick',{detail:input.value}))};
on(input,'input',render);on(input,'focus',render);on(input,'keydown',e=>{const vis=items.filter(i=>!i.hidden);if(e.key==='ArrowDown'){e.preventDefault();list.hidden=false;idx=Math.min(vis.length-1,idx+1);hl()}else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1);hl()}else if(e.key==='Enter'&&idx>=0){e.preventDefault();pick(vis[idx])}else if(e.key==='Escape'){setOpen(false)}else if(e.key==='Tab'){setOpen(false)}});
items.forEach(it=>on(it,'click',()=>pick(it)));on(document,'pointerdown',e=>{if(!root.contains(e.target))setOpen(false)});setOpen(false)}
/* ---- Command palette: same filter over groups ---- */
function command(root){const input=query('input',root),items=queryAll('.v-menu__item',root),groups=queryAll('.v-menu__group',root),empty=query('.v-cmd__empty',root);let idx=0;
const render=()=>{const q=input.value.trim().toLowerCase();let vis=0;items.forEach(it=>{const hit=!q||it.textContent.toLowerCase().includes(q);it.hidden=!hit;if(hit)vis++});groups.forEach(g=>{let n=g.nextElementSibling,any=false;while(n&&!n.classList.contains('v-menu__group')){if(!n.hidden&&n.classList.contains('v-menu__item'))any=true;n=n.nextElementSibling}g.hidden=!any});if(empty)empty.hidden=vis>0;idx=0;hl()};
const hl=()=>{const vis=items.filter(i=>!i.hidden);items.forEach(i=>i.removeAttribute('aria-selected'));vis[idx]&&vis[idx].setAttribute('aria-selected','true')};
on(input,'input',render);on(input,'keydown',e=>{const vis=items.filter(i=>!i.hidden);if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(vis.length-1,idx+1);hl()}else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1);hl()}else if(e.key==='Enter'&&vis[idx]){vis[idx].click()}});render()}
/* ---- Custom select (listbox) ---- */
function select(root){const btn=query('button',root),list=query('.v-listbox',root),opts=queryAll('.v-menu__item',list),label=query('[data-value]',btn)||btn;
 if(!root.id)root.id=uid('v-select');if(!list.id)list.id=root.id+'-list';
 list.setAttribute('role','listbox');btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-controls',list.id);
 opts.forEach((o,n)=>{if(!o.id)o.id=root.id+'-opt-'+n});
const openL=()=>{list.hidden=false;btn.setAttribute('aria-expanded','true');(opts.find(o=>o.getAttribute('aria-selected')==='true')||opts[0]).focus()};const closeL=()=>{list.hidden=true;btn.setAttribute('aria-expanded','false')};
opts.forEach(o=>{o.setAttribute('role','option');o.tabIndex=-1;on(o,'click',()=>{opts.forEach(x=>x.removeAttribute('aria-selected'));o.setAttribute('aria-selected','true');label.textContent=[...o.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||o.textContent.trim();{const d=o.querySelector('.v-disk'),ld=btn.querySelector('.v-disk');if(d&&ld){ld.className=d.className.replace(/v-morph-\S+/g,'').trim();ld.innerHTML=d.innerHTML.replace(/<svg class="v-morph[\s\S]*?<\/svg>/,'')}}closeL();btn.focus();root.dispatchEvent(new CustomEvent('v-change',{detail:o.dataset.value||o.textContent.trim()}))})});
on(btn,'click',()=>list.hidden?openL():closeL());on(list,'keydown',e=>{const i=opts.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();opts[Math.min(opts.length-1,i+1)].focus()}else if(e.key==='ArrowUp'){e.preventDefault();opts[Math.max(0,i-1)].focus()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();document.activeElement.click()}else if(e.key==='Escape'){closeL();btn.focus()}});on(document,'pointerdown',e=>{if(!root.contains(e.target))closeL()});list.hidden=true}
/* ---- Tooltip / hover card ---- */
let tip;function ensureTip(){if(tip)return;
 tip=document.createElement('div');tip.className='v-tip';tip.id='v-tip';tip.setAttribute('role','tooltip');tip.setAttribute('aria-live','polite');
 document.body.appendChild(tip);on(document,'keydown',e=>{if(e.key==='Escape')tipHide()})}
let tipT;
/* show/hide live beside wireTips, not inside ensureTip: trapping them there is what produced
   "ReferenceError: hide is not defined" and aborted VUI.init mid-run. */
const tipShow=el=>{ensureTip();clearTimeout(tipT);tipT=setTimeout(()=>{tip.textContent=el.dataset.tooltip||'';tip.classList.add('-show');
 const r=el.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))+'px';
 tip.style.top=(r.top-tip.offsetHeight-8<8?r.bottom+8:r.top-tip.offsetHeight-8)+'px'},TM('--t-tooltip',220))};
const tipHide=()=>{clearTimeout(tipT);if(tip){tip.classList.remove('-show')}};
function wireTips(root){ensureTip();queryAll('[data-tooltip]',root).forEach(el=>{el.setAttribute('aria-describedby','v-tip');if(!el.getAttribute('aria-label')&&!el.textContent.trim())el.setAttribute('aria-label',el.dataset.tooltip);if(!once(el,'tip'))return;if(!el.getAttribute('aria-label')&&!el.textContent.trim())el.setAttribute('aria-label',el.dataset.tooltip);on(el,'pointerenter',()=>tipShow(el));on(el,'pointerleave',tipHide);on(el,'focus',()=>tipShow(el));on(el,'blur',tipHide)});}

function hovercard(el){const card=query(el.dataset.hovercard);if(!card)return;let t;const show=()=>{clearTimeout(t);t=setTimeout(()=>{card.classList.add('-show');const r=el.getBoundingClientRect();card.style.left=Math.min(innerWidth-card.offsetWidth-8,r.left)+'px';card.style.top=(r.bottom+8)+'px'},TM('--t-hovercard',300))};const hide=()=>{clearTimeout(t);t=setTimeout(()=>card.classList.remove('-show'),150)};[el,card].forEach(x=>{on(x,'pointerenter',show);on(x,'pointerleave',hide)});on(el,'focus',show);on(el,'blur',hide)}
/* ---- OTP ---- */
function otp(root){const cells=queryAll('input',root);cells.forEach((c,i)=>{c.inputMode='numeric';c.maxLength=1;c.setAttribute('aria-label',`Digit ${i+1} of ${cells.length}`);on(c,'input',()=>{c.value=c.value.replace(/\D/g,'').slice(-1);if(c.value&&cells[i+1])cells[i+1].focus();if(cells.every(x=>x.value))root.dispatchEvent(new CustomEvent('v-complete',{detail:cells.map(x=>x.value).join('')}))});on(c,'keydown',e=>{if(e.key==='Backspace'&&!c.value&&cells[i-1]){cells[i-1].focus();cells[i-1].value=''}if(e.key==='ArrowLeft'&&cells[i-1])cells[i-1].focus();if(e.key==='ArrowRight'&&cells[i+1])cells[i+1].focus()});on(c,'paste',e=>{const d=(e.clipboardData.getData('text')||'').replace(/\D/g,'');if(!d)return;e.preventDefault();cells.forEach((x,j)=>x.value=d[j]||'');(cells[Math.min(d.length,cells.length-1)]).focus();
   if(cells.every(x=>x.value))root.dispatchEvent(new CustomEvent('v-complete',{detail:cells.map(x=>x.value).join('')}))})})}
/* ---- Toast queue (durable variants stay until dismissed) ---- */
let toaster;function toast({text,kind='',action,durable=false,ttl=TM('--t-toast',5000)}){if(!toaster){toaster=document.createElement('div');toaster.className='v-toaster';toaster.setAttribute('role','status');toaster.setAttribute('aria-live','polite');document.body.appendChild(toaster)}const t=document.createElement('div');t.className='v-toast '+kind;const span=document.createElement('span');span.style.flex='1';span.textContent=esc(text);t.appendChild(span);/* text is text: innerHTML here allowed markup from any caller */if(action){const b=document.createElement('button');b.className='v-btn';b.textContent=action.label;on(b,'click',()=>{action.onClick?.();dismiss()});t.appendChild(b)}const x=document.createElement('button');x.className='v-btn';x.setAttribute('aria-label','Dismiss');x.textContent='×';x.style.minWidth='30px';x.style.padding='0';on(x,'click',()=>dismiss());t.appendChild(x);toaster.appendChild(t);let h;const dismiss=()=>{clearTimeout(h);t.classList.add('-out');setTimeout(()=>t.remove(),220)};if(!durable)h=setTimeout(dismiss,ttl);return dismiss}
/* ---- Carousel ---- */
function carousel(root){const track=query('.v-carousel__track',root),[prev,next]=queryAll('.v-carousel__nav button',root);const step=()=>track.firstElementChild?track.firstElementChild.offsetWidth+16:240;prev&&on(prev,'click',()=>track.scrollBy({left:-step(),behavior:'smooth'}));next&&on(next,'click',()=>track.scrollBy({left:step(),behavior:'smooth'}));/* dots: one per tile, the nearest-to-left tile is current; clicking a dot scrolls there */
 let dots=query('.v-carousel__dots',root);if(!dots){dots=document.createElement('div');dots.className='v-carousel__dots';dots.setAttribute('role','group');dots.setAttribute('aria-label','Tiles');const nav=query('.v-carousel__nav',root);if(nav)nav.prepend(dots);else root.appendChild(dots)}
 const upd=()=>{if(prev)prev.disabled=track.scrollLeft<4;if(next)next.disabled=track.scrollLeft+track.clientWidth>track.scrollWidth-4;const kids=[...track.children];const cur=kids.reduce((b,k,i)=>Math.abs(k.offsetLeft-track.offsetLeft-track.scrollLeft)<Math.abs(kids[b].offsetLeft-track.offsetLeft-track.scrollLeft)?i:b,0);if(dots.children.length!==kids.length){dots.innerHTML=kids.map((_,i)=>`<button type="button" aria-label="Tile ${i+1}"></button>`).join('');[...dots.children].forEach((d,i)=>on(d,'click',()=>track.scrollTo({left:kids[i].offsetLeft-track.offsetLeft,behavior:'smooth'})))}[...dots.children].forEach((d,i)=>{if(i===cur)d.setAttribute('aria-current','true');else d.removeAttribute('aria-current')})};on(track,'scroll',upd,{passive:true});
 const ro=new ResizeObserver(upd);ro.observe(track);
 const mo=new MutationObserver(upd);mo.observe(track,{childList:true});
 const o=owned(root,'carousel');if(o)o.extra.push(()=>{ro.disconnect();mo.disconnect()});
 upd()}
/* ---- Resizable ---- */
function resizable(root){const h=query('.v-resizable__handle',root);const v=root.classList.contains('-v');h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation',v?'horizontal':'vertical');const set=p=>{p=Math.max(15,Math.min(85,p));root.style.setProperty('--split',p+'%');h.setAttribute('aria-valuenow',Math.round(p))};set(parseFloat(root.style.getPropertyValue('--split'))||50);
on(h,'pointerdown',e=>{h.setPointerCapture(e.pointerId);const r=root.getBoundingClientRect();const mv=ev=>set(v?(ev.clientY-r.top)/r.height*100:(ev.clientX-r.left)/r.width*100);on(h,'pointermove',mv);const off=()=>{h.removeEventListener('pointermove',mv)};
  on(h,'pointerup',off,{once:true});on(h,'pointercancel',off,{once:true});on(h,'lostpointercapture',off,{once:true})});
h.setAttribute('aria-valuemin','15');h.setAttribute('aria-valuemax','85');
 on(h,'keydown',e=>{const cur=parseFloat(root.style.getPropertyValue('--split'))||50;
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();set(cur-5)}
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();set(cur+5)}
  if(e.key==='Home'){e.preventDefault();set(15)}if(e.key==='End'){e.preventDefault();set(85)}})}
/* ---- Message scroller: follow only while at bottom ---- */
function scroller(root){let atBottom=true;const jump=query('.v-scroller__jump',root);const chk=()=>{atBottom=root.scrollHeight-root.scrollTop-root.clientHeight<24;root.classList.toggle('-detached',!atBottom)};on(root,'scroll',chk,{passive:true});const smo=new MutationObserver(()=>{if(atBottom)root.scrollTop=root.scrollHeight});smo.observe(root,{childList:true,subtree:true});{const o=owned(root,'scroller');if(o)o.extra.push(()=>smo.disconnect())}jump&&on(jump,'click',()=>{root.scrollTop=root.scrollHeight});root.scrollTop=root.scrollHeight}
/* ---- Slider output ---- */
function sliderOut(inp){const out=query(inp.dataset.sliderOut);const upd=()=>{out&&(out.textContent=inp.value+(inp.dataset.unit||''));inp.style.setProperty('--p',((inp.value-inp.min)/(inp.max-inp.min)*100)+'%')};on(inp,'input',upd);upd()}
/* ---- Pagination ---- */
function pager(root){const fin=(v,d)=>{const x=parseFloat(v);return isFinite(x)?x:d};const total=Math.max(1,fin(root.dataset.pages,1));let cur=Math.min(total,Math.max(1,fin(root.dataset.page,1)));const render=()=>{const btns=[];const add=(n,lab=n)=>btns.push(`<button ${n===cur?'aria-current="page"':''} data-p="${n}">${lab}</button>`);btns.push(`<button data-p="${cur-1}" ${cur===1?'disabled':''} aria-label="Previous">‹</button>`);const win=[1,cur-1,cur,cur+1,total].filter((n,i,a)=>n>=1&&n<=total&&a.indexOf(n)===i).sort((a,b)=>a-b);let last=0;for(const n of win){if(n-last>1)btns.push('<span class="v-ellipsis">…</span>');add(n);last=n}btns.push(`<button data-p="${cur+1}" ${cur===total?'disabled':''} aria-label="Next">›</button>`);root.innerHTML=btns.join('')+`<span class="v-pager__info">Page ${cur} of ${total}</span>`;queryAll('button[data-p]',root).forEach(b=>on(b,'click',()=>{cur=+b.dataset.p;render();root.dispatchEvent(new CustomEvent('v-page',{detail:cur}))}))};render()}
/* ---- Calendar (date selection) + date picker ---- */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'],WD=['MO','TU','WE','TH','FR','SA','SU'];
function calendar(root){/* ISO date-only strings via new Date() are parsed as UTC and shift a day west of UTC; parse the parts. */
const parseISO=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?new Date(+m[1],+m[2]-1,+m[3]):(s?new Date(s):null)};
let d=root.dataset.date?parseISO(root.dataset.date):new Date();let sel=root.dataset.selected?parseISO(root.dataset.selected):null;let y=d.getFullYear(),m=d.getMonth();
const wk=dt=>{const t=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));const dn=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-dn);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7)};
const render=()=>{const first=new Date(y,m,1),off=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
 /* Exactly one tab stop per rendered month, always reachable: the selected day if it falls in this month,
    else today if it does, else the first of the month. Without this, navigating away from the selection
    left every cell at -1 and the grid became unreachable by keyboard. */
 const today=new Date();
 const tabDay=(sel&&sel.getFullYear()===y&&sel.getMonth()===m)?sel.getDate()
  :(today.getFullYear()===y&&today.getMonth()===m)?today.getDate():1;
 /* marks: data-marks="YYYY-MM-DD:pink,YYYY-MM-DD:blue" → a hue dot under the day (an event, a run, a note) */
 const marks={};String(root.dataset.marks||'').split(',').forEach(p=>{const [k,h]=p.split(':');if(k)marks[k.trim()]=(h||'pink').trim()});
 const iso=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
 const wkCell=(dt)=>{const w=wk(dt);return `<span class="v-cal__wk ${sel&&wk(sel)===w&&sel.getMonth()===m?'-on':''}">${w}</span>`};
 let cells=wkCell(new Date(y,m,1));for(let i=0;i<off;i++)cells+='<span></span>';for(let dd=1;dd<=days;dd++){const dt=new Date(y,m,dd);const we=dt.getDay()===0||dt.getDay()===6;const isSel=sel&&dt.toDateString()===sel.toDateString();const isToday=dt.toDateString()===today.toDateString();const mk=marks[iso(dt)];cells+=`<button class="v-cal__d ${we?'-off':''} ${isToday?'-today':''}" role="gridcell" ${isSel?'aria-selected="true"':''} data-d="${dd}" tabindex="${tabDay===dd?0:-1}" aria-label="${dt.toDateString()}${isToday?' · today':''}${mk?' · marked':''}"><span>${dd}</span>${mk?`<i class="v-cal__mark -${mk}"></i>`:''}</button>`;if((off+dd)%7===0||dd===days){const pad=dd===days?(7-(off+dd)%7)%7:0;for(let i=0;i<pad;i++)cells+='<span></span>';if(dd!==days)cells+=wkCell(new Date(y,m,dd+1))}}
 const dir=root.__dir||0;root.__dir=0;
root.innerHTML=`<div class="v-cal__head"><span class="v-cal__month" aria-live="polite"><b>${MONTHS[m]}</b> <span>${y}</span></span><span class="v-cal__nav"><button class="v-ibtn -sm" aria-label="Previous month" data-nav="-1"><svg class="v-icon" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button><button class="v-ibtn -sm" aria-label="Next month" data-nav="1"><svg class="v-icon" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></span></div><div class="v-cal__grid ${dir>0?'-fwd':dir<0?'-back':''}" role="grid"><span class="v-cal__wd -wk" role="columnheader" aria-label="Week">WK</span>${WD.map(w=>`<span class="v-cal__wd" role="columnheader">${w}</span>`).join('')}${cells}</div>`;
queryAll('[data-nav]',root).forEach(b=>on(b,'click',()=>{const dir=+b.dataset.nav;root.__dir=dir;m+=dir;if(m<0){m=11;y--}if(m>11){m=0;y++}render();
  const nav=queryAll('[data-nav="'+dir+'"]',root);if(nav)nav.focus();/* the button that moved the month keeps focus */}));
queryAll('.v-cal__d',root).forEach(b=>{on(b,'click',()=>{sel=new Date(y,m,+b.dataset.d);
  /* a pick inside the shown month moves the selection in place so its disk can travel (js/flow.js); only a month change rebuilds the grid */
  const w=wk(sel);queryAll('.v-cal__d',root).forEach(x=>{const on=x===b;if(on)x.setAttribute('aria-selected','true');else x.removeAttribute('aria-selected');x.tabIndex=on?0:-1});
  queryAll('.v-cal__wk',root).forEach(k=>k.classList.toggle('-on',+k.textContent===w));
  root.dispatchEvent(new CustomEvent('v-date',{detail:sel}))});on(b,'keydown',e=>{const mv={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[e.key];if(mv==null)return;e.preventDefault();
  /* move by real calendar days so ±7 across a boundary lands on the correct date, not the first/last cell */
  const cur=new Date(y,m,+b.dataset.d);cur.setDate(cur.getDate()+mv);
  if(cur.getFullYear()!==y||cur.getMonth()!==m){y=cur.getFullYear();m=cur.getMonth();render()}
  const t=query('.v-cal__d[data-d="'+cur.getDate()+'"]',root);
  if(t){queryAll('.v-cal__d',root).forEach(x=>x.tabIndex=-1);t.tabIndex=0;t.focus()}  /* one roving stop */})});
  /* the selected day carries an explicit blob body; the engine only scans on init, so a re-render must re-offer it */
  if(window.VMorph&&VMorph.init)VMorph.init(root)};render();root.getSelected=()=>sel}
function datepicker(root){const btn=query('button',root),pop=query('.v-popover',root),cal=query('[data-cal]',pop);
 /* The trigger must advertise and synchronise the popup it owns. */
 if(!pop.id)pop.id=uid('v-datepicker')+'-pop';
 btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls',pop.id);
 const sync=o=>{pop.hidden=!o;btn.setAttribute('aria-expanded',String(!!o))};
 sync(false);
 on(btn,'click',()=>{const open=pop.hidden;sync(open);if(open)query('.v-cal__d[tabindex="0"]',cal)?.focus()});on(cal,'v-date',e=>{btn.querySelector('[data-value]').textContent=e.detail.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});sync(false);btn.focus()});on(document,'pointerdown',e=>{if(!root.contains(e.target))pop.hidden=true});on(root,'keydown',e=>{if(e.key==='Escape'){pop.hidden=true;btn.focus()}})}
/* ---- Toggle / toggle group ---- */
function toggle(b){/* labels must agree with state: a control reading "Off" while pressed is incoherent */
 const on=()=>b.getAttribute('aria-pressed')==='true';
 const sync=()=>{const t=(b.dataset.onLabel||'').trim(),f=(b.dataset.offLabel||'').trim();
  if(t&&f)b.textContent=on()?t:f;
  else if(/^(on|off)$/i.test(b.textContent.trim()))b.textContent=on()?'On':'Off'};
 b.addEventListener('click',()=>{b.setAttribute('aria-pressed',String(!on()));sync()});sync()}
function togglegroup(root){const multi=root.dataset.togglegroup==='multi';queryAll('[aria-pressed]',root).forEach(b=>once(b,'tg')&&on(b,'click',()=>{if(!multi)queryAll('[aria-pressed]',root).forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed',multi?String(b.getAttribute('aria-pressed')!=='true'):'true')}))}
/* ---- init ---- */
function destroy(root=document){const scope=root&&root.querySelectorAll?root:document;
 [scope,...scope.querySelectorAll('*')].forEach(el=>{if(el.nodeType===1)release(el)});
 stack.slice().forEach(s=>{if(scope===document||scope.contains(s.layer))closeLayer(s.layer)})}
function each(root,sel,kind,fn,ready){const scope=root&&root.querySelectorAll?root:document;
 const list=[...scope.querySelectorAll(sel)];if(scope.nodeType===1&&scope.matches&&scope.matches(sel))list.unshift(scope);
 list.forEach(el=>{
  /* Progressive enhancement means an incomplete host is simply NOT decorated — and not claimed either, so a
     consumer that renders the parts later still gets behaviour on the next init. Ten React exports lost
     their entire subtree because these initialisers dereferenced a part that was not there. */
  if(ready&&!ready(el))return;
  const slot=claim(el,kind);if(!slot)return;/* already initialised: idempotent */
  /* And one host must never take the caller down with it. VUI.init runs inside a wrapper's useEffect, and a
     throw there makes React unmount the whole tree — the same "one bad owner removes everything" failure as
     §3.82, but in a consumer's app. Failures are isolated and named on window.VUIBoot. */
  try{fn(el,slot.ac.signal)}
  catch(err){const b=window.VUIBoot=window.VUIBoot||{failed:[]};b.failed.push(kind+': '+((err&&err.message)||err));
   console.warn('VUI.init: '+kind+' could not initialise',el,err)}})}
/* One owner for switch state: the checkbox. The wrapper never handles clicks (that was the double-toggle);
   it only mirrors the input so anything reading aria-checked sees the truth. */
function switches(root){queryAll('.v-switch',root).forEach(w=>{const i=query('input[type=checkbox]',w);if(!i||w.dataset.vsw)return;w.dataset.vsw='1';
 const sync=()=>{w.setAttribute('aria-checked',String(i.checked));w.classList.toggle('-on',i.checked);
  w.dispatchEvent(new CustomEvent('v-switch',{bubbles:true,detail:{checked:i.checked,input:i}}))};
 i.addEventListener('change',sync);sync()})}
/* ---------- Sidebar: a working navigation system, not a picture of one ----------
   The rail shipped as pure markup: Collapse changed nothing and clicking a destination left the old one
   selected, because no runtime owned it. This is that owner, claimed through the registry so a consumer gets
   it on init and loses it on destroy — collapse state, selection, roving arrow keys, and the same travelling
   selection shape the tabs use (no second implementation). */
function sidebar(root){const nav=query('.v-nav',root);if(!nav)return;
 const items=queryAll('.v-nav__item',nav).filter(i=>!i.closest('.v-sidebar__foot'));
 const btn=query('.v-collapse',root);
 const setCollapsed=(on,announce)=>{
  root.classList.toggle('-mini',on);
  const shell=root.closest('.v-shell');if(shell)shell.classList.toggle('-mini',on);
  if(btn){btn.setAttribute('aria-expanded',String(!on));btn.setAttribute('aria-label',on?'Expand navigation':'Collapse navigation')}
  queryAll('.v-nav__item',root).forEach(i=>{const l=query('.v-nav__label',i);
   if(l){if(on&&!i.getAttribute('aria-label'))i.setAttribute('aria-label',l.textContent.trim());
    if(on)i.dataset.tooltip=l.textContent.trim();else delete i.dataset.tooltip}});
  if(window.VLive&&VLive.replace)requestAnimationFrame(()=>VLive.replace());
  if(announce)toast(on?'Navigation collapsed':'Navigation expanded','-cream');
 };
 setCollapsed(root.classList.contains('-mini')||!!(root.closest('.v-shell')&&root.closest('.v-shell').classList.contains('-mini')),false);
 const select=el=>{items.forEach(i=>{const on=i===el;
   if(on)i.setAttribute('aria-current','page');else i.removeAttribute('aria-current');
   i.tabIndex=on?0:-1});
  if(window.VLive&&VLive.replace)VLive.replace();
  const l=query('.v-nav__label',el);
  root.dispatchEvent(new CustomEvent('v-navigate',{bubbles:true,detail:{label:l?l.textContent.trim():el.textContent.trim(),el}}));
 };
 /* each() has already claimed this element under 'sidebar', so claim() here would return null and bail out
    before a single listener was attached — which is exactly what happened. Take the existing claim. */
 const o=owned(root,'sidebar');if(!o)return;const sig={signal:o.ac.signal};
 if(btn)btn.addEventListener('click',()=>setCollapsed(!root.classList.contains('-mini'),true),sig);
 items.forEach((it,n)=>{it.tabIndex=it.hasAttribute('aria-current')?0:-1;
  it.addEventListener('click',e=>{if(it.getAttribute('href')==='#')e.preventDefault();select(it)},sig);
  it.addEventListener('keydown',e=>{const k=e.key;let j=-1;
   if(k==='ArrowDown')j=(n+1)%items.length;else if(k==='ArrowUp')j=(n-1+items.length)%items.length;
   else if(k==='Home')j=0;else if(k==='End')j=items.length-1;else return;
   e.preventDefault();items[j].focus();select(items[j])},sig)});
 if(!items.some(i=>i.hasAttribute('aria-current'))&&items[0])select(items[0]);
 if(window.VLive&&VLive.glide)VLive.glide(nav);
}
/* Each hook states the parts it needs. Nothing else in the file has to be defensive, and a host that is not
   ready is left alone rather than half-decorated or thrown on. */
const READY={combo:el=>query('input',el)&&query('.v-menu',el),command:el=>!!query('input',el),
 select:el=>query('button',el)&&query('.v-listbox',el),
 carousel:el=>query('.v-carousel__track',el)&&queryAll('.v-carousel__nav button',el).length>=2,
 resizable:el=>!!query('.v-resizable__handle',el),
 datepicker:el=>{const p=query('.v-popover',el);return !!(query('button',el)&&p&&query('[data-cal]',p))},
 otp:el=>queryAll('input',el).length>0,hovercard:el=>!!query(el.dataset.hovercard||'#__none')};
function init(root=document){each(root,'.v-sidebar','sidebar',sidebar);switches(root);each(root,'[data-tabs]','tabs',tabs);each(root,'[data-combo]','combo',combo,READY.combo);each(root,'[data-command]','command',command,READY.command);each(root,'[data-select]','select',select,READY.select);each(root,'[data-hovercard]','hovercard',hovercard,READY.hovercard);each(root,'[data-otp]','otp',otp,READY.otp);each(root,'[data-carousel]','carousel',carousel,READY.carousel);each(root,'[data-resizable]','resizable',resizable,READY.resizable);each(root,'[data-scroller]','scroller',scroller);each(root,'[data-slider-out]','slider-out',sliderOut);each(root,'[data-pager]','pager',pager);each(root,'[data-cal]','cal',calendar);each(root,'[data-datepicker]','datepicker',datepicker,READY.datepicker);each(root,'[data-toggle]','toggle',toggle);each(root,'[data-togglegroup]','togglegroup',togglegroup);
queryAll('.v-dialog[data-dialog],.v-sheet[data-sheet],.v-drawer[data-drawer]',root).forEach(l=>{l.hidden=true});
queryAll('[data-dialog-open],[data-sheet-open],[data-drawer-open]',root).forEach(b=>once(b,'open')&&on(b,'click',()=>{const l=query(b.dataset.dialogOpen||b.dataset.sheetOpen||b.dataset.drawerOpen);l&&openLayer(l,b)}));
queryAll('[data-close]',root).forEach(b=>once(b,'close')&&on(b,'click',()=>{const l=b.closest('.v-dialog,.v-sheet,.v-drawer');l&&closeLayer(l)}));
queryAll('[data-toast]',root).forEach(b=>once(b,'toast')&&on(b,'click',()=>toast({text:b.dataset.toast,kind:b.dataset.kind||'',durable:b.hasAttribute('data-durable'),action:b.dataset.action?{label:b.dataset.action}:null})));
queryAll('.v-menu[id]',root).forEach(m=>{if(!m.closest('.v-combo,.v-cmd,[data-select]'))m.hidden=true});
wireTips(root)}
window.VUI={init,destroy,switches,openLayer,closeLayer,toast,showMenu,closeMenu,initPager:el=>{el.innerHTML='';pager(el)}};
document.readyState==='loading'?on(document,'DOMContentLoaded',()=>init()):init();
})();
