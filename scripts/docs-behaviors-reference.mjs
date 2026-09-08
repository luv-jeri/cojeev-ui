import assert from "node:assert/strict";
import fs from "node:fs";

// The reference gate checks real public specimen controls. These same journeys
// are also exercised at desktop/touch widths by check-reference-effects.mjs.
const stageSignature = async stage => await stage.getAttribute("data-slot") === "portal-field" ? (await stage.screenshot()).toString("base64") : stage.evaluate(element => {
  const canvas = element.querySelector("canvas");
  let pixels = "";
  if (canvas) { try { pixels = canvas.toDataURL(); } catch { pixels = "tainted"; } }
  const marks = [...element.querySelectorAll("[transform],[style],feTurbulence,clipPath rect")].map(node => [node.getAttribute("transform"), node.getAttribute("style"), node.getAttribute("baseFrequency"), node.getAttribute("x"), node.getAttribute("width")]);
  return JSON.stringify([pixels, marks]);
});

export function createReferenceTests() {
  const rows = JSON.parse(fs.readFileSync("data/reference-effects.json", "utf8"));
  return Object.fromEntries(rows.filter(row => row.status === "new").map(row => [row.id, async ({page,root:specimen,entry:sourceEntry}) => {
    const doc=sourceEntry.name, entry={id:doc}, width=page.viewportSize().width, context=page.context();
    const output="artifacts/production-reference";fs.mkdirSync(output,{recursive:true});
    const result={checks:[]};
    await page.emulateMedia({reducedMotion:"no-preference"});
    const stage=specimen.locator(`[data-slot="${doc}"]`).first();await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(350);
    const box=await stage.boundingBox();
      const initial = await stageSignature(stage);
      if (width < 500 && !["motion-drawer","linear-modal","swapy"].includes(doc)) await page.touchscreen.tap(box.x + box.width * .65, box.y + box.height * .52);
      else { await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .4, { steps: 12 }); }
      await page.waitForTimeout(240);
      if (["swarm-cursor", "ghost-cursor", "magic-rings", "strands", "meta-balls", "ripple-distortion", "image-trail", "orbit-images", "typography-vortex", "warp-text"].includes(doc)) {
        assert.notEqual(await stageSignature(stage), initial, "Paint responds over time or to input"); result.checks.push("visible paint changes");
      }
      if (doc === "elastic-mesh" && width >= 500) { assert.notEqual(await stageSignature(stage), initial); result.checks.push("mesh deformation"); }
      if (doc === "portal-field") {
        assert.equal(await stage.getAttribute("data-renderer"), "webgl");
        assert.notEqual(await stageSignature(stage), initial); result.checks.push("organic WebGL halo changes");
      }
      if (doc === "article-headings") {
        await specimen.getByRole("button", { name: "Replay decode" }).click(); await page.waitForTimeout(100);
        const decoded = await stage.locator("[data-heading-visual]").first().innerText();
        await page.waitForTimeout(1000);
        assert.notEqual(await stage.locator("[data-heading-visual]").first().innerText(), decoded);
        assert.equal(await stage.getAttribute("data-state"), "complete");
        assert.equal(await stage.getByRole("heading", { name: "Ideas need a place to return to", exact: true }).count(), 1);
        result.checks.push("finite heading decode", "canonical accessible heading");
      }
      if (doc === "motion-drawer" || doc === "linear-modal") {
        const trigger = stage.getByRole("button").first(); await trigger.focus(); await trigger.press("Enter");
        const dialog = page.getByRole("dialog", { name: doc === "motion-drawer" ? "A place to begin" : "Room for good ideas", exact: true });
        await dialog.waitFor({state:"visible"}); await page.waitForTimeout(500);
        assert(await dialog.evaluate(el=>el.contains(document.activeElement)), "Focus enters the dialog");
        await dialog.screenshot({path:`${output}/${entry.id}-${width}-open.png`});
        await page.keyboard.press("Escape"); await dialog.waitFor({state:"hidden"});
        assert(await trigger.evaluate(el=>document.activeElement===el), "Focus returns to its trigger");
        result.checks.push("keyboard open", "modal focus containment", "Escape dismissal and focus return");
        if (doc === "motion-drawer") {
          await trigger.click(); await dialog.waitFor({state:"visible"}); await page.waitForTimeout(400);
          const handle=dialog.getByRole("button",{name:"Drag toward the edge to close; press Enter to close"});
          const rect=await handle.boundingBox(),x=rect.x+rect.width*.5,y=rect.y+rect.height*.5;
          if(width<500){const cdp=await context.newCDPSession(page);await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:Math.max(1,x-180),y}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();}
          else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(Math.max(1,x-180),y,{steps:8});await page.mouse.up();}
          await dialog.waitFor({state:"hidden"}); result.checks.push(width<500?"touch drag dismissal":"pointer drag dismissal");
        }
      }
      if (doc === "image-masking") {
        const signature=()=>stage.evaluate(el=>[el.querySelector(".v-image-masking__frame").getAttribute("style"),el.querySelector("clipPath path")?.getAttribute("d")].join("|"));
        const before=await signature();await specimen.getByRole("button",{name:"daisy 12",exact:true}).click();assert.notEqual(await signature(),before);
        assert.equal(await stage.getByRole("img",{name:"Pink sun, olive hills and delicate ink contours",exact:true}).count(),1);
        result.checks.push("shape choice changes actual image mask", "semantic image alternative");
      }
      if (doc === "buy-me-coffee") {
        const href=await stage.getAttribute("href");assert(href?.startsWith("#"));await stage.focus();await stage.press("Enter");
        assert.equal(new URL(page.url()).hash,href);assert(await page.locator(href).isVisible());
        result.checks.push("keyboard support link reaches real local information");
      }
      if (doc === "swapy") {
        const order=()=>stage.locator("[data-swap-id]").evaluateAll(nodes=>nodes.map(node=>node.dataset.swapId));
        await stage.getByRole("button",{name:"Move Collect",exact:true}).focus();await page.keyboard.press("ArrowRight");
        assert.deepEqual((await order()).slice(0,2),["connect","collect"],"Keyboard commits actual order");
        await specimen.getByRole("button",{name:"Restore original order"}).click(); await page.waitForTimeout(350);
        await stage.evaluate(element=>{document.documentElement.style.scrollBehavior="auto";window.scrollTo(0,element.getBoundingClientRect().top+scrollY-100);});
        await page.waitForTimeout(500);
        const handle=await stage.getByRole("button",{name:"Move Collect",exact:true}).boundingBox(),target=await stage.locator('[data-swap-id="connect"]').boundingBox();
        const x=handle.x+handle.width/2,y=handle.y+handle.height/2,tx=target.x+target.width/2,ty=target.y+target.height/2;
        assert(y>0&&y<1050&&ty>0&&ty<1050,"Both drag endpoints are visible");
        assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.getAttribute("aria-label"),{x,y}),"Move Collect");
        if(width<500){const cdp=await context.newCDPSession(page);await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:tx,y:ty}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();}
        else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:8});await page.mouse.up();}
        await page.waitForTimeout(350);
        assert.deepEqual((await order()).slice(0,2),["connect","collect"],"Pointer commits actual order");
        assert.match(await stage.getByRole("status").innerText(),/Collect moved to position 2/);
        result.checks.push("keyboard reorder persists",width<500?"touch handle swaps real cards":"pointer handle swaps real cards","order change announced");
      }
      if (doc === "click-spark") {
        const beforeCount = Number((await specimen.getByRole("status").innerText()).match(/^\d+/)?.[0] ?? 0);
        const button = stage.getByRole("button", { name: "Make a small mark" }); await button.focus(); await button.press("Enter");
        assert.equal(Number((await specimen.getByRole("status").innerText()).match(/^\d+/)?.[0]), beforeCount + 1); result.checks.push("keyboard activation");
      }
      if (doc === "pixel-swap") {
        await specimen.getByRole("button", { name: "Swap the study" }).click();
        const start = await stage.locator("clipPath rect").first().getAttribute("width"); await page.waitForTimeout(220);
        assert.notEqual(await stage.locator("clipPath rect").first().getAttribute("width"), start, "Pixel mask actually animates");
        await page.waitForTimeout(800); assert.equal(await stage.getAttribute("data-active"), "true");
        assert.equal(await stage.locator(".v-pixel-swap__layer").first().getAttribute("inert"), ""); result.checks.push("tiled transition", "outgoing content inert");
      }
      if (doc === "target-cursor") {
        const target = stage.getByRole("button", { name: "Motion", exact: true }); await target.focus(); await target.press("Enter");
        assert.equal(await target.getAttribute("aria-pressed"), "true"); await page.waitForTimeout(300);
        assert.equal(await stage.locator(".v-target-cursor__mark").evaluate(el => getComputedStyle(el).opacity), "1"); result.checks.push("keyboard target tracking");
      }
      if (doc === "scroll-expand") {
        const slider = specimen.getByRole("slider", { name: "Expansion progress" }); const before = await stage.getAttribute("data-progress");
        await slider.focus(); await slider.press("End"); await page.waitForTimeout(150); assert.notEqual(await stage.getAttribute("data-progress"), before); result.checks.push("controlled expansion");
      }
      if (doc === "infinite-spiral") {
        const choice = stage.getByRole("button", { name: "Show Remember" });
        await choice.click(); assert.equal(await choice.getAttribute("aria-pressed"), "true");
        await stage.getByRole("button", { name: "Next image" }).press("Enter");
        assert.equal(await stage.getByRole("button", { name: "Show Grow" }).getAttribute("aria-pressed"), "true");
        result.checks.push("pointer image selection", "keyboard next image");
      }
      if (doc === "accordion-gallery") {
        const choice = stage.getByRole("button", { name: /Gather/ });
        await choice.click(); assert.equal(await choice.getAttribute("aria-expanded"), "true");
        await choice.press("ArrowRight");
        assert.equal(await stage.getByRole("button", { name: /Remember/ }).getAttribute("aria-expanded"), "true");
        assert.equal(await stage.locator(".v-accordion-gallery__story:visible").count(), 1);
        result.checks.push("pointer panel selection", "keyboard selection and visible story");
      }
      if (doc === "option-wheel") {
        const listbox = stage.getByRole("listbox"); await listbox.focus(); await listbox.press("End");
        assert.equal(await stage.getByRole("option", { name: "Return", exact: true }).getAttribute("aria-selected"), "true");
        await stage.getByRole("button", { name: "Next option" }).click();
        assert.equal(await stage.getByRole("option", { name: "Begin", exact: true }).getAttribute("aria-selected"), "true");
        result.checks.push("listbox keyboard selection", "pointer wraparound selection");
      }
      if (["grain-dissolve", "wave-wipe", "dither-dissolve"].includes(doc)) {
        const change = specimen.getByRole("button", { name: "Change scene" });
        await change.focus(); await change.press("Enter"); await page.waitForTimeout(160);
        const middle = await stageSignature(stage); await page.waitForTimeout(180);
        assert.notEqual(await stageSignature(stage), middle, "Transition visibly progresses");
        await change.click(); await page.waitForTimeout(1400);
        assert.equal(await stage.getAttribute("data-active"), "false");
        assert.equal(await stage.locator(`[class="v-${doc}__layer"]`).nth(1).getAttribute("inert"), "");
        await specimen.getByRole("button", { name: "Use still transitions" }).click();
        await change.click(); await page.waitForTimeout(100);
        assert.equal(await stage.getAttribute("data-active"), "true");
        const settled = await stageSignature(stage); await page.waitForTimeout(180);
        assert.equal(await stageSignature(stage), settled);
        result.checks.push("keyboard scene transition", "interrupted reversal", "inactive content inert", "still mode settles target");
      }
      const pause = specimen.getByRole("button", { name: /^Pause (effect|motion|orbit)$/ }).first();
      if (await pause.count()) {
        await pause.focus(); await pause.press("Enter"); await page.waitForTimeout(150);
        const still = await stageSignature(stage); await page.waitForTimeout(180);
        assert.equal(await stageSignature(stage), still, "Pause stops rendered movement"); result.checks.push("keyboard pause stops paint");
        await specimen.getByRole("button", { name: /^Resume (effect|motion|orbit)$/ }).first().click(); await page.waitForTimeout(100);
      }

    await page.emulateMedia({reducedMotion:"reduce"});await page.waitForTimeout(180);
    const still=await stageSignature(stage);await page.waitForTimeout(180);
    assert.equal(await stageSignature(stage),still,"Reduced motion keeps optional paint still");
    await page.emulateMedia({reducedMotion:"no-preference"});
    return [...result.checks,"reduced motion stays still"].join(", ");
  }]));
}
