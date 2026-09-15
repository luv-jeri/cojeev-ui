import * as React from 'react';
import * as THREE from 'three';
import {createRoot,extend,type RootState} from '@react-three/fiber';
import {ShaderGradient} from '@shadergradient/react';
import {sourcePresets,sceneOverrides,FramePolicy} from './shader-background-scene';

type SceneProps={mode:'light'|'dark';moving:boolean;original:boolean};
type Message=SceneProps & {type:'init'|'props'|'resize';surface?:OffscreenCanvas;width:number;height:number};
let root:ReturnType<typeof createRoot>|undefined;
let state:RootState|undefined;
let size={width:1,height:1,top:0,left:0};
let canvas:OffscreenCanvas|undefined;
let scene:SceneProps={mode:'light',moving:true,original:false};
const report=(error:unknown)=>self.postMessage({type:'error',message:String(error)});
extend({Mesh:THREE.Mesh,PlaneGeometry:THREE.PlaneGeometry,AmbientLight:THREE.AmbientLight});
// ShaderGradientCanvas applies these compatibility chunks to the same Three version.
Object.assign(THREE.ShaderChunk,{uv2_pars_vertex:'',uv2_vertex:'',uv2_pars_fragment:'',encodings_fragment:''});
function renderScene() {
 root?.render(<><ShaderGradient {...sourcePresets[scene.mode]} {...(scene.original?{}:sceneOverrides[scene.mode])} animate="on"/><FramePolicy moving={scene.moving} mode={scene.mode}/></>);
}
// This scene has no pointer controls. The canvas adapter supplies the geometry
// and event surface expected by the original camera controller, without DOM work.
function attachSurface(surface:OffscreenCanvas) {
 Object.assign(surface,{
  style:{touchAction:'none'},ownerDocument:surface,documentElement:surface,
  getBoundingClientRect:()=>({...size,x:0,y:0,right:size.width,bottom:size.height}),
  setAttribute(){},removeAttribute(){},setPointerCapture(){},releasePointerCapture(){},
 });
 Object.defineProperties(surface,{clientWidth:{get:()=>size.width},clientHeight:{get:()=>size.height}});
}
let queue=Promise.resolve();
self.onmessage=(event:MessageEvent<Message>)=>{
 queue=queue.then(async()=>{
  const message=event.data;
  if(message.type==='init') {
   canvas=message.surface!;
   size={width:message.width,height:message.height,top:0,left:0};
   scene=message;
   attachSurface(canvas);
   root=createRoot(canvas);
   await root.configure({size,dpr:1,camera:{fov:45},linear:true,flat:true,
    gl:{powerPreference:'low-power'},frameloop:scene.moving?'always':'demand',
    onCreated:value=>{state=value;},
   });
   renderScene();
  } else if(message.type==='resize') {
   size={width:message.width,height:message.height,top:0,left:0};
   state?.setSize(size.width,size.height,0,0);
  } else {
   scene=message;renderScene();
  }
 }).catch(report);
};
self.addEventListener('unhandledrejection',event=>report(event.reason));
self.addEventListener('error',event=>report(event.message));
