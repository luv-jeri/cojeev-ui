import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { generateComponent } from "../scripts/generate-component.mjs";

test("generator covers every authored base axis and slot and emits parseable TSX",()=>{
 const reference="reference/sahajiv-handoff-v4/data";
 const entries:Record<string,{id:string;tier:string;variants:string[];sizes:string[]}>=JSON.parse(fs.readFileSync(`${reference}/registry.json`,"utf8")).entries;
 const map=JSON.parse(fs.readFileSync(`${reference}/port-map.json`,"utf8")).entries;
 const base=Object.values(entries).filter(entry=>entry.tier==="base");
 assert.equal(base.length,66);
 for(const entry of base){
   const result=generateComponent(entry,map[entry.id]);
   assert.deepEqual(Object.keys(result.axes.variant),["default",...entry.variants]);
   assert.deepEqual(Object.keys(result.axes.size),["default",...entry.sizes]);
   assert.deepEqual(result.slots.map((s:{selector:string})=>s.selector),Object.keys(map[entry.id].parts));
   const output=ts.transpileModule(result.code,{reportDiagnostics:true,fileName:`${entry.id}.tsx`,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
   assert.equal(output.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,entry.id);
 }
 assert.throws(()=>generateComponent({...base[0],tier:"composite"},map[base[0].id]),/Only base/);
 assert.throws(()=>generateComponent({...base[0],id:"../../escape"},map[base[0].id]),/Invalid/);
 assert.throws(()=>generateComponent(base[0],{...map[base[0].id],root:".different"}),/disagree/);
});
