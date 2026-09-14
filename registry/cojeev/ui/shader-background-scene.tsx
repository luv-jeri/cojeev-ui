"use client";
import * as React from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { useThree } from "@react-three/fiber";
const shared={control:"props", cAzimuthAngle:180, envPreset:"city", grain:"on", lightType:"3d", reflection:0.1, positionY:0,positionZ:0, range:"disabled",rangeStart:0,rangeEnd:40,shader:"defaults",wireframe:false,toggleAxis:false} as const;
// Unmodified source settings from the two owner-supplied customizer URLs.
export const sourcePresets={
 dark:{...shared,brightness:1,cDistance:2.8,cPolarAngle:80,cameraZoom:9.1,color1:"#606080",color2:"#8d7dca",color3:"#212121",positionX:0,rotationX:50,rotationY:0,rotationZ:-60,type:"waterPlane",uAmplitude:0,uDensity:1.5,uFrequency:0,uSpeed:0.3,uStrength:1.5,uTime:8},
 light:{...shared,brightness:1.2,cDistance:2.9,cPolarAngle:120,cameraZoom:1,color1:"#ebedff",color2:"#f3f2f8",color3:"#dbf8ff",grain:"off",positionX:0,positionY:1.8,rotationX:0,rotationY:0,rotationZ:-90,type:"waterPlane",uAmplitude:0,uDensity:1,uFrequency:5.5,uSpeed:0.3,uStrength:3,uTime:0.2,zoomOut:true},
} as const;
// Crop into both fields so the mesh boundary stays outside the viewport.
// Camera framing changes coverage without increasing the canvas pixel count.
// Dark sits closer than its source (2.8): at 2.8 the plane's corners cut into
// wide frames (21:9 and wider) as the waves move, showing a straight edge.
const sceneOverrides={light:{zoomOut:false,positionY:0,cDistance:1.5,enableTransition:false},dark:{color1:"#606080",color2:"#A394D1",color3:"#20242A",cDistance:2.4,grain:"off"}} as const;
function FramePolicy({moving,mode}:{moving:boolean;mode:string}){
 const setFrameloop=useThree(s=>s.setFrameloop),invalidate=useThree(s=>s.invalidate);
 React.useEffect(()=>{setFrameloop(moving?"always":"demand");invalidate();},[moving,mode,setFrameloop,invalidate]);
 return null;
}
export default function ShaderScene({mode,moving,envBasePath,original}:{mode:"light"|"dark";moving:boolean;envBasePath?:string;original:boolean}){
 return <ShaderGradientCanvas style={{position:"absolute",inset:0}} pixelDensity={1} fov={45} pointerEvents="none" lazyLoad={false} envBasePath={envBasePath}>
  <ShaderGradient {...sourcePresets[mode]} {...(original?{}:sceneOverrides[mode])} animate="on" />
  <FramePolicy moving={moving} mode={mode}/>
 </ShaderGradientCanvas>;
}
