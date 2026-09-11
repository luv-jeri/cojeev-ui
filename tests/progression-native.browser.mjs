import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (await fetch(`${origin}/cojeev-ui/docs/stepper/`)).text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
      (await fetch(new URL(m[1], origin))).text(),
    ),
  )
).join("\n");
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{Stepper,StepperList,StepperItem,StepperTitle,StepperIndicator,StepperPrevious,StepperNext,StepperStatus,useStepper}from'./registry/cojeev/ui/stepper';
import{Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbLink,BreadcrumbPage,BreadcrumbBack}from'./registry/cojeev/ui/breadcrumb';
function Probe(){const c=useStepper();window.changeStep=c.change;return <StepperStatus/>}
function Fixture(p){return <><Stepper {...p} key={p.fixture} count={p.count??3} onValueChange={n=>window.events.push(n)} ref={n=>window.stepper=n}><StepperList>{[1,2,3].map(n=><StepperItem key={n} step={n}><StepperIndicator step={n}/><StepperTitle>Step {n}</StepperTitle></StepperItem>)}</StepperList><StepperPrevious disabled={false} onClick={e=>{if(window.cancel)e.preventDefault()}}/><StepperNext disabled={false} onClick={e=>{if(window.cancel)e.preventDefault()}}/><Probe/></Stepper><Breadcrumb><BreadcrumbBack onClick={()=>window.back=true}/><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild ref={n=>window.link=n}><a href="#parent">Parent</a></BreadcrumbLink></BreadcrumbItem><BreadcrumbItem><BreadcrumbPage>Here</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></>}
const root=createRoot(document.getElementById('root'));window.events=[];window.render=p=>flushSync(()=>root.render(<Fixture {...p}/>));window.render({});`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  await page.setContent(
    '<style>#root{padding:32px;max-width:500px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const prev = page.locator("[data-step-back]"),
    next = page.locator("[data-step-next]");
  assert.equal(
    await prev.isDisabled(),
    true,
    "Caller disabled=false cannot re-enable the first-step boundary",
  );
  await next.click();
  assert.match(await page.getByRole("status").innerText(), /Stage 2 of 3/);
  await page.evaluate(() => (window.cancel = true));
  await next.click();
  assert.match(await page.getByRole("status").innerText(), /Stage 2/);
  await page.evaluate(() => (window.cancel = false));
  await next.click();
  assert.equal(await next.isDisabled(), true);
  await page.evaluate(() => window.changeStep(NaN));
  assert.match(
    await page.getByRole("status").innerText(),
    /Stage 3/,
    "Non-finite changes do not reset progress",
  );
  await page.evaluate(() => window.changeStep(1.9));
  await page.waitForFunction(() => document.querySelector('[data-slot="stepper-status"]').textContent.includes('Stage 1'));
  assert.match(await page.getByRole("status").innerText(), /Stage 1/);
  await page.evaluate(() => window.render({ fixture: "controlled", value: 2 }));
  await next.click();
  assert.match(
    await page.getByRole("status").innerText(),
    /Stage 2/,
    "Controlled refusal is respected",
  );
  assert.equal(
    await page
      .locator('[data-slot="stepper-provider"]')
      .evaluate((el) => el === window.stepper),
    true,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Parent" })
      .evaluate((el) => el === window.link && el.tagName === "A"),
    true,
    "Slot/ref stays one native link",
  );
  const back = page.locator('[data-slot="breadcrumb-back"]'),
    box = await back.boundingBox();
  assert.ok(
    box.width >= 44 && box.height >= 44,
    "Back has a 44px touch target",
  );
  await back.hover();
  await page.waitForTimeout(240);
  const hover = await back.boundingBox();
  assert.ok(
    Math.abs(box.x - hover.x) < 0.5,
    "Hover does not move the native back target",
  );
  await back.click();
  assert.equal(await page.evaluate(() => window.back), true);
  console.log(
    "PASS progression native: bounded/cancelled/controlled steps, finite values, native refs/Slot, stable 44px back",
  );
} finally {
  await browser.close();
}
