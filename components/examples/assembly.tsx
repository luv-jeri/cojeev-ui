"use client";
import * as React from "react";
import { OrganismAssembly } from "@/registry/sahajiv/ui/organism-assembly";
import { OrganismComposition, ProfileCard, WorkSidePanel, ActionDock, ConversationPanel, CompactDashboard } from "@/registry/sahajiv/ui/organism-composition";
import { AssemblyPart } from "@/registry/sahajiv/ui/assembly-part";
import { Button } from "@/registry/sahajiv/ui/button";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { Icon } from "@/registry/sahajiv/ui/icon";
export function OrganismAssemblyExample(){return <OrganismAssembly/>}
export function OrganismCompositionExample(){return <OrganismComposition kind="chat"/>}
export function AssemblyPartExample(){
 const [wide,setWide]=React.useState(false),[presses,setPresses]=React.useState(0),[settled,setSettled]=React.useState(false);
 return <div style={{width:"100%",maxWidth:360}}><Button variant="secondary" onClick={()=>{setSettled(false);setWide(value=>!value)}}>Reshape the same button</Button><div style={{position:"relative",height:150}}><AssemblyPart identity="example-button" rect={{x:12,y:24,width:wide?212:88,height:wide?56:88,rotate:wide?0:-12}} contour={wide?"rounded":"clover-soft"} release={wide&&settled} interactive={settled} onRest={()=>setSettled(true)}><Button variant="accent" aria-label={`Press count: ${presses}`} onClick={()=>setPresses(count=>count+1)}><span className="v-assembly-content"><Icon name="star"/>{presses}</span></Button></AssemblyPart></div></div>;
}
export function ProfileCardExample(){return <ProfileCard/>}
export function WorkSidePanelExample(){return <WorkSidePanel/>}
export function ActionDockExample(){return <ActionDock/>}
export function ConversationPanelExample(){return <ConversationPanel/>}
export function CompactDashboardExample(){return <><Meta>Historical sample · use WorkSidePanel for a compact task list.</Meta><CompactDashboard/></>}
