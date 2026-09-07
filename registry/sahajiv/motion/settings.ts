export const RUNTIME={cfg:{rest:false,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,dots:0,grain:.08,sheen:.6,curve:1.2,lobeK:130,lobeZ:1,mergeZ:.8,arcK:40,holdK:80,pressK:170,jiggle:.35,jiggleDecay:1.6,restSpeed:1,drift:1,quality:2.5},
 tier:{pill:{amp:0,reach:3,inside:1.2,press:.02},tile:{amp:0,reach:2.4,inside:1,press:.02},nav:{amp:0,reach:1.2,inside:.5,press:.008},card:{amp:0,reach:1,inside:.4,press:.004},blob:{amp:.006,reach:3,inside:1.2,press:.03}}};
/* Per-tier authoring domains live with the profile, so a slider cannot offer a value the tier cannot mean
   (the spinner's amp .14 is legitimate and must not be clamped to the pill's 3 % ceiling). */
export const DOMAIN={amp:{max:{pill:3,tile:3,nav:1,card:1,blob:8,spinner:20},min:0},reach:{max:{pill:24,tile:24,nav:12,card:12,blob:32,spinner:0},min:0},inside:{max:{pill:12,tile:12,nav:6,card:6,blob:16,spinner:0},min:0},press:{max:{pill:12,tile:12,nav:4,card:4,blob:16,spinner:0},min:0},R:{max:{pill:240,tile:240,nav:160,card:160,blob:320,spinner:0},min:0},sig:{max:{pill:120,tile:120,nav:80,card:160,blob:160,spinner:8},min:1}};
const factoryTiers={pill:{amp:.008,reach:4,inside:2,sig:24,R:80,press:.03,lobes:0,depth:0,asym:0,spread:.55},tile:{amp:.008,reach:3.5,inside:1.6,sig:18,R:64,press:.035,lobes:0,depth:0,asym:0,spread:.55},nav:{amp:.0006,reach:3,inside:1.2,sig:24,R:64,press:.010,lobes:0,depth:0,asym:0,spread:.55},card:{amp:.0003,reach:2.5,inside:.9,sig:44,R:56,press:.004,lobes:0,depth:0,asym:0,spread:.55},blob:{amp:.012,reach:4,inside:1.8,sig:22,R:64,press:.05,lobes:0,depth:0,asym:0,spread:.55},spinner:{amp:.14,reach:0,inside:0,sig:1,R:0,press:0,lobes:0,depth:0,asym:0,spread:.55}};
const factoryCfg={quality:2.5,grain:.12,sheen:1,curve:1,lobeK:90,lobeZ:.9,mergeZ:.62,arcK:26,holdK:55,pressK:140,jiggle:.45,jiggleDecay:1.35,restSpeed:1,drift:1,rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,echoOff:6,echoScale:1.04,dots:0};


export type MorphConfig = typeof factoryCfg
export type TierName = keyof typeof factoryTiers
export type Tier = typeof factoryTiers.pill
export type Category = "buttons" | "icons" | "pills" | "cards" | "skeleton" | "nav" | "inputs" | "controls" | "surfaces"
export type MotionSettings = {v:3;mode:"off"|"subtle";cats:Record<Category,boolean>}
export type MorphProfile = {cfg:MorphConfig;TIER:Record<TierName,Tier>}
export const MOTION_KEY = "v-motion"
export const MORPH_KEY = "v-morph-cfg-v3"
const defaultSettings:MotionSettings={v:3,mode:"subtle",cats:{buttons:true,icons:true,pills:true,cards:false,skeleton:true,nav:false,inputs:false,controls:false,surfaces:false}}
function runtime():MorphProfile {
 const TIER=structuredClone(factoryTiers)
 for(const name of Object.keys(RUNTIME.tier) as (keyof typeof RUNTIME.tier)[]) Object.assign(TIER[name],RUNTIME.tier[name])
 return {cfg:{...factoryCfg,...RUNTIME.cfg},TIER}
}
let settings=structuredClone(defaultSettings), profile=runtime(), loaded=false
const listeners=new Set<()=>void>()
function storage(){try{return window.localStorage}catch{return null}}
function mergeProfile(value:unknown) {
 if(!value || typeof value!=="object")return
 const saved=value as Partial<MorphProfile>
 for(const key of Object.keys(profile.cfg) as (keyof MorphConfig)[]){const v=saved.cfg?.[key];if(typeof v===typeof profile.cfg[key]&&(typeof v!=="number"||Number.isFinite(v)))Object.assign(profile.cfg,{[key]:v})}
 for(const name of Object.keys(profile.TIER) as TierName[]){for(const key of Object.keys(profile.TIER[name]) as (keyof Tier)[]){const v=saved.TIER?.[name]?.[key];if(typeof v==="number"&&Number.isFinite(v))profile.TIER[name][key]=v}}
}
export function loadMotionSettings(){
 if(loaded||typeof window==="undefined")return
 loaded=true
 try{const store=storage();const raw=JSON.parse(store?.getItem(MOTION_KEY)||"null");
 if(raw?.mode==="off"||raw?.mode==="subtle")settings.mode=raw.mode
 if(raw?.v===3)for(const key of Object.keys(settings.cats) as Category[])if(typeof raw.cats?.[key]==="boolean")settings.cats[key]=raw.cats[key]
 const authored=JSON.parse(store?.getItem(MORPH_KEY)||"null");if(authored){profile={cfg:{...factoryCfg},TIER:structuredClone(factoryTiers)};mergeProfile(authored)}
 for(const key of ["v-alive-settings","v-morph-cfg","v-morph-cfg-v2","v-motion-cfg"])store?.removeItem(key)
 }catch{/* Unavailable storage leaves usable runtime defaults. */}
}
export function getMotionSettings(){loadMotionSettings();return structuredClone(settings)}
export function getMorphProfile(){loadMotionSettings();return structuredClone(profile)}
function emit(){listeners.forEach(fn=>fn())}
export function subscribeMotion(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn)}}
export function reloadMotionSettings(){loaded=false;settings=structuredClone(defaultSettings);profile=runtime();loadMotionSettings();emit()}
export function setMotionMode(mode:MotionSettings["mode"]){loadMotionSettings();settings.mode=mode;saveSettings()}
export function setMotionCategory(category:Category,on:boolean){loadMotionSettings();settings.cats[category]=on;saveSettings()}
function saveSettings(){try{storage()?.setItem(MOTION_KEY,JSON.stringify(settings))}catch{}emit();window.dispatchEvent(new CustomEvent("v-motion-change",{detail:getMotionSettings()}))}
export function exportMorphJSON(){return JSON.stringify({version:4,...getMorphProfile()},null,1)}
export function importMorphJSON(value:string|Partial<MorphProfile>){loadMotionSettings();mergeProfile(typeof value==="string"?JSON.parse(value):value);try{storage()?.setItem(MORPH_KEY,JSON.stringify(profile))}catch{}emit()}
export function resetMorph(){profile=runtime();try{storage()?.removeItem(MORPH_KEY)}catch{}emit()}
