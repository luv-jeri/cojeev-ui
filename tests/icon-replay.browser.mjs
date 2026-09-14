/** RF-U-016: real input replays exactly once; animation assertions inspect painted geometry. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
  await page.goto(`${process.env.POLISH_URL??"http://127.0.0.1:4320/cojeev-ui"}/docs/animated-icon/`);
  const example=page.locator('[data-example="animated-icon"]').first();
  await example.locator(".v-morph-live").first().waitFor({state:"attached"});
  const action=example.locator('[data-icon-option="check"]').first();
  const icon=action.locator('[data-slot="animated-icon"]');
  const serial=async()=>Number(await icon.getAttribute("data-icon-replay"));
  await action.scrollIntoViewIfNeeded();
  // Let the reveal/hover animation finish before observing a separate press.
  await action.hover();
  await page.waitForTimeout(850);
  await icon.evaluate(el=>{
    window.checkTraceFrames=0;
    window.checkTraceObserver=new MutationObserver(()=>{
      const path=el.querySelector('[data-icon-part="0"] path');
      const offset=Number(path.getAttribute('stroke-dashoffset'));
      if(offset>0&&offset<path.getTotalLength())window.checkTraceFrames++;
    });
    window.checkTraceObserver.observe(el,{subtree:true,attributes:true,attributeFilter:['stroke-dashoffset']});
  });
  await action.click();
  assert.equal(await serial(),1);
  const check=action.locator('[data-icon-part="0"] path');
  const drawAmount=()=>check.getAttribute("stroke-dashoffset");
  await page.waitForFunction(()=>window.checkTraceFrames>=2,{},{timeout:3000});
  await page.evaluate(()=>window.checkTraceObserver.disconnect());
  await page.waitForTimeout(650);
  await action.click({delay:180});
  assert.equal(await serial(),2,"long pointer hold still activates once");
  await page.waitForTimeout(650);
  await action.press("Space",{delay:180});
  assert.equal(await serial(),3,"long Space hold activates once");
  await action.press("Enter",{delay:180});
  assert.equal(await serial(),4,"Enter activates once");
  await action.dispatchEvent("click");
  assert.equal(await serial(),5,"standalone assistive click replays");
  await action.tap();
  assert.equal(await serial(),6,"touch tap activates once");
  assert.equal(await action.getAttribute("aria-pressed"),"true","selection does not toggle away on replay");

  const pulseAction=page.locator('[data-example="animated-icon"][data-variant="pulse"]').getByRole("button",{name:"Try heart"});
  const pulse=pulseAction.locator('[data-icon-part="glyph"]');
  for(let run=0;run<2;run++){
    await pulseAction.click();
    await page.waitForTimeout(100);
    const transform=await pulse.evaluate(node=>getComputedStyle(node).transform);
    assert.notEqual(transform,"none","pulse has a visible transform on every activation");
    assert.notEqual(transform,"matrix(1, 0, 0, 1, 0, 0)","pulse does not merely change a lifecycle marker");
    await page.waitForTimeout(650);
  }
  const drawAction=page.locator('[data-example="animated-icon"][data-variant="draw"]').getByRole("button",{name:"Try camera"});
  for(let run=0;run<2;run++){
    await drawAction.click();
    await page.waitForTimeout(90);
    const circle=drawAction.locator("circle");
    const dash=await circle.getAttribute("stroke-dashoffset");
    assert.ok(dash&&parseFloat(dash)>0,"draw visibly animates circular geometry, including replay");
    await page.waitForTimeout(650);
  }
  await example.getByRole("button",{name:"Disable actions",exact:true}).click();
  assert.equal(await action.isDisabled(),true);
  const current=await serial();
  await action.dispatchEvent("click");
  assert.equal(await serial(),current,"disabled input cannot replay");
  await page.emulateMedia({reducedMotion:"reduce"});
  await example.getByRole("button",{name:"Enable actions",exact:true}).click();
  await action.click();
  await page.waitForTimeout(90);
  assert.equal(await icon.getAttribute("data-animated"),null);
  assert.equal(await drawAmount(),null,"reduced motion restores a complete check");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.goto(`${process.env.POLISH_URL??"http://127.0.0.1:4320/cojeev-ui"}/docs/icon/`);
  await page.locator('[data-example="icon"] .v-morph-live').first().waitFor({state:"attached"});
  const native=page.locator('[data-icon-option="check"]').first();
  await native.click();
  await page.waitForTimeout(250);
  // The explorer now exposes a 0.7s default. Hold beyond that duration so a
  // release-triggered duplicate would be distinguishable from the original.
  await native.press("Space",{delay:900});
  assert.equal(await native.locator('svg[data-slot="icon"]').getAttribute("data-icon-feedback"),null,"native Icon also avoids a second animation on long Space release");
  console.log("PASS RF-U-016: real pointer, long Space, Enter, touch, assistive click, pulse/draw pixels, disabled/reduced motion.");
}finally{await browser.close()}
