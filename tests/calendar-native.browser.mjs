/** Real exports exercise uncontrolled state and native required/min/disabled rules. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const bundle=await build({stdin:{contents:`
 import React from "react";
 import {createRoot} from "react-dom/client";
 import {flushSync} from "react-dom";
 import {Calendar} from "./registry/cojeev/ui/calendar";
 import {DatePicker} from "./registry/cojeev/ui/date-picker";
 const root=createRoot(document.getElementById("root"));
 const d=day=>new Date(2026,8,day);
 window.renderNative=({mode="single",required=false,min,controlled=false,picker=false}={})=>{
  const spec={mode,required,min,controlled,picker};
  const value=mode==="single"?d(12):mode==="multiple"?[d(12),d(15)]:undefined;
  window.selection=null;
  const changed=next=>{window.selection=next instanceof Date?next.getDate():Array.isArray(next)?next.map(d=>d.getDate()):next?{from:next.from?.getDate(),to:next.to?.getDate()}:null;};
  const rules={defaultMonth:d(1),today:d(10),showWeekNumber:false,showOutsideDays:true,required,min,disabled:d(20),excludeDisabled:true,resetOnSelect:true};
  flushSync(()=>root.render(picker?<DatePicker key={JSON.stringify(spec)} mode={mode} defaultDate={value} onDateChange={changed} calendarProps={rules}/>:<Calendar key={JSON.stringify(spec)} {...rules} mode={mode} defaultSelected={value} {...(controlled?{selected:undefined}:{})} onSelect={changed}/>));
 };window.renderNative();
`,loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",alias:process.env.CALENDAR_DATE_FNS_FIXTURE?{"date-fns":process.env.CALENDAR_DATE_FNS_FIXTURE}:undefined,define:{"process.env.NODE_ENV":'"production"'}});
const origin=process.env.DOCS_ORIGIN??"http://127.0.0.1:4320";
const html=await (await fetch(`${origin}/cojeev-ui/docs/calendar/`)).text();
const links=[...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(match=>match[1]);
const css=(await Promise.all(links.map(async href=>(await fetch(new URL(href,origin))).text()))).join("\n");
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:500,height:700},reducedMotion:"reduce"});
 await page.setContent('<div id="root" style="width:360px;margin:30px"></div>');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
 const day=n=>page.locator(`[data-slot="calendar-day"][data-date="2026-09-${String(n).padStart(2,'0')}"]`);
 const count=()=>page.locator('[data-slot="calendar-day"][data-state="active"]').count();
 const render=async spec=>{await page.evaluate(spec=>window.renderNative(spec),spec);await day(12).waitFor();};
 await render({required:true});assert.ok(await page.locator('[data-slot="calendar-day"][data-outside]').count()>0,'native outside-day opt-in is preserved');await day(12).click();assert.equal(await count(),1);await day(13).click();assert.equal(await day(13).getAttribute('data-state'),'active');assert.equal(await page.evaluate(()=>window.selection),13);
 await render({controlled:true});assert.equal(await count(),0,'explicit undefined selected wins over defaultSelected');await day(13).click();assert.equal(await count(),0,'controlled selected is owned by caller');assert.equal(await page.evaluate(()=>window.selection),13);
 await render({mode:'multiple',required:true,min:2});await day(12).click();assert.equal(await count(),2,'native min prevents removing below two');await day(16).click();assert.equal(await count(),3);assert.deepEqual(await page.evaluate(()=>window.selection),[12,15,16]);await day(16).click();assert.equal(await count(),2);
 await render({mode:'range',min:1});await day(18).click();await day(22).click();assert.equal(await count(),1,'excludeDisabled restarts range after unavailable date');assert.deepEqual(await page.evaluate(()=>window.selection),{from:22,to:undefined});await day(24).click();assert.deepEqual(await page.evaluate(()=>window.selection),{from:22,to:24});assert.equal(await count(),3);
 await page.evaluate(()=>window.renderNative({picker:true,required:true}));const trigger=page.locator('[data-slot="date-picker-trigger"]');await trigger.click();assert.equal(await page.getByRole('button',{name:'Clear dates'}).isDisabled(),true);await day(12).click();assert.match(await trigger.innerText(),/12 Sept? 2026/);await trigger.click();await day(13).click();assert.match(await trigger.innerText(),/13 Sept? 2026/);assert.equal(await page.evaluate(()=>window.selection),13);
 console.log('PASS real Calendar controlled/uncontrolled, explicit clear value, required/min, Date/Date[]/DateRange callbacks, excluded disabled range; DatePicker required/uncontrolled selection');
}finally{await browser.close();}
