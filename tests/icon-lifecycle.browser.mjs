/** Test controlled props without adding a production-only test route or changing the user's tabs. */
import assert from "node:assert/strict";
import {build} from "esbuild";
import {chromium} from "playwright";
const bundle=await build({stdin:{contents:`
  import React from "react";
  import {createRoot} from "react-dom/client";
  import {AnimatedIcon} from "./registry/cojeev/ui/animated-icon";
  import {Icon} from "./registry/cojeev/ui/icon";
  const root=createRoot(document.getElementById("root"));
  window.renderCase=(props,native=false)=>root.render(React.createElement("button",{id:"action"},React.createElement(native?Icon:AnimatedIcon,{style:{width:32,height:32},...props})));
`,loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",define:{"process.env.NODE_ENV":'"production"'}});
const browser=await chromium.launch();
try{
  const page=await browser.newPage();
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(const preset of ["spin","auto"]){
    await page.evaluate(preset=>window.renderCase({name:"loader",preset,duration:.5}),preset);
    const action=page.locator("#action");
    await action.waitFor();await page.waitForTimeout(200);
    await action.evaluate(node=>node.click());
    await page.waitForTimeout(100);
    await page.evaluate(preset=>window.renderCase({name:"loader",preset,duration:1}),preset);
    await page.waitForTimeout(1200);
    assert.equal(await action.locator('[data-slot="animated-icon"]').getAttribute("data-animated"),null,`${preset}: duration change must retire a one-shot replay`);
    assert.equal(await action.locator('[data-icon-part="glyph"]').getAttribute("transform"),null,"retired replay restores geometry");
  }
  for(const name of ["circle","rectangle-horizontal"]){
    await page.evaluate(name=>window.renderCase({name,draw:false},true),name);
    await page.waitForTimeout(100);
    await page.evaluate(name=>window.renderCase({name,draw:true},true),name);
    await page.waitForTimeout(80);
    const geometry=page.locator('#action svg[data-slot="icon"] circle, #action svg[data-slot="icon"] rect').first();
    assert.ok(Number(await geometry.getAttribute("stroke-dashoffset"))>0,`${name}: native Icon draws non-path geometry`);
    await page.waitForTimeout(550);
    assert.equal(await geometry.getAttribute("stroke-dashoffset"),null,"native draw restores a complete visible silhouette");
  }
  console.log("PASS: changing duration retires transient loader/spin replays; native circle/rectangle draw paints and restores.");
}finally{await browser.close()}
