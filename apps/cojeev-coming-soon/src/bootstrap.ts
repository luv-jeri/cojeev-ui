import './utilities.css';
import './styles.css';
import './bond-demo.css';
import './prompt-bond.css';
import {startup} from './startup';

const pending:(()=>void)[]=[];
let observer:PerformanceObserver|undefined;
let enhancement:Promise<unknown>|undefined;
const enhance=()=>{observer?.disconnect();return enhancement??=import('./bond-demo');};
const recordInput=(event:Event)=>{
 const target=event.target;
 if(target instanceof HTMLInputElement&&target.getAttribute('aria-label')==='Your prompt'){startup.prompt=target.value;void enhance();}
};
const recordClick=(event:MouseEvent)=>{
 const button=event.target instanceof Element?event.target.closest('button'):null;
 if(button&&!button.disabled){
  const {clientX,clientY}=event;
  event.preventDefault();event.stopImmediatePropagation();
  pending.push(()=>{if(button.isConnected)button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX,clientY}));});
  void enhance();
 }
};
const recordEnter=(event:KeyboardEvent)=>{
 if(event.key!=='Enter'||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 const target=event.target;
 const input=document.querySelector<HTMLInputElement>('input[aria-label="Your prompt"]');
 if(!(target instanceof Element)||!input)return;
 if(target!==input&&target.closest('input,button,a,textarea,[role=button],[role=switch],[contenteditable]'))return;
 startup.prompt=input.value;event.preventDefault();event.stopImmediatePropagation();
 pending.push(()=>{if(input.isConnected)input.form?.requestSubmit();});
 void enhance();
};
document.addEventListener('input',recordInput,true);
document.addEventListener('click',recordClick,true);
document.addEventListener('keydown',recordEnter,true);
document.addEventListener('cojeev:interactive',()=>{
 document.removeEventListener('input',recordInput,true);
 document.removeEventListener('click',recordClick,true);
 document.removeEventListener('keydown',recordEnter,true);
 for(const action of pending)action();
 pending.length=0;startup.prompt=null;
},{once:true});

// Production HTML already contains the real page. Wait for its actual content
// paint, rather than assuming two animation frames mean text is on screen.
// A visitor's input always starts enhancement immediately. Development has no
// prerendered tree, so it mounts without waiting for a paint it cannot produce.
if(document.getElementById('root')?.hasChildNodes()) {
 if(typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('paint')) {
  observer=new PerformanceObserver(list=>{if(list.getEntries().some(entry=>entry.name==='first-contentful-paint'))void enhance();});
  observer.observe({type:'paint',buffered:true});
 } else requestAnimationFrame(()=>requestAnimationFrame(()=>{void enhance();}));
} else {
 void enhance();
}
