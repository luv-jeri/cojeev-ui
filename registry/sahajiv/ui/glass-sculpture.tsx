"use client";
import * as React from "react";
import { SculptureStage,type MaterialSculptureCommonProps } from "../lib/sculpture-stage";
import { sculptureNumber } from "@/registry/sahajiv/lib/sculpture-raster";
import type { SculptureStudio } from "../lib/sculpture-renderer";
export { SculptureStage } from "../lib/sculpture-stage";
export type { MaterialSculptureCommonProps,SculptureStudio };
export type { SculptureRendererState } from "../lib/sculpture-stage";
export type GlassSculptureProps=MaterialSculptureCommonProps&{refraction?:number;frost?:number;thickness?:number;dispersion?:number;studio?:SculptureStudio};
/** Translucent geometry refracts an original procedural studio, not the surrounding DOM. */
export function GlassSculpture({refraction=1.45,frost=.08,thickness=1.2,dispersion=.55,studio="ribbons",pointerTracking=false,...props}:GlassSculptureProps){
 return <SculptureStage {...props} pointerTracking={pointerTracking} effect={{kind:"glass",refraction:sculptureNumber(refraction,1.45,1,2.2),frost:sculptureNumber(frost,.08,0,.8),thickness:sculptureNumber(thickness,1.2,.1,3),dispersion:sculptureNumber(dispersion,.55,0,2),studio:studio==="petals"||studio==="tiles"?studio:"ribbons"}}/>;
}
