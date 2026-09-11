import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
const browser=await chromium.launch();
const base=process.env.POLISH_URL??"http://127.0.0.1:4320/cojeev-ui";
await mkdir("output/playwright/round-7-drawer",{recursive:true});
const settled=page=>page.waitForFunction(()=>{const d=document.querySelector('[data-slot="motion-drawer-content"]');if(!d)return false;const m=new DOMMatrixReadOnly(getComputedStyle(d).transform);return Math.abs(m.m41)<.1&&Math.abs(m.m42)<.1&&Math.abs(m.a-1)<.001});
const drag=async(page,x,y,dx,dy)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up()};
try{
  for(const width of [1440,390]) for(const mode of ["light","dark"]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.addInitScript(mode=>localStorage.setItem("cojeev-docs-theme",mode),mode);
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`${base}/docs/motion-drawer/`,{waitUntil:"domcontentloaded"});
    const example=page.locator('[data-example="motion-drawer"]').first();
    await example.locator(".v-morph-live").first().waitFor({state:"attached"});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(mode=>document.documentElement.dataset.mode===mode,mode);
    const source=example.locator('[data-slot="motion-drawer"][data-variant="default"]').first();
    const trigger=source.getByRole("button",{name:"Explore chapters",exact:true});
    const openingFrames = width===1440&&mode==="light" ? page.evaluate(async()=>{
      let node; while(!(node=document.querySelector('[data-slot="motion-drawer-content"]'))) await new Promise(requestAnimationFrame);
      const xs=[];for(let i=0;i<40;i++){xs.push(node.getBoundingClientRect().x);await new Promise(requestAnimationFrame)}return xs;
    }) : null;
    await trigger.click();
    let dialog=page.getByRole("dialog");
    await dialog.waitFor({state:"attached"});
    if(width===1440&&mode==="light"){
      const frames=await openingFrames;
      assert.ok(Math.max(...frames)-Math.min(...frames)>2,"opening must visibly travel, not just change state");
    }
    await settled(page);
    const box=await dialog.boundingBox();
    assert.ok(Math.abs(box.x)<1&&Math.abs(box.y)<1,"default is flush against the viewport edge");
    assert.ok(Math.abs(box.width-300)<1,"default uses the measured 300px width");
    assert.equal(await dialog.evaluate(node=>getComputedStyle(node).borderRadius),"0px");
    assert.equal(await dialog.locator(".v-motion-drawer__handle").count(),0,"no dashed drag button");
    assert.ok(await dialog.evaluate(node=>node.contains(document.activeElement)),"focus enters the modal");
    for(let i=0;i<8;i++){await page.keyboard.press("Tab");assert.ok(await dialog.evaluate(n=>n.contains(document.activeElement)),"Tab stays in modal")}
    await page.screenshot({path:`output/playwright/round-7-drawer/default-${width}-${mode}.png`});
    if(width===1440&&mode==="light"){
      await drag(page,220,500,-30,0);
      await settled(page);
      assert.equal(await dialog.count(),1,"short drag springs back");
      await drag(page,220,500,35,0);
      await settled(page);
      assert.equal(await dialog.count(),1,"wrong-direction drag cannot dismiss");
      await drag(page,220,500,-160,0);
      await dialog.waitFor({state:"detached"});
      await trigger.click();await settled(page);
    }
    await dialog.getByRole("link",{name:"Motion",exact:true}).click();
    await dialog.waitFor({state:"detached"});
    assert.match(await example.getByRole("region",{name:"Selected chapter"}).first().innerText(),/Motion is open/);
    // Verify focus return after the launcher's return journey has settled.
    await page.waitForFunction(()=>document.activeElement?.textContent.includes("Explore chapters"));
    await page.emulateMedia({reducedMotion:"reduce"});
    await trigger.click();await settled(page);
    await page.keyboard.press("Escape");await dialog.waitFor({state:"detached"});
    assert.ok(await trigger.evaluate(n=>document.activeElement===n),"Escape returns focus");
    for(const [variant,label] of [["floating","Open quick actions"],["stack","Choose a chapter"],["bottom","Change layout"]]){
      const root=page.locator(`[data-slot="motion-drawer"][data-variant="${variant}"]`).first();
      await root.getByRole("button",{name:label,exact:true}).click();
      dialog=page.getByRole("dialog");await settled(page);
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.mode),mode,"theme persists when reduced motion changes");
      const background=await dialog.locator(variant === "stack" ? '.v-motion-drawer__stack-card[data-active=true] .v-motion-drawer__stack-card-surface' : '.v-motion-drawer__surface').evaluate(n=>getComputedStyle(n).backgroundColor);
      assert.equal(Number(background.match(/\d+/)[0])<100,mode==="dark","panel paint actually matches the requested theme");
      const r=await dialog.boundingBox();
      assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=901,`${variant} stays inside viewport`);
      assert.ok(await dialog.locator('.v-motion-drawer__body').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${variant} content has no horizontal overflow (stack backplates intentionally extend)`);
      if(variant==="floating"){
        assert.ok(r.height<700,"floating is content-sized, not another full-height sheet");
        await dialog.getByRole("button",{name:/^Pin note/}).click();
        await dialog.getByRole("button",{name:/^Notifications/}).click();
        assert.match(await dialog.innerText(),/Note pinned · Notifications on/);
      }
      if(variant==="stack"){
        await dialog.getByRole("tab",{name:"Shapes",exact:true}).click();
        assert.match(await dialog.getByRole("region",{name:"Shapes outline"}).innerText(),/Shapes selected/);
      }
      await page.screenshot({path:`output/playwright/round-7-drawer/${variant}-${width}-${mode}.png`});
      if(variant==="floating")await dialog.getByRole("button",{name:"Done",exact:true}).click();
      if(variant==="stack")await dialog.getByRole("button",{name:"Open selected",exact:true}).click();
      if(variant==="bottom")await dialog.getByRole("button",{name:/Cards/}).click();
      await dialog.waitFor({state:"detached"});
      if(variant==="bottom")assert.equal(await page.locator("[data-notes-layout]").getAttribute("data-notes-layout"),"cards");
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no page overflow");
    assert.deepEqual(errors,[],"no browser exceptions");
    await page.close();
  }
  console.log("PASS: 4 structural variants; 1440/390 light/dark; reference geometry, real animation, directional drag/snapback, focus trap/return, Escape, reduced motion, real actions and viewport bounds.");
}finally{await browser.close()}
