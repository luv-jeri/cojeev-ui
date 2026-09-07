import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {chromium} from 'playwright';
const checks=[],errors=[],out='output/playwright/multi-select';fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react(),tailwind(),{name:'multi-select-fixture',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/','<!doctype html><html data-mode="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/.work/multi-select-fixture.tsx"></script></body></html>'));})}}],resolve:{alias:{'@':process.cwd()}},optimizeDeps:{entries:['.work/multi-select-fixture.tsx']},server:{port:4354,strictPort:true,host:'127.0.0.1',hmr:false,watch:null},css:{postcss:{plugins:[]}},logLevel:'error'});
await server.listen();const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:1000}}),page=await context.newPage();page.on('pageerror',error=>{errors.push(error.stack);console.error(error.stack)});
try{
 await page.goto('http://127.0.0.1:4354');await page.waitForFunction(()=>document.documentElement.dataset.ready==='1');await page.evaluate(()=>document.fonts.ready);
 await page.getByRole('button',{name:'Topics',exact:true}).click();await page.getByRole('searchbox',{name:'Search Topics'}).waitFor();await page.waitForTimeout(600);
 const before=await page.getByRole('checkbox',{name:'Design',exact:true}).locator('[data-slot="checkbox-indicator"]').evaluate(el=>({image:getComputedStyle(el).backgroundImage,fill:getComputedStyle(el).backgroundColor}));
 assert.match(before.image,/data:image\/svg\+xml/);assert.match(before.image,/M5/);checks.push({check:'Initial selected dark checkbox retains the authored tick image',...before});
 await page.getByRole('checkbox',{name:'Research',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'Research',exact:true}).isChecked(),true);
 const after=await page.getByRole('checkbox',{name:'Research',exact:true}).locator('[data-slot="checkbox-indicator"]').evaluate(el=>({image:getComputedStyle(el).backgroundImage,fill:getComputedStyle(el).backgroundColor}));
 assert.match(after.image,/data:image\/svg\+xml/);assert.match(after.image,/M5/);checks.push({check:'Pointer-selected dark checkbox retains the authored tick image',...after});await page.waitForTimeout(450);
 await page.screenshot({path:`${out}/multi-select-390-dark-glyph-fixed.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify(checks,null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();await server.close();fs.writeFileSync('.work/multi-select-dark-verification.json',JSON.stringify({base:'6315478 plus 74eb662',passed:!process.exitCode,checks,errors},null,2)+'\n');}
