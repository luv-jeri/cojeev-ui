/* Vriksha catalog · demo-behaviour.js — makes the product-family demos actually do something.
   Everything here is a LOCAL SIMULATION: no host is contacted, no file is written, no model is called,
   no real Memory/Notes/Library is touched. Every visible result says so.
   Each block owns one dataset, and the rows, counts, paging and empty states all read that dataset,
   so a filter can never disagree with what is on screen. */
(()=>{
/* Clear names, no sigils: query() returns one node, queryAll() returns an array. The old $ / $$ pair was
   corrupted three times by regex replacement strings (where "$$" means a literal "$"), silently turning list
   iteration into a single-node call and crashing VUI.init. The regression harness now guards this. */
const query=(s,r=document)=>r.querySelector(s),queryAll=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(text,kind='-cream',action)=>window.VUI&&VUI.toast({text,kind,action,durable:kind==='-danger'});
/* A result belongs in its component's own flow, and most of these hosts are grids: appended without a
   placement the note landed in whichever track came next — under the profile's 110 px avatar column, for
   instance, where a two-line sentence is unreadable. It now spans every column of a grid host and gets a
   little air, wherever it is used. */
const note=(host,text,tone='')=>{let n=host.querySelector(':scope>.demo-note');if(!n){n=document.createElement('p');n.className='demo-note v-meta';n.setAttribute('role','status');n.setAttribute('aria-live','polite');host.appendChild(n);
 const d=getComputedStyle(host).display;
 if(d==='grid'||d==='inline-grid'){n.style.gridColumn='1 / -1';n.style.gridRow='auto'}
 n.style.marginTop='10px';n.style.minWidth='0';n.style.maxWidth='72ch'}n.textContent=text;n.style.color=tone==='ok'?'var(--v-olive-ink)':tone==='bad'?'var(--v-danger-ink)':'';return n};
const spin='<span class="v-spin" style="display:inline-block"></span>';
/* ---- ONE OWNERSHIP GUARD ----
   Two guards had grown up side by side: some sweeps wrote data-wired, others data-owned, and neither read the
   other. That is why "Change this demo picture" opened its inline picture choices AND the profile rename
   dialog \u2014 avatarEdit() claimed the button with data-owned while compositeActions' .v-edit sweep only looked
   for data-wired. claim() is now the single question every sweep asks, and it answers for both attributes, so
   a second owner cannot attach to a control that already has one. */
const claim=(el,kind)=>{if(!el)return false;
 if(el.dataset.owned||el.dataset.wired)return false;
 el.dataset.owned=kind;el.dataset.wired='1';return true};
/* Numeric coercion in one place. Every count, page number and total goes through n(); a value that is not
   a finite number can never reach the DOM as "NaN" — it becomes a dash and is reported to the console. */
const n=(v,fallback=0)=>{const x=typeof v==='number'?v:parseFloat(v);if(!isFinite(x)){console.warn('demo-behaviour: non-numeric value',v);return fallback}return x};
const txt=v=>{const s=String(v==null?'':v);return /NaN|undefined|\[object Object\]/.test(s)?'—':s};
/* Development guard: any status/count node that ends up carrying a broken interpolation is logged with its
   owner so the cause is found, not the symptom. */
const guard=el=>{if(!el)return el;const bad=/NaN|undefined|\[object Object\]/;const check=()=>{if(bad.test(el.textContent||'')){console.error('demo-behaviour: broken interpolation in',(el.closest('[data-demo]')||el).dataset?.demo||el.className,'→',el.textContent);el.dataset.broken='1'}else delete el.dataset.broken};new MutationObserver(check).observe(el,{childList:true,characterData:true,subtree:true});check();return el};
/* Use the shared recoverable factory so a pre-readiness render keeps its identity and V.fillIcons()
   completes it later; fall back to an identity-carrying stub if v.js has not defined V.icon yet. */
const ic=n=>(window.V&&V.icon)?V.icon(n,'-sm'):'<svg class="v-icon -sm" viewBox="0 0 24 24" aria-hidden="true" data-icon-name="'+n+'"></svg>';
const fill=r=>{if(window.V&&V.fillIcons)V.fillIcons(r||document)};

/* ---------- 1. Data table: one dataset drives rows, filter, paging, counts, empty ---------- */
const RUNS=[
 {agent:'Cedar',c:'pink',icon:'git-branch',receipt:'#3586895',when:'Today 09:12',dur:'4 min 12 s',status:'Requested',pill:'-blue'},
 {agent:'Moss',c:'olive',icon:'brain',receipt:'#3586894',when:'Today 08:40',dur:'1 min 05 s',status:'Paid',pill:'-pink'},
 {agent:'Willow',c:'blue',icon:'monitor',receipt:'#3586890',when:'Yesterday 17:02',dur:'12 min 48 s',status:'Sent',pill:'-olive'},
 {agent:'Birch',c:'yellow',icon:'repeat',receipt:'#3586871',when:'Yesterday 11:20',dur:'2 min 30 s',status:'Paid',pill:'-pink'},
 {agent:'Cedar',c:'pink',icon:'git-branch',receipt:'#3586863',when:'2 Sept 16:00',dur:'3 min 58 s',status:'Sent',pill:'-olive'},
 {agent:'Moss',c:'olive',icon:'brain',receipt:'#3586840',when:'2 Sept 09:05',dur:'0 min 52 s',status:'Requested',pill:'-blue'},
 {agent:'Willow',c:'blue',icon:'monitor',receipt:'#3586822',when:'1 Sept 14:41',dur:'8 min 10 s',status:'Paid',pill:'-pink'},
 {agent:'Birch',c:'yellow',icon:'repeat',receipt:'#3586810',when:'1 Sept 10:12',dur:'1 min 44 s',status:'Sent',pill:'-olive'},
 {agent:'Cedar',c:'pink',icon:'git-branch',receipt:'#3586802',when:'31 Aug 18:20',dur:'5 min 06 s',status:'Requested',pill:'-blue'}];
const PER=4;
function dataTable(){const e=query('[data-demo="runs-table"]');if(!e)return;
const tbody=query('tbody',e),pager=query('[data-pager]',e),count=guard(query('[data-result]',e)),empty=query('[data-empty]',e),wrap=query('.v-table-wrap',e);
 if(!tbody||!pager||!count){console.error('demo-behaviour: #data-table markup is missing a required node — refusing to render rather than printing NaN');return}
let filter='All',page=1;
const rows=()=>filter==='All'?RUNS:RUNS.filter(r=>r.status===filter);
const render=()=>{const list=rows();const pages=Math.max(1,Math.ceil(n(list.length)/n(PER,4)));page=Math.min(Math.max(1,n(page,1)),pages);
 const slice=list.slice((page-1)*PER,page*PER);
 tbody.innerHTML=slice.map(r=>`<tr tabindex="0" data-row="${r.receipt}" aria-label="Run ${r.receipt}, ${r.agent}, ${r.status}"><td><div style="display:flex;gap:10px;align-items:center"><span class="v-disk -sm -${r.c}">${ic(r.icon)}</span><b>${r.agent}</b></div></td><td class="v-id">${r.receipt}</td><td>${r.when}</td><td class="-num">${r.dur}</td><td><span class="v-badge ${r.pill}">${r.status}</span></td><td><span class="v-actions"><button class="v-ibtn -sm" data-act="receipt" data-r="${r.receipt}" aria-label="Show receipt ${r.receipt}">${ic('file-text')}</button><button class="v-ibtn -sm" data-act="detail" data-r="${r.receipt}" aria-label="Open run ${r.receipt}">${ic('arrow-ur')}</button></span></td></tr>`).join('');
 /* a row is a target: click or Enter anywhere on it opens the run (the trailing buttons keep their own jobs) */
 tbody.querySelectorAll('tr[data-row]').forEach(tr=>{const open=()=>{const b=tr.querySelector('[data-act="detail"]');if(b)b.click()};
  tr.addEventListener('click',ev=>{if(ev.target.closest('button'))return;open()});
  tr.addEventListener('keydown',ev=>{if(ev.target!==tr)return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open()}
   const rows=[...tbody.querySelectorAll('tr[data-row]')],i=rows.indexOf(tr);if(ev.key==='ArrowDown'&&rows[i+1]){ev.preventDefault();rows[i+1].focus()}if(ev.key==='ArrowUp'&&rows[i-1]){ev.preventDefault();rows[i-1].focus()}})});
 wrap.hidden=!list.length;empty.hidden=!!list.length;
 pager.dataset.pages=pages;pager.dataset.page=page;if(window.VUI&&VUI.initPager)VUI.initPager(pager);else pager.dispatchEvent(new Event('v-rebuild'));
 count.textContent=list.length?'Showing '+n(slice.length)+' of '+n(list.length)+' demo runs · '+txt(filter).toLowerCase()+' · page '+n(page,1)+' of '+n(pages,1):'No demo runs with status “'+txt(filter)+'”';
 fill(tbody);queryAll('[data-act]',tbody).forEach(b=>b.addEventListener('click',()=>{const r=list.find(x=>x.receipt===b.dataset.r);
  if(b.dataset.act==='receipt')note(e,`Receipt ${r.receipt} — ${r.agent}, ${r.status.toLowerCase()}, ${r.dur}, started ${r.when}. Simulated record; nothing was downloaded.`);
  else note(e,`Run ${r.receipt} (${r.agent}) would open in the real app. This demo has no run page, so nothing navigated.`)}))};
queryAll('[data-filters] button',e).forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.f;page=1;queryAll('[data-filters] button',e).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()}));
query('[data-clear]',e).addEventListener('click',()=>{filter='All';page=1;queryAll('[data-filters] button',e).forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.f==='All')));render()});
pager.addEventListener('v-page',ev=>{page=ev.detail;render()});
render()}

/* ---------- 2. Memory: one dataset, real search, real conflict review ---------- */
const MEM=[
 {agent:'Cedar',tag:'decision',text:'Release notes always list breaking changes first.',src:'chat with you · 12 Sept'},
 {agent:'Cedar',tag:'preference',text:'Never push to main without asking.',src:'chat with you · 4 Sept'},
 {agent:'Moss',tag:'fact',text:'The weekly digest goes to three recipients.',src:'run #3586402 · 2 Sept'},
 {agent:'Moss',tag:'decision',text:'Digest recipients live in the shared list, not in Memory.',src:'chat with you · 5 Sept'},
 {agent:'Willow',tag:'fact',text:'Invoice totals are checked against the PDF, not the email.',src:'run #3586822 · 1 Sept'},
 {agent:'Willow',tag:'note',text:'Ask before contacting a client.',src:'chat with you · 28 Aug'}];
const CONFLICTS=[
 {title:'Digest recipients',mine:'Recipients live in the shared list, not in Memory.',theirs:'Recipients: ana@, ben@, cara@ (copied into Memory).'},
 {title:'Release note order',mine:'Breaking changes first, then fixes.',theirs:'Chronological order, newest first.'}];
function memory(){const e=query('[data-demo="memory"]');if(!e)return;
const q=query('[data-q]',e),groups=query('[data-groups]',e),count=guard(query('[data-result]',e)),empty=query('[data-empty]',e);
 if(!q||!groups||!count){console.error('demo-behaviour: #memory markup is missing a required node — refusing to render');return}
const render=()=>{const s=(q.value||'').trim().toLowerCase();
 const hits=MEM.filter(m=>!s||(m.text+' '+m.tag+' '+m.agent).toLowerCase().includes(s));
 const by={};hits.forEach(m=>{(by[m.agent]=by[m.agent]||[]).push(m)});
 /* filled after injection */groups.innerHTML=Object.keys(by).map(a=>`<div><div class="v-recgroup"><b>${a}</b><span class="v-badge -count">${by[a].length}</span><span class="v-meta">${by[a].length===1?'1 match':by[a].length+' matches'}</span></div>${by[a].map(m=>`<div class="v-card"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="v-badge -olive-soft">${m.agent}</span><span class="v-badge -cream">${m.tag}</span></div><p class="v-body">${m.text}</p><div class="v-meta">Source: ${m.src} · demo entry</div></div>`).join('')}</div>`).join('');
 empty.hidden=!!hits.length;fill(groups);
 const agents=Object.keys(by).length;
 count.textContent=hits.length?n(hits.length)+' of '+n(MEM.length)+' demo entries'+(s?' match “'+txt(q.value.trim())+'”':'')+' · '+n(agents)+' agent'+(agents===1?'':'s'):'No demo entries match “'+txt(q.value.trim())+'”'};
q.addEventListener('input',render);
query('[data-clear]',e).addEventListener('click',()=>{q.value='';render();q.focus()});
query('[data-skip]',e).addEventListener('click',()=>note(e,'Import skipped. The demo file was not read and your Memory is unchanged.'));
query('[data-review]',e).addEventListener('click',()=>{
 const choices=CONFLICTS.map(()=>null);
 const dlg=document.createElement('div');dlg.className='v-dialog';dlg.id='mem-conflicts';dlg.setAttribute('data-dialog','');dlg.setAttribute('aria-labelledby','mc-t');dlg.hidden=true;
 dlg.innerHTML=`<div class="v-dialog__head"><h3 class="v-section" id="mc-t">Review 2 conflicts</h3><button class="v-ibtn -dashed" data-close aria-label="Close">${ic('x')}</button></div>
 <p class="v-body-2">team-memory.json wants to change two entries. Choose for each; nothing is written until you press Import.</p>
 ${CONFLICTS.map((c,i)=>`<div class="v-card" style="display:grid;grid-template-columns:minmax(0,1fr);gap:8px"><b>${c.title}</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div class="v-card -sm" style="background:var(--v-canvas)"><div class="v-caps">Yours</div><p class="v-body" style="font-size:13px">${c.mine}</p></div><div class="v-card -sm" style="background:var(--v-canvas)"><div class="v-caps">Theirs</div><p class="v-body" style="font-size:13px">${c.theirs}</p></div></div><div class="v-tabs -pills" data-filters role="group" aria-label="Choice for ${c.title}"><button class="v-tab" aria-pressed="false" data-c="${i}" data-v="mine">Keep mine</button><button class="v-tab" aria-pressed="false" data-c="${i}" data-v="theirs">Take theirs</button><button class="v-tab" aria-pressed="false" data-c="${i}" data-v="skip">Skip</button></div></div>`).join('')}
 <div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Cancel</button><button class="v-btn" data-import disabled>Import 48 entries</button></div>`;
 document.body.appendChild(dlg);
 const imp=query('[data-import]',dlg);
 queryAll('[data-c]',dlg).forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.c;choices[i]=b.dataset.v;
  queryAll(`[data-c="${i}"]`,dlg).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  imp.disabled=choices.some(c=>!c)}));
 imp.addEventListener('click',()=>{VUI.closeLayer(dlg);
  const kept=choices.filter(c=>c==='mine').length,took=choices.filter(c=>c==='theirs').length,skipped=choices.filter(c=>c==='skip').length;
  note(e,`Simulated import · 46 new entries added, ${took} replaced, ${kept} of yours kept, ${skipped} skipped · receipt #SIM-IMP-0912. Your real Memory is unchanged.`,'ok');
  toast('Import finished (simulated) · receipt #SIM-IMP-0912','-cream',{label:'Receipt'});setTimeout(()=>dlg.remove(),400)});
 queryAll('[data-close]',dlg).forEach(b=>b.addEventListener('click',()=>{VUI.closeLayer(dlg);note(e,'Import cancelled. No entry was changed.');setTimeout(()=>dlg.remove(),400)}));
 VUI.openLayer(dlg,query('[data-review]',e))});
render()}

/* ---------- 3. Builder: inspector ↔ node ↔ validation are one state ---------- */
function builder(){const e=query('[data-demo="builder"]');if(!e)return;
const nodes=queryAll('[data-node]',e),draft=query('[data-node="draft"]',e),sub=query('[data-nodesub]',e),
 val=query('[data-validation]',e),vtext=query('[data-vtext]',e),field=query('[data-tfield]',e),ta=query('[data-template]',e),
 title=query('[data-ititle]',e),outline=query('[data-outline]',e),help=query('#bth');
const state={template:''};
const sync=()=>{const ok=state.template.trim().length>0;
 field.classList.toggle('-invalid',!ok);ta.setAttribute('aria-invalid',String(!ok));
 draft.classList.toggle('-invalid',!ok);draft.setAttribute('aria-invalid',String(!ok));
 sub.textContent=ok?state.template.trim().slice(0,32)+(state.template.trim().length>32?'…':''):'Template missing';
 sub.style.color=ok?'':'var(--v-danger-ink)';
 help.textContent=ok?'Saved in this demo. Nothing runs.':'Required. Describe what the notes should contain.';
 val.classList.toggle('-ok',ok);val.classList.toggle('-error',!ok);
 const steps=outline?outline.children.length:2;const wired=2;/* the canvas is illustrative: only the two wired nodes are executable */
 vtext.textContent=ok?('Ready to test — '+wired+' wired step'+(wired===1?'':'s')+(steps>wired?(' · '+(steps-wired)+' more in the outline, not wired'):'')+', no missing fields'):'1 field needs a value — “Draft notes” has no template'};
ta.addEventListener('input',()=>{state.template=ta.value;sync()});
const select=n=>{nodes.forEach(x=>x.classList.toggle('-selected',x===n));title.textContent=n.querySelector('.v-node__head').textContent.trim();
 const isDraft=n===draft;field.hidden=!isDraft;
 if(!isDraft)note(queryAll('[data-inspector]',e),'“Read files” has no editable fields in this demo.');else{const nn=query('.demo-note',query('[data-inspector]',e));nn&&nn.remove()}};
nodes.forEach(n=>{n.addEventListener('click',()=>select(n));n.addEventListener('focus',()=>select(n))});
queryAll('[data-add]',e).forEach(b=>b.addEventListener('click',()=>{const li=document.createElement('li');li.textContent=b.dataset.add+' (added in this demo)';outline.appendChild(li);
 sync();note(query('[data-outline]',e).parentElement,`“${b.dataset.add}” added to the outline. The canvas above is illustrative — this demo does not place nodes.`)}));
sync();select(draft)}

/* ---------- 4. Explainers: the written summary is real text, shown in place ---------- */
function explainers(){const e=query('[data-demo="explainers"]');if(!e)return;
const card=query('[data-oversized]',e),btn=query('[data-read]',card),sum=query('[data-summary]',card);
btn.addEventListener('click',()=>{const open=sum.hidden;sum.hidden=!open;btn.textContent=open?'Hide the written summary':'Read the written summary';
 if(open)sum.scrollIntoView===undefined?0:0})}

/* ---------- 5. Chat dock: Open summary opens the summary; sending gets a contextual reply ---------- */
function chat(){const e=query('[data-demo="chat"]');if(!e)return;
const thread=query('[data-thread]',e),msg=query('[data-msg]',e);
const summary=()=>{const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');dlg.setAttribute('aria-labelledby','cs-t');dlg.hidden=true;
 dlg.innerHTML=`<div class="v-dialog__head"><h3 class="v-section" id="cs-t">Last night's runs</h3><button class="v-ibtn -dashed" data-close aria-label="Close">${ic('x')}</button></div>
 <ul style="margin:0;padding-left:1.2em;display:grid;gap:8px;font-size:14px;line-height:1.5"><li><b>Cedar</b> drafted the 2.4 release notes and stopped for your approval on the push (run #3586895).</li><li><b>Moss</b> sent the weekly digest to three recipients at 07:40 (run #3586894).</li><li><b>Willow</b> checked 12 invoices; one total disagreed with the PDF and is waiting for you (run #3586890).</li></ul>
 <dl class="v-kv"><dt>Drawn from</dt><dd>3 demo run records</dd><dt>Outside changes</dt><dd>None — Cojeev only read</dd></dl>
 <div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Close</button></div>`;
 document.body.appendChild(dlg);queryAll('[data-close]',dlg).forEach(b=>b.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
 VUI.openLayer(dlg,queryAll('[data-open-summary]',e))};
const wire=()=>queryAll('[data-open-summary]',e).forEach(b=>{if(!claim(b,'chat-summary'))return;b.addEventListener('click',summary)});
wire();
const send=()=>{const t=(msg.value||'').trim();if(!t){msg.setAttribute('aria-invalid','true');note(e,'Type a message first.','bad');return}
 msg.removeAttribute('aria-invalid');msg.value='';
 const me=document.createElement('span');me.className='v-bubble -me';me.style.alignSelf='end';me.textContent=t;thread.appendChild(me);
 const card=document.createElement('div');card.className='v-card -cream -sm';card.style.display='grid';card.style.gap='8px';
 card.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><span class="v-badge -pending">${spin}Running</span><b style="font-size:13px">Looking through 3 demo runs</b></div><p class="v-meta">In this demo only · no model is called</p>`;
 thread.appendChild(card);thread.scrollTop=thread.scrollHeight;
 setTimeout(()=>{card.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><span class="v-badge -olive">Done</span><b style="font-size:13px">Answered from 3 demo runs</b></div><p class="v-body" style="font-size:13px">Cedar improved most: 4 min 12 s last night against 9 min 40 s a week ago.</p><p class="v-meta">Canned reply · nothing was sent</p><button class="v-btn -sm" data-open-summary>Open summary</button>`;
  wire();thread.scrollTop=thread.scrollHeight},900)};
query('[data-send]',e).addEventListener('click',send);
msg.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();send()}})}

/* ---------- 6. Quick note: destination, validation, one receipt, Open shows the record ---------- */
function quickNote(){const e=query('[data-demo="quick-note"]');if(!e)return;
 const ta=query('[data-text]',e),dest=query('[data-dest]',e),change=query('[data-change]',e),
  list=query('[data-destlist]',e),receipt=query('[data-receipt]',e),field=ta.closest('.v-field'),help=query('#qn-h',e);
 const state={dest:dest.textContent.trim(),saves:0,id:''};
 const closeList=()=>{list.hidden=true;change.setAttribute('aria-expanded','false')};
 change.addEventListener('click',()=>{const open=list.hidden;list.hidden=!open;change.setAttribute('aria-expanded',String(open));
  if(open)query('.v-menu__item',list).focus()});
 /* delegated, so a re-render cannot orphan the handler — the previous per-node binding is why picking
    Memory · Moss changed nothing */
 list.dataset.owned='menu';
 list.addEventListener('click',ev=>{const o=ev.target.closest('.v-menu__item');if(!o)return;
  ev.stopPropagation();
  queryAll('.v-menu__item',list).forEach(x=>x.setAttribute('aria-selected',String(x===o)));
  state.dest=o.textContent.trim();dest.textContent=state.dest;
  closeList();change.focus();note(e,'Destination set to '+state.dest+' (demo).')});
 list.addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeList();change.focus()}});
 document.addEventListener('pointerdown',ev=>{if(!e.contains(ev.target))closeList()});
 query('[data-save]',e).addEventListener('click',()=>{
  const text=(ta.value||'').trim();
  if(!text){field.classList.add('-invalid');ta.setAttribute('aria-invalid','true');
   help.textContent='Type something to save.';receipt.hidden=true;receipt.innerHTML='';ta.focus();
   note(e,'Nothing was saved — the note is empty.');return}
  field.classList.remove('-invalid');ta.removeAttribute('aria-invalid');help.textContent='Saved with the project you choose.';
  state.saves++;state.id='SIM-N'+(4400+state.saves);
  receipt.hidden=false;
  receipt.innerHTML='<div class="v-card" style="background:var(--v-canvas);display:grid;grid-template-columns:minmax(0,1fr);gap:8px">'
   +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="v-badge -olive">Saved</span>'
   +'<span class="v-badge -cream v-id">'+state.id+'</span>'
   +'<span class="v-meta" style="margin-left:auto">'+(state.saves>1?'receipt updated ('+state.saves+' saves)':'just now')+'</span></div>'
   +'<p class="v-meta">Simulated record — no Notes service was contacted.</p>'
   +'<button class="v-btn -sm -secondary" data-open>Open the saved note</button><div data-saved hidden></div></div>';
  query('[data-open]',receipt).addEventListener('click',()=>{const box=query('[data-saved]',receipt);const open=box.hidden;box.hidden=!open;
   query('[data-open]',receipt).textContent=open?'Hide the saved note':'Open the saved note';
   if(open)box.innerHTML='<dl class="v-kv" style="background:var(--v-beige);border-radius:14px;padding:14px">'
    +'<dt>Text</dt><dd>'+text.replace(/</g,'&lt;')+'</dd><dt>Destination</dt><dd>'+state.dest+'</dd>'
    +'<dt>Receipt</dt><dd class="v-id">'+state.id+'</dd><dt>Stored</dt><dd>In this page only</dd></dl>'});
  toast('Note saved (simulated) · '+state.id+' → '+state.dest,'-cream')})}

function normaliseTabs(){queryAll('[role="tablist"]').forEach(g=>{
 /* the authoring panel owns its own semantics and re-renders its tray; two owners rewriting the same nodes
    is what left six role="tab" children inside a role="group" after any section switch */
 if(g.closest('#v-authoring'))return;const tabs=queryAll('[role="tab"]',g);if(!tabs.length)return;
 const hasPanels=tabs.some(t=>t.getAttribute('aria-controls')&&document.getElementById(t.getAttribute('aria-controls')));
 if(hasPanels)return;
 g.setAttribute('role','group');if(!g.getAttribute('aria-label'))g.setAttribute('aria-label','Filter');g.dataset.filters='';g.removeAttribute('data-tabs');
 tabs.forEach(t=>{const on=t.getAttribute('aria-selected')==='true';t.removeAttribute('role');t.removeAttribute('aria-selected');t.setAttribute('aria-pressed',String(on));t.tabIndex=0;
  t.addEventListener('click',()=>{queryAll('[aria-pressed]',g).forEach(x=>x.setAttribute('aria-pressed',String(x===t)))})})})}

/* ---------- 8. Settings, library, AI apps (unchanged behaviour, kept) ---------- */
function settings(){const e=query('#settings');if(!e)return;
const cards=queryAll('.demo>div>.v-card',e);
const mode=queryAll('select',e).find(s=>/Light|Dark/.test(s.textContent));
const size=queryAll('select',e).find(s=>/Default|Large/.test(s.textContent));
if(mode){mode.value=document.documentElement.dataset.mode==='dark'?'Dark':'Light';
 mode.onchange=()=>{const dark=mode.value==='Dark';document.documentElement.dataset.mode=dark?'dark':'light';toast('Mode set to '+mode.value.toLowerCase()+' · this page only (demo)')}}
if(size){size.onchange=()=>{document.documentElement.style.fontSize=size.value==='Large'?'17.5px':'';toast('Text size: '+size.value.toLowerCase()+' · this page only (demo)')}}
const seg=query('.v-seg[data-togglegroup]',e);
const keys=['buttons','icons','pills','cards'];
const sync=()=>{if(!window.VMotion)return;const m=VMotion.mode(),c=VMotion.cats();
 if(seg)queryAll('button',seg).forEach(b=>b.setAttribute('aria-pressed',String((b.textContent.trim()==='Off')===(m==='off'))));
 queryAll('input[type=checkbox]',e).forEach((i,n)=>{if(keys[n]){i.checked=!!c[keys[n]];i.disabled=m==='off'}})};
if(seg)queryAll('button',seg).forEach(b=>b.addEventListener('click',()=>{if(!window.VMotion)return;VMotion.setMode(b.textContent.trim()==='Off'?'off':'subtle');sync();const t=query('#v-motion-tab');if(t)t.classList.toggle('-off',VMotion.mode()==='off')}));
queryAll('input[type=checkbox]',e).forEach((i,n)=>{if(keys[n])i.addEventListener('change',()=>{window.VMotion&&VMotion.setCat(keys[n],i.checked)})});
window.addEventListener('v-motion-change',sync);sync();
const checksCard=cards.find(c=>/System checks/.test(c.textContent));
if(checksCard){const btn=queryAll('button',checksCard).find(b=>/Run all/.test(b.textContent));const rows=queryAll('.v-item.-flat',checksCard);
 btn&&btn.addEventListener('click',()=>{if(btn.dataset.busy)return;btn.dataset.busy='1';btn.setAttribute('aria-busy','true');btn.innerHTML=spin+'Running…';
  rows.forEach(r=>{r.innerHTML='<span class="v-badge -pending">'+spin+'running</span><span class="v-item__body"><span class="v-item__title" style="font-weight:500">'+r.querySelector('.v-item__title').textContent+'</span></span><span class="v-meta">—</span>'});
  note(checksCard,'Simulated run · nothing on your machine is contacted.');
  const results=[['olive','passed','09:41'],['olive','passed','09:41'],['danger','failed','09:41']];
  rows.forEach((r,i)=>setTimeout(()=>{const [c,w,at]=results[i];const title=r.querySelector('.v-item__title').textContent;
   r.innerHTML='<span class="v-badge -'+c+'">'+w+'</span><span class="v-item__body"><span class="v-item__title" style="font-weight:500">'+title+'</span></span><span class="v-meta">'+at+'</span>';
   if(i===rows.length-1){btn.removeAttribute('aria-busy');btn.textContent='Run all';delete btn.dataset.busy;
    note(checksCard,'Simulated: 2 passed, 1 failed · receipt #SIM-0912 · no host was contacted.','bad');
    toast('Checks finished (simulated) · 2 passed, 1 failed','-cream',{label:'Receipt'})}},420+i*380))})}}
function library(){const e=query('#library');if(!e)return;
 /* Apply is owned by the delegated document listener (LIBRARY APPLY, DELEGATED) — one owner per button.
    Restore is owned here: it is the only control in this entry that still needed a real simulated outcome. */
 const restore=queryAll('button',e).find(x=>/^Restore/i.test(x.textContent.trim()));
 if(restore&&claim(restore,'library-restore')){
  restore.addEventListener('click',()=>{
   const card=restore.closest('.v-card')||e;
   const alert=query('.v-alert',card);
   if(alert){alert.className='v-alert -ok';
    alert.innerHTML=ic('check')+'<div class="v-alert__body"><div class="v-alert__title">“Old digest” restored to Library</div><div class="v-alert__text">Back in your skills list, disabled, ready to review · receipt #SIM-R2208.</div></div>'}
   restore.disabled=true;restore.textContent='Restored';
   note(card,'Restored in this demo only · receipt #SIM-R2208 · your real Library is unchanged.','ok');
   toast('Restored (simulated) · #SIM-R2208','-cream',{label:'Receipt'})})}}

function aiApps(){const e=query('#ai-apps');if(!e)return;
const filters=queryAll('[data-filters] button,.v-tabs.-pills .v-tab',e);const wraps=queryAll('.v-table-wrap',e);const modelWrap=wraps[wraps.length-1];const rows=modelWrap?queryAll('tbody tr',modelWrap):[];if(!filters.length||!rows.length)return;
const kind=r=>/local/i.test(r.textContent)?'Local':/—/.test(r.textContent)?'Free':'Paid';
const apply=name=>{let shown=0;rows.forEach(r=>{const on=name==='All'||kind(r)===name;r.hidden=!on;if(on)shown++});
 {let empty=query('[data-model-empty]',modelWrap.parentElement);
   if(!empty){empty=document.createElement('div');empty.className='v-state -filtered';empty.setAttribute('data-model-empty','');
    empty.innerHTML='<div class="v-state__word">No demo models match that filter</div><div class="v-state__why">The three illustrative models are paid or local.</div>';
    const clr=document.createElement('button');clr.className='v-btn -sm -secondary';clr.textContent='Clear filter';
    clr.addEventListener('click',()=>{const all=filters.find(f2=>/^All$/.test(f2.textContent.trim()));if(all)all.click()});
    empty.appendChild(clr);modelWrap.parentElement.appendChild(empty)}
   empty.hidden=shown>0;modelWrap.hidden=shown===0;
   note(modelWrap.parentElement,'Showing '+shown+' of '+rows.length+' demo models · '+name.toLowerCase()+' filter.')}};
filters.forEach(t=>t.addEventListener('click',()=>apply(t.textContent.trim())));
queryAll('.v-card',e).forEach(c=>{if(!/Cursor/.test(c.textContent))return;const u=query('.v-usage',c);if(!u)return;
 const b=document.createElement('button');b.className='v-btn -sm -secondary';b.textContent='Check usage again';
 b.addEventListener('click',()=>{b.setAttribute('aria-busy','true');b.innerHTML=spin+'Checking…';
  setTimeout(()=>{b.removeAttribute('aria-busy');b.textContent='Check usage again';note(c,'Simulated: Cursor still reported no limit. Shown as unavailable, never as 0.')},700)});
 c.appendChild(b)})}

/* Every enabled action produces a specific, demo-only result — or says plainly that it is unavailable here.
   No generic success toast, no silent no-op, and nothing contacts a host. */
function familyActions(){
 const outcome=(host,text,tone)=>note(host,text,tone);
 // run detail: forking from a step lists what is reused and what re-runs
 const rd=query('#run-detail');if(rd){const b1=queryAll('button',rd).find(x=>/Run from step/.test(x.textContent));
  b1&&b1.addEventListener('click',()=>{outcome(rd.querySelector('.demo'),'Simulated fork from step 3 · reuses step 1 Read files and step 2 Summarise (results kept); re-runs step 3 Draft notes, step 4 Ask AI, step 5 Save. Receipt #SIM-F3-0912. No host was contacted.','ok');
   toast('Fork prepared (simulated) · #SIM-F3-0912','-cream')})}
 // health line: "See why" opens the observation behind the state
 const hl=query('#health-line');if(hl){queryAll('button',hl).filter(x=>/See why/.test(x.textContent)).forEach(bt=>bt.addEventListener('click',()=>{
   outcome(bt.closest('.v-card'),'Why “Needs a check”: the last run failed 40 min ago — the host closed the session during step 3 of 5 (HOST_SESSION_CLOSED, exit 137). Nothing outside Cojeev changed. Demo record.','bad')}))}
 /* Retry has exactly ONE owner (the bounded retry in compositeActions). A second owner used to bind here:
    both wrote "Retrying…", and because this one captured the label AFTER the first had already replaced it,
    the restore put "Retrying…" back — which is why the button stayed spinning beside a finished result. */
 // scope picker: changing the default states both the old and the new value
 const sp=query('#scope-picker');if(sp){const bt=queryAll('button',sp).find(x=>/Make Cedar default/.test(x.textContent));
  bt&&bt.addEventListener('click',()=>{if(bt.dataset.done)return;bt.dataset.done='1';bt.disabled=true;
   const al=query('.v-alert',sp);if(al){const t=query('.v-alert__title',al),w=query('.v-alert__text',al);
    if(t)t.textContent='Default project is now Cedar';if(w)w.textContent='Was Moss · changed in this demo only.'}
   outcome(sp.querySelector('.demo'),'Default project changed from Moss to Cedar · receipt #SIM-D-2201. Simulated: your real default is unchanged.','ok')})}
 // needs you: an explicit handoff preview, never a host call
 const ny=query('#needs-you');if(ny){queryAll('button',ny).filter(x=>/Open in/.test(x.textContent))/* host handoffs only; "Open run" is owned by declaredActions() — one owner per button */.forEach(bt=>bt.addEventListener('click',()=>{
   const host=/Cursor/.test(bt.textContent)?'Cursor':'Claude Code';
   outcome(bt.closest('.v-needs'),'Handoff preview — the real app would focus '+host+' at this decision and Cojeev would stop here. This demo does not launch '+host+' and cannot reply on your behalf.')}))}
 // automations: the schedule fields drive the summary and the next run
 const ac=query('#automation-cards');if(ac){const card=queryAll('.v-card',ac).find(c=>/Schedule/.test(c.textContent));
  if(card){const sels=queryAll('select',card),days=queryAll('.v-weekdays input',card);
   const relabel=()=>{const time=sels[0]?sels[0].value:'16:00';const tz=sels[1]?sels[1].value:'Europe/Berlin';
    const on=['MO','TU','WE','TH','FR','SA','SU'].filter((_,i)=>days[i]&&days[i].checked);
    const nameOf={MO:'Mondays',TU:'Tuesdays',WE:'Wednesdays',TH:'Thursdays',FR:'Fridays',SA:'Saturdays',SU:'Sundays'};
    const label=on.length===0?'No day selected':on.length===7?'Every day':on.map(x=>nameOf[x]).join(', ');
    const meta=queryAll('.v-meta',card).find(x=>/Next run/.test(x.textContent));
    if(meta)meta.textContent=on.length?('Next run: '+label+' at '+time+' · '+tz+' (demo)'):'No run scheduled — pick at least one day (demo)';
    queryAll('.v-badge',ac).forEach(p=>{if(/\d\d:\d\d/.test(p.textContent)&&!p.classList.contains('-cream'))p.textContent=(on.length?label:'Unscheduled')+' '+time;
     if(/Europe\//.test(p.textContent))p.textContent=tz});
    const defs=queryAll('.v-card',ac).map(c=>c);defs.forEach(c=>{const h=queryAll('.v-badge',c).find(p=>/Fridays/.test(p.textContent));if(h)h.textContent=(on.length?label:'Unscheduled')+' '+time})};
   sels.forEach(s=>s.addEventListener('change',relabel));days.forEach(x=>x.addEventListener('change',relabel));relabel()}}
}

/* ---- Composite families: one owner per interaction, every enabled control gives a real demo result ----
   Selection state and any detail it drives come from the same local model, so they cannot disagree. */
function compositeActions(){
 const say=(host,text,tone)=>note(host,text,tone);
 /* date strip: shared roving selection with truthful aria-pressed */
 queryAll('.v-datestrip').forEach(strip=>{const btns=queryAll('button',strip).filter(x=>!x.disabled);
  const select=bt=>{btns.forEach(x=>{const on=x===bt;x.setAttribute('aria-pressed',String(on));x.tabIndex=on?0:-1});
   const lab=bt.textContent.trim().replace(/\s+/g,' ');
   const host=strip.closest('.demo')||strip.parentElement;say(host,'Selected '+lab+' — a real view would reload that day\u2019s runs. Demo selection only.')};
  btns.forEach((bt,i)=>{bt.addEventListener('click',()=>select(bt));
   bt.addEventListener('keydown',e=>{const j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1;if(j<0||j>=btns.length)return;e.preventDefault();btns[j].focus();select(btns[j])})});
  if(!btns.some(x=>x.getAttribute('aria-pressed')==='true')&&btns[0])btns[0].setAttribute('aria-pressed','true')});
 /* master / detail: the selected row and the detail panel read one record map */
 const DET={'Cedar · release notes':{id:'RUN-1EG4-TE5',host:'Claude Code',obs:'09:12',state:'waiting 3 min',chips:['git push','main','3 files'],what:'Tests passed. The diff touches CHANGELOG and two docs pages.',next:'Open Claude Code to approve. Cojeev cannot reply here.'},
  'Willow · invoice check':{id:'RUN-8KP2-QQ1',host:'Cursor',obs:'08:20',state:'waiting 40 min',chips:['invoice','12 checked','1 differs'],what:'Twelve invoices checked against their PDFs; one total differs by £40.',next:'Open Cursor to confirm the total.'},
  'Moss · weekly digest':{id:'RUN-3M77-BD4',host:'Claude Code',obs:'07:40',state:'done',chips:['email','3 recipients'],what:'Digest sent to three recipients from the shared list.',next:'Open the digest record.'},
  'Cedar · report':{id:'RUN-5TT9-LN2',host:'Claude Code',obs:'09:45',state:'scheduled',chips:['report'],what:'Report scheduled for 09:45; nothing has run yet.',next:'Open the schedule.'}};
 queryAll('.v-md').forEach(md=>{const rows=queryAll('.v-md__list .v-item',md),detail=query('.v-md__detail',md);if(!rows.length||!detail)return;
  const paint=row=>{const title=query('.v-item__title',row).textContent.trim();const r=DET[title]||{};
   rows.forEach(x=>{const on=x===row;x.classList.toggle('-selected',on);x.setAttribute('aria-current',String(on));
    /* a fill body caches its host colour at tag time; the selection moved, so the cached fill must move too */
    x.style.setProperty('--mfill',on?'var(--v-pink)':'var(--v-canvas)');x.dataset.origBg=on?'rgb(245, 184, 219)':'rgb(251, 244, 230)'});
   const disk=query('.v-disk',row);const diskCls=disk?disk.className.replace('v-morph-host','').replace('v-morph-live','').trim():'v-disk';
   const hostIcon=/Claude/.test(r.host||'')?'terminal':/Cursor/.test(r.host||'')?'monitor':'cpu';
   detail.innerHTML='<div class="v-md__head"><span class="'+diskCls+' -lg" style="background:var(--v-canvas)">'+(disk?disk.innerHTML.replace(/<svg class="v-morph[\s\S]*?<\/svg>/,''):'')+'</span><div class="v-md__titles"><span class="v-md__title">'+title+'</span><span class="v-md__host">'+ic(hostIcon)+(r.host||'—')+' · observed '+(r.obs||'—')+' · '+(r.state||'—')+'</span></div><span class="v-badge -cream v-id">'+(r.id||'—')+'</span></div>'+
    '<div class="v-md__chips">'+(r.chips||[]).map(c=>'<span class="v-badge -cream">'+c+'</span>').join('')+'</div>'+
    '<dl class="v-md__facts"><dt>What happened</dt><dd>'+(r.what||'—')+'</dd><dt>Next action</dt><dd>'+(r.next||'—')+'</dd></dl>'+
    '<div class="v-md__actions"><button class="v-btn">Open in '+(r.host||'host')+' '+ic('arrow-ur')+'</button><button class="v-btn -ghost">Mark as read</button><span class="v-meta" role="status">Illustrative demo record.</span></div>';
   if(window.V&&V.fillIcons)V.fillIcons(detail)};
  rows.forEach(r=>{r.addEventListener('click',()=>paint(r));r.addEventListener('keydown',e=>{const i=rows.indexOf(r);
   if(e.key==='ArrowDown'&&rows[i+1]){e.preventDefault();rows[i+1].focus();paint(rows[i+1])}
   if(e.key==='ArrowUp'&&rows[i-1]){e.preventDefault();rows[i-1].focus();paint(rows[i-1])}})});
  paint(rows.find(r=>r.classList.contains('-selected'))||rows[0])});
 /* notched card: the arrow really advances the quote */
 const QUOTES=[['I want to see what my agents did overnight without reading every log.','Sanjay · founder'],
  ['If it needs me, tell me once — and tell me what to do about it.','Priya · operations'],
  ['I do not want to learn a new language to automate my own work.','Marcus · consultant']];
 queryAll('.v-notchwrap').forEach(w=>{let n=0;const bt=query('.v-ibtn',w),body=query('.v-notch',w);if(!bt||!body)return;
  const p=query('p',body),meta=query('.v-meta',body);
  bt.addEventListener('click',()=>{n=(n+1)%QUOTES.length;if(p)p.textContent='“'+QUOTES[n][0]+'”';if(meta)meta.textContent=QUOTES[n][1];
   bt.setAttribute('aria-label','Next quote, showing '+(n+1)+' of '+QUOTES.length)})});
 /* assistant panel: Show summary opens the summary it promises */
 queryAll('.v-assist').forEach(a=>{const bt=queryAll('button',a).find(x=>/Show (summary|recommendations)/.test(x.textContent));if(!bt||!claim(bt,'assist-summary'))return;
  bt.addEventListener('click',()=>{const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');dlg.setAttribute('aria-labelledby','as-t');dlg.hidden=true;
   dlg.innerHTML='<div class="v-dialog__head"><h3 class="v-section" id="as-t">Recommendations</h3><button class="v-ibtn -dashed" data-close aria-label="Close">'+ic('x')+'</button></div>'+
    '<ul style="margin:0;padding-left:1.2em;display:grid;gap:8px;font-size:14px;line-height:1.5"><li>Approve Cedar\u2019s push in Claude Code — tests passed and the diff is three files.</li><li>Check Willow\u2019s invoice: one total differs by £40.</li><li>Two agents have not been checked this week.</li></ul>'+
    '<dl class="v-kv"><dt>Drawn from</dt><dd>3 demo run records</dd><dt>Outside changes</dt><dd>None</dd></dl>'+
    '<div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Close</button></div>';
   document.body.appendChild(dlg);queryAll('[data-close]',dlg).forEach(x=>x.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
   VUI.openLayer(dlg,bt)})});
 /* widgets: pause really pauses, with a label and a resumable state */
 queryAll('.v-capsule').forEach(cap=>{const bt=queryAll('.v-ibtn',cap).find(x=>/Pause/i.test(x.getAttribute('aria-label')||''));if(!bt)return;
  const line=query('.v-capsule__line i',cap),time=query('.v-meta',cap);let paused=false;
  bt.addEventListener('click',()=>{paused=!paused;bt.setAttribute('aria-label',paused?'Resume':'Pause');bt.setAttribute('aria-pressed',String(paused));
    bt.innerHTML=ic(paused?'play':'pause');/* the glyph must agree with the label */
   if(line)line.style.opacity=paused?'.45':'';if(time)time.textContent=paused?'paused at 2:54 / 45:00':'2:54 / 45:00';
   say(slotFor(cap),paused?'Paused this demo activity at 2:54. Nothing real was stopped.':'Resumed the demo activity.')})});
 /* file / resource: links open illustrative content instead of doing nothing */
 queryAll('.v-resource__link,[data-play]').forEach(el=>{if(!claim(el,'resource-open'))return;
  el.addEventListener('click',e=>{e.preventDefault();const card=el.closest('.v-resource,.v-feature,.v-file')||el.parentElement;
   const title=((query('.v-resource__head',card)||query('.v-title',card)||{}).textContent||'Resource').trim();
   const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');dlg.setAttribute('aria-labelledby','rs-t');dlg.hidden=true;
   dlg.innerHTML='<div class="v-dialog__head"><h3 class="v-section" id="rs-t">'+title+'</h3><button class="v-ibtn -dashed" data-close aria-label="Close">'+ic('x')+'</button></div>'+
    '<p class="v-body">Illustrative resource content. In the real app this opens the saved document or the recorded session; this demo renders a local preview and contacts nothing.</p>'+
    '<dl class="v-kv"><dt>Kind</dt><dd>'+(el.dataset.play!==undefined?'Live session (demo)':'Written resource (demo)')+'</dd><dt>Source</dt><dd>Demo fixture</dd></dl>'+
    '<div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Close</button></div>';
   document.body.appendChild(dlg);queryAll('[data-close]',dlg).forEach(x=>x.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
   VUI.openLayer(dlg,el)})});
 /* profile: edit is a real local rename. Scoped to a PROFILE host \u2014 an avatar's own edit badge is a picture
    control and is owned by avatarEdit(); this sweep used to take it as well, so both journeys opened at once. */
 queryAll('.v-profile .v-edit,.v-record .v-edit').forEach(bt=>{if(!claim(bt,'profile-rename'))return;
  bt.addEventListener('click',()=>{const wrap=bt.closest('.v-profile')||bt.closest('.demo');const nameEl=wrap&&query('.v-profile__name',wrap);
   const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');dlg.setAttribute('aria-labelledby','pe-t');dlg.hidden=true;
   dlg.innerHTML='<div class="v-dialog__head"><h3 class="v-section" id="pe-t">Edit this demo profile</h3><button class="v-ibtn -dashed" data-close aria-label="Close">'+ic('x')+'</button></div>'+
    '<div class="v-field"><label class="v-label -sm" for="pe-n">Display name</label><input class="v-input" id="pe-n" value="'+(nameEl?nameEl.textContent.replace(/\s+/g,' ').trim():'Sanjay Wilkinson')+'"><div class="v-help">Changes this page only.</div></div>'+
    '<div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Cancel</button><button class="v-btn" data-save>Save locally</button></div>';
   document.body.appendChild(dlg);
   query('[data-save]',dlg).addEventListener('click',()=>{const v=query('#pe-n',dlg).value.trim();if(nameEl&&v)nameEl.textContent=v;
    VUI.closeLayer(dlg);say(wrap,'Renamed to “'+v+'” in this demo only · receipt #SIM-P-9001.','ok');setTimeout(()=>dlg.remove(),400)});
   queryAll('[data-close]',dlg).forEach(x=>x.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
   VUI.openLayer(dlg,bt)})});
 /* empty / error: the single bounded-retry owner. It reads the reason from the host it is retrying, so the
    label and the result can never tell two stories, and it marks the control owned so no later sweep can
    bind a second handler to it. */
 queryAll('.v-empty button,.v-state button').forEach(bt=>{if(!/Retry/i.test(bt.textContent)||!claim(bt,'retry'))return;let n=0;
  const host=bt.closest('.v-empty,.v-state');
  const denied=!!host&&/permission denied/i.test(host.textContent||'');
  const reason=denied?'still permission denied on ~/.cursor':'the same simulated connection refusal';
  bt.addEventListener('click',()=>{if(bt.dataset.busy)return;bt.dataset.busy='1';
   n++;const t0=bt.textContent;bt.setAttribute('aria-busy','true');bt.innerHTML=spin+'Retrying…';
   setTimeout(()=>{bt.removeAttribute('aria-busy');bt.textContent=t0;delete bt.dataset.busy;
    if(n<3)say(host,'Attempt '+n+' of 3: '+reason+'. The panel keeps its error state rather than showing an empty list, and nothing outside Cojeev changed.','bad');
    else{bt.disabled=true;say(host,'Stopped after 3 attempts — '+reason+' every time. A real app backs off and keeps the last error visible rather than retrying forever.','bad')}},700)})});
 /* mobile dock: Ask and More are distinct, and the panel relationship is declared */
 queryAll('.v-dock').forEach(dock=>{const act=query('.v-dock__action',dock);const more=queryAll('.v-dock__item',dock).find(x=>/more/i.test(x.getAttribute('aria-label')||''));
  const panel=dock.parentElement&&query('.v-dockpanel',dock.parentElement);
  /* the trigger state is part of setPanel below — a parallel setOpen was competing with it */if(!panel)return;
  if(!panel.id)panel.id='dockpanel-'+Math.random().toString(36).slice(2,7);
  const setPanel=(open,kind)=>{panel.hidden=!open;dock.classList.toggle('-open',open);
   /* the trigger's announced state belongs to this one function, so Escape, selection and the click path
      can never disagree (a parallel setOpen used to fight it) */
   if(more)more.setAttribute('aria-expanded',String(!!open&&kind!=='ask'));
   const sc=panel.previousElementSibling;if(sc&&sc.classList&&sc.classList.contains('v-mobile-scrim'))sc.hidden=!open;
   const t=query('.v-dockpanel__title',panel);if(t&&open)t.textContent=kind==='ask'?'Ask Cojeev':'More';
   const body=queryAll('.v-item',panel);
   if(open&&kind==='ask'){panel.dataset.kind='ask';body.forEach(x=>x.hidden=true);
    let ask=query('[data-ask-body]',panel);
    if(!ask){ask=document.createElement('div');ask.setAttribute('data-ask-body','');ask.style.display='grid';ask.style.gap='8px';
     ask.innerHTML='<span class="v-bubble">What needs me right now?</span><span class="v-bubble">Two things: Cedar wants a push approved, Willow found one invoice total that differs.</span><p class="v-meta" style="color:rgba(251,244,230,.6)">Canned demo reply — nothing is sent.</p>';
     panel.appendChild(ask)}ask.hidden=false}
   else if(open){panel.dataset.kind='more';body.forEach(x=>x.hidden=false);const ask=query('[data-ask-body]',panel);if(ask)ask.hidden=true}
   [act,more].forEach(x=>{if(!x)return;x.dataset.owned='dock';x.setAttribute('aria-controls',panel.id);x.setAttribute('aria-expanded',String(open&&((x===act)===(kind==='ask'))))})};
  setPanel(false,'more');
  act&&act.addEventListener('click',()=>setPanel(panel.hidden||panel.dataset.kind!=='ask','ask'));
  more&&more.addEventListener('click',e=>{e.preventDefault();setPanel(panel.hidden||panel.dataset.kind!=='more','more')});
  /* The trigger is a SIBLING of the panel, so a key pressed while it holds focus never reaches
     panel.addEventListener — bind the dismiss on a scope that contains both. */
  const frame=dock.parentElement||dock;
  frame.addEventListener('keydown',e=>{if(e.key!=='Escape'||panel.hidden)return;
   e.stopPropagation();setPanel(false,'more');(act||more).focus()});
  /* Selection: this owner had no .v-item branch — the answer lived in the block removed during
     de-duplication, so choosing Library did nothing at all. */
  /* Destinations: the four dock items were bare href="#" links, so a tap jumped the catalog to its top and
     changed nothing. They now select like the rail does (aria-current moves, the panel closes, a note says so). */
  queryAll('.v-dock__item',dock).filter(x=>x!==more).forEach(it=>{if(!claim(it,'dock-dest'))return;
   it.addEventListener('click',e=>{if(it.getAttribute('href')==='#')e.preventDefault();
    queryAll('.v-dock__item',dock).forEach(x=>x.removeAttribute('aria-current'));it.setAttribute('aria-current','page');
    if(!panel.hidden)setPanel(false,'more');
    const en=it.closest('.entry');if(en)note(en,'Selected '+(it.getAttribute('aria-label')||it.textContent.trim())+' — demo navigation, no screen is loaded.')})});
  panel.addEventListener('click',e=>{const row=e.target.closest('.v-item');if(!row||row.hidden)return;
   const name=(query('.v-item__title',row)||row).textContent.trim();
   setPanel(false,'more');
   const en=row.closest('.entry');
   if(en)note(en,name+' selected — the panel closed and the dock kept Work current, because '+name+' is reached from More rather than being a dock destination. Nothing was loaded.');
   (act||more).focus()})});
}
/* Declared actions that had no owner. Bound once per element; each produces a simulated, inspectable
   result and states plainly that no host is contacted. */
function declaredActions(){
 queryAll('#health-line button').filter(x=>/Run a test/i.test(x.textContent)).forEach(bt=>{if(!claim(bt,'health-test'))return;
  bt.addEventListener('click',()=>{const card=bt.closest('.v-card');const line=query('.v-health',card);
   bt.setAttribute('aria-busy','true');const t0=bt.textContent;bt.innerHTML=spin+'Testing…';
   if(line){line.className='v-health -check';line.innerHTML=ic('clock')+'<span class="v-word">Test running</span><span class="v-age">started just now</span>'}
   note(card,'Test started (simulated) · receipt #SIM-T-7781. Nothing outside Cojeev runs.');
   setTimeout(()=>{bt.removeAttribute('aria-busy');bt.textContent=t0;
    if(line){line.className='v-health -ok';line.innerHTML=ic('check')+'<span class="v-word">Working</span><span class="v-age">test passed just now</span>'}
    note(card,'Simulated test finished: 3 of 3 steps ran, no outside changes · receipt #SIM-T-7781.','ok');
    toast('Test finished (simulated) · #SIM-T-7781','-cream',{label:'Receipt'})},1100)})});
 queryAll('#needs-you button').filter(x=>/Open run/i.test(x.textContent)).forEach(bt=>{if(!claim(bt,'needs-openrun'))return;
  bt.addEventListener('click',()=>{const row=bt.closest('.v-needs');
   note(row,'Run RUN-3M77-BD4 · Moss · resolved by you in Cursor at 08:02. This demo has no run page, so nothing navigated and no host was opened.')})});
}
/* A result must render inside the component's own flow. The gallery is a max-content grid, so appending to
   it made the note a sibling column and squeezed the capsule; the note now lives in a full-width slot. */
function slotFor(el){const host=el.closest('.v-compose')||el.parentElement;let s=host.querySelector(':scope>[data-note-slot]');
 if(!s){s=document.createElement('div');s.setAttribute('data-note-slot','');s.style.gridColumn='1/-1';host.appendChild(s)}return s}
/* LIBRARY APPLY, DELEGATED — three binding attempts failed on element lookup and init ordering; a single
   document-level listener cannot miss the button, and the mutation is the only thing that announces success. */
document.addEventListener('click',ev=>{
 const btn=ev.target.closest('#library button');if(!btn||!/^Apply/i.test(btn.textContent.trim()))return;
 if(btn.dataset.applied)return;
 const e=document.getElementById('library');const cols=queryAll('.v-diff__col',e);if(cols.length<2)return;
 const [nowCol,afterCol]=cols;
 const after=queryAll('.v-diff__line',afterCol).map(l=>l.textContent.trim());
 queryAll('.v-diff__line',nowCol).forEach((l,n)=>{if(after[n]!==undefined){l.textContent=after[n];l.className='v-diff__line -add'}});
 queryAll('.v-diff__line',afterCol).forEach(l=>{l.className='v-diff__line';l.style.opacity='.45'});
 const cap=query('.v-caps',afterCol);if(cap)cap.textContent='Applied';
 btn.dataset.applied='1';btn.disabled=true;btn.textContent='Applied';
 const cancel=queryAll('button',e).find(x=>/^Cancel/i.test(x.textContent.trim()));if(cancel)cancel.disabled=true;
 note(e,'Applied in this demo only · receipt #SIM-C4471 · your real Library configuration is unchanged.','ok');
 toast('Applied (simulated) · receipt #SIM-C4471','-cream',{label:'Receipt'});
});
/* TEXTAREA SEND — delegated, so it cannot miss on init order. The message leaves the field and appears as a
   sent record with a receipt; nothing is transmitted. */
document.addEventListener('click',ev=>{
 const btn=ev.target.closest('#textarea button, #message button');if(!btn)return;
 const host=btn.closest('.demo');if(!host)return;
 const ta=query('textarea',host);if(!ta)return;
 const text=(ta.value||'').trim();
 const field=ta.closest('.v-field')||host;
 if(!text){ta.setAttribute('aria-invalid','true');ta.focus();note(host,'Type a message first — nothing was sent.','bad');return}
 ta.removeAttribute('aria-invalid');ta.value='';
 let log_=query('[data-sent]',host);
 if(!log_){log_=document.createElement('div');log_.setAttribute('data-sent','');log_.style.cssText='display:grid;gap:8px;margin-top:12px';host.appendChild(log_)}
 const n=log_.children.length+1;
 const row=document.createElement('div');row.className='v-card';row.style.cssText='background:var(--v-canvas);display:grid;gap:6px;padding:14px';
 row.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="v-badge -olive">Sent</span><span class="v-badge -cream v-id">SIM-M'+(7300+n)+'</span><span class="v-quiet" style="margin-left:auto;font-size:12px">just now</span></div><p class="v-body" style="font-size:15px">'+text.replace(/</g,'&lt;')+'</p><p class="v-quiet" style="font-size:12px">Simulated — no message left this page.</p>';
 log_.appendChild(row);
 toast('Message sent (simulated) · SIM-M'+(7300+n),'-cream');
});
function dropzone(){const z=query('[data-drop]');if(!z)return;const log_=query('[data-drop-log]');let n=0;
 const record=names=>{names.forEach(nm=>{n++;const row=document.createElement('div');row.className='v-card';row.style.cssText='background:var(--v-canvas);display:flex;gap:10px;align-items:center;padding:12px 14px';
  row.innerHTML='<span class="v-disk -sm">'+ic('file-text')+'</span><span style="flex:1;min-width:0"><b style="font-size:14.5px">'+nm.replace(/</g,'&lt;')+'</b><span class="v-quiet" style="display:block;font-size:12px">Simulated record · SIM-F'+(5100+n)+' · not uploaded</span></span><span class="v-badge -olive">Added</span>';
  log_.appendChild(row)});toast(names.length+' file'+(names.length===1?'':'s')+' recorded (simulated)','-cream')};
 ['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.add('-over')}));
 ['dragleave','drop'].forEach(ev=>z.addEventListener(ev,()=>z.classList.remove('-over')));
 z.addEventListener('drop',e=>{e.preventDefault();const names=[...(e.dataTransfer&&e.dataTransfer.files||[])].map(f=>f.name);record(names.length?names:['dropped-file.txt'])});
 const fake=()=>record(['release-notes-2.4.md','diff-summary.png'][Math.floor(Math.random()*2)]?['release-notes-2.4.md']:['diff-summary.png']);
 /* A focused [role=button] already synthesises a click on Enter/Space, so binding keydown as well
   recorded every intent twice. Click is the single owner; keydown only handles Space, which does not
   synthesise a click on a non-button element. */
 z.addEventListener('click',fake);
 z.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();fake()}})}
function stepper(){const f=query('[data-stepper]');if(!f)return;const steps=queryAll('.v-step',f);const say=query('[data-step-say]');let i=steps.findIndex(s=>s.classList.contains('-on'));if(i<0)i=0;
 const paint=()=>{steps.forEach((s,n)=>{s.className='v-step'+(n<i?' -done':n===i?' -on':'');s.toggleAttribute('aria-current',n===i);if(n===i)s.setAttribute('aria-current','step');
  /* Write the glyph INTO the existing circle; a previous version appended, which stacked a second
   numbered disk over each stage. */
  queryAll('.v-step__n',s).slice(1).forEach(x2=>x2.remove());/* one circle per stage, by construction */
  const num=query('.v-step__n',s);if(num){num.textContent='';num.innerHTML=n<i?ic('check'):String(n+1)}});
  if(say)say.textContent='Stage '+(i+1)+' of '+steps.length+' · '+query('.v-step__t',steps[i]).textContent;
  const bk=query('[data-step-back]'),nx=query('[data-step-next]');if(bk)bk.disabled=i===0;if(nx)nx.disabled=i===steps.length-1};
 const bk=query('[data-step-back]'),nx=query('[data-step-next]');
 bk&&bk.addEventListener('click',()=>{if(i>0){i--;paint()}});
 nx&&nx.addEventListener('click',()=>{if(i<steps.length-1){i++;paint()}});
 paint()}
function questionnaire(){queryAll('.v-quest').forEach(q=>{
 const every=queryAll('.v-check input',q).find(i2=>/everyday/i.test((i2.closest('label')||{}).textContent||''));
 const days=queryAll('.v-weekdays input',q);
 if(!every||!days.length||!claim(every,'questionnaire'))return;
 const sync=()=>{const all=days.every(dd=>dd.checked);every.checked=all;every.indeterminate=!all&&days.some(dd=>dd.checked)};
 every.addEventListener('change',()=>{days.forEach(dd=>{dd.checked=every.checked});every.indeterminate=false;
  say(q,every.checked?'All seven days selected.':'No days selected — pick at least one.')});
 days.forEach(dd=>dd.addEventListener('change',()=>{sync();
  const on=days.filter(x2=>x2.checked).length;say(q,on?on+' of 7 days selected.':'No days selected — pick at least one.')}));
 sync()})}
function schedulePopover(){queryAll('.v-popover').forEach(p=>{
 const ch=queryAll('button',p).find(x2=>/^Change$/i.test(x2.textContent.trim()));
 if(!ch||!claim(ch,'schedule'))return;
 ch.addEventListener('click',()=>{
  let ed=query('[data-sched-edit]',p);
  if(!ed){ed=document.createElement('div');ed.setAttribute('data-sched-edit','');ed.style.cssText='display:grid;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--v-edge)';
   ed.innerHTML='<label class="v-label -sm" for="sp-day">Day</label><select class="v-native" id="sp-day"><option>Fridays</option><option>Mondays</option><option>Every weekday</option></select>'+
    '<label class="v-label -sm" for="sp-time">Time</label><select class="v-native" id="sp-time"><option>16:00</option><option>09:00</option><option>21:00</option></select>'+
    '<div style="display:flex;gap:8px"><button class="v-btn -sm" data-sched-save>Save schedule</button><button class="v-btn -sm -secondary" data-sched-cancel>Cancel</button></div>';
   p.appendChild(ed);
   query('[data-sched-save]',ed).addEventListener('click',()=>{
    const dayv=query('#sp-day',ed).value,timev=query('#sp-time',ed).value;
    const head=queryAll('b',p)[0];if(head)head.textContent='Runs '+dayv.toLowerCase()+' '+timev;
    const meta=query('.v-meta,.v-quiet',p);if(meta)meta.textContent='Timezone Europe/Berlin · next run in 2 d 4 h · simulated';
    ed.remove();ch.textContent='Change';say(p,'Schedule set to '+dayv+' at '+timev+' (simulated) · receipt #SIM-S9930.','ok');
    toast('Schedule saved (simulated) · #SIM-S9930','-cream')});
   query('[data-sched-cancel]',ed).addEventListener('click',()=>{ed.remove();ch.textContent='Change';say(p,'Schedule unchanged.')})}
  ch.textContent='Editing…';query('#sp-day',p)&&query('#sp-day',p).focus()})}) }
function nav(){
 /* indeterminate is set here because an inline <script> inside an injected demo string never runs */
 queryAll('#checkbox .v-check input').forEach(i=>{if(/some days/i.test(i.closest('.v-check').textContent))i.indeterminate=true});
 /* A standalone .v-nav (Navigation Menu entry) must select like the rail does; ui.js owns that for
    .v-sidebar, so bind the same contract for navs that live outside one. */
 queryAll('.v-nav').forEach(n=>{
  if(n.closest('.v-sidebar')||n.dataset.navBound)return;n.dataset.navBound='1';
  const items=queryAll('.v-nav__item',n);
  items.forEach((it,idx)=>{
   it.tabIndex=it.hasAttribute('aria-current')?0:-1;
   const pick=()=>{items.forEach(x=>{const on=x===it;if(on)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');x.tabIndex=on?0:-1});
    if(window.VLive&&VLive.replace)VLive.replace();
    note(n.parentElement||n,'Selected '+(query('.v-nav__label',it)||it).textContent.trim()+' — demo navigation, no screen is loaded.')};
   it.addEventListener('click',e=>{if(it.getAttribute('href')==='#')e.preventDefault();pick()});
   it.addEventListener('keydown',e=>{let j=-1;
    if(e.key==='ArrowDown')j=(idx+1)%items.length;else if(e.key==='ArrowUp')j=(idx-1+items.length)%items.length;
    else if(e.key==='Home')j=0;else if(e.key==='End')j=items.length-1;else return;
    e.preventDefault();items[j].focus();items[j].click()})});
  if(window.VLive&&VLive.glide)VLive.glide(n)})}
/* DEAD-END ACTIONS — one delegated owner, so an enabled control in these examples always says what it did.
   Nothing contacts a host; every line is explicit about being simulated. */
document.addEventListener('click',ev=>{
 const item=ev.target.closest('.v-menu__item,.v-menubar__trigger + .v-menu .v-menu__item');
 /* a menu with a dedicated owner writes its own message; the generic one must not overwrite it */
 if(item&&item.closest('[data-owned="menu"]'))return;
 if(item&&!item.dataset.owned){
  const entry=item.closest('.entry');const label=item.textContent.trim();
  if(entry&&!item.closest('[data-demo]')&&!/^(Keep|Cancel|Close)$/i.test(label)){
   note(entry,'“'+label+'” ran in this demo only — nothing was created, sent or changed.')}}
 const search=ev.target.closest('.v-igroup .v-btn,.v-cmd__input + *');
 if(search&&/^search$/i.test(search.textContent.trim())){
  const g=search.closest('.v-igroup');const q=(query('input',g)||{}).value||'';
  const scope=queryAll('.v-badge.-ink,.v-badge.-dashed',g).map(x=>x.textContent.trim()).join(', ');
  note(search.closest('.entry'),q?('Searched “'+q+'”'+(scope?' in '+scope:'')+' — 3 demo matches, no index was queried.'):'Type something to search the demo index.')}
 const clear=ev.target.closest('.v-state .v-btn,.v-empty .v-btn');
 if(clear&&/clear|show all/i.test(clear.textContent)&&!clear.closest('[data-demo]')){
  const st=clear.closest('.v-state,.v-empty');const entry=clear.closest('.entry');
  if(st&&entry){st.hidden=true;
   /* Announce nothing we cannot show: if the entry has no list to restore, build the three demo rows the
      message refers to, so "the full demo list is shown again" is actually true. */
   let list=query('.v-list,.v-table-wrap',entry);
   if(list)list.hidden=false;
   else{list=document.createElement('div');list.className='v-list';list.dataset.restored='1';
    list.innerHTML=[['Cedar','release notes','pink','09:12'],['Moss','weekly digest','olive','07:40'],['Willow','invoice check','blue','yesterday']]
     .map(([a,t,c,w])=>'<div class="v-item"><span class="v-disk -sm -'+c+'"></span><span class="v-item__body"><span class="v-item__title">'+a+' · '+t+'</span><span class="v-item__sub">illustrative record</span></span><span class="v-meta">'+w+'</span></div>').join('');
    st.parentElement.insertBefore(list,st.nextSibling);window.V&&V.init&&V.init(list)}
   note(entry,'Filter cleared — 3 demo records shown. Nothing was queried.')}}
});
/* Context menu: right-click already works via ui.js, but the host was not reachable by keyboard. */
document.addEventListener('keydown',ev=>{
 if(ev.key!=='F10'||!ev.shiftKey){if(ev.key!=='ContextMenu')return}
 const host=ev.target.closest('[data-context]');if(!host)return;
 ev.preventDefault();const m=query(host.dataset.context);
 if(m&&window.VUI&&VUI.showMenu){const r=host.getBoundingClientRect();VUI.showMenu(m,host,{x:Math.round(r.left+24),y:Math.round(r.top+24)})}});
function commandResult(){
 queryAll('.v-cmd').forEach(cmd=>{
  if(cmd.dataset.resultBound)return;cmd.dataset.resultBound='1';
  const host=cmd.parentElement||cmd;
  cmd.addEventListener('click',ev=>{
   const it=ev.target.closest('.v-menu__item');if(!it)return;
   const label=it.textContent.trim();
   let out=query('[data-cmd-result]',host);
   if(!out){out=document.createElement('div');out.dataset.cmdResult='1';out.className='v-card -quiet';
    out.style.marginTop='12px';out.setAttribute('role','status');host.appendChild(out)}
   const body={Memory:['248 notes · 3 agents','Cedar 96 · Moss 84 · Willow 68','Opening Memory would show these groups.'],
    Work:['14 runs today','2 need you · 12 done','Opening Work would show the Now lens.'],
    Automations:['6 agents','4 working · 1 needs a check · 1 not checked','Opening Automations would list them.'],
    'Quick note':['Empty note','nothing captured yet','Opening Quick Note would focus the field.'],
    'Stop all agents':['6 agents','would be asked to stop','Nothing was stopped — this is a demo.']}[label]
    ||[label,'ran in this demo','No screen is loaded and nothing was contacted.'];
   out.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="v-badge -olive">Done</span><b>'+label+'</b><span class="v-meta" style="margin-left:auto">simulated</span></div>'
    +'<div class="v-mcard__value" style="font-size:24px;margin-top:8px">'+body[0]+'</div>'
    +'<p class="v-body-2" style="font-size:13px">'+body[1]+'</p><p class="v-meta">'+body[2]+'</p>'},true)})}
function notifications(){
 const e=query('#notifications');if(!e)return;
 const bell=query('[data-bell]',e),sheet=query('.v-sheet',e);if(!bell)return;
 const rows=()=>queryAll('.v-needs',sheet||e);
 const sync=()=>{const unread=rows().filter(r=>r.hasAttribute('data-unread')).length;
  bell.setAttribute('aria-label',unread?('Notifications, '+unread+' unread'):'Notifications, all read');
  let dot=query('[data-dot]',bell);
  if(unread&&!dot){dot=document.createElement('span');dot.dataset.dot='1';
   dot.style.cssText='position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--v-pink)';
   bell.style.position='relative';bell.appendChild(dot)}
  if(!unread&&dot)dot.remove();
  rows().forEach(r=>{const meta=query('.v-needs__meta',r);if(!meta)return;
   const isRead=r.hasAttribute('data-read');
   meta.textContent=meta.textContent.replace(/·\s*(unread|read)$/,'· '+(isRead?'read':'unread'));
   r.style.opacity=isRead?'.72':''})};
 sync();
 (sheet||e).addEventListener('click',ev=>{
  const btn=ev.target.closest('[data-open-run]');if(!btn)return;
  const row=btn.closest('.v-needs');
  const reason=(query('.v-needs__reason',row)||{}).textContent||'this event';
  const host=/cursor/i.test((query('.v-needs__meta',row)||{}).textContent||'')?'Cursor':'Claude Code';
  row.removeAttribute('data-unread');row.setAttribute('data-read','');sync();
  let out=query('[data-run-result]',row);
  if(!out){out=document.createElement('p');out.dataset.runResult='1';out.className='v-meta';
   out.setAttribute('role','status');out.style.gridColumn='1 / -1';row.appendChild(out)}
  out.textContent='Marked read. In the real app this opens the run in '+host+' — this demo has no run page, so nothing navigated.';
  note(e,'“'+reason.trim()+'” marked read · '+rows().filter(r=>r.hasAttribute('data-unread')).length+' unread left. Simulated only.')})}
/* REMAINING DEAD ACTIONS — Settings' Fix with Cojeev, Widgets' Refresh. One delegated owner, explicit
   simulated outcomes, nothing contacted. */
document.addEventListener('click',ev=>{
 const fix=ev.target.closest('#settings .v-btn');
 if(fix&&/fix with cojeev/i.test(fix.textContent)){
  const card=fix.closest('.v-card');if(!card)return;
  if(fix.dataset.busy)return;fix.dataset.busy='1';fix.setAttribute('aria-busy','true');
  const label=fix.textContent.trim();fix.textContent='Opening…';
  setTimeout(()=>{fix.removeAttribute('aria-busy');fix.textContent=label;delete fix.dataset.busy;
   let out=query('[data-fix-result]',card);
   if(!out){out=document.createElement('div');out.dataset.fixResult='1';out.className='v-alert -info';
    out.setAttribute('role','status');out.style.marginTop='10px';card.appendChild(out)}
   out.innerHTML='<div class="v-alert__body"><div class="v-alert__title">Ask Cojeev would open here</div>'
    +'<div class="v-alert__text">With the failing check (Cursor logs · permission denied) and its evidence attached. '
    +'This demo opens no chat and contacts no host.</div></div>'},520)}
 const ref=ev.target.closest('#widgets .v-btn,#widgets .v-ibtn');
 if(ref&&/refresh/i.test((ref.getAttribute('aria-label')||ref.textContent||''))){
  const w=ref.closest('.v-widget,.v-card')||ref.parentElement;
  if(ref.dataset.busy)return;ref.dataset.busy='1';ref.setAttribute('aria-busy','true');
  const rows=queryAll('.v-prow',w);
  setTimeout(()=>{ref.removeAttribute('aria-busy');delete ref.dataset.busy;
   const vals=[8.8,6.2,8.3,4.1];
   rows.forEach((r,i)=>{const bar=query('.v-track>i',r),val=query('.v-prow__val',r);
    if(bar)bar.style.setProperty('--p',(vals[i%4]*10)+'%');
    /* a score without its unit is not a score: keep whatever the row already said after the number */
    if(val){const rest=(val.textContent||'').replace(/^\s*[\d.,]+\s*/,'');val.textContent=vals[i%4].toFixed(1)+(rest?' '+rest:'')}});
   note(w,'Re-read the demo snapshot · observed 09:41 · nothing was contacted.')},560)}
});
/* REMAINING INERT CONTROLS — one owner, explicit simulated outcomes. */
function inertOwners(){
 /* icon-only and storyboard controls: an icon button has no text, so the promotion sweep could never match it
    and the utility owner was scoped to .v-utility */
 queryAll('.entry button').forEach(x=>{
  if(x.dataset.owned||x.dataset.wired||x.closest('[data-demo]')||x.closest('.ap'))return;
  const name=(x.getAttribute('aria-label')||x.textContent||'').trim();
  const bare=!x.textContent.trim();
  if(!name)return;
  if(!(bare||/^(More|Step through the story|Play|Edit)$/i.test(name)))return;
  x.dataset.owned='1';
  x.addEventListener('click',()=>{const en=x.closest('.entry');if(!en)return;
   if(/step(ping)? through|storyboard/i.test(name)){
    const card=x.closest('.v-card')||en;let i=+(card.dataset.step||0);
    const steps=['1 · Cedar reads the merged pull requests','2 · It groups breaking changes first','3 · It drafts the notes','4 · It stops and asks you'];
    card.dataset.step=String((i+1)%steps.length);
    note(en,steps[i]+' — illustrative storyboard, nothing plays.')}
   else note(en,'“'+name+'” would open its menu here. This demo has no destination, so nothing opened.')})});

 /* action-looking text is promoted to a real button: it escaped the cursor census because it was a span */
 queryAll('.entry').forEach(en=>queryAll('span,div',en).forEach(el=>{
  if(el.children.length||el.dataset.promoted)return;
  const t=(el.textContent||'').trim();
  if(!/^(Open transcript|Open resource ↗|Open barcode ▯▯|Show all …|More)$/.test(t))return;
  const btn=document.createElement('button');btn.className='v-btn -sm -ghost';btn.type='button';
  btn.textContent=t;btn.dataset.promoted='1';btn.style.padding='0';btn.style.height='auto';
  btn.addEventListener('click',()=>note(en,'“'+t+'” would open here. This demo has no destination, so nothing navigated.'));
  el.replaceWith(btn)}));
 /* the assistant closes itself */
 queryAll('.v-assist__close').forEach(x=>{if(!claim(x,'assist-close'))return;
  x.addEventListener('click',()=>{const p=x.closest('.v-assist');if(!p)return;p.hidden=true;
   const en=x.closest('.entry');if(en){note(en,'Ask Cojeev dismissed (demo).');
    let re=query('[data-reopen]',en);if(!re){re=document.createElement('button');re.dataset.reopen='1';
     re.className='v-btn -sm -secondary';re.textContent='Show Ask Cojeev';
     re.addEventListener('click',()=>{p.hidden=false;re.remove();query('.v-assist__close',p).focus()});
     en.querySelector('.demo').appendChild(re)}}})});
 /* dock state is owned by compositeActions (one setOpen governs panel, scrim, aria-expanded) */
 /* joined utilities answer */
 queryAll('.v-utility .v-ibtn').forEach(x=>{if(!claim(x,'utility'))return;
  x.addEventListener('click',()=>{const en=x.closest('.entry');if(en)note(en,(x.getAttribute('aria-label')||'This control')+' would open its panel. Nothing was contacted.')})});
 /* retry is owned by declaredActions, which writes the note AND restores the control */
}
function scope(){
 const e=query('#scope-picker');if(!e)return;
 const btn=query('.v-select',e),list=query('.v-listbox',e),alert=query('.v-alert',e);
 if(!btn||!alert)return;
 const state={viewing:(query('[data-value]',btn)||btn).textContent.replace(/^Viewing:\s*/,'').trim()||'Cedar',def:'Moss'};
 const title=query('.v-alert__title',alert),text=query('.v-alert__text',alert);
 const action=queryAll('.v-btn',e).find(x=>/default/i.test(x.textContent));
 const render=()=>{
  const v=state.viewing,dflt=state.def,same=v===dflt||/^all projects$/i.test(v);
  (query('[data-value]',btn)||btn).textContent=v;
  const chip=(n,c)=>'<span class="v-badge -'+c+'">'+n+'</span>';const hue=n=>/^cedar$/i.test(n)?'yellow':/^moss$/i.test(n)?'olive':'blue';
  if(title)title.innerHTML=same?('Viewing '+chip(v,hue(v))+(/^all/i.test(v)?'':' · your default')):('Viewing '+chip(v,hue(v))+' · default is '+chip(dflt,hue(dflt)));
  if(text)text.textContent=/^all projects$/i.test(v)?'Nothing is filtered away.':(same?'This view matches your default project.':'This filter changes this view only.');
  if(action){action.hidden=same;action.textContent='Make '+v+' default'}};
 render();
 if(list){list.dataset.owned='menu';list.addEventListener('click',ev=>{const o=ev.target.closest('.v-menu__item');if(!o)return;
  ev.stopPropagation();state.viewing=(o.querySelector('.v-badge')?[...o.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''):o.textContent).trim();render();
  note(e,'Viewing '+state.viewing+' — your default is still '+state.def+'. Filter only; nothing was changed.')})}
 if(action)action.addEventListener('click',()=>{state.def=state.viewing;render();
  note(e,state.def+' is now the default in this demo · receipt #SIM-D2210. No real setting was written.','ok')})}
/* Every owner is isolated: init() used to call several owners directly, so the first one that threw removed
   all the owners after it — which is how the data table, the transcript promotion and the dock owner all
   disappeared at once. Each runs in its own try/catch, failures are named on window.VDemoBoot, and one bad
   owner can no longer take the library's behaviour with it. */
function itemRows(){
 queryAll('#item .v-item,#item [role="listitem"]').forEach(row=>{
  if(row.dataset.owned)return;row.dataset.owned='1';
  if(row.tagName!=='BUTTON'&&!row.hasAttribute('tabindex'))row.tabIndex=0;
  const name=(query('.v-item__title',row)||row).textContent.trim();
  const act=()=>{const list=row.parentElement;
   queryAll('.v-item',list).forEach(x=>{const on=x===row;x.classList.toggle('-selected',on);
    x.setAttribute('aria-current',String(on))});
   if(window.VLive&&VLive.replace)VLive.replace();
   note(row.closest('.entry'),name+' selected — a list row reports its selection; this demo loads no detail view.')};
  row.addEventListener('click',act);
  row.addEventListener('keydown',ev=>{if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();act()}})})}
/* ---------- App shell: one state owns the width preview and both global journeys ----------
   Ask and Needs You are the two affordances that exist on every screen, so the shell has to be able to
   show what they DO, not just that they are there. One `state.panel` owns which is open, so the two
   triggers can never both claim to be expanded, and both journeys render into the page's own slot so the
   result appears where the real one would. Nothing here contacts a host. */
const NEEDS=[
 {id:'RUN-1EG4-TE5',agent:'Cedar',what:'release notes',asks:'Approve the git push',host:'Claude Code',waited:'3 min',
  detail:'Tests passed. The diff touches CHANGELOG.md and two docs pages.',c:'pink',icon:'git-branch'},
 {id:'RUN-8KP2-QQ1',agent:'Willow',what:'invoice check',asks:'Confirm one invoice total',host:'Cursor',waited:'40 min',
  detail:'Twelve invoices checked against their PDFs; one total differs by \u00a340.',c:'blue',icon:'monitor'}];
function appShell(){const e=query('[data-demo="app-shell"]');if(!e)return;
 const shell=query('[data-shell]',e),slot=query('[data-shell-slot]',e),say=query('[data-shellsay]',e),
  askBtn=query('[data-shell-ask]',e),needsBtn=query('[data-shell-needs]',e),badge=query('[data-needs-count]',e);
 if(!shell||!slot||!askBtn||!needsBtn)return;
 const state={panel:null,seen:[],sent:0};

 /* --- the width control resizes the shell's own container, so the breakpoints are the shipped ones --- */
 /* The status line is the user-facing evidence for the reflow, so it must read the layout AFTER it settles.
    A single requestAnimationFrame fires before the container query and the grid re-resolve, so it printed the
    PREVIOUS preset's numbers — "rail 76 px" beside a 174 px rail. A ResizeObserver on the shell reports when
    the layout has actually changed, which is exactly the moment worth describing. */
 const describe=()=>{const w=Math.round(shell.getBoundingClientRect().width);
  const sb=query('.v-sidebar',shell),main=query('.v-main',e);
  const cs=sb?getComputedStyle(sb):null;
  const sbr=sb?sb.getBoundingClientRect():{width:0,height:0};
  const hidden=!cs||cs.display==='none'||sbr.width<1;
  /* A pill row is the rail laid out as a ROW — ask the layout, do not infer it from proportions. */
  const asRow=!hidden&&cs.flexDirection==='row'&&cs.display==='flex';
  /* Read the rail's own width from the shell's first track, so the number quoted is the track that exists. */
  const track=getComputedStyle(shell).gridTemplateColumns.split(/\s+/)[0];
  const labels=sb?queryAll('.v-nav__label',sb).filter(l=>getComputedStyle(l).display!=='none').length:0;
  const tracks=main?getComputedStyle(main).gridTemplateColumns.split(/\s+/).filter(Boolean).length:1;
  say.textContent=w+' px \u00b7 '+(hidden?'rail hidden'
    :asRow?'destinations as a pill row'
    :(labels?'rail '+track+' with labels':'rail '+track+', icons only'))
   +' \u00b7 agenda '+(tracks>1?'beside the content':'under the content')};
 const settle=('ResizeObserver' in window)?new ResizeObserver(()=>describe()):null;
 if(settle)settle.observe(shell);
 queryAll('[data-shellw] button',e).forEach(b=>b.addEventListener('click',()=>{
  queryAll('[data-shellw] button',e).forEach(x=>x.setAttribute('aria-selected',String(x===b)));
  const w=+b.dataset.w;
  if(w){shell.style.width=w+'px';shell.style.maxWidth='none'}else{shell.style.width='';shell.style.maxWidth=''}
  /* No rAF here: the observer above fires once the layout has actually settled, which is the only moment
     whose numbers are true. */}));

 /* --- one owner for both panels --- */
 const close=(focusBack=true)=>{if(!state.panel)return;const back=state.panel==='ask'?askBtn:needsBtn;
  state.panel=null;slot.innerHTML='';askBtn.setAttribute('aria-expanded','false');needsBtn.setAttribute('aria-expanded','false');
  if(focusBack)back.focus()};
 const frame=(title,body,tone)=>'<section class="v-card'+(tone?' '+tone:'')+'" data-shell-panel style="margin-top:4px;padding:14px;border-radius:16px;display:grid;gap:10px" aria-label="'+title+'">'
  +'<div class="v-sechead"><span class="v-lead" style="font-size:15px">'+title+'</span>'
  +'<button class="v-ibtn -sm -dashed" type="button" data-panel-close aria-label="Close '+title+'">'+ic('x')+'</button></div>'+body+'</section>';

 const needsBody=()=>{
  /* Reading a request does not answer it. `seen` is a READ state; the count is UNRESOLVED work, and only the
     host where the agent is waiting can change that \u2014 which this demo cannot, and must not imply it did. So the
     badge never falls to zero here, no row ever leaves the list, and the panel says both things at once:
     what you have looked at, and what is still waiting. */
  const unseen=NEEDS.filter(x=>!state.seen.includes(x.id)).length;
  return NEEDS.map(x=>{const seen=state.seen.includes(x.id);
   return '<div class="v-item" style="align-items:flex-start;min-height:0;padding:10px 12px'+(seen?';opacity:.8':'')+'"><span class="v-disk -sm -'+x.c+'">'+ic(x.icon)+'</span>'
   +'<span class="v-item__body"><span class="v-item__title">'+x.agent+' \u00b7 '+x.what
   +' <span class="v-badge '+(seen?'-cream':'-pink')+' -sm">'+(seen?'read':'unread')+'</span></span>'
   +'<span class="v-item__sub">'+x.asks+' \u00b7 still waiting '+x.waited+' \u00b7 in '+x.host+'</span>'
   +'<span class="v-meta">'+x.detail+'</span>'
   +'<span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
   +'<button class="v-btn -sm" type="button" data-needs-open="'+x.id+'">Open in '+x.host+'</button>'
   +'<button class="v-btn -sm -secondary" type="button" data-needs-seen="'+x.id+'"'+(seen?' disabled':'')+'>'+(seen?'Read':'Mark as read')+'</button></span></span>'
   +'<span class="v-badge -cream v-id">'+x.id+'</span></div>'}).join('')
   +'<p class="v-meta" role="status" data-needs-say><b>'+NEEDS.length+' still need you</b>'
   +(unseen?' \u00b7 '+unseen+' you have not read yet':' \u00b7 you have read both')
   +'. Marking one as read changes what you have seen, not what it is waiting for \u2014 only Claude Code or Cursor can answer it.</p>'
   +'<div><button class="v-btn -sm -ghost" type="button" data-needs-restore>Mark both unread again</button></div>'};

 const askBody=()=>'<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="v-badge -cream">Project Cedar</span><span class="v-badge -cream">Run #3586895</span><span class="v-badge -cream">2 waiting</span></div>'
  +'<div data-ask-thread style="display:grid;gap:8px"></div>'
  +'<div style="display:flex;gap:8px;align-items:center"><label class="v-input" style="flex:1;min-width:0"><input data-ask-msg placeholder="Ask about this screen" aria-label="Ask Cojeev about this screen"></label>'
  +'<button class="v-btn -sm" type="button" data-ask-send>Ask</button></div>'
  +'<p class="v-meta">Canned demo replies drawn from the records on this screen. Nothing is sent and no model is called.</p>';

 const ASK=[['What needs me right now?','Two things. Cedar wants the 2.4 push approved \u2014 tests passed, three files. Willow found one invoice total that differs by \u00a340.'],
  ['What did they do overnight?','Fourteen runs finished. Cedar drafted the release notes, Moss sent the weekly digest to three recipients, Willow checked twelve invoices.'],
  ['How much time did that save?','14 h 20 m of hands-on time across those fourteen runs \u2014 13 % more than last week.']];
 const paintThread=()=>{const t=query('[data-ask-thread]',slot);if(!t)return;
  t.innerHTML=state.thread.map(([who,text])=>who==='you'
   ?'<span class="v-bubble -you">'+text.replace(/</g,'&lt;')+'</span>'
   :'<span class="v-bubble">'+text+'</span>').join('')
   +(state.card?'<div class="v-card -quiet" style="padding:12px;border-radius:14px;display:grid;gap:6px">'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="v-badge '+(state.card==='done'?'-olive':'-pending')+'">'+(state.card==='done'?'Done':'Running')+'</span><b style="font-size:13.5px">Summarise last night</b><span class="v-meta" style="margin-left:auto">simulated</span></div>'
    +(state.card==='done'
      ?'<p class="v-body-2" style="font-size:13px">Three agents, fourteen runs, two waiting on you.</p><button class="v-btn -sm -secondary" type="button" data-ask-summary aria-expanded="false">Open the summary</button><div data-ask-summary-body hidden></div>'
      :'<p class="v-body-2" style="font-size:13px">Reading the fourteen demo run records\u2026</p>')
    +'</div>':'')};
 state.thread=[];state.card=null;

 const open=kind=>{if(state.panel===kind){close();return}
  state.panel=kind;slot.innerHTML=frame(kind==='ask'?'Ask Cojeev':'Needs You',kind==='ask'?askBody():needsBody(),kind==='ask'?'-quiet':'-yellow');
  askBtn.setAttribute('aria-expanded',String(kind==='ask'));needsBtn.setAttribute('aria-expanded',String(kind==='needs'));
  fill(slot);if(window.VLive)VLive.init(slot);
  if(kind==='ask'){if(!state.thread.length){state.thread=[['you',ASK[0][0]],['sj',ASK[0][1]]];state.card='done'}paintThread();
   const m=query('[data-ask-msg]',slot);m&&m.focus()}
  else{const f=query('button',slot);f&&f.focus()}};

 askBtn.addEventListener('click',()=>open('ask'));
 needsBtn.addEventListener('click',()=>open('needs'));
 const syncBadge=()=>{const waiting=NEEDS.length,unseen=NEEDS.filter(x=>!state.seen.includes(x.id)).length;
  /* The badge counts UNRESOLVED work, so it agrees with the page's own "2 need you". Read state is said in
     words and in the row's own pill, never by removing the count \u2014 a zero badge beside "two need you" was the
     interface claiming that reading had resolved something. */
  if(badge){badge.textContent=String(waiting);badge.hidden=false;
   badge.style.background=unseen?'var(--v-pink)':'var(--v-beige-2)'}
  needsBtn.setAttribute('aria-label','Needs You, '+waiting+' waiting'+(unseen?', '+unseen+' unread':', all read'));
  /* Both triggers are claimed here. inertOwners' .v-utility sweep would otherwise bind a second handler that
     says this control "would open its panel" \u2014 announced after this owner had already opened it. */
  needsBtn.dataset.owned='app-shell';askBtn.dataset.owned='app-shell'};

 /* Both triggers and the slot live inside `e`, so one keydown owner sees Escape wherever focus sits. */
 e.addEventListener('keydown',ev=>{if(ev.key!=='Escape'||!state.panel)return;ev.stopPropagation();close()});
 slot.addEventListener('click',ev=>{
  const t=ev.target;
  if(t.closest('[data-panel-close]')){close();return}
  const restore=t.closest('[data-needs-restore]');
  if(restore){state.seen=[];syncBadge();
   slot.innerHTML=frame('Needs You',needsBody(),'-yellow');fill(slot);
   const f=query('button',slot);f&&f.focus();
   note(e,'Both requests are unread again. Neither was ever resolved \u2014 read state is all this control touches.');return}
  const seen=t.closest('[data-needs-seen]');
  if(seen){const id=seen.dataset.needsSeen;
   if(!state.seen.includes(id))state.seen.push(id);
   syncBadge();slot.innerHTML=frame('Needs You',needsBody(),'-yellow');fill(slot);
   const back=query('[data-needs-seen]:not([disabled])',slot)||query('[data-panel-close]',slot);back&&back.focus();
   const x=NEEDS.find(y=>y.id===id);
   note(e,'Marked '+id+' as read \u2014 '+x.agent+' is still waiting for '+x.asks.toLowerCase()+' in '+x.host+'. '+NEEDS.length+' still need you. Reading a request never answers it.');return}
  const go=t.closest('[data-needs-open]');
  if(go){const x=NEEDS.find(y=>y.id===go.dataset.needsOpen);
   note(e,'Handoff preview \u2014 the real app focuses '+x.host+' at '+x.asks.toLowerCase()+' ('+x.id+') and Cojeev stops there. This demo launches nothing and cannot reply for you.');return}
  const send=t.closest('[data-ask-send]');
  if(send){const inp=query('[data-ask-msg]',slot);const v=(inp.value||'').trim();
   if(!v){inp.setAttribute('aria-invalid','true');note(e,'Type a question first \u2014 nothing was asked.','bad');return}
   inp.removeAttribute('aria-invalid');inp.value='';state.sent++;
   const pick=ASK[state.sent%ASK.length];
   state.thread.push(['you',v]);state.thread.push(['sj',pick[1]]);state.card='run';paintThread();
   setTimeout(()=>{state.card='done';paintThread()},900);return}
  const sum=t.closest('[data-ask-summary]');
  if(sum){const box=query('[data-ask-summary-body]',slot);const showing=box.hidden;box.hidden=!showing;
   sum.setAttribute('aria-expanded',String(showing));sum.textContent=showing?'Hide the summary':'Open the summary';
   if(showing)box.innerHTML='<dl class="v-kv" style="margin-top:8px"><dt>Runs</dt><dd>14 finished \u00b7 2 waiting on you</dd>'
    +'<dt>Drawn from</dt><dd>14 demo run records on this screen</dd><dt>Outside changes</dt><dd>None</dd></dl>';return}});
 syncBadge();requestAnimationFrame(describe)}

/* An attachment's own actions. Both were icon-only, so the generic sweep claimed them and said they would
   "open a menu" \u2014 an attachment has no menu; Open shows the thing and Download records the file. */
/* The storyboard promised "four illustrative frames, nothing plays" and opened a generic resource preview
   labelled "Live session (demo)" — the generic owner had claimed it first. It has its own owner now, claimed
   before that sweep, and it shows the four frames it names: a progress ladder, one small readable scene at a
   time, a gentle cross-fade, and language that stays honest about being local. */
const FRAMES=[
 ['Reads the merged pull requests','Cedar opens the 14 merges since 2.3 and reads each title and body.','git-branch','blue'],
 ['Groups breaking changes first','Anything that changes an interface is lifted to the top of the draft.','layers','yellow'],
 ['Drafts the notes','One paragraph per group, in the order a reader needs them.','file-text','olive'],
 ['Stops and asks you','It will not push. The draft waits for a person to approve it.','inbox','pink']];
function storyboard(){queryAll('[data-play]').forEach(host=>{
 if(!claim(host,'storyboard'))return;
 host.addEventListener('click',()=>{
  let i=0;
  const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');
  dlg.setAttribute('aria-labelledby','sb-t');dlg.hidden=true;
  dlg.innerHTML='<div class="v-dialog__head"><h3 class="v-section" id="sb-t">How Cedar drafts release notes</h3>'
   +'<button class="v-ibtn -dashed" data-close aria-label="Close">'+ic('x')+'</button></div>'
   +'<div class="v-steps" data-sb-rail role="tablist" aria-label="Storyboard frames"></div>'
   +'<div data-sb-frame aria-live="polite" style="min-height:186px;display:grid;align-content:start;gap:12px;transition:opacity var(--t-element) var(--enter)"></div>'
   +'<p class="v-meta">Four illustrative frames. Nothing plays and nothing is recorded — this is a drawn '
   +'sequence held in this page.</p>'
   +'<div class="v-dialog__actions"><button class="v-btn -secondary" data-sb-back>Back</button>'
   +'<button class="v-btn" data-sb-next>Next frame</button></div>';
  document.body.appendChild(dlg);
  const rail=query('[data-sb-rail]',dlg),box=query('[data-sb-frame]',dlg),
   back=query('[data-sb-back]',dlg),next=query('[data-sb-next]',dlg);
  rail.innerHTML=FRAMES.map((f,n)=>'<button class="v-step" type="button" role="tab" data-sb-go="'+n+'" '
   +'aria-selected="false"><span class="v-step__n">'+(n+1)+'</span>'
   +'<span class="v-step__t">'+f[0].split(' ').slice(0,2).join(' ')+'</span></button>').join('');
  const paint=()=>{const [title,text,icon,c]=FRAMES[i];
   box.style.opacity='0';
   setTimeout(()=>{
    box.innerHTML='<div class="v-card -'+c+'" style="padding:16px;border-radius:18px;display:grid;gap:10px">'
     +'<span class="v-disk -'+c+'">'+ic(icon)+'</span>'
     +'<b style="font-size:16px;line-height:1.25">'+title+'</b>'
     +'<p class="v-body-2" style="font-size:13.5px;max-width:44ch">'+text+'</p></div>'
     +'<p class="v-meta">Frame '+(i+1)+' of '+FRAMES.length+'</p>';
    fill(box);if(window.VLive)VLive.init(box);
    box.style.opacity='1'},120);
   queryAll('[data-sb-go]',rail).forEach((b,n)=>{b.className='v-step'+(n<i?' -done':n===i?' -on':'');
    b.setAttribute('aria-selected',String(n===i));
    const num=query('.v-step__n',b);if(num){num.textContent='';num.innerHTML=n<i?ic('check'):String(n+1)}});
   back.disabled=i===0;next.disabled=i===FRAMES.length-1;
   next.textContent=i===FRAMES.length-2?'Last frame':'Next frame'};
  rail.addEventListener('click',ev=>{const b=ev.target.closest('[data-sb-go]');if(!b)return;i=+b.dataset.sbGo;paint()});
  back.addEventListener('click',()=>{if(i>0){i--;paint()}});
  next.addEventListener('click',()=>{if(i<FRAMES.length-1){i++;paint()}});
  queryAll('[data-close]',dlg).forEach(b=>b.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
  paint();fill(dlg);VUI.openLayer(dlg,host)})})}
function attachments(){queryAll('.v-attach').forEach(row=>{
 const name=(query('.v-attach__name',row)||{}).textContent||'File';
 const clean=name.replace(/\s+/g,' ').trim();
 const meta=(query('.v-attach__meta',row)||{}).textContent||'';
 queryAll('.v-actions button',row).forEach(bt=>{
  if(!claim(bt,'attachment'))return;
  const kind=/download/i.test(bt.getAttribute('aria-label')||'')?'download':'open';
  bt.setAttribute('aria-label',(kind==='download'?'Download ':'Open ')+clean.split(meta)[0].trim());
  bt.addEventListener('click',()=>{
   const en=bt.closest('.entry');
   if(kind==='open'){const dlg=document.createElement('div');dlg.className='v-dialog';dlg.setAttribute('data-dialog','');dlg.hidden=true;
    dlg.setAttribute('aria-labelledby','at-t');
    dlg.innerHTML='<div class="v-dialog__head"><h3 class="v-section" id="at-t">'+clean.split(meta)[0].trim()+'</h3>'
     +'<button class="v-ibtn -dashed" data-close aria-label="Close">'+ic('x')+'</button></div>'
     +'<div class="v-skel-group" aria-hidden="true" style="display:grid;gap:8px;margin-bottom:12px"><span class="v-skel -line" style="width:92%"></span><span class="v-skel -line" style="width:78%"></span><span class="v-skel -line" style="width:86%"></span></div>'
     +'<p class="v-body">First page of an illustrative document. In the real app this opens the stored file in place; this demo draws a placeholder and reads nothing from disk.</p>'
     +'<dl class="v-kv"><dt>File</dt><dd>'+clean.split(meta)[0].trim()+'</dd><dt>Details</dt><dd>'+meta.replace(/\s+/g,' ').trim()+'</dd><dt>Source</dt><dd>Demo fixture</dd></dl>'
     +'<div class="v-dialog__actions"><button class="v-btn -secondary" data-close>Close</button></div>';
    document.body.appendChild(dlg);fill(dlg);if(window.VLive)VLive.init(dlg);
    queryAll('[data-close]',dlg).forEach(x=>x.addEventListener('click',()=>{VUI.closeLayer(dlg);setTimeout(()=>dlg.remove(),400)}));
    VUI.openLayer(dlg,bt)}
   else{if(en)note(en,'\u201c'+clean.split(meta)[0].trim()+'\u201d recorded as downloaded (simulated) \u00b7 receipt #SIM-DL-'+(4100+queryAll('.v-attach').indexOf(row))+'. No file left this page.','ok')}})})})}

/* A breadcrumb is a trail, so its controls move along it. Back drops the last crumb; a crumb selects itself
   and becomes the current page. Neither used to do anything a person could observe. */
function crumbs(){queryAll('.v-crumbs').forEach(navEl=>{
 if(navEl.dataset.owned)return;navEl.dataset.owned='crumbs';
 const back=query('.v-ibtn',navEl);
 const full=[...navEl.childNodes].map(n2=>n2.cloneNode(true));
 const labels=()=>queryAll('a,[aria-current]',navEl).map(x=>x.textContent.trim());
 const en=navEl.closest('.entry');
 const restore=()=>{navEl.innerHTML='';full.forEach(n2=>navEl.appendChild(n2.cloneNode(true)));wire();fill(navEl)};
 const truncate=to=>{
  const parts=queryAll('a,[aria-current]',navEl);
  const idx=parts.indexOf(to);if(idx<0)return;
  /* everything after the chosen crumb goes, and the chosen crumb becomes the current page */
  let n2=to.nextSibling;while(n2){const nx=n2.nextSibling;n2.remove();n2=nx}
  const span=document.createElement('span');span.setAttribute('aria-current','page');span.textContent=to.textContent.trim();
  to.replaceWith(span);
  if(en)note(en,'Moved up to \u201c'+span.textContent+'\u201d \u2014 the trail now ends there and it is the current page. Demo navigation; no screen was loaded.');
  addReset()};
 const addReset=()=>{if(!en||query('[data-crumb-reset]',en))return;
  const b=document.createElement('button');b.dataset.crumbReset='1';b.type='button';b.className='v-btn -sm -secondary';
  b.textContent='Reset the trail';b.addEventListener('click',()=>{restore();b.remove();
   note(en,'Trail reset to All agents \u203a Cedar \u203a Run #2J983KT0.')});
  navEl.parentElement.appendChild(b)};
 function wire(){const bk=query('.v-ibtn',navEl);
  if(bk&&!bk.dataset.owned){bk.dataset.owned='crumbs';bk.addEventListener('click',()=>{
   const parts=queryAll('a,[aria-current]',navEl);
   if(parts.length<2){if(en)note(en,'Already at the top of this trail \u2014 nothing above All agents in this demo.');return}
   truncate(parts[parts.length-2])})}
  queryAll('a',navEl).forEach(a=>{if(a.dataset.owned)return;a.dataset.owned='crumbs';
   a.addEventListener('click',ev=>{ev.preventDefault();truncate(a)})})}
 wire();void back})}

/* Edit photo offers a picture, because that is what it says it does. */
function avatarEdit(){queryAll('[data-avatar-edit]').forEach(wrap=>{
 const bt=query('.v-edit',wrap),face=query('.v-avatar',wrap);if(!bt||!face||!claim(bt,'avatar-picture'))return;
 const OPT=[['SJ','var(--v-pink)','Monogram'],['\u25cf','var(--v-olive)','Olive pebble'],['\u25c6','var(--v-blue)','Blue diamond'],['\u2726','var(--v-yellow)','Yellow star']];
 bt.addEventListener('click',()=>{
  const en=bt.closest('.entry');
  let pick=query('[data-photo-pick]',en);
  if(pick){pick.remove();bt.setAttribute('aria-expanded','false');return}
  pick=document.createElement('div');pick.dataset.photoPick='1';
  pick.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px';
  pick.innerHTML='<span class="v-meta">Choose a demo picture</span>'+OPT.map(([g,c,label],i)=>
   '<button class="v-ibtn" type="button" data-photo="'+i+'" aria-label="'+label+'" title="'+label+'" style="width:36px;height:36px;background:'+c+';color:#111;font:600 14px var(--font-text)">'+g+'</button>').join('')
   +'<button class="v-btn -sm -ghost" type="button" data-photo-cancel>Cancel</button>';
  bt.setAttribute('aria-expanded','true');
  pick.addEventListener('click',ev=>{
   if(ev.target.closest('[data-photo-cancel]')){pick.remove();bt.setAttribute('aria-expanded','false');bt.focus();return}
   const b=ev.target.closest('[data-photo]');if(!b)return;
   const [g,c,label]=OPT[+b.dataset.photo];
   face.innerHTML='<span aria-hidden="true">'+g+'</span>';face.style.background=c;face.style.color='#111';
   pick.remove();bt.setAttribute('aria-expanded','false');bt.focus();
   note(en,'Picture set to \u201c'+label+'\u201d in this demo only \u00b7 receipt #SIM-PIC-3301. Nothing was uploaded.','ok')});
  query('.demo',en).appendChild(pick);query('[data-photo]',pick).focus()})})}

/* Two disclosures that carry meaning a glyph cannot: what a score is, and who the initials are. */
function disclosures(){
 queryAll('[data-define]').forEach(bt=>{if(!claim(bt,'define'))return;
  const body=document.getElementById(bt.getAttribute('aria-controls'));if(!body)return;
  bt.addEventListener('click',()=>{const showing=body.hidden;body.hidden=!showing;
   bt.setAttribute('aria-expanded',String(showing))})});
 queryAll('[data-more-people]').forEach(bt=>{if(!claim(bt,'people'))return;
  const body=document.getElementById(bt.getAttribute('aria-controls'));if(!body)return;
  bt.addEventListener('click',()=>{const showing=body.hidden;body.hidden=!showing;
   bt.setAttribute('aria-expanded',String(showing));bt.textContent=showing?'\u2212 12':'+12'})})}

function init(){
 const owners=[
  ['contextHosts',()=>queryAll('[data-context]').forEach(h=>{if(!h.hasAttribute('tabindex'))h.tabIndex=0;
    if(!h.getAttribute('aria-haspopup'))h.setAttribute('aria-haspopup','menu')})],
  ['questionnaire',questionnaire],['schedulePopover',schedulePopover],['dropzone',dropzone],['stepper',stepper],
  ['appShell',appShell],['storyboard',storyboard],['attachments',attachments],['crumbs',crumbs],['avatarEdit',avatarEdit],['disclosures',disclosures],
  ['declaredActions',declaredActions],['compositeActions',compositeActions],['familyActions',familyActions],
  ['nav',nav],['scope',scope],['inertOwners',inertOwners],['notifications',notifications],
  ['commandResult',commandResult],['dataTable',dataTable],['memory',memory],['builder',builder],
  ['explainers',explainers],['chat',chat],['quickNote',quickNote],['settings',settings],
  ['library',library],['aiApps',aiApps],['normaliseTabs',normaliseTabs],['itemRows',itemRows]];
 const report={ok:[],failed:[]};
 for(const [name,fn] of owners){
  try{if(typeof fn==='function')fn();report.ok.push(name)}
  catch(e){report.failed.push(name+': '+(e&&e.message||e));console.warn('demo-behaviour owner failed:',name,e)}}
 window.VDemoBoot=report;
 return report;
}
window.VDemo={init};
})();
