import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base=process.env.BASE_URL??"http://127.0.0.1:4320/sahajiv-ui";
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1050},isMobile:width<500,hasTouch:width<500});
  try{
   const page=await context.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
   await page.goto(`${base}/docs/swapy/`,{waitUntil:"networkidle"});await page.evaluate(()=>document.fonts.ready);
   const specimen=page.locator('[data-example="swapy"]').last(),stage=specimen.locator('[data-slot="swapy"]');await specimen.scrollIntoViewIfNeeded();await page.waitForTimeout(450);
   const order=()=>stage.locator("[data-swap-id]").evaluateAll(nodes=>nodes.map(node=>node.dataset.swapId));
   await stage.getByRole("button",{name:"Move Collect",exact:true}).focus();await page.keyboard.press("ArrowRight");
   assert.deepEqual((await order()).slice(0,2),["connect","collect"],"Keyboard must commit actual DOM order");
   await specimen.getByRole("button",{name:"Restore original order"}).click();await page.waitForTimeout(350);
   const afterReset=await stage.getByRole("button",{name:"Move Collect",exact:true}).boundingBox();
   // Reset is below all four cards and scrolls the page. Never reuse offscreen coordinates.
   await stage.evaluate(element=>{document.documentElement.style.scrollBehavior="auto";window.scrollTo(0,element.getBoundingClientRect().top+scrollY-100);});await page.waitForTimeout(500);
   const handle=await stage.getByRole("button",{name:"Move Collect",exact:true}).boundingBox(),target=await stage.locator('[data-swap-id="connect"]').boundingBox();
   const x=handle.x+handle.width/2,y=handle.y+handle.height/2,tx=target.x+target.width/2,ty=target.y+target.height/2;
   assert(y>0&&y<1050&&ty>0&&ty<1050,"Both drag endpoints must be visible");
   const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.getAttribute("aria-label"),{x,y});assert.equal(hit,"Move Collect","The drag must start on the real handle");
   if(width<500){const cdp=await context.newCDPSession(page);await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:tx,y:ty}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.mouse.up();}
   await page.waitForTimeout(350);assert.deepEqual((await order()).slice(0,2),["connect","collect"],"Pointer/touch must commit actual DOM order");assert.match(await stage.getByRole("status").innerText(),/Collect moved to position 2/);assert.deepEqual(errors,[]);
   results.push({width,keyboard:"passed",pointer:width<500?"touch passed":"mouse passed",afterResetHandleY:afterReset.y,drag:{x,y,tx,ty},order:await order(),errors});
  }finally{await context.close();}
 }
}finally{await browser.close();}
const output=process.env.OUTPUT_FILE??"/tmp/sahajiv-swapy-regression.json";
await fs.writeFile(output,JSON.stringify(results,null,2)+"\n");console.log(JSON.stringify(results,null,2));
