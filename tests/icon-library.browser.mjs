import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
const browser=await chromium.launch();
const base=process.env.POLISH_URL??"http://127.0.0.1:4320/cojeev-ui";
await mkdir("output/playwright/round-6-icons",{recursive:true});
try{
  for(const width of [360,1440])for(const mode of ["light","dark"]){
    const page=await browser.newPage({viewport:{width,height:1000},permissions:["clipboard-read","clipboard-write"],reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`${base}/docs/icon/`);
    const explorer=page.locator('[data-icon-explorer="native"]');
    await explorer.locator(".v-morph-live").first().waitFor({state:"attached"});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(mode=>{document.documentElement.dataset.mode=mode},mode);
    assert.equal(await explorer.locator("[data-icon-option]").count(),24,"mount only one bounded result page");
    const inspector=explorer.locator("[data-icon-inspector]");
    const initial=await inspector.boundingBox();
    for(const treatment of ["Duotone","Organic","Outline"]){
      await explorer.getByRole("group",{name:"Icon treatment",exact:true}).getByRole("button",{name:treatment,exact:true}).click();
      const final=await inspector.boundingBox();
      assert.ok(Math.abs(final.height-initial.height)<1,"treatments do not resize the inspector");
    }
    await explorer.getByRole("group",{name:"Icon treatment",exact:true}).getByRole("button",{name:"Organic",exact:true}).click();
    await explorer.getByRole("button",{name:"Blue accent",exact:true}).click();
    const search=explorer.getByRole("searchbox",{name:"Find an icon"});
    await search.fill("air-vent");
    await explorer.locator('[data-icon-option="air-vent"]').click();
    assert.equal(await explorer.locator("[data-icon-selected]").innerText(),"air-vent","full pack names are selectable");
    assert.ok(Math.abs((await inspector.boundingBox()).height-initial.height)<1,"changing motion description does not shift the inspector");
    const beforeCopy=await inspector.boundingBox();
    await explorer.getByRole("button",{name:"Copy JSX",exact:true}).click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'<Icon name="air-vent" treatment="organic" tone="blue" style={{ color: "var(--status-info-ink)" }} feedbackDuration={0.7} feedbackEase="gentle" />');
    assert.ok(Math.abs((await inspector.boundingBox()).height-beforeCopy.height)<1,"copy receipt does not shift the inspector");
    await search.fill("does-not-exist-1234");
    assert.equal(await explorer.locator("[data-icon-option]").count(),0);
    assert.match(await explorer.locator(':scope > [role="status"]').innerText(),/No matching icons/);
    await explorer.getByRole("button",{name:"Clear icon search",exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute("data-slot")),"input-group-input","clear returns focus to the native search input");
    await explorer.getByRole("button",{name:"Next icons",exact:true}).click();
    assert.match(await explorer.getByRole("navigation",{name:"Icon result pages"}).innerText(),/Page 2 of 72/);
    await explorer.getByRole("button",{name:"Previous icons",exact:true}).click();
    assert.equal(await explorer.locator("[data-icon-option]").count(),24);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"no horizontal page overflow");
    await inspector.screenshot({path:`output/playwright/round-6-icons/inspector-${width}-${mode}.png`});
    await explorer.screenshot({path:`output/playwright/round-6-icons/explorer-${width}-${mode}.png`});
    assert.deepEqual(errors,[],"no client exceptions");
    await page.close();
  }
  const motion=await browser.newPage({viewport:{width:900,height:800},reducedMotion:"no-preference"});
  await motion.goto(`${base}/docs/icon/`);
  const live=motion.locator('[data-icon-explorer="native"]');
  await live.locator(".v-morph-live").first().waitFor({state:"attached"});
  await live.getByRole("button",{name:"Organic",exact:true}).click();
  const outline=live.locator("[data-icon-replay-control] path[data-icon-organic-line]").first();
  const rest=await outline.getAttribute("data-icon-organic-rest");
  await live.locator("[data-icon-replay-control]").click();
  await motion.waitForTimeout(140);
  assert.notEqual(await outline.getAttribute("d"),rest,"organic outline morphs during its finite replay");
  await motion.waitForTimeout(850);
  assert.equal(await outline.getAttribute("d"),rest,"organic outline settles back to its authored rest path");
  await motion.close();
  console.log("PASS: complete-name search, 24 mounted tiles, paging, treatments, exact clipboard, stable inspector, mobile/desktop light/dark.");
}finally{await browser.close()}
