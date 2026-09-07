import * as React from 'react';import {createRoot} from 'react-dom/client';
import '../app/globals.css';
import {setMotionMode} from '../registry/sahajiv/motion/settings';
const modules=import.meta.glob('../registry/sahajiv/ui/shape-scene.tsx');const styles=import.meta.glob('../registry/sahajiv/styles/shape-scene.css');
const host=document.createElement('main');document.body.append(host);document.body.style.cssText='margin:0;background:var(--v-canvas);color:var(--v-text)';document.documentElement.dataset.mode='light';
const load=modules['../registry/sahajiv/ui/shape-scene.tsx'];
if(!load){host.textContent='ShapeScene is not implemented';document.documentElement.dataset.ready='1';}
else{await styles['../registry/sahajiv/styles/shape-scene.css']?.();const {ShapeScene}=await load() as any;
function App(){const [show,setShow]=React.useState(true),[animate,setAnimate]=React.useState(true),[interactive,setInteractive]=React.useState(true);React.useEffect(()=>{Object.assign(window,{shapeControls:{setShow,setAnimate,setInteractive,setMotionMode}});document.documentElement.dataset.ready='1';},[]);return <><div style={{maxWidth:1000,margin:'0 auto',padding:20}}>{show&&<ShapeScene animate={animate} interactive={interactive} aria-label="SahaJiv sculpture"/>}</div><div style={{height:1600}}/></>;}createRoot(host).render(<App/>);}
