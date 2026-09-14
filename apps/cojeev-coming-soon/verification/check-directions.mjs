// Historical three-direction study; selected Type is now verified by check-type.mjs.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const started=performance.now(),errors=[],checks=[];
const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on("pageerror",e=>errors.push(e.message));
const visit=async(p,d)=>{await p.goto("http://127.0.0.1:4345/?direction="+d);await p.locator(".footer-peek").waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(450);};
const capture=async(p,name)=>p.screenshot({path:new URL(name+".png",import.meta.url).pathname});
try {
 await visit(page,"living");
 assert.equal(await page.locator("body").innerText().then(x=>x.includes("A 30-day countdown")),false);
 const icon=page.locator(".footer-peek [data-slot=icon]");
 assert.notEqual(await icon.evaluate(e=>getComputedStyle(e).stroke),"none");
 const control=page.locator(".footer-peek"),path=control.locator("[data-morph-body]");
 const before=await path.getAttribute("d");
 await control.hover();await page.waitForTimeout(110);
 assert.equal(await control.locator("[data-slot=animated-icon]").getAttribute("data-animated"),"true");
 assert.notEqual(await path.getAttribute("d"),before);
 const movingIcon=await icon.locator("[data-icon-part=glyph]").getAttribute("transform");
 assert.ok(movingIcon&&movingIcon!=="translate(0 0)");
 await page.mouse.move(10,100);await page.waitForTimeout(550);await capture(page,"living-desktop");
 const shape=page.locator(".specimen-contour path"),shapeBefore=await shape.getAttribute("d");
 await page.locator(".specimen-touch").hover();await page.waitForTimeout(140);assert.notEqual(await shape.getAttribute("d"),shapeBefore);
 await page.locator(".specimen-touch").click();assert.equal(await page.locator(".specimen-discovery").innerText(),"A memory you share.");
 const top=(await page.locator("h1").boundingBox()).y;await page.mouse.wheel(0,160);await page.getByRole("dialog").waitFor();await page.waitForTimeout(750);
 assert.ok(Math.abs((await page.getByRole("dialog").boundingBox()).height-360)<2);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal((await page.locator("h1").boundingBox()).y,top);
 const tabs=page.locator(".future-tabs-list");assert.equal(await tabs.getAttribute("data-flow-v"),"jelly");const initial=await tabs.locator(".v-glide__pill").evaluate(e=>getComputedStyle(e).transform);
 for(const name of ["Harnesses","Hooks","Identity","Subagents","Memory"]){await page.getByRole("tab",{name,exact:true}).click();assert.equal(await page.locator("[role=tabpanel]:visible").count(),1);}
 await page.getByRole("tab",{name:"Hooks",exact:true}).click();await page.waitForTimeout(120);assert.notEqual(await tabs.locator(".v-glide__pill").evaluate(e=>getComputedStyle(e).transform),initial);
 await page.waitForTimeout(500);await capture(page,"footer-desktop");await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"hidden"});
 await page.getByRole("button",{name:"Pause motion",exact:true}).click();await page.waitForTimeout(200);const still=await shape.getAttribute("d");await page.waitForTimeout(180);assert.equal(await shape.getAttribute("d"),still);await page.getByRole("button",{name:"Resume motion",exact:true}).click();
 await visit(page,"type");await capture(page,"type-desktop");await page.getByRole("button",{name:"Discover hooks",exact:true}).click();assert.equal(await page.locator(".type-feature-link").innerText(),"Your prompts. Your rules.");await page.locator(".type-feature-link").click();await page.getByRole("dialog").waitFor();assert.equal(await page.getByRole("tab",{name:"Hooks",exact:true}).getAttribute("aria-selected"),"true");await page.keyboard.press("Escape");
 await visit(page,"peel");await capture(page,"peel-desktop");await page.getByRole("button",{name:"Peel it back",exact:true}).click();await page.waitForTimeout(850);assert.equal(await page.locator(".poster-inside").getAttribute("aria-hidden"),"false");await capture(page,"peel-open-desktop");await page.getByRole("button",{name:"Every prompt, your way.",exact:true}).click();await page.getByRole("dialog").waitFor();assert.equal(await page.getByRole("tab",{name:"Hooks",exact:true}).getAttribute("aria-selected"),"true");
 checks.push("three compositions and feature shortcuts","visible animated-icon stroke and actual moving glyph","button contour changes on pointer","shape path interpolation","jelly selection moves","five feature panels","stationary page and 40vh wheel footer","Escape and pause/resume");
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on("pageerror",e=>errors.push(e.message));
 for(const d of ["living","type","peel"]){await visit(mobile,d);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await capture(mobile,d+"-mobile");}
 await mobile.getByRole("button",{name:"Peel it back",exact:true}).tap();await mobile.waitForTimeout(850);await capture(mobile,"peel-open-mobile");
 await mobile.getByRole("button",{name:"Meet Cojeev",exact:true}).tap();await mobile.getByRole("dialog").waitFor();await mobile.waitForTimeout(750);assert.ok(Math.abs((await mobile.getByRole("dialog").boundingBox()).height-337.6)<2);await capture(mobile,"footer-mobile");await mobile.keyboard.press("Escape");
 await mobile.setViewportSize({width:320,height:667});await visit(mobile,"peel");await mobile.getByRole("button",{name:"Peel it back",exact:true}).tap();await mobile.waitForTimeout(850);await capture(mobile,"peel-open-narrow");assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mobile.setViewportSize({width:844,height:390});await visit(mobile,"peel");await mobile.getByRole("button",{name:"Peel it back",exact:true}).tap();await mobile.waitForTimeout(850);await capture(mobile,"peel-open-landscape");await mobile.getByRole("button",{name:"The right mind for the task.",exact:true}).tap();await mobile.getByRole("dialog").waitFor();assert.equal(await mobile.getByRole("tab",{name:"Subagents",exact:true}).getAttribute("aria-selected"),"true");
 await mobile.emulateMedia({reducedMotion:"reduce"});await visit(mobile,"living");const quiet=mobile.locator(".specimen-contour path"),q=await quiet.getAttribute("d");await mobile.waitForTimeout(300);assert.equal(await quiet.getAttribute("d"),q);
 checks.push("390 and 320px layouts","touch peel and feature activation","landscape last feature accessible","reduced-motion still");
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
const report={passed:true,checks,errors,checkSeconds:+((performance.now()-started)/1000).toFixed(2)};await writeFile(new URL("checks.json",import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
