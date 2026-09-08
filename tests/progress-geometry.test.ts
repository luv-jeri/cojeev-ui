import {test} from "node:test";
import assert from "node:assert/strict";
import {organicBandPath,organicLinePath,organicThumbPath,organicOrbitPath,progressRatio,segmentCount} from "../registry/sahajiv/motion/progress-geometry";
import {flowTravelTransition} from "../registry/sahajiv/motion/flow-motion";
test("progress values and segment counts are bounded without pretending unavailable data is complete",()=>{
 assert.equal(progressRatio(50,200),.25);assert.equal(progressRatio(-20),0);assert.equal(progressRatio(Infinity),0);assert.equal(progressRatio(400,200),1);assert.equal(segmentCount(100),32);assert.equal(segmentCount(-1),3);
});
test("organic bands never paint past the represented value, including tiny and invalid boxes",()=>{
 for(const w of [0,3,100,780])for(const h of [2,12,30])for(const p of [0,.001,.2,1])for(const energy of [-1,0,1]){
  const nums=organicBandPath(w,h,p,energy).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  nums.forEach((v,i)=>assert.ok(v>=-.001&&v<=(i%2?h:w*p)+.001,`${w},${h},${p},${energy}: ${v}`));
 }
 assert.equal(organicBandPath(NaN,8),"M0 0Z");assert.notEqual(organicBandPath(100,12,.6,1),organicBandPath(100,12,.6,-1));
});
test("line, thumb and orbit contours keep stable topology while their material changes",()=>{
 for(const e of [-1,0,1]){assert.equal(organicLinePath(100,12,.5,e).match(/C/g)?.length,2);assert.equal(organicThumbPath(1,e).match(/C/g)?.length,8);assert.equal(organicOrbitPath(.5,e).match(/C/g)?.length,12)}
 for(const p of [0,.01,.5,1])for(const e of [-1,0,1])organicOrbitPath(p,e).match(/-?\d+(?:\.\d+)?/g)!.map(Number).forEach(v=>assert.ok(v>=0&&v<=100));
 assert.notEqual(organicThumbPath(0),organicThumbPath(1));
});
test("local flow characters keep distinct travel tuning and scale speed consistently",()=>{
 const glide=flowTravelTransition("glide"),jelly=flowTravelTransition("jelly"),fast=flowTravelTransition("glide",2);
 assert.notDeepEqual(glide,jelly);assert.equal(fast.stiffness,Number(glide.stiffness)*4);assert.equal(fast.damping,Number(glide.damping)*2);
});
