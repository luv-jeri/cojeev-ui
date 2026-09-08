import test from "node:test";
import assert from "node:assert/strict";
import { sculptureGeometry } from "@/registry/sahajiv/lib/sculpture-geometry";
import { createVelocityField, stirVelocityField, advanceVelocityField, clearVelocityField } from "../registry/sahajiv/lib/sculpture-flow";
import { sampleSculptureSurface, createParticleSpring, stepParticleSpring, pulseParticleSpring, resetParticleSpring } from "../registry/sahajiv/lib/sculpture-particles";
import { materialPixelSize, orientSculptureTriangles } from "../registry/sahajiv/lib/sculpture-stage-geometry";

test("native surface preparation respects supplied outward normals and pixel budgets",()=>{
 const mesh=sculptureGeometry({positions:[0,0,0,0,1,0,1,0,0],normals:[0,0,1,0,0,1,0,0,1]});
 assert.deepEqual(Array.from(orientSculptureTriangles(mesh)),[0,2,1]);
 assert.deepEqual(Array.from(mesh.triangles),[0,1,2],"adapting winding must not mutate caller geometry");
 for(const [width,height,dpr]of [[1200,420,3],[390,300,2],[1e7,1e7,10],[NaN,Infinity,NaN]]){const result=materialPixelSize(width,height,dpr);assert.ok(result.width*result.height<=1000000);assert.ok(result.width>=1&&result.height>=1);assert.ok(result.width<=2048&&result.height<=2048);}
});

test("a local stir travels through a finite field and settles back to rest", () => {
  const field = createVelocityField(80, 60);
  stirVelocityField(field, .35, .55, .4, -.3, .12);
  const energy = () => field.x.reduce((sum,value,index) => sum + Math.abs(value) + Math.abs(field.y[index]),0);
  const initial = energy();
  assert.ok(initial > 1, "a stir must produce a visible local field");
  const before = Float32Array.from(field.x);
  advanceVelocityField(field, 1/30, 1);
  assert.notDeepEqual(field.x, before, "velocity must evolve instead of remaining a static mask");
  for (let i=0;i<700;i++) advanceVelocityField(field, 1/30, 1);
  assert.ok(energy() < initial * .001, "a stopped pointer must leave a settled field");
  stirVelocityField(field,NaN,Infinity,NaN,Infinity,Infinity);
  assert.ok([...field.x,...field.y].every(Number.isFinite));
  clearVelocityField(field);assert.equal(energy(),0);
});

test("the velocity field caps allocation and encodes neutral displacement exactly", () => {
  const field = createVelocityField(Infinity,1e9);
  assert.ok(field.width * field.height <= 96*72);
  assert.equal(field.texture.length,field.width*field.height*4);
  advanceVelocityField(field,NaN,NaN);
  for(let i=0;i<field.texture.length;i+=4){assert.equal(field.texture[i],128);assert.equal(field.texture[i+1],128);}
});

test("particles sample surface area deterministically and spring back after a pulse", () => {
  const mesh=sculptureGeometry({positions:[-1,-1,0,1,-1,0,0,1,0]});
  const a=sampleSculptureSurface(mesh,800,9),b=sampleSculptureSurface(mesh,800,9);
  assert.deepEqual(a,b);assert.equal(a.length,2400);
  for(let i=0;i<a.length;i+=3){assert.equal(a[i+2],0);assert.ok(a[i]>=-.9&&a[i]<=.9);}
  const spring=createParticleSpring(a);
  pulseParticleSpring(spring,1);
  stepParticleSpring(spring,1/30,1,1);
  const distance=()=>spring.positions.reduce((sum,value,index)=>sum+Math.abs(value-spring.rest[index]),0);
  const displaced=distance();assert.ok(displaced>1);
  for(let i=0;i<800;i++)stepParticleSpring(spring,1/30,1,1);
  assert.ok(distance()<displaced*.001);
  resetParticleSpring(spring);assert.deepEqual(spring.positions,spring.rest);
});

test("particle springs survive long frame gaps and invalid caller values without escaping bounds",()=>{
  const mesh=sculptureGeometry({positions:[-1,-1,0,1,-1,0,0,1,0]});
  const particles=sampleSculptureSurface(mesh,1e9,NaN);assert.equal(particles.length,8000*3);
  const spring=createParticleSpring(particles);
  for(let i=0;i<30;i++){pulseParticleSpring(spring,Infinity);stepParticleSpring(spring,1e6,Infinity,NaN,{x:0,y:0,z:0,radius:Infinity,strength:Infinity,swirl:Infinity});}
  assert.ok([...spring.positions,...spring.velocities].every(Number.isFinite));
  assert.ok(spring.positions.every(value=>Math.abs(value)<4));
});
