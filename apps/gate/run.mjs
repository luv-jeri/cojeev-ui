import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { createServer } from "vite";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const arg = name => process.argv.find(value=>value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const ids=(arg("components")??"button,badge,card").split(",");
const widths=(arg("widths")??"360,390,768,1024,1440,1920").split(",").map(Number);
const limit=Number(arg("limit")??Infinity);
const reference="reference/sahajiv-handoff-v4";
const registry=JSON.parse(fs.readFileSync(`${reference}/data/registry.json`,"utf8")).entries;
const portMap=JSON.parse(fs.readFileSync(`${reference}/data/port-map.json`,"utf8")).entries;
const properties=["background-color","color","font-family","font-size","font-weight","line-height","letter-spacing","padding-top","padding-right","padding-bottom","padding-left","height","min-height","border-top-width","border-top-style","border-top-color","border-radius","box-shadow","outline","outline-offset","gap","opacity","transform","transition-duration","transition-timing-function"];
const out=path.resolve("artifacts/gate");fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:path.resolve("apps/gate/vite.config.ts"),server:{port:4317,strictPort:true}});
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
  const styles=await page.evaluate(({properties,parts})=>{
    const roots=Array.from(document.querySelectorAll("[data-gate]"));
    const entries=roots.map((el,index)=>({el,key:`gate:${el.getAttribute("data-gate")}:${index}`}));
    for(const [selector,name] of Object.entries(parts))document.querySelectorAll(selector).forEach((el,index)=>{if(!roots.includes(el))entries.push({el,key:`part:${name}:${index}`});});
    return Object.fromEntries(entries.map(({el,key})=>{const cs=getComputedStyle(el);return[key,Object.fromEntries(properties.map(p=>[p,cs.getPropertyValue(p)]))];}));
  },{properties,parts:portMap[id].parts});
  frames[width]={styles,pixels:await page.screenshot(),errors:[...errors]};
  }
  return frames;
}
function styleDiff(a,b){const diff=[];for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(!a[key]||!b[key]){diff.push({part:key,property:"presence",reference:!!a[key],candidate:!!b[key]});continue;}for(const property of properties)if(a[key][property]!==b[key][property])diff.push({part:key,property,reference:a[key][property],candidate:b[key][property]});}return diff;}
function pixels(a,b){const x=PNG.sync.read(a),y=PNG.sync.read(b),d=new PNG({width:x.width,height:x.height});const count=pixelmatch(x.data,y.data,d.data,x.width,x.height,{threshold:0.1,includeAA:true});return {count,ratio:count/(x.width*x.height),diff:PNG.sync.write(d)};}
try{
  for(const id of ids){
    if(registry[id]?.tier!=="base")throw new Error(`Not a base component: ${id}`);
    for(const file of registry[id].isolation.filter(file=>!arg("file")||file.includes(arg("file"))).slice(0,limit)){
      const oracle=`http://127.0.0.1:4317/${reference}/isolation/${id}/${file}`;
      const candidate=`http://127.0.0.1:4317/candidate?id=${id}&file=${file}`;
      const A=await sample(oracle,id),A2=await sample(oracle,id),B=await sample(candidate,id),B2=await sample(candidate,id);
      for(const width of widths){
      const a=A[width],a2=A2[width],b=B[width],b2=B2[width];
      const oracleStable=hash(a.pixels)===hash(a2.pixels)&&!styleDiff(a.styles,a2.styles).length;
      const candidateStable=hash(b.pixels)===hash(b2.pixels)&&!styleDiff(b.styles,b2.styles).length;
      const differences=styleDiff(a.styles,b.styles);const delta=pixels(a.pixels,b.pixels);
      const verdict=!oracleStable||!candidateStable?"HARNESS_UNSTABLE":differences.length||delta.ratio>0.001?"FAIL":"PASS";
      if(verdict!=="PASS")process.exitCode=1;
      const name=`${id}-${file.replace(".html","")}-${width}`;
      if(verdict!=="PASS"){for(const [suffix,bytes]of[["reference",a.pixels],["candidate",b.pixels],["diff",delta.diff]])fs.writeFileSync(`${out}/${name}-${suffix}.png`,bytes);}
      results.push({id,file,width,verdict,oracleStable,candidateStable,pixelDifference:delta.ratio,differences});
      fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
      console.log(`${verdict} ${name}: ${differences.length} style differences, ${(100*delta.ratio).toFixed(4)}% pixels`);
      // The spike must resolve its first invalid comparison before scaling up.
      if(verdict!=="PASS"&&arg("fail-fast")!=="false")throw new Error(`Gate stopped at ${name}: ${verdict}`);
      }
    }
  }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
  const unchanged=candidateHash()===candidateRevision;
  if(!unchanged){console.error("Candidate source changed during the run; results are not release evidence.");process.exitCode=1;}
  const complete=ids.every(id=>results.filter(r=>r.id===id).length===registry[id].isolation.length*widths.length)&&widths.length===6;
  const text=["# Fidelity gate","",`Scope: ${ids.join(", ")}. ${results.length} measured comparisons. Full six-width isolation coverage: ${complete?"yes":"NO"}.`,"","Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Motion and keyboard coverage are separate and pending.","","| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |","| --- | --- | ---: | --- | ---: | ---: |",...results.map(r=>`| ${r.id} | ${r.file} | ${r.width} | ${r.verdict} | ${r.differences.length} | ${(100*r.pixelDifference).toFixed(4)}% |`),""];
  text.splice(2,0,`Candidate source SHA-256: ${candidateRevision}. Unchanged during run: ${unchanged?"yes":"NO"}.`,"");
  fs.writeFileSync("GATE.md",text.join("\n"));
  await browser.close();await server.close();
}
