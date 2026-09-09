/** Behavioral assertions use production hooks/APIs; no source markup is counted as a component. */
export function instrumentMotion(){
 const observers=new Set(),listeners=new Set(),nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener
 const owned=()=>new Error().stack?.includes('/registry/cojeev/motion/')
 for(const name of ['MutationObserver','ResizeObserver']){const Original=window[name];window[name]=class extends Original{constructor(fn){super(fn);this.owned=owned()}observe(...args){if(this.owned)observers.add(this);return super.observe(...args)}disconnect(){observers.delete(this);return super.disconnect()}}}
 EventTarget.prototype.addEventListener=function(type,fn,options){
  const capture=typeof options==='boolean'?options:!!options?.capture,global=this===window||this===document||this instanceof MediaQueryList
  if(global&&owned()&&!options?.signal?.aborted&&![...listeners].some(entry=>entry.target===this&&entry.type===type&&entry.fn===fn&&entry.capture===capture)){
   const entry={target:this,type,fn,capture};listeners.add(entry)
   if(options?.signal)nativeAdd.call(options.signal,'abort',()=>listeners.delete(entry),{once:true})
  }
  return nativeAdd.call(this,type,fn,options)
 }
 EventTarget.prototype.removeEventListener=function(type,fn,options){const capture=typeof options==='boolean'?options:!!options?.capture;for(const entry of listeners)if(entry.target===this&&entry.type===type&&entry.fn===fn&&entry.capture===capture)listeners.delete(entry);return nativeRemove.call(this,type,fn,options)}
 window.motionInstrumentation=()=>({observers:observers.size,listeners:listeners.size,types:[...listeners].map(entry=>entry.type).sort()})
}
export async function checkBehavior({page,scenario,tick,getTime}){
 const checks=[],assert=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})})
 const counts=()=>page.evaluate(()=>({layers:document.querySelectorAll('#group>.v-glide__pill,#group>.v-glide__hover,#group>.v-glide__trail').length,selected:[...document.querySelectorAll('#group>[data-glide-active]')].map(el=>el.id)}))
 if(scenario.id==='lifecycle'){
  let c=await counts();assert('StrictMode creates exactly one three-layer group',c.layers===3,c)
  await page.locator('#item-1').focus();await page.evaluate(()=>{window.retainedGroup=document.getElementById('group');motionGate.rerender()});assert('controlled rerender retains host and focus',await page.evaluate(()=>retainedGroup===document.getElementById('group')&&document.activeElement.id==='item-1'))
  await page.evaluate(()=>motionGate.replaceChildren());await tick(getTime()+80);c=await counts();assert('React child replacement repairs exactly three layers',c.layers===3&&c.selected[0]==='item-0',c)
  await page.locator('#item-1').click();await tick(getTime()+16);await page.locator('#item-2').click();await tick(getTime()+16);await tick(getTime()+2000);c=await counts();assert('interrupted phase settles on latest winner',c.selected[0]==='item-2'&&await page.locator('#group>.v-glide__pill').evaluate(el=>![...el.classList].some(name=>['-gather','-shoot','-land'].includes(name))),c)
  await page.evaluate(()=>{const outside=document.createElement('div');outside.id='outside-owner';outside.className='v-btn';outside.setAttribute('data-morph','fill');outside.textContent='Unrelated';document.body.append(outside);window.outsideBefore=outside.outerHTML;window.retainedHosts=[...document.querySelectorAll('[data-flow-owned],.v-morph-host')];motionGate.unmount()});await tick(getTime()+2500)
  const released=await page.evaluate(()=>({environment:motionInstrumentation(),leftovers:retainedHosts.filter(el=>el.querySelector('svg.v-morph,.v-glide__pill,.v-glide__hover,.v-glide__trail')||el.hasAttribute('data-flow-owned')||el.hasAttribute('data-auto-morph')||el.classList.contains('v-morph-live')).length,outside:document.getElementById('outside-owner').outerHTML===outsideBefore}))
  assert('last owner releases observers and shared listeners',released.environment.observers===0&&released.environment.listeners===0,released.environment);assert('unmount removes owned decoration and cancels queued work',released.leftovers===0,released);assert('outside DOM remains untouched',released.outside)
  await page.evaluate(()=>motionGate.mount());await tick(getTime()+80);c=await counts();assert('remount creates one new group',c.layers===3,c)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await tick(getTime()+500);assert('hidden document releases travel phases',await page.locator('#group>.v-glide__pill').evaluate(el=>![...el.classList].some(name=>name.startsWith('-'))))
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));motionGate.clock(null)});await page.waitForTimeout(100);assert('clock release resumes a usable document',await page.locator('#group>.v-glide__pill').count()===1)
 }else if(scenario.id==='live-settings'){
  await page.evaluate(()=>{localStorage.setItem('v-flow-v1',JSON.stringify({variant:'rubber',speed:2,intensity:1.4,hover:false,hoverStrength:1.6}));window.dispatchEvent(new StorageEvent('storage',{key:'v-flow-v1',newValue:localStorage.getItem('v-flow-v1')}))});await tick(getTime()+80)
  let state=await page.evaluate(()=>({read:motionGate.read(),variant:document.documentElement.dataset.flow,speed:document.documentElement.style.getPropertyValue('--flow-speed'),group:document.getElementById('group').dataset.flowV}))
  assert('storage changes update store, root and mounted group',state.read.flow.variant==='rubber'&&state.variant==='rubber'&&state.group==='rubber'&&state.speed==='2',state)
  const authored=await page.evaluate(()=>{const p=structuredClone(motionGate.read().profile);p.cfg.lobeK=215;p.TIER.blob.reach=11;motionGate.profile(p);motionGate.category('cards',true);return motionGate.read()});assert('category changes preserve authored geometry',authored.profile.cfg.lobeK===215&&authored.profile.TIER.blob.reach===11&&authored.authored)
  await page.evaluate(()=>motionGate.mode('off'));await tick(getTime()+80);assert('Off removes travelling body but preserves real selection',await page.locator('#group>.v-glide__pill').count()===0&&await page.locator('#item-0').getAttribute('aria-selected')==='true')
  await page.evaluate(()=>motionGate.mode('subtle'));await tick(getTime()+80);assert('Subtle restores exactly one group',await page.locator('#group>.v-glide__pill').count()===1)
  await page.locator('#motion-stage').evaluate(el=>el.dataset.flow='off');await tick(getTime()+80);assert('ancestor Off suspends subtree',await page.locator('#group>.v-glide__pill').count()===0)
  await page.locator('#motion-stage').evaluate(el=>delete el.dataset.flow);await tick(getTime()+80);assert('ancestor re-enable reseats current selection',await page.locator('#group>.v-glide__pill').count()===1)
  await page.evaluate(()=>{motionGate.disable('body')});assert('scoped disable preserves explicit host',await page.locator('#body>svg.v-morph').count()===1)
 }else{
  await page.locator('#body').hover();await page.mouse.down();await tick(getTime()+160);const moving=await page.locator('#body>svg.v-morph>path').first().getAttribute('d')
  await page.locator('#item-1').dispatchEvent('click');await tick(getTime()+16);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);await tick(getTime()+16)
  const first=await page.evaluate(()=>({d:document.querySelector('#body>svg.v-morph>path').getAttribute('d'),transform:document.getElementById('body').style.transform,phase:[...document.querySelector('#group>.v-glide__pill').classList].filter(name=>name.startsWith('-')),stored:localStorage.getItem('v-morph-cfg-v3')}));await tick(getTime()+1000)
  const after=await page.locator('#body>svg.v-morph>path').first().getAttribute('d');assert('live reduced preference removes press deformation',first.transform===''&&first.d!==moving);assert('reduced body path remains static',after===first.d);assert('live reduced preference cancels travelling phases',first.phase.length===0,first.phase);assert('effective override preserves authored profile storage',await page.evaluate(()=>localStorage.getItem('v-morph-cfg-v3'))===first.stored)
  await page.mouse.up();await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(50);await tick(getTime()+80);assert('restored preference keeps one body and group',await page.locator('#body>svg.v-morph').count()===1&&await page.locator('#group>.v-glide__pill').count()===1)
 }
 return checks
}
