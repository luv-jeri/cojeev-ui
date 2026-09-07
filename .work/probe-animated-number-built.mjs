import fs from 'node:fs';
import {preview} from 'vite';
import {chromium} from 'playwright';
const server=await preview({configFile:false,base:'/sahajiv-ui/',build:{outDir:process.env.BUILT_DOCS_DIRECTORY || 'out'},preview:{host:'127.0.0.1',port:0}});
const browser=await chromium.launch();
const rows=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(()=>{window.numberFrames=[];const original=requestAnimationFrame;window.requestAnimationFrame=callback=>{const scheduled=performance.now(),number=callback.toString().includes("Math.pow");return original(time=>{window.lastFrame={time,now:performance.now(),scheduled,number};if(number)window.numberFrames.push(window.lastFrame);callback(time)})};});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/sahajiv-ui/docs/animated-number/`);await page.evaluate(()=>document.fonts.ready);
 const p=page.locator('[data-slot=preview]').first();await p.locator('[data-slot=tabs-list][data-flow-owned]').waitFor();
 await p.getByRole('button',{name:'Copy code',exact:true}).first().click();await p.getByText('Copied to clipboard.',{exact:true}).waitFor();
 const code=p.getByRole('tab',{name:'Code',exact:true});await code.focus();await code.press('Enter',{delay:60});await p.locator('pre').first().waitFor();await p.getByRole('tab',{name:'Preview',exact:true}).click();
 const root=page.locator('[data-example=animated-number]');await root.waitFor();const visual=root.locator('[data-slot=animated-number] [aria-hidden]');
 const initial=await visual.evaluate(el=>{window.samples=[];window.phase='add';window.observer=new MutationObserver(()=>window.samples.push({phase:window.phase,raw:el.textContent,value:Number(el.textContent.replaceAll(',','')),time:performance.now(),raf:window.lastFrame,rect:el.getBoundingClientRect().toJSON(),visibility:document.visibilityState}));window.observer.observe(el,{childList:true,subtree:true,characterData:true});return {raw:el.textContent,rect:el.getBoundingClientRect().toJSON()}});
 await root.getByRole('button',{name:'Add 125',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-example=animated-number] [data-slot=animated-number] [aria-hidden]').textContent==='1,365');
 await page.evaluate(()=>window.phase='subtract');const subtract=root.getByRole('button',{name:'Subtract 75',exact:true});await subtract.focus();await subtract.press('Enter',{delay:60});
 await root.getByText('Current value: 1,290',{exact:true}).waitFor();await page.evaluate(()=>window.phase='reset');await root.getByRole('button',{name:'Reset count',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-example=animated-number] [data-slot=animated-number] [aria-hidden]').textContent==='1,240');
 for(let cycle=0;cycle<8;cycle++){await page.evaluate(cycle=>window.phase="add-"+cycle,cycle);await root.getByRole("button",{name:"Add 125",exact:true}).click();await page.waitForFunction(()=>document.querySelector("[data-example=animated-number] [data-slot=animated-number] [aria-hidden]").textContent==="1,365");await page.evaluate(cycle=>window.phase="reset-"+cycle,cycle);await root.getByRole("button",{name:"Reset count",exact:true}).click();await page.waitForFunction(()=>document.querySelector("[data-example=animated-number] [data-slot=animated-number] [aria-hidden]").textContent==="1,240");}
 const samples=await page.evaluate(()=>{window.observer.disconnect();return window.samples});rows.push({initial,samples,errors,numberFrames:await page.evaluate(()=>window.numberFrames)});
 console.log(JSON.stringify({count:samples.length,min:Math.min(...samples.map(s=>s.value)),max:Math.max(...samples.map(s=>s.value)),outside:samples.filter(s=>s.value<1240||s.value>1365),first:samples.slice(0,3),errors},null,2));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));fs.writeFileSync('.work/animated-number-built-repeat-samples.json',JSON.stringify(rows,null,2));}
