import { chromium, webkit } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({ configFile:false, base:"/sahajiv-ui/", build:{outDir:"out"}, preview:{host:"127.0.0.1",port:0,strictPort:true} }) : null;
const base=process.env.BASE_URL??(staticServer ? `http://127.0.0.1:${staticServer.httpServer.address().port}/sahajiv-ui` : "http://127.0.0.1:4320/sahajiv-ui");
const output=process.env.OUTPUT_DIR??"output/playwright/refinement-marketing";
await fs.mkdir(output,{recursive:true});
const results=[];
for(const engine of process.env.WEBKIT?[webkit]:[chromium]) {
 const browser=await engine.launch();
 for(const width of (process.env.WIDTHS??"390,768,1440").split(",").map(Number)) for(const theme of ["light","dark"]) {
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme});
  await context.addInitScript(t=>localStorage.setItem("sahajiv-docs-theme",t),theme);
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const row={engine:engine.name(),width,theme,errors,checks:[]};
  try {
   await page.goto(base+"/",{waitUntil:"networkidle"});
   await page.evaluate(()=>document.fonts.ready);
   await page.getByRole("button",{name:"Go on, press me"}).click();
   await page.getByRole("button",{name:"That felt nice. ×1"}).waitFor();row.checks.push("hero press");
   await page.getByRole("button",{name:"Stage 3: Make something useful",exact:true}).click();
   await page.getByRole("textbox",{name:"Try the conversation composer",exact:true}).fill("Make a thoughtful little thing.");
   await page.getByRole("button",{name:"Send message",exact:true}).click();
   await page.getByText("Make a thoughtful little thing.",{exact:true}).waitFor();row.checks.push("assembled composer sends locally");
   await page.getByRole("button",{name:"Use clover soft",exact:true}).click();
   await page.getByRole("button",{name:"Use blue",exact:true}).click();
   await page.getByRole("button",{name:"Filled",exact:true}).click();
   await page.getByRole("slider",{name:"Rotation",exact:true}).focus();await page.keyboard.press("ArrowRight");
   await page.getByRole("img",{name:"clover soft, blue, outlined",exact:true}).waitFor();row.checks.push("shape, tone, outline and keyboard rotation");
   await page.getByRole("button",{name:"Complete",exact:true}).click();row.checks.push("agent state control");
   if(width<801){await page.getByRole("button",{name:"Open navigation",exact:true}).focus();await page.keyboard.press("Enter");await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Components",exact:true}).waitFor({state:"visible"});if(!await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Components",exact:true}).evaluate(el=>el===document.activeElement))throw Error("Keyboard navigation was not focused");await page.keyboard.press("Escape");row.checks.push("mobile navigation keyboard focus and Escape");}
   await page.evaluate(()=>scrollTo(0,0));
   row.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   if(row.overflow)throw Error("Homepage overflows");
   await page.screenshot({path:path.join(output,`home-${engine.name()}-${width}-${theme}.png`),fullPage:true});
   await page.goto(base+"/work-with-me/",{waitUntil:"networkidle"});
   const contact=page.getByRole("link",{name:/Find me on GitHub/});
   if(await contact.getAttribute("href")!=="https://github.com/luv-jeri")throw Error("Wrong creator contact");
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error("Creator page overflows");
   await page.screenshot({path:path.join(output,`creator-${engine.name()}-${width}-${theme}.png`),fullPage:true});row.checks.push("creator route and GitHub contact");
   await page.emulateMedia({reducedMotion:"reduce"});await page.goto(base+"/",{waitUntil:"networkidle"});
   await page.getByRole("textbox",{name:"Try the conversation composer",exact:true}).waitFor({state:"visible"});
   if(!await page.getByRole("button",{name:"Replay",exact:true}).isDisabled())throw Error("Reduced replay should be static");await page.getByRole("button",{name:"Stage 1: Start with the little things",exact:true}).click();if(await page.locator(".story-assembly-stage").getAttribute("data-stage")!=="0")throw Error("Quiet manual stage is ignored");await page.getByRole("button",{name:"Stage 3: Make something useful",exact:true}).click();row.checks.push("reduced motion complete usable assembly and manual stages");
   if(errors.length)throw Error(errors.join("; "));row.pass=true;
  } catch(e) {row.pass=false;row.failure=e.message;await page.screenshot({path:path.join(output,`failure-${engine.name()}-${width}-${theme}.png`),fullPage:true}).catch(()=>{});}
  results.push(row);await fs.writeFile(path.join(output,"results.json"),JSON.stringify(results,null,2));console.log(JSON.stringify(row));await context.close();
 }
 await browser.close();
}
if(staticServer)await new Promise(resolve=>staticServer.httpServer.close(resolve));
if(results.some(r=>!r.pass))process.exitCode=1;
