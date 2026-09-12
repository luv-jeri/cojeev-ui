import assert from "node:assert/strict";
import {build} from "esbuild";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";

const bundle=await build({stdin:{contents:`
 import React from "react";import {createRoot} from "react-dom/client";import {Slider} from "./registry/cojeev/ui/slider";
 const root=createRoot(document.getElementById("root"));
 function Harness({caseId="default",orientation="horizontal",dir,inverted=false,disabled=false,appearance="organic"}){
  const [value,setValue]=React.useState([20,70]);const ref=React.useRef(null);
  React.useEffect(()=>{window.setSliderValue=setValue;window.sliderValue=value;window.sliderRef=ref.current;window.sliderCase=caseId},[value,caseId]);
  return React.createElement("form",{id:"form","data-case":caseId},React.createElement(Slider,{key:caseId,ref,name:"window",orientation,dir,inverted,disabled,appearance,value,onValueChange:setValue,onValueCommit:next=>window.commits.push(next),thumbLabel:index=>index?"End":"Start"}),React.createElement("output",{id:"value"},value.join(",")));
 }
 window.commits=[];window.renderSlider=config=>root.render(React.createElement(Harness,{...config,key:config.caseId}));window.renderSlider({});
`,loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",define:{"process.env.NODE_ENV":'"production"'}});
const css=await readFile("registry/cojeev/styles/slider.css","utf8");
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:700,height:360},reducedMotion:"no-preference"});
 await page.setContent(`<style>:root{--v-pink:#f5b8db;--v-ink:#111;--v-beige:#eee7da;--v-canvas:#fbf4e6;--v-brand:#9c3e6e;--v-disabled-fill:#aaa;--v-text:#111;--fs-label:14px}*{box-sizing:border-box}body{margin:32px;font-family:Arial}form{width:420px}</style><div id="root"></div>`);
 await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
 const d=async index=>page.locator('[data-slot="slider-thumb"]').nth(index).locator("path").getAttribute("d");
 const motionBox=path=>page.evaluate(path=>{const n=path.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=n.filter((_,i)=>i%2===0),ys=n.filter((_,i)=>i%2);return {cx:(Math.min(...xs)+Math.max(...xs))/2,cy:(Math.min(...ys)+Math.max(...ys))/2}},path);
 const rest=[await d(0),await d(1)];
 await page.locator('[data-slot="slider-thumb"]').nth(0).focus();assert.deepEqual([await d(0),await d(1)],rest,"focusing first range thumb is quiet");
 await page.locator('[data-slot="slider-thumb"]').nth(1).focus();assert.deepEqual([await d(0),await d(1)],rest,"switching focus to a distant range thumb is quiet");

 await page.evaluate(()=>window.setSliderValue([20,80]));
 await page.waitForFunction(()=>document.querySelector("#value")?.textContent==="20,80");
 await page.waitForFunction(rest=>document.querySelectorAll('[data-slot="slider-thumb"] path')[1]?.getAttribute("d")!==rest[1],rest);
 assert.equal(await d(0),rest[0],"external update leaves the unchanged thumb quiet");
 await page.evaluate(()=>window.setSliderValue(values=>[...values]));
 await page.waitForFunction(rest=>document.querySelectorAll('[data-slot="slider-thumb"] path')[1]?.getAttribute("d")==rest[1],rest,{timeout:5000});
 await page.evaluate(()=>window.setSliderValue(([start,end])=>[start,end]));
 await page.waitForFunction(rest=>document.querySelectorAll('[data-slot="slider-thumb"] path')[1]?.getAttribute("d")==rest[1],rest);

 const screenCases=[
  [{orientation:"horizontal"},"x",1],
  [{orientation:"horizontal",dir:"rtl"},"x",-1],
  [{orientation:"horizontal",inverted:true},"x",-1],
  [{orientation:"vertical"},"y",-1],
  [{orientation:"vertical",inverted:true},"y",1],
 ];
 for(const [config,axis,sign] of screenCases){
  await page.evaluate(config=>window.renderSlider({...config,caseId:JSON.stringify(config)}),config);
  await page.waitForFunction(id=>window.sliderCase===id,JSON.stringify(config));
  await page.waitForFunction(()=>document.querySelector('[data-slot="slider"]')?.dataset.motion==='on');
  const beforePath=await d(1),before=await motionBox(beforePath);await page.evaluate(()=>window.setSliderValue([20,80]));
  await page.waitForFunction(before=>document.querySelectorAll('[data-slot="slider-thumb"] path')[1]?.getAttribute("d")!==before,beforePath,{timeout:5000});
  const during=await motionBox(await d(1));assert.ok((during[axis==="x"?"cx":"cy"]-before[axis==="x"?"cx":"cy"])*sign>0,`screen direction: ${JSON.stringify(config)}`);
  await page.waitForFunction(rest=>document.querySelectorAll('[data-slot="slider-thumb"] path')[1]?.getAttribute("d")==rest,rest[1],{timeout:5000});
 }

 await page.evaluate(()=>window.renderSlider({caseId:"keyboard"}));await page.waitForFunction(()=>window.sliderCase==='keyboard');await page.getByRole("slider",{name:"Start"}).focus();await page.getByRole("slider",{name:"Start"}).press("ArrowRight");
 await page.waitForFunction(()=>document.querySelector("#value")?.textContent==="21,70");await page.waitForFunction(()=>window.commits.length>0);
 const track=await page.locator('[data-slot="slider-track"]').boundingBox();await page.mouse.move(track.x+track.width*.2,track.y+track.height/2);await page.mouse.down();await page.mouse.move(track.x+track.width*.35,track.y+track.height/2);await page.mouse.up();await page.waitForFunction(()=>window.sliderValue[0]!==21);
 assert.equal(await page.locator('input[name="window[]"]').count(),2,"Radix range form inputs retain their array name");assert.equal(await page.evaluate(()=>window.sliderRef?.dataset.slot),"slider","forwarded ref reaches the primitive root");

 await page.evaluate(()=>window.renderSlider({caseId:"disabled",disabled:true}));await page.waitForFunction(()=>window.sliderCase==='disabled');const disabled=[await d(0),await d(1)];await page.evaluate(()=>window.setSliderValue([30,80]));await page.waitForFunction(()=>document.querySelector("#value")?.textContent==="30,80");assert.deepEqual([await d(0),await d(1)],disabled,"disabled slider remains visually still");
 await page.emulateMedia({reducedMotion:"reduce"});await page.evaluate(()=>window.renderSlider({caseId:"reduced"}));await page.waitForFunction(()=>window.sliderCase==='reduced');const reduced=[await d(0),await d(1)];await page.evaluate(()=>window.setSliderValue([30,80]));await page.waitForFunction(()=>document.querySelector("#value")?.textContent==="30,80");assert.deepEqual([await d(0),await d(1)],reduced,"reduced motion remains visually still");
 // Rubber remains span-shaped in range, RTL and vertical modes; motion is only settling.
 for(const config of [{},{dir:'rtl'},{orientation:'vertical'}]){
  const caseId=`rubber-${JSON.stringify(config)}`;
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(config=>window.renderSlider(config),{...config,caseId,appearance:'rubber'});
  await page.waitForFunction(id=>window.sliderCase===id,caseId);
  await page.waitForFunction(()=>document.querySelector('[data-slot="slider"]')?.dataset.motion==='on');
  const path=page.locator('[data-slot="slider-range"] path');
  const start=await path.getAttribute('d');
  await page.evaluate(()=>window.setSliderValue([5,95]));
  await page.waitForFunction(()=>document.querySelector('#value')?.textContent==='5,95');
  await page.waitForFunction(start=>document.querySelector('[data-slot="slider-range"] path')?.getAttribute('d')!==start,start);
  await page.waitForFunction(rest=>document.querySelectorAll('[data-slot="slider-thumb"] path')[0]?.getAttribute('d')===rest,rest[0]);
  const normal=await path.getAttribute('d');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('[data-slot="slider"]')?.dataset.motion==='off');
  assert.equal(await path.getAttribute('d'),normal,'Quiet mode retains the exact settled rubber shape');
  assert.ok(!/NaN|Infinity/.test(normal));
  assert.equal(await page.locator('input[name="window[]"]').count(),2);
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>window.renderSlider({caseId:'rubber-drag',appearance:'rubber'}));
 await page.waitForFunction(()=>window.sliderCase==='rubber-drag');
 const rubberTrack=await page.locator('[data-slot="slider-track"]').boundingBox();
 const end=await page.getByRole('slider',{name:'End'}).boundingBox();
 await page.mouse.move(end.x+end.width/2,end.y+end.height/2);await page.mouse.down();
 await page.mouse.move(rubberTrack.x+rubberTrack.width*.9,rubberTrack.y+rubberTrack.height/2,{steps:8});
 const stretched=Number(await page.getByRole('slider',{name:'End'}).getAttribute('aria-valuenow'));
 await page.mouse.move(rubberTrack.x+rubberTrack.width*.4,rubberTrack.y+rubberTrack.height/2,{steps:8});await page.mouse.up();
 const contracted=Number(await page.getByRole('slider',{name:'End'}).getAttribute('aria-valuenow'));
 assert.ok(stretched>80&&contracted<50,'A captured drag can reverse from stretched to contracted');
 assert.ok((await page.getByRole('slider',{name:'End'}).boundingBox()).width>=28);
 console.log("PASS: value-driven directional/quiet motion, Radix form/ref/commit, rubber drag reversal and quiet shape equivalence in range/RTL/vertical.");
}finally{await browser.close()}
