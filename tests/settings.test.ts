import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as settings from '../registry/sahajiv/motion/settings'

test('shared Adjuster settings migrate, persist three exact payloads, synchronize without hosts, and reset independently',()=>{
 class MemoryStorage{values=new Map<string,string>();getItem(key:string){return this.values.get(key)??null}setItem(key:string,value:string){this.values.set(key,value)}removeItem(key:string){this.values.delete(key)}clear(){this.values.clear()}}
 const store=new MemoryStorage(),browser=Object.assign(new EventTarget(),{localStorage:store}),old=Object.getOwnPropertyDescriptor(globalThis,'window')
 Object.defineProperty(globalThis,'window',{value:browser,configurable:true})
 const fire=(type:string,key?:string|null)=>{const event=new Event(type);if(type==='storage')Object.defineProperty(event,'key',{value:key});browser.dispatchEvent(event)}
 const read=(key:string)=>JSON.parse(store.getItem(key)??'null')
 let offA=()=>{},offB=()=>{}
 try{
  settings.reloadMotionSettings()
  assert.equal(settings.getSettingsSnapshot().authored,false);assert.equal(settings.getMotionMode(),'subtle');assert.equal(settings.getMotionSettings().cats.cards,false)
  assert.deepEqual(settings.getFlowSettings(),settings.FLOW_DEFAULTS);assert.equal(settings.getMorphProfile().cfg.lobeK,130)
  for(const key of ['v-alive-settings','v-morph-cfg','v-morph-cfg-v2','v-motion-cfg','v-authoring-v1','unrelated'])store.setItem(key,'preserved')
  store.setItem(settings.MOTION_KEY,JSON.stringify({v:2,mode:'off',cats:{cards:true,buttons:false}}));settings.reloadMotionSettings()
  assert.equal(settings.getMotionMode(),'off');assert.equal(settings.getMotionSettings().cats.buttons,true);assert.equal(settings.getMotionSettings().cats.cards,false)
  for(const key of ['v-alive-settings','v-morph-cfg','v-morph-cfg-v2','v-motion-cfg'])assert.equal(store.getItem(key),null)
  assert.equal(store.getItem('v-authoring-v1'),'preserved');assert.equal(store.getItem('unrelated'),'preserved')
  let callsA=0,callsB=0,motionEvents=0,flowEvents=0
  browser.addEventListener('v-motion-change',()=>motionEvents++);browser.addEventListener('v-flow',()=>flowEvents++)
  offA=settings.subscribeSettings(()=>callsA++);offB=settings.subscribeSettings(()=>callsB++)
  const changes:[()=>void,()=>void][]=[
   [()=>settings.setMotionMode('subtle'),()=>assert.equal(settings.getMotionMode(),'subtle')],
   [()=>settings.setMotionCategory('cards',true),()=>assert.equal(read(settings.MOTION_KEY).cats.cards,true)],
   [()=>settings.setFlowSettings({variant:'drop',speed:.1,intensity:1.8,hover:false,hoverStrength:2.4}),()=>assert.deepEqual(read(settings.FLOW_KEY),{variant:'drop',speed:.25,intensity:1.8,hover:false,hoverStrength:2.4})],
   [()=>settings.setMorphConfig({lobeK:185}),()=>assert.equal(read(settings.MORPH_KEY).cfg.lobeK,185)],
   [()=>settings.setMorphTier('spinner',{amp:.15}),()=>assert.equal(settings.getMorphProfile().TIER.spinner.amp,.15)],
  ]
  for(const [change,check]of changes){const before=callsA;change();check();assert.ok(callsA>before);assert.equal(callsA,callsB);assert.strictEqual(settings.getSettingsSnapshot(),settings.getSettingsSnapshot());assert.ok(Object.isFrozen(settings.getSettingsSnapshot().profile.cfg))}
  assert.deepEqual(Object.keys(read(settings.MOTION_KEY).cats).sort(),[...settings.PRODUCT_CATEGORIES].sort());assert.equal(motionEvents,2);assert.equal(flowEvents,1)
  settings.importMorphJSON({cfg:{...settings.getMorphProfile().cfg,lobeK:215},TIER:{...settings.getMorphProfile().TIER,blob:{...settings.getMorphProfile().TIER.blob,reach:18},spinner:{...settings.getMorphProfile().TIER.spinner,amp:.14}}})
  settings.setMotionCategory('cards',false);settings.reloadMotionSettings()
  assert.equal(settings.getSettingsSnapshot().authored,true);assert.equal(settings.getMorphProfile().cfg.lobeK,215);assert.equal(settings.getMorphProfile().TIER.blob.reach,18);assert.equal(settings.getMorphProfile().TIER.spinner.amp,.14)
  const exported=settings.exportMorphJSON(),profile=settings.getMorphProfile();assert.equal(JSON.parse(exported).version,4);settings.importMorphJSON(exported);assert.deepEqual(settings.getMorphProfile(),profile)
  for(const invalid of ['{not json','{}','{"cfg":{"lobeK":"wrong"}}']){assert.throws(()=>settings.importMorphJSON(invalid),/JSON|Profile|Invalid/);assert.deepEqual(settings.getMorphProfile(),profile)}
  const external:[string,object,()=>void][]=[
   [settings.MOTION_KEY,{v:3,mode:'off',cats:{buttons:false}},()=>assert.equal(settings.getMotionMode(),'off')],
   [settings.FLOW_KEY,{variant:'invalid',speed:3,intensity:-1,hoverStrength:4,hover:true},()=>assert.deepEqual(settings.getFlowSettings(),{variant:'glide',speed:3,intensity:0,hoverStrength:4,hover:true})],
   [settings.MORPH_KEY,{cfg:{lobeK:230},TIER:{spinner:{amp:.14}}},()=>assert.equal(settings.getMorphProfile().cfg.lobeK,230)],
  ]
  for(const [key,value,check]of external){const before=callsA;store.setItem(key,JSON.stringify(value));fire('storage',key);check();assert.ok(callsA>before)}
  const noEcho=[motionEvents,flowEvents];store.setItem(settings.MOTION_KEY,JSON.stringify({v:3,mode:'subtle',cats:{cards:true}}));fire('v-motion-change');assert.equal(settings.getMotionMode(),'subtle')
  store.setItem(settings.FLOW_KEY,JSON.stringify({variant:'halo',speed:1,intensity:1,hover:true,hoverStrength:1}));fire('v-flow');assert.equal(settings.getFlowSettings().variant,'halo');assert.deepEqual([motionEvents,flowEvents],[noEcho[0]+1,noEcho[1]+1])
  const flowBefore=store.getItem(settings.FLOW_KEY),motionBefore=store.getItem(settings.MOTION_KEY)
  settings.resetMorph();assert.equal(store.getItem(settings.MORPH_KEY),null);assert.equal(settings.getSettingsSnapshot().authored,false);assert.equal(settings.getMorphProfile().cfg.lobeK,130);assert.equal(store.getItem(settings.FLOW_KEY),flowBefore);assert.equal(store.getItem(settings.MOTION_KEY),motionBefore)
  settings.setMorphConfig({lobeK:190});const morphBefore=store.getItem(settings.MORPH_KEY);settings.resetFlow();assert.deepEqual(settings.getFlowSettings(),settings.FLOW_DEFAULTS);assert.equal(store.getItem(settings.MORPH_KEY),morphBefore);assert.equal(store.getItem(settings.MOTION_KEY),motionBefore)
  store.clear();fire('storage',null);assert.equal(settings.getMotionMode(),'subtle');assert.equal(settings.getSettingsSnapshot().authored,false)
  offA();offB();const counts=[callsA,callsB];settings.setMotionMode('off');fire('storage',null);assert.deepEqual([callsA,callsB],counts)
 }finally{offA();offB();if(old)Object.defineProperty(globalThis,'window',old);else Reflect.deleteProperty(globalThis,'window')}
})
