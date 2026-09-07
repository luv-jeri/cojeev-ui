import {test} from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {spring,type Spring} from "../registry/sahajiv/motion/geometry"

test("literal spring matches authored integrator across held, merge, release and long-frame trajectories",()=>{
 const source=readFileSync(new URL("../reference/sahajiv-handoff-v4/js/morph.js",import.meta.url),"utf8")
 const expression=source.match(/const spring=(\(s,dt\)=>\{.*?\});/)?.[1]
 assert.ok(expression,"authored spring must be extracted, not copied into the expected implementation")
 const reference=Function("SETTLE","return ("+expression+")")(.0008) as (s:Spring,dt:number)=>void
 for(const [k,z]of [[130,1],[105,.8],[260,.9],[170,.9],[40,1],[80,1]]){
  const actual:Spring={x:0,v:0,to:0,k,z},expected={...actual}
  for(let i=0;i<900;i++){
   const to=i<90?3:i<180?-1.2:i<240?1:0
   actual.to=expected.to=to
   const dt=[0,.001,1/144,1/60,.05,.2][i%6]
   spring(actual,dt);reference(expected,dt)
   assert.deepEqual(actual,expected,`trajectory k=${k}, z=${z}, frame=${i}`)
  }
  assert.equal(actual.x,0);assert.equal(actual.v,0)
 }
})
