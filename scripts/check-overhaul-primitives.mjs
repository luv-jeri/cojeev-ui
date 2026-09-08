/** Bounded browser behavior proof. Uses an existing docs server; never builds its registry. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { build } from "esbuild";

const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const base = (args.url || "http://127.0.0.1:4320/sahajiv-ui").replace(/\/$/, "");
const output = path.resolve(args.output || "output/playwright/overhaul-primitives");
const widths = (args.widths || "1440,390").split(",").map(Number);
const only = args.only?.split(",");
fs.mkdirSync(output, { recursive: true });
const results = [], errors = [];

async function eventually(read, message, timeout = 3500) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await read()) return; await new Promise(resolve => setTimeout(resolve, 40)); }
  throw new Error(message);
}
async function quiet(page, mode) {
  await page.emulateMedia({ reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
  await page.evaluate(mode => {
    localStorage.removeItem("v-motion"); localStorage.removeItem("v-flow-v1");
    if (mode === "off") localStorage.setItem("v-motion", JSON.stringify({ v: 3, mode: "off", cats: { buttons: true } }));
    if (mode === "flow-off") localStorage.setItem("v-flow-v1", JSON.stringify({ variant: "off", hover: true, speed: 1, intensity: 1, hoverStrength: 1 }));
    window.dispatchEvent(new CustomEvent("v-motion-change")); window.dispatchEvent(new CustomEvent("v-flow"));
  }, mode);
  await page.waitForTimeout(100);
}
async function open(page, id) {
  await page.goto(`${base}/docs/${id}/`);
  const root = page.locator(`[data-example="${id}"]`);
  await root.waitFor(); await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  return root;
}
async function variant(page, id, value) {
  await page.getByLabel("Variant", { exact: true }).selectOption(value);
  const root = page.locator(`[data-example="${id}"][data-variant="${value}"]`);
  await root.waitFor(); await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  return root;
}
async function snapshot(locator) {
  return locator.evaluate(e => ({ animated: e.getAttribute("data-animated"), transform: getComputedStyle(e).transform, translate: getComputedStyle(e).translate, opacity: getComputedStyle(e).opacity, d: e.getAttribute("d"), dash: e.getAttribute("stroke-dasharray"), subtree: [...e.querySelectorAll("g,path,circle,.v-skel__sheen")].map(child=>({d:child.getAttribute("d"),transform:getComputedStyle(child).transform,opacity:getComputedStyle(child).opacity})) }));
}
async function stable(page, locator) {
  await page.waitForTimeout(120); const first = await snapshot(locator); await page.waitForTimeout(160); assert.deepEqual(await snapshot(locator), first); return first;
}

// An isolated React root probes combinations and native props absent from docs examples.
// Only this in-memory audit bundle is generated; no Next/registry build is performed.
const fixture = await build({
  stdin: { sourcefile: "primitives-audit.tsx", loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {AnimatedIcon} from './registry/sahajiv/ui/animated-icon';
    import {Card} from './registry/sahajiv/ui/card';
    import {MotionSurface} from './registry/sahajiv/ui/presence';
    import {ThemeToggle,applyTheme} from './registry/sahajiv/ui/theme-toggle';
    import {useChoreography} from './registry/sahajiv/motion/choreography';
    const host=document.createElement('div'); host.id='primitives-fixture';
    host.style.cssText='position:fixed;top:40px;left:16px;width:min(340px,calc(100vw - 32px));padding:20px;background:var(--v-canvas);z-index:999999;border:1px solid var(--v-border)'; document.body.append(host);
    function Audit(){const [mode,setMode]=React.useState('light');const {quiet}=useChoreography();
      React.useEffect(()=>{applyTheme(mode,quiet)},[mode,quiet]);
      return <><ThemeToggle mode={mode} onModeChange={setMode}/>
        <AnimatedIcon name='check' preset='validation' size='lg' id='contract-icon' role='img' aria-hidden={false} aria-label='Ready state' style={{color:'rgb(255, 0, 0)'}} ref={node=>{host.dataset.refTag=node?.tagName??''}}/>
        <MotionSurface asChild initial={false} animate={{opacity:1,'--presence-y':'22px'}}><Card lift id='depth-contract' tabIndex={0} style={{height:140,marginTop:30}}>Depth and presence share this native Card.</Card></MotionSurface>
      </>}
    const root=createRoot(host); root.render(<Audit/>); window.__primitivesUnmount=()=>{root.unmount();host.remove()};
  ` }, bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
});
async function mountFixture(page) { await page.addScriptTag({ content: fixture.outputFiles[0].text }); await page.locator("#depth-contract").waitFor(); await page.waitForTimeout(600); return page.locator("#primitives-fixture"); }

const checks = {
  async theme(page, width) {
    const root = await open(page, "theme-toggle"), toggle = root.getByRole("switch", { name: "Dark appearance" });
    const path = toggle.locator("svg:not(.v-morph) > path"), sun = await path.getAttribute("d");
    await toggle.click(); await page.waitForTimeout(50); const middle = await path.getAttribute("d");
    await page.waitForTimeout(650); const moon = await path.getAttribute("d");
    assert.notEqual(middle, sun); assert.notEqual(middle, moon); assert.equal(await toggle.getAttribute("aria-checked"), "true");
    await toggle.press("Space"); await page.waitForTimeout(40); await toggle.click(); await page.waitForTimeout(650);
    assert.equal(await path.getAttribute("d"), moon);
    const mounted = await mountFixture(page), global = mounted.getByRole("switch", { name: "Dark appearance" });
    const color = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--v-canvas").trim());
    const light = await color(); await global.click(); await page.waitForTimeout(70); const halfway = await color(); await page.waitForTimeout(500); const dark = await color();
    assert.notEqual(halfway, light); assert.notEqual(halfway, dark);
    await global.click(); await page.waitForTimeout(45); const reversedFrom = await color(); await global.click(); await page.waitForTimeout(500); assert.equal(await color(), dark);
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue("--v-canvas")), "", "Theme clears temporary inline token paint");
    const midflightQuiet = [];
    for (const mode of ["off", "reduced"]) {
      await quiet(page,"active");
      if(await global.getAttribute("aria-checked")==="true"){await global.click();await page.waitForTimeout(500)}
      await global.click();await page.waitForTimeout(40);await quiet(page,mode);await page.waitForTimeout(100);
      assert.equal(await color(),dark,"Quiet interrupts the active crossfade at its requested target");
      assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue("--v-canvas")),"","Interrupted theme clears temporary tokens");
      await stable(page,global.locator("svg:not(.v-morph) > path"));midflightQuiet.push(mode);
    }
    const quietModes = [];
    for (const mode of ["off", "reduced", "flow-off"]) {
      await quiet(page, mode); const target = await global.getAttribute("aria-checked") === "true" ? light : dark;
      await global.click(); await page.waitForTimeout(35); assert.equal(await color(), target); await stable(page, global.locator("svg:not(.v-morph) > path")); quietModes.push(mode);
    }
    await mounted.screenshot({ path: pathFor("theme", width) });
    return { sunMoonInterpolation: true, pointerAndKeyboard: true, rapidReversal: true, colors: { light, halfway, dark, reversedFrom }, temporaryPaintCleared: true, midflightQuiet, quietModes };
  },
  async icons(page, width) {
    let root = await open(page, "animated-icon");
    const spin = root.getByRole("button", { name: "Settings", exact: true }), host = spin.locator("[data-slot=animated-icon]"), body = host.locator(":scope > span");
    await spin.hover(); await eventually(async () => await host.getAttribute("data-animated") === "true", "Settings icon engages on hover");
    const turn = await snapshot(body); await page.waitForTimeout(130); assert.notEqual((await snapshot(body)).transform, turn.transform);
    await spin.focus(); await page.mouse.move(width - 2, 2); await page.waitForTimeout(80);
    assert.equal(await spin.evaluate(e => e === document.activeElement), true); assert.equal(await host.getAttribute("data-animated"), "true", "Pointer leave must preserve focused engagement");
    await root.getByRole("button", { name: "Keep motion active", exact: true }).focus(); await eventually(async () => await host.getAttribute("data-animated") === null, "Blur stops unhovered icon");
    const draw = root.getByRole("button", { name: "Draw a check", exact: true }); await draw.hover();
    const stroke = draw.locator("[data-slot=animated-icon] svg path"); await page.waitForTimeout(70); const drawing = await stroke.getAttribute("stroke-dasharray"); await page.waitForTimeout(600); const drawn = await stroke.getAttribute("stroke-dasharray"); assert.notEqual(drawing, drawn);
    root = await variant(page, "animated-icon", "validation"); const action = root.getByRole("button", { name: "Mark ready", exact: true }), validation = root.locator("[data-slot=animated-icon]").first().locator("svg path");
    const cross = await validation.getAttribute("d"); await action.click(); await page.waitForTimeout(55); const changing = await validation.getAttribute("d"); await page.waitForTimeout(650); const check = await validation.getAttribute("d"); assert.notEqual(changing, cross); assert.notEqual(changing, check);
    const quietModes = [];
    for (const mode of ["off", "reduced", "flow-off"]) {
      await quiet(page, mode); const control = root.getByRole("button", { name: "Settings", exact: true }), icon = control.locator("[data-slot=animated-icon]"); await control.hover(); assert.equal(await icon.getAttribute("data-animated"), null); await stable(page, icon.locator(":scope > span")); quietModes.push(mode);
    }
    await quiet(page, "active"); const active = root.getByRole("button", { name: "Keep motion active", exact: true }); await active.click();
    const continuous = root.locator("[data-slot=animated-icon]").first(); await eventually(async () => await continuous.getAttribute("data-animated") === "true", "Explicit active icon starts");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await eventually(async () => await continuous.getAttribute("data-animated") === null, "Offscreen icon suspends"); await stable(page, continuous.locator(":scope > span"));
    await root.scrollIntoViewIfNeeded(); await root.screenshot({ path: pathFor("icons", width) });
    return { hoverSpin: true, focusSurvivesPointerLeave: true, blurStops: true, draw: { drawing, drawn }, validationMorph: true, quietModes, offscreenStatic: true };
  },
  async depth(page, width) {
    await open(page, "card"); const root = await variant(page, "card", "lift"), card = root.locator("[data-slot=card]").first();
    const rect = await card.boundingBox(); await page.mouse.move(rect.x + rect.width * .85, rect.y + rect.height * .75); await page.waitForTimeout(500);
    const natural = await card.evaluate(e => ({ rotate: getComputedStyle(e).rotate, lift: getComputedStyle(e).getPropertyValue("--depth-lift") })); assert.ok(parseFloat(natural.lift) < -2);
    const mounted = await mountFixture(page), composed = mounted.locator("#depth-contract"), box = await composed.boundingBox(); await page.mouse.move(box.x + box.width * .9, box.y + box.height * .8); await page.waitForTimeout(500);
    const combined = await composed.evaluate(e => {const s=getComputedStyle(e);return {translate:s.translate,presence:s.getPropertyValue("--presence-y"),lift:s.getPropertyValue("--depth-lift"),rotate:s.rotate}});
    assert.ok(Math.abs(parseFloat(combined.translate.split(" ")[1]) - (parseFloat(combined.presence) + parseFloat(combined.lift))) < .15, "Lifecycle and depth translation must add");
    const svg = await mounted.locator("#contract-icon").evaluate(e => ({ tag:e.tagName,role:e.getAttribute("role"),hidden:e.getAttribute("aria-hidden"),label:e.getAttribute("aria-label"),width:getComputedStyle(e).width,color:getComputedStyle(e).color }));
    assert.equal(svg.tag,"svg");assert.equal(svg.role,"img");assert.equal(svg.hidden,"false");assert.equal(svg.label,"Ready state");assert.equal(svg.width,"24px");assert.equal(svg.color,"rgb(255, 0, 0)");assert.equal(await mounted.getAttribute("data-ref-tag"),"svg");
    await composed.focus(); await page.mouse.move(width - 2, 2); await page.waitForTimeout(500); const focusedLift = await composed.evaluate(e => parseFloat(getComputedStyle(e).getPropertyValue("--depth-lift"))); assert.ok(focusedLift < -1);
    const quietModes = [];
    for(const mode of ["off","reduced","flow-off"]){await quiet(page,mode);assert.equal(await composed.getAttribute("data-depth"),null);assert.equal(await composed.evaluate(e=>parseFloat(getComputedStyle(e).getPropertyValue("--depth-lift"))),0);quietModes.push(mode)}
    await mounted.screenshot({ path: pathFor("depth", width) });
    return { nativeDepth: natural, combined, validationSvgContract: svg, forwardedRef: true, keyboardLift: focusedLift, quietModes };
  },
  async spinner(page, width) {
    const evidence=await loader(page,width,"spinner","[data-slot=spinner]","path.seed");
    await quiet(page,"off");const original=await page.locator('[data-example=spinner] path.seed').getAttribute('d');
    const point=await variant(page,"spinner","point"),host=point.locator('[data-slot=spinner]'),paint=host.locator('path.seed');
    const pointed=await paint.getAttribute('d');assert.notEqual(pointed,original,"Point variant has distinct geometry in quiet mode");
    await quiet(page,"active");await eventually(async()=>await host.getAttribute('data-animated')==='true',"Point resumes");const start=await snapshot(paint);await eventually(async()=>JSON.stringify(await snapshot(paint))!==JSON.stringify(start),"Point contour breathes",1600);
    await quiet(page,"reduced");await stable(page,paint);await point.screenshot({path:pathFor("spinner-point",width)});
    return {...evidence,point:{distinctQuietContour:true,activeContourChanges:true,reducedStatic:true}};
  },
  async skeleton(page, width) { return loader(page, width, "skeleton", "[data-slot=skeleton-item]", ".v-skel__sheen"); },
};
async function loader(page, width, id, hostSelector, paintSelector) {
  const root = await open(page, id), host = root.locator(hostSelector).first(), paint = host.locator(paintSelector).first();
  await eventually(async () => await host.getAttribute("data-animated") === "true", `${id} starts in viewport`);
  const before = await snapshot(paint); await eventually(async () => JSON.stringify(await snapshot(paint)) !== JSON.stringify(before), `${id} actually changes paint`, 1600);
  const quietModes = [];
  for (const mode of ["off", "reduced", "flow-off"]) { await quiet(page, mode); assert.equal(await host.getAttribute("data-animated"), null); await stable(page, id === "spinner" ? host : paint); quietModes.push(mode); }
  await quiet(page, "active"); await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await eventually(async () => await host.getAttribute("data-animated") === null, `${id} stops offscreen`); await stable(page, id === "spinner" ? host : paint);
  await host.scrollIntoViewIfNeeded(); await eventually(async () => await host.getAttribute("data-animated") === "true", `${id} resumes on return`); await root.screenshot({ path: pathFor(id, width) });
  return { visiblePaintChanges: true, quietModes, offscreenStatic: true, resumesOnReturn: true, accessibleLabel: await host.getAttribute("aria-label") };
}
function pathFor(id, width) { return path.join(output, `${id}-${width}.png`); }

const browser = await chromium.launch();
try {
  for (const width of widths) for (const [name, check] of Object.entries(checks)) {
    if (only && !only.includes(name)) continue;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "no-preference", colorScheme: "light" });
    const page = await context.newPage(), pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    try { const evidence = await check(page, width); assert.deepEqual(pageErrors, []); results.push({ name, width, passed: true, evidence }); console.log(`PASS ${name} ${width}`); }
    catch (error) { results.push({ name, width, passed: false, error: error.stack }); await page.screenshot({ path: pathFor(`${name}-failure`, width) }).catch(() => {}); process.exitCode = 1; console.log(`FAIL ${name} ${width}: ${error.message}`); }
    finally { errors.push(...pageErrors.map(error => ({ name, width, error }))); await context.close(); }
  }
} finally {
  await browser.close(); fs.writeFileSync(path.join(output, "results.json"), JSON.stringify({ base, widths, results, errors }, null, 2));
}
