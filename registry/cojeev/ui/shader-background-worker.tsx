import * as React from "react";

const Fallback = React.lazy(() => import("./shader-background-scene"));
type Props = { mode:"light"|"dark"; moving:boolean; envBasePath?:string; original:boolean };

/** The same decorative scene, with graphics initialization off the UI thread. */
export default function WorkerBackground(props:Props) {
 const host=React.useRef<HTMLDivElement>(null);
 const worker=React.useRef<Worker|null>(null);
 const latest=React.useRef(props);
 latest.current=props;
 const [failed,setFailed]=React.useState(false);
 const fallback=failed||props.original;
 React.useEffect(()=>{
  if(!host.current||fallback)return;
  if(!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) {setFailed(true);return;}
  const container=host.current,canvas=document.createElement('canvas');
  canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
  container.appendChild(canvas);
  let renderer:Worker|undefined;
  let observer:ResizeObserver|undefined;
  try {
   renderer=new Worker(new URL('./shader-background.worker.tsx',import.meta.url),{type:'module'});
   worker.current=renderer;
   const fail=(event:ErrorEvent|MessageEvent)=>{
    console.warn('Background worker unavailable; using the original renderer.',event instanceof ErrorEvent?event.message:event.data.message);
    setFailed(true);
   };
   renderer.onerror=fail;
   renderer.onmessage=event=>{if(event.data.type==='error')fail(event);};
   const surface=canvas.transferControlToOffscreen();
   renderer.postMessage({type:'init',surface,width:container.clientWidth,height:container.clientHeight,...latest.current},[surface]);
   observer=new ResizeObserver(entries=>{
    const {width,height}=entries[0].contentRect;
    renderer?.postMessage({type:'resize',width,height});
   });
   observer.observe(container);
  } catch(error) {console.warn('Background worker unavailable.',error);setFailed(true);}
  return()=>{observer?.disconnect();renderer?.terminate();worker.current=null;canvas.remove();};
 },[fallback]);
 React.useEffect(()=>{worker.current?.postMessage({type:'props',...props});},[props.mode,props.moving,props.original,props.envBasePath]);
 return fallback?<Fallback {...props}/>:<div ref={host} style={{position:'absolute',inset:0}} data-renderer="worker"/>;
}
