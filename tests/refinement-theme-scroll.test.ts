import {test} from "node:test";
import assert from "node:assert/strict";
import {themeRevealPath,variedThemeOrigin} from "../registry/sahajiv/motion/theme-transition";
import {scrollThumbPath,scrollVelocity} from "../registry/sahajiv/motion/scroll-thumb";

function outline(path:string) {
  const numbers=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),points:[number,number][]=[];
  let start:[number,number]=[numbers[0],numbers[1]];
  for(let i=2;i<numbers.length;i+=6){
    const a=[numbers[i],numbers[i+1]],b=[numbers[i+2],numbers[i+3]],end:[number,number]=[numbers[i+4],numbers[i+5]];
    for(let step=0;step<24;step++){const t=step/24,u=1-t;points.push([u**3*start[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*end[0],u**3*start[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*end[1]])}start=end;
  }
  return points;
}
function contains(points:[number,number][],x:number,y:number){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside}return inside}

test("organic reveal starts at its origin and fully covers every viewport corner",()=>{
  for(const [width,height]of [[390,844],[1440,980]])for(const origin of [{x:12,y:12},{x:width-12,y:height-12},{x:width/2,y:height/2},{x:width-20,y:height/2}])for(const phase of [0,1,3,5]){
    const start=outline(themeRevealPath(0,origin,width,height,phase));assert.ok(start.every(([x,y])=>Math.abs(x-origin.x)<1e-7&&Math.abs(y-origin.y)<1e-7));
    const full=outline(themeRevealPath(1,origin,width,height,phase));for(const[x,y]of [[0,0],[width,0],[width,height],[0,height]])assert.ok(contains(full,x,y),`${width}×${height}: ${x},${y} must be covered`);
    assert.equal(themeRevealPath(.4,origin,width,height,phase).match(/C/g)?.length,12);
  }
});
test("default reveal origins visit all regions without repeating the previous region",()=>{
  const zones=new Set<number>();let previous=-1;
  for(let i=0;i<72;i++){const choice=variedThemeOrigin(390,844,()=>((i*7)%71)/71,previous);assert.notEqual(choice.zone,previous);zones.add(choice.zone);assert.ok(choice.origin.x>=12&&choice.origin.x<=378&&choice.origin.y>=12&&choice.origin.y<=832);previous=choice.zone}
  assert.equal(zones.size,9);
  assert.notEqual(themeRevealPath(.5,{x:100,y:100},390,844,0),themeRevealPath(.5,{x:100,y:100},390,844,2));
});
test("scroll contour responds to direction and held pressure within the native hit area",()=>{
  assert.notEqual(scrollThumbPath(.7,0,1,0),scrollThumbPath(.7,0,-1,0));
  assert.notEqual(scrollThumbPath(1,0,0,0),scrollThumbPath(1,0,0,1));
  for(const active of [0,.7,1,NaN])for(const bend of [-1,0,1])for(const speed of [-10,-1,0,1,10,NaN])for(const pressure of [0,.5,1,Infinity]){
    const path=scrollThumbPath(active,bend,speed,pressure);assert.equal(path.match(/C/g)?.length,8);
    const coordinates=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);coordinates.forEach((value,index)=>assert.ok(value>=0&&value<=(index%2?100:20)));
  }
});
test("native velocity feedback is signed and bounded without generating scroll momentum",()=>{
  assert.ok(scrollVelocity(80,16)>0);assert.ok(scrollVelocity(-80,16)<0);assert.equal(scrollVelocity(0,16),0);
  assert.ok(Math.abs(scrollVelocity(100000,1))<=1);assert.equal(scrollVelocity(NaN,16),0);assert.equal(scrollVelocity(5,0),0);
});
