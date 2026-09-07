import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { createServer } from "vite";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const arg = name => process.argv.find(value=>value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const requestedIds=arg("components");
const widths=(arg("widths")??"360,390,768,1024,1440,1920").split(",").map(Number);
const limit=Number(arg("limit")??Infinity);
const reference="reference/sahajiv-handoff-v4";
const registry=JSON.parse(fs.readFileSync(`${reference}/data/registry.json`,"utf8")).entries;
const portMap=JSON.parse(fs.readFileSync(`${reference}/data/port-map.json`,"utf8")).entries;
const semantics=JSON.parse(fs.readFileSync("apps/gate/fixture-semantic-map.json","utf8")).entries;
const ids=requestedIds?requestedIds.split(","):Object.keys(registry).filter(id=>registry[id].tier==="base");
const port=Number(arg("port")??4317);
const properties=["background-color","color","font-family","font-size","font-weight","line-height","letter-spacing","padding-top","padding-right","padding-bottom","padding-left","height","min-height","border-top-width","border-top-style","border-top-color","border-radius","box-shadow","outline","outline-offset","gap","opacity","transform","transition-duration","transition-timing-function"];
const out=path.resolve(arg("out")??"artifacts/gate");fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:path.resolve("apps/gate/vite.config.ts"),server:{port,strictPort:true}});
await server.listen();
const browser=await chromium.launch();
// One page, one context. Every side is loaded sequentially and sampled twice.
const context=await browser.newContext({viewport:{width:widths[0],height:900},reducedMotion:"reduce"});
const page=await context.newPage();
const errors=[];page.on("pageerror",e=>errors.push(e.message));
const results=[];
function hash(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function candidateHash(){const files=[];function walk(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())walk(file);else files.push(file);}}walk("registry/sahajiv");walk("apps/gate");return hash(files.map(file=>`${file}\n${fs.readFileSync(file,"utf8")}`).join("\n"));}
const candidateRevision=candidateHash();
async function sample(url,id){
  errors.length=0;
  await page.setViewportSize({width:Math.max(...widths),height:Math.max(900,Number(registry[id].canvas.split("x")[1]))});
  await page.goto(url,{waitUntil:"load"});
  await page.waitForFunction(()=>document.documentElement.dataset.ready==="1");
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1800);
  const frames={};
  for(const width of widths){
  await page.setViewportSize({width,height:Math.max(900,Number(registry[id].canvas.split("x")[1]))});
  // Let layout and ResizeObserver delivery complete; the engine clock below then
  // produces the exact frame. A fixed wall-clock pause adds no evidence here.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>{window.VMorph?.rewind?.();window.__sahajivGate?.rewind();window.V?.clock?.(100000);window.__sahajivGate?.clock(100000);window.V?.clock?.(100400);window.__sahajivGate?.clock(100400);});
  if(errors.length)throw new Error(errors.join("\n"));
  const styles=await page.evaluate(({properties,parts,translations,candidate})=>{
    const visible=el=>{
      if(!el.getClientRects().length||getComputedStyle(el).visibility==="hidden"||getComputedStyle(el).display==="none")return false;
      // Chromium can report layout rectangles for the hidden contents of a
      // native closed details element. Its direct summary remains visible.
      for(let parent=el.parentElement;parent;parent=parent.parentElement){
        if(!parent.matches("details:not([open])"))continue;
        const summary=Array.from(parent.children).find(child=>child.tagName==="SUMMARY");
        if(!summary?.contains(el))return false;
      }
      return true;
    };
    const roots=Array.from(document.querySelectorAll("[data-gate]"));
    const counts=new Map();
    const key=(kind,name,el)=>{const prefix=`${visible(el)?"":"hidden-"}${kind}:${name}`;const count=counts.get(prefix)??0;counts.set(prefix,count+1);return `${prefix}:${count}`};
    const entries=roots.map(el=>({el,key:key("gate",el.getAttribute("data-gate"),el)}));
    for(const [selector,name] of Object.entries(parts)){
      const resolved=candidate?(translations?.[selector]?.candidateSelector??selector):selector;
      document.querySelectorAll(resolved).forEach(el=>{if(!roots.includes(el))entries.push({el,key:key("part",name,el)});});
    }
    return Object.fromEntries(entries.map(({el,key})=>{const cs=getComputedStyle(el);return[key,{__visible:String(visible(el)),...Object.fromEntries(properties.map(p=>[p,cs.getPropertyValue(p)]))}];}));
  },{properties,parts:portMap[id].parts,translations:semantics[id]?.parts,candidate:url.includes("/candidate?")});
  frames[width]={styles,pixels:await page.screenshot(),errors:[...errors]};
  }
  return frames;
}
function styleDiff(a,b){const diff=[];for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
 if(!a[key]||!b[key]){const existing=a[key]??b[key];if(existing?.__visible==="false")continue;diff.push({part:key,property:"presence",reference:!!a[key],candidate:!!b[key]});continue;}
 if(a[key].__visible!==b[key].__visible){diff.push({part:key,property:"visibility",reference:a[key].__visible,candidate:b[key].__visible});continue;}
 if(a[key].__visible==="false")continue;
 for(const property of properties)if(a[key][property]!==b[key][property])diff.push({part:key,property,reference:a[key][property],candidate:b[key][property]});
 }return diff;}

function pixels(a,b){const x=PNG.sync.read(a),y=PNG.sync.read(b),d=new PNG({width:x.width,height:x.height});const count=pixelmatch(x.data,y.data,d.data,x.width,x.height,{threshold:0.1,includeAA:true});return {count,ratio:count/(x.width*x.height),diff:PNG.sync.write(d)};}
try{
  for(const id of ids){
    if(registry[id]?.tier!=="base")throw new Error(`Not a base component: ${id}`);
    for(const file of registry[id].isolation.filter(file=>!arg("file")||file.includes(arg("file"))).slice(0,limit)){
      const oracle=`http://127.0.0.1:${port}/${reference}/isolation/${id}/${file}`;
      const candidate=`http://127.0.0.1:${port}/candidate?id=${id}&file=${file}`;
      let A,A2,B,B2;
      try {A=await sample(oracle,id);A2=await sample(oracle,id);B=await sample(candidate,id);B2=await sample(candidate,id);}
      catch(error){
        process.exitCode=1;
        for(const width of widths)results.push({id,file,width,verdict:"RUNTIME_ERROR",oracleStable:false,candidateStable:false,pixelDifference:null,differences:[{part:"page",property:"runtime",reference:null,candidate:error.message}]});
        fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.error(`RUNTIME_ERROR ${id}/${file}: ${error.message}`);
        if(arg("fail-fast")!=="false")throw error;continue;
      }
      for(const width of widths){
      const a=A[width],a2=A2[width],b=B[width],b2=B2[width];
      const oracleByteStable=hash(a.pixels)===hash(a2.pixels);
      const oracleStable=pixels(a.pixels,a2.pixels).count===0&&!styleDiff(a.styles,a2.styles).length;
      const candidateByteStable=hash(b.pixels)===hash(b2.pixels);
      const candidateStable=pixels(b.pixels,b2.pixels).count===0&&!styleDiff(b.styles,b2.styles).length;
      const differences=styleDiff(a.styles,b.styles);const delta=pixels(a.pixels,b.pixels);
      const verdict=!oracleStable||!candidateStable?"HARNESS_UNSTABLE":differences.length||delta.ratio>0.001?"FAIL":"PASS";
      if(verdict!=="PASS")process.exitCode=1;
      const name=`${id}-${file.replace(".html","")}-${width}`;
      if(verdict!=="PASS"){for(const [suffix,bytes]of[["reference",a.pixels],["candidate",b.pixels],["diff",delta.diff]])fs.writeFileSync(`${out}/${name}-${suffix}.png`,bytes);}
      results.push({id,file,width,verdict,oracleStable,candidateStable,oracleByteStable,candidateByteStable,pixelDifference:delta.ratio,differences});
      fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
      console.log(`${verdict} ${name}: ${differences.length} style differences, ${(100*delta.ratio).toFixed(4)}% pixels`);
      // Default fail-fast for fixes; a diagnostic wave can collect independent failures.
      if(verdict!=="PASS"&&arg("fail-fast")!=="false")throw new Error(`Gate stopped at ${name}: ${verdict}`);
      }
    }
  }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
  const unchanged=candidateHash()===candidateRevision;
  if(!unchanged){console.error("Candidate source changed during the run; results are not release evidence.");process.exitCode=1;}
  const complete=ids.every(id=>results.filter(r=>r.id===id).length===registry[id].isolation.length*widths.length)&&widths.length===6;
  const text=["# Fidelity gate","",`Scope: ${ids.join(", ")}. ${results.length} measured comparisons. Full six-width isolation coverage: ${complete?"yes":"NO"}.`,"","Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.","","| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |","| --- | --- | ---: | --- | ---: | ---: |",...results.map(r=>`| ${r.id} | ${r.file} | ${r.width} | ${r.verdict} | ${r.differences.length} | ${(100*r.pixelDifference).toFixed(4)}% |`),""];
  text.splice(2,0,`Candidate source SHA-256: ${candidateRevision}. Unchanged during run: ${unchanged?"yes":"NO"}.`,"");
  fs.writeFileSync(arg("report")??"GATE.md",text.join("\n"));
  await browser.close();await server.close();
}
