"use client";
import * as React from "react";
import { useMotionVisibility } from "../motion/use-motion-visibility";
const Scene = React.lazy(() => import("./shader-background-worker"));
export type ShaderBackgroundProps = {mode: "light" | "dark"; paused?: boolean; className?: string; envBasePath?: string; original?: boolean};
class ShaderBoundary extends React.Component<React.PropsWithChildren, {failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error){console.warn("Shader background unavailable; using still colour field.",error);}
 render(){return this.state.failed?null:this.props.children;}
}
/** Original ShaderGradient renderer; Cojeev owns its palette and shared stillness. */
export function ShaderBackground({mode,paused=false,className="",envBasePath,original=false}:ShaderBackgroundProps){
 const host=React.useRef<HTMLDivElement>(null);
 const {enabled,inView}=useMotionVisibility(host);
 const moving=enabled&&inView&&!paused;
 const [painted,setPainted]=React.useState(false);
 React.useEffect(()=>{
  let second=0,idle=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   if('requestIdleCallback' in window)idle=window.requestIdleCallback(()=>setPainted(true),{timeout:500});
   else setPainted(true);
  });});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);if(idle)window.cancelIdleCallback(idle);};
 },[]);
 return <div ref={host} aria-hidden="true" className={`v-shader-background ${className}`} data-mode={mode} data-original={original} data-moving={moving}>
  {painted&&<ShaderBoundary><React.Suspense fallback={null}><Scene mode={mode} moving={moving} envBasePath={envBasePath} original={original}/></React.Suspense></ShaderBoundary>}
 </div>;
}
