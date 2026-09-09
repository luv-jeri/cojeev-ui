"use client";
import * as React from "react";
import { SculptureStage,type MaterialSculptureCommonProps } from "./glass-sculpture";
import { sculptureNumber } from "@/registry/cojeev/lib/sculpture-raster";
export type ParticleSculptureProps=MaterialSculptureCommonProps&{count?:number;size?:number;strength?:number;radius?:number;spring?:number;damping?:number;swirl?:number;pulse?:number};
/** Area-sampled points leave their real surface under pointer forces, then spring home. */
export function ParticleSculpture({count=3600,size=2.3,strength=1,radius=.4,spring=1,damping=1,swirl=.35,pulse=0,...props}:ParticleSculptureProps){
 return <SculptureStage {...props} effect={{kind:"particle",count:Math.round(sculptureNumber(count,3600,300,8000)),size:sculptureNumber(size,2.3,1,6),strength:sculptureNumber(strength,1,0,2),radius:sculptureNumber(radius,.4,.1,.8),spring:sculptureNumber(spring,1,.25,3),damping:sculptureNumber(damping,1,.25,2),swirl:sculptureNumber(swirl,.35,0,1),pulse:sculptureNumber(pulse,0,0,Number.MAX_SAFE_INTEGER)}}/>;
}
