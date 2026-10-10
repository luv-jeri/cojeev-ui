import assert from "node:assert/strict";
import {test} from "node:test";
import {createIconMotionPainter} from "../registry/cojeev/ui/icon";
import {iconData,type IconNode} from "../registry/cojeev/lib/icon-data";

// The Organic treatment is exercised through the real painter with a minimal SVG stand-in,
// so organicMotionPath needs no extra export.
function paintOrganic(source:string,progress:number,amplitude=1){
  const attributes=new Map<string,string>();
  const path={
    dataset:{iconOrganicSource:source},
    getAttribute:(name:string)=>attributes.get(name)??null,
    setAttribute:(name:string,value:string)=>{attributes.set(name,value)},
    removeAttribute:(name:string)=>{attributes.delete(name)},
  };
  const svg={
    querySelectorAll:(selector:string)=>selector==="path[data-icon-organic-line]"?[path]:[],
    querySelector:()=>null,
  };
  createIconMotionPainter(svg as unknown as SVGSVGElement,"download",amplitude).paint(progress);
  return attributes.get("d")??source;
}

// Verbatim copy of the previous implementation: non-arc output must not drift.
function previousOrganicMotionPath(d:string,amount:number){
  if(!amount)return d;let index=0;
  return d.replace(/-?\d*\.?\d+/g,value=>{index++;const delta=index%5===0?amount:index%7===0?-amount*.6:0;return delta?(Number(value)+delta).toFixed(3).replace(/\.?(?:0+)$/," ").trim():value});
}
const pulse=(progress:number,amplitude:number)=>Math.sin(Math.PI*Math.max(0,Math.min(1,progress)))*Math.max(0,Math.min(3,amplitude))*.18;

/** Strict SVG arc check: each arc parameter group is rx ry rot flag flag x y with flags written as one 0 or 1. */
function arcFlags(d:string){
  const flags:string[]=[];
  for(const [,command,body] of d.matchAll(/([Aa])([^A-Za-z]*)/g)){
    void command;
    let rest=body.trim();
    while(rest){
      const number=/^[\s,]*-?(?:\d+\.?\d*|\.\d+)/;
      for(let slot=0;slot<7;slot++){
        if(slot===3||slot===4){
          const flag=/^[\s,]*([01])/.exec(rest);
          assert.ok(flag,`flag at slot ${slot} of "${d}"`);
          flags.push(flag[1]);rest=rest.slice(flag[0].length);
        }else{
          const match=number.exec(rest);
          assert.ok(match,`number at slot ${slot} of "${d}"`);
          rest=rest.slice(match[0].length);
        }
      }
      rest=rest.replace(/^[\s,]+/,"");
    }
  }
  return flags;
}

const phases=[.1,.25,.5,.75,.9];
const arcPaths=[
  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",           // download
  "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4",
  "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",            // repeated groups, one letter
  "M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9a1 1 0 00 2 2",       // implicit repeat, compact flags
  "M10 10A5 5 0 01 15 15a2.5 2.5 0 10-3-3A1 1 0 1,1 4 4", // compact flags and comma flags
];

test("organic motion keeps arc flags exactly 0 or 1 at every phase",()=>{
  for(const d of arcPaths){
    const rest=arcFlags(d);
    assert.ok(rest.length>0,d);
    for(const progress of phases)for(const amplitude of [1,2,3]){
      const moved=paintOrganic(d,progress,amplitude);
      assert.notEqual(moved,d,`${d} should visibly move at ${progress}`);
      assert.deepEqual(arcFlags(moved),rest,`${d} -> ${moved}`);
      assert.doesNotMatch(moved,/NaN|Infinity/);
    }
  }
});

test("organic motion still moves arc coordinates and radii",()=>{
  // Radii, rotation and end points shift as before; the two flag slots of each arc stay put.
  assert.equal(paintOrganic("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",.5,1),"M21 15v4a2 2.18 0 0 1-2 2.18H5a2 2 -0.108 0 1-2-2v-4");
});

test("organic motion on paths without arcs is unchanged from the previous behaviour",()=>{
  const plain=[
    "M12 15V3","m7 10 5 5 5-5","M4 6h16M4 12h16M4 18h16","m22 6-10 7L2 6",
    "M10 13c0 1-.4 2.5-1.2 3.5C7.2 18.3 5.4 19 4 19.5","M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.8c0-1.1-.4-1.8-.8-2.2",
    ...Object.values(iconData).flat().flatMap(function collect(node:IconNode):string[]{
      const own=node.tag==="path"&&typeof node.attrs.d==="string"?[node.attrs.d]:[];
      return [...own,...node.children.flatMap(collect)];
    }),
  ].filter(d=>!/[Aa]/.test(d));
  assert.ok(plain.length>20);
  for(const d of plain)for(const progress of phases)for(const amplitude of [.5,1,3]){
    assert.equal(paintOrganic(d,progress,amplitude),previousOrganicMotionPath(d,pulse(progress,amplitude)),d);
  }
});

test("organic motion leaves every authored arc icon with valid flags",()=>{
  let checked=0;
  const visit=(node:IconNode)=>{
    if(node.tag==="path"&&typeof node.attrs.d==="string"&&/[Aa]/.test(node.attrs.d)){
      checked++;
      for(const progress of phases)assert.deepEqual(arcFlags(paintOrganic(node.attrs.d,progress,3)),arcFlags(node.attrs.d),node.attrs.d);
    }
    node.children.forEach(visit);
  };
  Object.values(iconData).flat().forEach(visit);
  assert.ok(checked>10,`only ${checked} arc paths found`);
});
