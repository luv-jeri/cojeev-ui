import * as React from 'react'
import {createRoot} from 'react-dom/client'
import {flushSync} from 'react-dom'
import {useFlowGroup,useFlowAppearance} from '@/registry/cojeev/motion/use-flow'
import {useFlowPress} from '@/registry/cojeev/motion/flow-press'
import {useMorph,rewindMorph,morphClock,enableMorph,disableMorph} from '@/registry/cojeev/motion/use-morph'
import {replaceFlow,appearFlow} from '@/registry/cojeev/motion/flow'
import * as settings from '@/registry/cojeev/motion/settings'
import {Adjuster} from '@/registry/cojeev/ui/adjuster'
import {Spinner} from '@/registry/cojeev/ui/spinner'
import {fixtureMarkup,type MotionScenario} from './motion-fixtures'
import './motion-styles.css'

type GateApi={clock:(t:number|null)=>void;rewind:()=>void;flow:typeof settings.setFlowSettings;mode:typeof settings.setMotionMode;category:typeof settings.setMotionCategory;profile:(value:Partial<settings.MorphProfile>)=>void;replace:()=>void;open:(open:boolean)=>void;arrive:()=>void;rerender:()=>void;replaceChildren:()=>void;read:typeof settings.getSettingsSnapshot;unmount:()=>void;mount:()=>void;enable:(id:string)=>void;disable:(id:string)=>void;appearance:(id:string,grow:boolean)=>void}
declare global {interface Window {motionGate:GateApi}}
const scenario=JSON.parse(document.getElementById('motion-fixture')!.textContent!) as MotionScenario
const root=createRoot(document.getElementById('motion-stage')!),surfaces=new Map<string,(value:boolean)=>void>()
let childVersion=0
function Group({tag,children,...props}:React.ComponentProps<'div'>&{tag:string}){const ref=useFlowGroup<HTMLElement>();return React.createElement(tag,{...props,ref},children)}
function Body({tag,children,...props}:React.ComponentProps<'div'>&{tag:string;'data-category'?:settings.Category}){const ref=useMorph<HTMLElement>(props['data-category']??'buttons');return React.createElement(tag,{...props,ref},children)}
function Press({tag,children,...props}:React.ComponentProps<'div'>&{tag:string}){const press=useFlowPress<HTMLElement>(),ref=useMorph<HTMLElement>('buttons',press);return React.createElement(tag,{...props,ref},children)}
function Surface({tag,id,children,...props}:React.ComponentProps<'div'>&{tag:string}){const [open,setOpen]=React.useState(false);const ref=useFlowAppearance<HTMLElement>(open,undefined,id==='feedback'?'enter':'grow');React.useEffect(()=>{surfaces.set(id!,setOpen);return ()=>{surfaces.delete(id!)}},[id]);return React.createElement(tag,{...props,id,ref,hidden:!open},children)}
const attributes:Record<string,string>={class:'className',for:'htmlFor',tabindex:'tabIndex','aria-selected':'aria-selected'}
function convert(node:Node,key:number):React.ReactNode{
 if(node.nodeType===Node.TEXT_NODE)return node.textContent
 if(!(node instanceof Element))return null
 const props:Record<string,unknown>={key:node.hasAttribute('data-item')?childVersion+'.'+key:key},tag=node.tagName.toLowerCase()
 for(const attribute of Array.from(node.attributes)){
  if(attribute.name==='style'){const style:Record<string,string>={};for(const name of Array.from((node as HTMLElement).style))style[name.startsWith('--')?name:name.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=(node as HTMLElement).style.getPropertyValue(name);props.style=style}
  else if(['hidden','checked'].includes(attribute.name))props[attribute.name==='checked'?'defaultChecked':attribute.name]=true
  else if(attribute.name==='value')props.defaultValue=attribute.value
  else props[attributes[attribute.name]??attribute.name]=attribute.value
 }
 let Component:string|React.ElementType=tag
 if(node.id==='loader')return <Spinner {...props} key={key}/>
 if(node.id==='adjuster-mount')return <Adjuster key={key}/>
 if(node.hasAttribute('data-flow-group'))Component=Group
 else if(node.hasAttribute('data-morph')||node.hasAttribute('data-category'))Component=Body
 else if(['surface','feedback'].includes(node.id))Component=Surface
 else if(['press','toggle','slider','opener'].includes(node.id))Component=Press
 if(Component!==tag)props.tag=tag
 const children=Array.from(node.childNodes).map(convert)
 return React.createElement(Component,props,children.length?children:undefined)
}
function App(){const documentFixture=new DOMParser().parseFromString(fixtureMarkup(scenario),'text/html');return <React.StrictMode>{Array.from(documentFixture.body.childNodes).map(convert)}</React.StrictMode>}
const render=()=>flushSync(()=>root.render(<App/>))
window.motionGate={clock:morphClock,rewind:rewindMorph,flow:settings.setFlowSettings,mode:settings.setMotionMode,category:settings.setMotionCategory,profile:settings.importMorphJSON,replace:replaceFlow,open:open=>flushSync(()=>surfaces.get('surface')?.(open)),arrive:()=>flushSync(()=>surfaces.get('feedback')?.(true)),rerender:render,replaceChildren:()=>{childVersion++;render()},read:settings.getSettingsSnapshot,unmount:()=>flushSync(()=>root.render(null)),mount:render,enable:id=>enableMorph(document.getElementById(id)!),disable:id=>disableMorph(document.getElementById(id)!),appearance:(id,grow)=>{appearFlow(document.getElementById(id)!,grow)}}
render()
settings.setFlowSettings({variant:(scenario.variant??'glide') as settings.FlowVariant,speed:scenario.speed??1,intensity:scenario.intensity??1,hover:scenario.hover??true,hoverStrength:scenario.hoverStrength??1})
if(scenario.off)settings.setMotionMode('off')
const group=document.getElementById('group');if(scenario.vertical)group?.classList.add('-vertical');if(scenario.pin)group?.setAttribute('data-flow',scenario.pin)
document.addEventListener('click',event=>{
 if(!(event.target instanceof Element))return
 if(event.target.closest('#opener'))window.motionGate.open(true)
 const item=event.target.closest<HTMLElement>('[data-item]'),host=item?.closest('[data-flow-group]')
 if(item&&host&&!host.hasAttribute('data-flow-fields')&&!item.querySelector('input[type=checkbox]'))host.querySelectorAll<HTMLElement>('[data-item]').forEach(child=>{if(child.closest('[data-flow-group]')===host){child.setAttribute(child.classList.contains('v-step')?'aria-current':'aria-selected',child===item?(child.classList.contains('v-step')?'step':'true'):'false')}})
})
document.documentElement.dataset.ready='1'
