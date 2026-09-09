"use client";
import * as React from "react";
import { SculptureStage,type MaterialSculptureCommonProps } from "./glass-sculpture";
import { sculptureNumber } from "@/registry/cojeev/lib/sculpture-raster";
export type FlowSculptureProps=MaterialSculptureCommonProps&{distortion?:number;chromatic?:number;spread?:number;settle?:number;swirl?:number;pulse?:number};
/** Pointer impulses advect and dissipate in a bounded field above a real rendered object. */
export function FlowSculpture({distortion=1,chromatic=.5,spread=.14,settle=1,swirl=.35,pulse=0,...props}:FlowSculptureProps){
 return <SculptureStage {...props} effect={{kind:"flow",distortion:sculptureNumber(distortion,1,0,2),chromatic:sculptureNumber(chromatic,.5,0,1),spread:sculptureNumber(spread,.14,.035,.3),settle:sculptureNumber(settle,1,.25,3),swirl:sculptureNumber(swirl,.35,0,1),pulse:sculptureNumber(pulse,0,0,Number.MAX_SAFE_INTEGER)}}/>;
}
