import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {chromium} from 'playwright';
const checks=[],errors=[],out='output/playwright/docs-contrast';fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react(),tailwind(),{name:'multi-select-fixture',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/.work/docs-contrast-fixture.tsx"></script></body></html>'));})}}],resolve:{alias:{'@':process.cwd()}},optimizeDeps:{entries:['.work/docs-contrast-fixture.tsx']},server:{port:4355,strictPort:true,host:'127.0.0.1',hmr:false,watch:null},css:{postcss:{plugins:[]}},logLevel:'error'});
await server.listen();const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:1000}}),page=await context.newPage();page.on('pageerror',error=>{errors.push(error.stack);console.error(error.stack)});
const rows=[];
try{
 for(const theme of ['light','dark']){
  await page.goto('http://127.0.0.1:4355');await page.waitForFunction(()=>document.documentElement.dataset.ready==='1');await page.evaluate(theme=>document.documentElement.dataset.mode=theme,theme);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
  for(const motion of ['subtle','off']){await page.evaluate(mode=>window.setFixtureMotion(mode),motion);await page.waitForTimeout(400);
   const state=await page.evaluate(()=>({alerts:[...document.querySelectorAll('[data-alert-case]')].map(root=>{const host=root.querySelector('[data-slot="alert-icon"]'),icon=host.querySelector('.v-icon'),morph=host.querySelector('[data-morph-body]');return {variant:root.dataset.alertCase,color:getComputedStyle(icon).color,hostColor:getComputedStyle(host).color,background:getComputedStyle(host).backgroundColor,morph:morph?getComputedStyle(morph).fill:null,alertBackground:getComputedStyle(root.querySelector('[data-slot="alert"]')).backgroundColor}}),buttons:[...document.querySelectorAll('[data-slot="button-group-item"]')].map(el=>({text:el.textContent,selected:el.getAttribute('aria-pressed'),background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,body:el.querySelector('[data-morph-body]')?.getAttribute('fill')}))}));rows.push({theme,motion,...state});
  }
 }
 console.log(JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();await server.close();fs.writeFileSync('.work/docs-contrast-baseline.json',JSON.stringify({rows,errors},null,2)+'\n');}
