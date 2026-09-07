"use client";
import React from "react";
import { Button } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card,CardTitle,CardDescription } from "@/registry/sahajiv/ui/card";
const entries:Record<string,React.ElementType>={button:Button,badge:Badge,card:Card};
export function ComponentPreview({id,variants,sizes}:{id:string;variants:string[];sizes:string[]}){
  const Component=entries[id];
  if(!Component)return <Card variant="cream"><CardTitle>Example being connected</CardTitle><CardDescription>The component source is integrated. Its interactive documentation example is being added now.</CardDescription></Card>;
  return <Card variant="cream" style={{display:"grid",gap:"var(--s-6)"}}>
    {variants.map(variant=><div key={variant}><p style={{marginBottom:12,fontSize:12,color:"var(--v-text-2)"}}>{variant}</p><div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12}}>{sizes.map(size=><Component key={size} variant={variant} size={size}>{id==="card"?<><CardTitle>A place for the details</CardTitle><CardDescription>Useful content, with room to breathe.</CardDescription></>:id==="button"?"Add schedule":"In progress"}</Component>)}</div></div>)}
  </Card>;
}
