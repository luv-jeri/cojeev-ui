import {test} from "node:test";
import assert from "node:assert/strict";
import * as geometry from "../registry/cojeev/motion/slider-geometry";
const {sliderRailPath,sliderScreenVelocity,sliderThumbPath} = geometry;

const bounds=(path:string)=>{
 const values=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),xs=values.filter((_,index)=>index%2===0),ys=values.filter((_,index)=>index%2===1);
 return {width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
};

test("slider thumb rests as a rounded near-circle",()=>{
 const rest=sliderThumbPath("horizontal",0);
 const {width,height}=bounds(rest);
 assert.equal(rest.match(/C/g)?.length,4);
 assert.ok(Math.abs(width-height)<.1,`expected near circle, got ${width} by ${height}`);
 assert.ok(width>=18&&width<=20,`expected a compact thumb, got ${width}`);
});

test("slider thumb stretches only along the signed direction of travel",()=>{
 const right=bounds(sliderThumbPath("horizontal",1)),up=bounds(sliderThumbPath("vertical",1));
 assert.ok(right.width>right.height+3,`expected horizontal stretch, got ${right.width} by ${right.height}`);
 assert.ok(up.height>up.width+3,`expected vertical stretch, got ${up.width} by ${up.height}`);
});

test("slider rail keeps a quiet capsule at rest and bends only during value travel",()=>{
 const rest=sliderRailPath(160,14,0),moving=sliderRailPath(160,14,1);
 assert.equal(rest.match(/C/g)?.length,6);
 assert.notEqual(rest,moving);
 assert.equal(sliderRailPath(NaN,14,0),"M0 0Z");
});

test("slider travel follows screen direction across orientation, RTL, and inversion",()=>{
 assert.equal(sliderScreenVelocity(.4,{orientation:"horizontal"}),.4);
 assert.equal(sliderScreenVelocity(.4,{orientation:"horizontal",dir:"rtl"}),-.4);
 assert.equal(sliderScreenVelocity(.4,{orientation:"horizontal",inverted:true}),-.4);
 assert.equal(sliderScreenVelocity(.4,{orientation:"horizontal",dir:"rtl",inverted:true}),.4);
 assert.equal(sliderScreenVelocity(.4,{orientation:"vertical"}),-.4);
 assert.equal(sliderScreenVelocity(.4,{orientation:"vertical",dir:"rtl",inverted:true}),.4);
});

test("rubber strand becomes progressively thinner as the selected span stretches",()=>{
 assert.equal(typeof geometry.sliderRubberProfile,"function","Rubber needs a value-derived profile, not only a velocity animation");
 const short=geometry.sliderRubberProfile(.05),half=geometry.sliderRubberProfile(.5),long=geometry.sliderRubberProfile(1);
 assert.ok(short.center>half.center&&half.center>long.center);
 assert.ok(long.center<=short.center/4,"Fully stretched gum must have a visibly thin waist");
 assert.ok(long.attachment>long.center*3,"Rounded attachment must remain visible");
 assert.deepEqual(geometry.sliderRubberProfile(-1),geometry.sliderRubberProfile(0));
 assert.deepEqual(geometry.sliderRubberProfile(2),geometry.sliderRubberProfile(1));
 assert.deepEqual(geometry.sliderRubberProfile(NaN),geometry.sliderRubberProfile(0));
});

test("rubber paint remains finite and bounded even at zero and tiny spans",()=>{
 assert.equal(typeof geometry.sliderRubberPath,"function");
 assert.equal(geometry.sliderRubberPath(0,24,0),"M0 0Z");
 for(const length of [.01,1,8,300]) for(const extent of [0,.5,1]){
  const path=geometry.sliderRubberPath(length,24,extent,1);
  assert.ok(!/NaN|Infinity/.test(path));
  assert.ok(path.endsWith("Z"));
  const shape=bounds(path);
  assert.ok(shape.width<=length+.01&&shape.height<=24.01,JSON.stringify({length,extent,shape}));
 }
});
