import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { createServer } from "vite";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const arg = name => process.argv.find(value=>value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const requestedIds=arg("components");
const widths=(arg("widths")??"360,390,768,1024,1440,1920").split(",").map(Number);
const limit=Number(arg("limit")??Infinity);
const reference="reference/cojeev-handoff-v4";
const registry=JSON.parse(fs.readFileSync(`${reference}/data/registry.json`,"utf8")).entries;
const portMap=JSON.parse(fs.readFileSync(`${reference}/data/port-map.json`,"utf8")).entries;
const semantics=JSON.parse(fs.readFileSync("apps/gate/fixture-semantic-map.json","utf8")).entries;
const ids=requestedIds?requestedIds.split(","):Object.keys(registry).filter(id=>registry[id].tier==="base");
const port=Number(arg("port")??4317);
const properties=["background-color","color","font-family","font-size","font-weight","line-height","letter-spacing","padding-top","padding-right","padding-bottom","padding-left","width","height","min-height","border-top-width","border-top-style","border-top-color","border-radius","box-shadow","outline","outline-offset","gap","opacity","transform","transition-duration","transition-timing-function"];
const out=path.resolve(arg("out")??"artifacts/gate");fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:path.resolve("apps/gate/vite.config.ts"),server:{port,strictPort:true}});
await server.listen();
const browser=await chromium.launch();
// One page, one context. Every side is loaded sequentially and sampled twice.
const context=await browser.newContext({viewport:{width:widths[0],height:900},reducedMotion:"reduce"});
const page=await context.newPage();
const errors=[];page.on("pageerror",e=>errors.push(e.message));
const results=[];
const priorReceipt=arg("skip-results");
const priorResults=priorReceipt?JSON.parse(fs.readFileSync(priorReceipt,"utf8")):[];
const skipped=[];
const openActions={
  "alert-dialog":{selector:"[data-dialog-open]",method:"click"},
  dialog:{selector:"[data-dialog-open]",method:"click"},
  sheet:{selector:"[data-sheet-open]",method:"click"},
  drawer:{selector:"[data-drawer-open]",method:"click"},
  "dropdown-menu":{selector:"[data-menu]",method:"click"},
  popover:{selector:"[data-menu]",method:"click"},
  menubar:{selector:".v-menubar__trigger",method:"click"},
  select:{selector:"[data-select] > button",method:"click",viewport:"before-open"},
  combobox:{selector:"[data-combo] input",method:"click"},
  "date-picker":{selector:"[data-datepicker] > button",method:"click"},
  "context-menu":{selector:"[data-context]",method:"contextmenu"},
  "hover-card":{selector:"[data-hovercard]",method:"hover"},
  tooltip:{selector:"[data-tooltip]",method:"hover"},
  // The authored durable trigger keeps this static multi-width comparison
  // independent of native toast timeout duration. Other triggers are behavioral tests.
  toast:{selector:"[data-toast][data-durable]",method:"click"},
};
function fixtureScenario(id,file){
  if(!file.includes("-open")||!openActions[id])return {sourceFile:file};
  const sourceFile=file.replace("-open","-rest");
  if(!registry[id].isolation.includes(sourceFile))throw new Error(`Missing paired rest fixture for ${id}/${file}`);
  return {sourceFile,action:openActions[id]};
}
function previouslyExact(id,file,scenario){
  return widths.every(width=>priorResults.some(row=>
    row.id===id&&row.file===file&&row.width===width&&row.verdict==="PASS"&&
    row.oracleStable&&row.candidateStable&&row.pixelDifference===0&&row.differences?.length===0&&
    (!scenario.action||JSON.stringify(row.statePreparation)===JSON.stringify({sourceFile:scenario.sourceFile,...scenario.action}))
  ));
}
function hash(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function candidateHash(){const files=[];function walk(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())walk(file);else files.push(file);}}walk("registry/cojeev");walk("apps/gate");return hash(files.map(file=>`${file}\n${fs.readFileSync(file,"utf8")}`).join("\n"));}
const candidateRevision=candidateHash();
async function sample(url,id,action){
  errors.length=0;
  const height=Math.max(900,Number(registry[id].canvas.split("x")[1]));
  async function prepare(width){
  await page.setViewportSize({width,height});
  await page.goto(url,{waitUntil:"load"});
  await page.waitForFunction(()=>document.documentElement.dataset.ready==="1");
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1800);
  if(action){
    const trigger=page.locator(action.selector).first();
    if(action.method==="hover")await trigger.hover();
    else await trigger.click(action.method==="contextmenu"?{button:"right",position:{x:24,y:24}}:{});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1800);
  }
  }
  // Radix Select intentionally dismisses on resize. Judge its authored open
  // state by opening after each viewport is established on BOTH sides.
  const prepareAtWidth=action?.viewport==="before-open";
  if(!prepareAtWidth)await prepare(Math.max(...widths));
  const frames={};
  for(const width of widths){
  if(prepareAtWidth)await prepare(width);
  else await page.setViewportSize({width,height});
  // Let layout and ResizeObserver delivery complete; the engine clock below then
  // produces the exact frame. A fixed wall-clock pause adds no evidence here.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>{window.VMorph?.rewind?.();window.__cojeevGate?.rewind();window.V?.clock?.(100000);window.__cojeevGate?.clock(100000);window.V?.clock?.(100400);window.__cojeevGate?.clock(100400);});
  if(errors.length)throw new Error(errors.join("\n"));
  const styles=await page.evaluate(({properties,parts,translations,candidate})=>{
    const visible=el=>{
      if(!el.getClientRects().length||getComputedStyle(el).visibility==="hidden"||getComputedStyle(el).display==="none")return false;
      for(let parent=el;parent;parent=parent.parentElement){
        if(Number(getComputedStyle(parent).opacity)===0)return false;
      }
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
      const translation=translations?.[selector];
      const resolved=candidate?(translation?.candidateSelector??selector):(translation?.referenceSelector??selector);
      const pseudo=candidate?translation?.candidatePseudo:translation?.referencePseudo;
      document.querySelectorAll(resolved).forEach(el=>{
        if(pseudo||!roots.includes(el))entries.push({el,pseudo,key:key("part",name,el),unavailable:translation?.computedStyleUnavailable});
      });
    }
    return Object.fromEntries(entries.map(({el,pseudo,key,unavailable})=>{
      const cs=getComputedStyle(el,pseudo);
      return[key,{__visible:String(visible(el)),...(unavailable?{__computedStyleUnavailable:unavailable}:Object.fromEntries(properties.map(p=>[p,cs.getPropertyValue(p)])))}];
    }));
  },{properties,parts:{...portMap[id].parts,...semantics[id]?.additionalParts},translations:semantics[id]?.parts,candidate:url.includes("/candidate?")});
  const oracleAdapters=await page.locator('meta[name="cojeev-oracle-adapter"]').evaluateAll(nodes=>nodes.map(node=>node.content));
  frames[width]={styles,pixels:await page.screenshot(),errors:[...errors],oracleAdapters};
  }
  return frames;
}
function styleDiff(a,b){const diff=[];for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
 if(!a[key]||!b[key]){const existing=a[key]??b[key];if(existing?.__visible==="false")continue;diff.push({part:key,property:"presence",reference:!!a[key],candidate:!!b[key]});continue;}
 if(a[key].__visible!==b[key].__visible){diff.push({part:key,property:"visibility",reference:a[key].__visible,candidate:b[key].__visible});continue;}
 if(a[key].__visible==="false")continue;
 if(a[key].__computedStyleUnavailable||b[key].__computedStyleUnavailable)continue;
 for(const property of properties)if(a[key][property]!==b[key][property])diff.push({part:key,property,reference:a[key][property],candidate:b[key][property]});
 }return diff;}

function pixels(a,b){const x=PNG.sync.read(a),y=PNG.sync.read(b),d=new PNG({width:x.width,height:x.height});const count=pixelmatch(x.data,y.data,d.data,x.width,x.height,{threshold:0.1,includeAA:true});return {count,ratio:count/(x.width*x.height),diff:PNG.sync.write(d)};}
const gateStartedAt=new Date().toISOString();
const oracleUrl=(id,file,atPort=port)=>file.startsWith("demo")?`http://127.0.0.1:${atPort}/${reference}/${registry[id].demo}?mode=${file.includes("dark")?"dark":"light"}`:`http://127.0.0.1:${atPort}/${reference}/isolation/${id}/${file}`;
async function warm(target){
  await page.goto(target,{waitUntil:"load"});
  await page.waitForFunction(()=>document.documentElement.dataset.ready==="1",{},{timeout:120000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1800);
}
let oracleCrossStart=null;
try{
  // B-044. The FIRST run after a source or config edit can read a reference oracle whose
  // dependency graph is still being re-optimised, so a fixture's cascade is served in a
  // different import order for that run. The in-run guard cannot see it: both samples of a
  // contaminated run agree with each other. Two mechanisms below.
  const warmId=ids[0];
  const warmFile=registry[warmId].isolation.find(file=>!arg("file")||file.includes(arg("file")));
  if(warmFile){
    const warmScenario=fixtureScenario(warmId,warmFile);
    // Candidate HTML is served by middleware, so Vite does not discover it as an HTML entry.
    await warm(`http://127.0.0.1:${port}/candidate?id=${warmId}&file=${warmScenario.sourceFile}`);
    // Mechanism 1: the reference fixture loads ONE sheet that @imports eleven others into a
    // single layer, so import order decides its cascade — exactly what a re-optimising graph
    // can serve differently for one run. Until this fix the reference side was never warmed
    // while the candidate side was. Warm it twice: the first load absorbs the re-optimisation.
    await warm(oracleUrl(warmId,warmScenario.sourceFile));
    await warm(oracleUrl(warmId,warmScenario.sourceFile));
    // Mechanism 2: prove independent-start reproducibility. A second, consecutively started
    // server reuses the now-settled optimiser cache, so if this run's oracle disagrees with
    // it, this run's oracle is the unsettled one and none of its measurements are evidence.
    if(arg("skip-oracle-cross-start")!=="true"){
      const probePort=port+1;
      const probeServer=await createServer({configFile:path.resolve("apps/gate/vite.config.ts"),server:{port:probePort,strictPort:true}});
      try{
        await probeServer.listen();
        let agreement=false,attempts=0,detail=null;
        for(attempts=1;attempts<=3&&!agreement;attempts++){
          await warm(oracleUrl(warmId,warmScenario.sourceFile,probePort));
          const p=await sample(oracleUrl(warmId,warmScenario.sourceFile),warmId,warmScenario.action);
          const q=await sample(oracleUrl(warmId,warmScenario.sourceFile,probePort),warmId,warmScenario.action);
          const styleDifferences=widths.flatMap(width=>styleDiff(p[width].styles,q[width].styles).map(diff=>({width,...diff})));
          const pixelDifferentWidths=widths.filter(width=>pixels(p[width].pixels,q[width].pixels).count>0);
          agreement=!styleDifferences.length&&!pixelDifferentWidths.length;
          detail={attempts,styleDifferences:styleDifferences.slice(0,8),pixelDifferentWidths};
        }
        oracleCrossStart={compared:true,agreement,attempts,...detail};
        if(!agreement){
          process.exitCode=1;
          throw new Error(`B-044: the oracle is not independently reproducible across two server starts, so this run is not evidence — ${JSON.stringify(detail).slice(0,600)}`);
        }
        console.log(`oracle cross-start agreement: yes (${attempts-1} attempt(s), ${warmId}/${warmScenario.sourceFile})`);
      } finally {
        await probeServer.close();
      }
    } else {
      oracleCrossStart={compared:false,agreement:null,reason:"--skip-oracle-cross-start=true: the oracle was NOT checked against a second server start, so this run must not be cited as evidence"};
      console.log("oracle cross-start agreement: NOT CHECKED (--skip-oracle-cross-start=true)");
    }
  }
  for(const id of ids){
    if(registry[id]?.tier!=="base")throw new Error(`Not a base component: ${id}`);
    const files=arg("demo-only")==="true"?["demo.html","demo-dark.html"]:registry[id].isolation;
    for(const file of files.filter(file=>!arg("file")||file.includes(arg("file"))).slice(0,limit)){
      const scenario=fixtureScenario(id,file);
      if(priorReceipt&&previouslyExact(id,file,scenario)){
        skipped.push({id,file,widths,receipt:priorReceipt});
        fs.writeFileSync(`${out}/skipped-exact-cases.json`,JSON.stringify(skipped,null,2));
        continue;
      }
      const oracle=oracleUrl(id,scenario.sourceFile);
      const candidate=`http://127.0.0.1:${port}/candidate?id=${id}&file=${scenario.sourceFile}`;
      let A,A2,B,B2;
      try {A=await sample(oracle,id,scenario.action);A2=await sample(oracle,id,scenario.action);B=await sample(candidate,id,scenario.action);B2=await sample(candidate,id,scenario.action);}
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
      const unavailableStyles=Object.entries(a.styles).filter(([,value])=>value.__computedStyleUnavailable).map(([part,value])=>({part,reason:value.__computedStyleUnavailable}));
      results.push({id,file,width,verdict,oracleStable,candidateStable,oracleByteStable,candidateByteStable,pixelDifference:delta.ratio,differences,oracleAdapters:a.oracleAdapters,unavailableStyles,...(scenario.action?{statePreparation:{sourceFile:scenario.sourceFile,...scenario.action}}:{})});
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
  const complete=arg("demo-only")!=="true"&&ids.every(id=>results.filter(r=>r.id===id).length===registry[id].isolation.length*widths.length)&&widths.length===6;
  // Bind the artefact to the tree. Until this was written, a census result carried no SHA at
  // all, so its provenance could only be INFERRED from sibling files and timestamps — which is
  // why the W04 census had to be marked UNKNOWN and could not support a score. The hash is the
  // same value the gate already prints, computed by the gate, beside the gate's own results.
  const gitInfo=(()=>{try{return {head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),dirty:execFileSync("git",["status","--porcelain","--","registry/cojeev","apps/gate"],{encoding:"utf8"}).trim().length>0};}catch{return {head:null,dirty:null};}})();
  const expectedRows=ids.reduce((total,id)=>total+(arg("demo-only")==="true"?2:registry[id].isolation.length)*widths.length,0);
  const provenance={
    gate:"apps/gate/run.mjs",
    gateStartedAt,gateFinishedAt:new Date().toISOString(),
    candidateSourceHash:candidateRevision,
    candidateSourceHashAlgorithm:"sha256 of sorted `path\\ncontent` over registry/cojeev + apps/gate (identical to apps/gate/run.mjs candidateHash())",
    unchangedDuringRun:unchanged,
    ...gitInfo,
    components:ids,widths,expectedRows,measuredRows:results.length,complete,
    oracleCrossStart,
    evidenceUsable:unchanged&&oracleCrossStart?.agreement===true,
    evidenceUsableReason:!unchanged?"candidate source changed during the run":oracleCrossStart?.agreement===true?"cross-start oracle agreement verified":`oracle cross-start was not verified (${oracleCrossStart?.reason??"not compared"})`,
  };
  fs.writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
  const text=["# Fidelity gate","",`Scope: ${ids.join(", ")}. ${results.length} measured comparisons. Full six-width isolation coverage: ${complete?"yes":"NO"}.`,"","Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.","","| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |","| --- | --- | ---: | --- | ---: | ---: |",...results.map(r=>`| ${r.id} | ${r.file} | ${r.width} | ${r.verdict} | ${r.differences.length} | ${(100*r.pixelDifference).toFixed(4)}% |`),""];
  text.splice(2,0,`Candidate source SHA-256: ${candidateRevision}. Unchanged during run: ${unchanged?"yes":"NO"}.`,"");
  text.splice(3,0,`Provenance: \`${out}/provenance.json\` — candidate source SHA-256 \`${candidateRevision}\`, unchanged during run: ${unchanged?"yes":"NO"}, cross-start oracle agreement: ${oracleCrossStart?.agreement===true?"verified":oracleCrossStart?.compared?"NOT VERIFIED":"not checked"}. Evidence usable: ${provenance.evidenceUsable?"yes":"NO"}.`,"");
  if(arg("demo-only")==="true")text.push("This supplementary run compares each original entries/<component>/demo.html, including parts omitted by the generated isolation cases. The same authored markup is rendered in both initial themes; no documentation example or newly designed fixture replaces it.","");
  const adapters=[...new Set(results.flatMap(row=>row.oracleAdapters??[]))];
  const unavailable=[...new Set(results.flatMap(row=>(row.unavailableStyles??[]).map(part=>`${row.id} / ${part.part}: ${part.reason}`)))];
  if(adapters.length)text.push("Recorded fixture adapters: "+adapters.join(", ")+". Reference files remain unchanged.","");
  if(adapters.includes("original-alive-runtime"))text.push("The original catalog's loader runtime is restored only where the isolation generator omitted it.","");
  if(adapters.includes("otp-catalog-sizing"))text.push("OTP uses the catalog's definite grid track and inline-size containment on BOTH sides. The isolation generator omitted that geometry, making native input intrinsic widths expand the scene. This adapter changes only the surrounding canvas, with no control styles or pixel masks (catalog/index.html:114,160,172).","");
  if(unavailable.length)text.push("Computed-style limitations (pixels remain fully compared; interaction proof is separate):",...unavailable.map(value=>`- ${value}`),"");
  const opened=results.filter(row=>row.statePreparation);
  if(opened.length)text.push("Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.","");
  if(skipped.length)text.push(`This bounded follow-up skipped ${skipped.length} files already exact at every requested width in ${priorReceipt}. The skipped-case manifest is retained separately; those earlier rows are not relabeled as measurements from this revision. The complete default command does not skip any cases.`,"");
  fs.mkdirSync(path.dirname(arg("report")??"docs/gates/GATE.md"),{recursive:true});
  fs.writeFileSync(arg("report")??"docs/gates/GATE.md",text.join("\n"));
  await browser.close();await server.close();
}
