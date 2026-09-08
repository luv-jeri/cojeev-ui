"use client";
/* eslint-disable @next/next/no-img-element -- Installable React image component. */
import * as React from "react";
import { cn } from "../lib/utils";
import { signatureShapePaths,type SignatureShapeName } from "../lib/signature-shapes";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { assignMotionRef } from "../motion/refs";
export type ImageMaskingProps=Omit<React.ComponentProps<"figure">,"children"> & {src:string;alt:string;shape?:SignatureShapeName;method?:"mask"|"clip";caption?:React.ReactNode;fit?:"cover"|"contain";imagePosition?:string};
export function ImageMasking({src,alt,shape="clover-soft",method="mask",caption,fit="cover",imagePosition="center",className,ref,...props}:ImageMaskingProps){
 const host=React.useRef<HTMLElement>(null),id=`image-mask-${React.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;const {enabled,inView}=useMotionVisibility(host);
 const path=signatureShapePaths[shape];if(!path)throw new Error(`Unknown SahaJiv image shape: ${shape}`);
 const mask=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${path}" fill="black"/></svg>`)}")`;
 const shapeStyle:React.CSSProperties=method==="mask"?{maskImage:mask,WebkitMaskImage:mask}:{clipPath:`url(#${id})`};
 const hostRef=React.useCallback((node:HTMLElement|null)=>{host.current=node;return assignMotionRef(ref,node);},[ref]);
 return <figure {...props} ref={hostRef} className={cn("v-image-masking",className)} data-slot="image-masking" data-method={method} data-motion={enabled&&inView?"on":"off"}>
 {method==="clip"&&<svg width="0" height="0" aria-hidden="true" className="v-image-masking__defs"><defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path transform="scale(.01)" d={path}/></clipPath></defs></svg>}
 <div className="v-image-masking__frame" style={shapeStyle}><img src={src} alt={alt} className="v-image-masking__image" style={{objectFit:fit,objectPosition:imagePosition}}/></div>
 {caption&&<figcaption>{caption}</figcaption>}
 </figure>;
}
