import assert from "node:assert/strict";
import {build} from "esbuild";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
const bundle=await build({stdin:{contents:`import React from "react";import {createRoot} from "react-dom/client";import {MotionDrawer} from "./registry/cojeev/ui/motion-drawer";const root=createRoot(document.getElementById("root"));window.requests=[];window.renderDrawer=({longContent,...config})=>{window.requests=[];root.render(React.createElement(MotionDrawer,{key:config.key,title:"A test drawer",open:true,...config,onOpenChange:next=>window.requests.push(next)},longContent?Array.from({length:30},(_,i)=>React.createElement("p",{key:i,style:{height:30}},"Row "+i)):React.createElement("p",{style:{height:130}},"Drag from the non-interactive surface.")))};window.renderDrawer({key:"initial"});`,loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",define:{"process.env.NODE_ENV":'"production"'}});
const css=await readFile("registry/cojeev/styles/motion-drawer.css","utf8");
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:600,height:600},reducedMotion:"reduce"});
  await page.setContent('<style>*{box-sizing:border-box}body{margin:0}.v-icon{width:24px;height:24px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}:root{--v-canvas:white;--v-text:black;--font-body:Arial;--font-display:Arial;--v-border:#aaa}</style><div id="root"></div>');
  await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(const test of [
    {key:"rtl-start",dir:"rtl",side:"start",dx:130,expectedSide:"right",close:true},
    {key:"rtl-end",dir:"rtl",side:"end",dx:-130,expectedSide:"left",close:true},
    {key:"drag-disabled",enableDrag:false,dx:-150},
    {key:"high-threshold",dragThreshold:.7,dx:-150},
    {key:"low-threshold",dragThreshold:.1,dx:-90,close:true},
    {key:"wrong-direction",dragThreshold:.1,dx:100},
    {key:"bottom-down",variant:"bottom",dy:150,close:true},
    {key:"bottom-up",variant:"bottom",dy:-100},
    {key:"bottom-body",variant:"bottom",dy:150,body:true},
  ]){
    const {dx=0,dy=0,body=false,close=false,expectedSide="left",...config}=test;
    await page.evaluate(config=>window.renderDrawer(config),config);
    const panel=page.locator('[data-slot="motion-drawer-content"]');await panel.waitFor();
    await page.waitForTimeout(150);
    const before=await panel.boundingBox();
    assert.equal(await panel.getAttribute("data-side"),expectedSide);
    const header=await panel.locator(body?".v-motion-drawer__body":".v-motion-drawer__top").boundingBox();
    const x=header.x+header.width/2,y=header.y+header.height/2+15;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:15});await page.mouse.up();
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>window.requests),close?[false]:[],test.key);
    assert.deepEqual(await panel.boundingBox(),before,"controlled refusal settles back: "+test.key);
  }
  await page.setViewportSize({width:360,height:500});
  for(const variant of ["default","floating","stack","bottom"]){
    await page.evaluate(variant=>window.renderDrawer({key:variant,variant,longContent:true}),variant);await page.waitForTimeout(150);
    const panel=page.getByRole("dialog"),body=panel.locator(".v-motion-drawer__body");
    const rect=await panel.boundingBox();
    assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=360&&rect.y+rect.height<=500,variant+" stays bounded with long content");
    assert.ok(await body.evaluate(n=>n.scrollHeight>n.clientHeight),variant+" has a scrolling body");
    await body.evaluate(n=>{n.scrollTop=400});
    assert.ok(await body.evaluate(n=>n.scrollTop>0),variant+" content can actually scroll");
  }
  await page.setViewportSize({width:900,height:600});
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.evaluate(()=>window.renderDrawer({key:"controlled-merge",open:false,width:324,style:{marginLeft:400,marginTop:200}}));
  await page.waitForTimeout(250);
  await page.evaluate(()=>window.renderDrawer({key:"controlled-merge",open:true,width:324,style:{marginLeft:400,marginTop:200}}));
  await page.waitForFunction(()=>{const e=document.querySelector(".v-motion-drawer__launcher");const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return Math.abs(m.m41)>100&&Math.abs(m.m42)>100});
  assert.equal((await page.getByRole("dialog").boundingBox()).width,324,"custom width reaches the panel");
  await page.waitForTimeout(1000);
  await page.evaluate(()=>window.renderDrawer({key:"controlled-merge",open:false,width:324,style:{marginLeft:400,marginTop:200}}));
  await page.waitForTimeout(80);
  await page.evaluate(()=>window.renderDrawer({key:"controlled-merge",open:true,width:324,style:{marginLeft:400,marginTop:200}}));
  await page.waitForFunction(()=>{const e=document.querySelector('[data-slot="motion-drawer-content"]');return e?.dataset.state==="open"&&Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)<.1},null,{timeout:2500});
  console.log("PASS: RTL, directional/disabled/threshold drag, bottom header gesture, controlled refusal snapback, long-content scrolling at 360×500, programmatic merge and custom width.");
}finally{await browser.close()}
