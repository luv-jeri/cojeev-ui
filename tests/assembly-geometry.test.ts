import assert from "node:assert/strict";
import {test} from "node:test";
import {assemblyContour,floatingContour,organismChoices,organismGeometry,type OrganismKind} from "../registry/sahajiv/lib/assembly-geometry";

test("all native targets and floating silhouettes remain bounded at narrow and wide sizes",()=>{
 for(const width of [240,280,328,360,390,500,700])for(const kind of [...organismChoices.map(choice=>choice.value),"dashboard"] as OrganismKind[])for(const scattered of [true,false])for(const itemCount of [0,3,4])for(const profileComposer of [false,true]){
  const result=organismGeometry(kind,width,scattered,{itemCount,profileComposer});
  for(const [id,part] of Object.entries(result.parts)){
   assert(part);
   assert(part.width>0&&part.height>0,`${kind}/${id} has positive dimensions`);
   assert(part.x>=0&&part.y>=0&&part.x+part.width<=width&&part.y+part.height<=result.height,`${kind}/${id} fits ${width}px`);
  }
 }
});
test("compositions have independent layouts, compact dock and intact native composer targets",()=>{
 assert.deepEqual(organismChoices.map(choice=>choice.value),["profile","side-panel","dock","chat","focus","invite"]);
 const profile=organismGeometry("profile",360),chat=organismGeometry("chat",360),panel=organismGeometry("side-panel",360),dock=organismGeometry("dock",360);
 assert(profile.parts.cover&&profile.parts.stats&&!profile.parts.composer);
 assert(chat.parts.thread&&chat.parts.composer&&!chat.parts.stats);
 assert(panel.parts["task-0"]&&!panel.parts.avatar&&!panel.parts.composer);
 assert(dock.height<280&&dock.parts.surface!.height<100&&!dock.parts.composer);
 assert.equal(chat.parts.composer!.height,52);
 const expanded=organismGeometry("profile",360,false,{profileComposer:true});
 assert.equal(expanded.parts.composer!.height,52);
 assert(expanded.parts.composer!.y>expanded.parts.primary!.y+expanded.parts.primary!.height);
});
test("all floating and useful silhouettes keep finite matching topology through large aspect changes",()=>{
 const ids=new Set(organismChoices.flatMap(choice=>Object.keys(organismGeometry(choice.value,360).parts)));
 for(const shape of [...ids].map(floatingContour).concat(["rounded","circle"]))for(const [width,height]of [[32,32],[300,52],[320,500]]){
  const path=assemblyContour(shape,width,height);
  assert(!/NaN|Infinity/.test(path));assert.equal(path.split(",").length,96);
  for(const value of path.match(/-?\d+(?:\.\d+)?/g)!.map(Number))assert(value>=0&&value<=100);
 }
});

test("asymmetric scatter is deterministic and rotated parts remain separate, including drift",()=>{
 for(const width of [240,280,328,360,390,500,700])for(const choice of organismChoices)for(const itemCount of [0,3,4]){
  const result=organismGeometry(choice.value,width,true,{itemCount,profileComposer:true});
  assert.deepEqual(result,organismGeometry(choice.value,width,true,{itemCount,profileComposer:true}));
  const boxes=Object.values(result.parts).map(part=>{
   assert(part);const angle=(part.rotate??0)*Math.PI/180;
   const radius=part.width/2*(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)));
   const cx=part.x+part.width/2,cy=part.y+part.height/2;
   return{left:cx-radius,right:cx+radius,top:cy-radius-5,bottom:cy+radius};
  });
  for(const [index,box]of boxes.entries()){
   assert(box.left>=0&&box.right<=width&&box.top>=0&&box.bottom<=result.height);
   for(const other of boxes.slice(index+1))assert(box.right<=other.left||other.right<=box.left||box.bottom<=other.top||other.bottom<=box.top,`${choice.value} scatter overlaps at ${width}px`);
  }
 }
});
