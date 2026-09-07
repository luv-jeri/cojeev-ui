import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {chromium} from 'playwright';
const results=[];const started=new Date();
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react(),tailwind(),{name:'fixture',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/', '<html><head></head><body><script type="module" src="/.work/code-block-fixture.tsx"></script></body></html>'));});}}],resolve:{alias:{'@':process.cwd()}},server:{port:4351,strictPort:true,host:'127.0.0.1',watch:null},css:{postcss:{plugins:[]}},logLevel:'error'});
await server.listen();const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:900},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4351/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='1');
 assert.equal(await page.locator('[data-slot="code-block"]').count(),2,'CodeBlock must render the requested reusable code surfaces');
 const code=await page.locator('[data-testid="code"] code').textContent();
 const copy=page.locator('[data-testid="code"] [data-slot="copy-button"]');
 await copy.click();await page.waitForFunction(()=>document.querySelector('[data-testid="code"] [role="status"]')?.textContent==='Copied to clipboard.');
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);results.push('Clipboard API copies exact multiline source text');
 await page.evaluate(()=>{window.savedClipboard=navigator.clipboard;Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});});
 await page.locator('#selection').focus();await page.locator('#selection').evaluate(el=>el.setSelectionRange(3,12,'backward'));await page.keyboard.press('Alt+c');
 await page.waitForFunction(()=>document.querySelector('[data-testid="code"] [role="status"]')?.textContent==='Copied to clipboard.');
 assert.equal(await page.evaluate(()=>window.savedClipboard.readText()),code);
 assert.deepEqual(await page.locator('#selection').evaluate(el=>({focused:document.activeElement===el,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection})),{focused:true,start:3,end:12,direction:'backward'});results.push('Missing Clipboard API uses real execCommand and restores input focus/selection');
 await page.evaluate(()=>{const e=document.getElementById('editable');e.focus();const s=getSelection(),r=document.createRange();r.setStart(e.firstChild,5);r.setEnd(e.firstChild,18);s.removeAllRanges();s.addRange(r);});
 await page.keyboard.press('Alt+c');await page.waitForFunction(()=>document.activeElement?.id==='editable');
 assert.equal(await page.evaluate(()=>getSelection().toString()),'this selected');results.push('Fallback restores contenteditable focus and document selection');
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});});await copy.click();await page.waitForFunction(()=>document.querySelector('[data-testid="code"] [role="status"]')?.textContent==='Copied to clipboard.');
 assert.equal(await page.evaluate(()=>window.savedClipboard.readText()),code);results.push('Denied Clipboard API falls back to actual copy');
 await page.evaluate(()=>{document.execCommand=()=>false;});await copy.click();await page.waitForFunction(()=>document.querySelector('[data-testid="code"] [role="status"]')?.textContent?.startsWith('Copy unavailable.'));
 assert.equal(await page.locator('[data-testid="code"] code').textContent(),code);results.push('Both mechanisms failing show manual-copy feedback without altering code');
 assert.equal(await page.locator('textarea[data-copy-fallback]').count(),0);results.push('Fallback temporary controls are always removed');
 for(const mode of ['light','dark']){await page.evaluate(mode=>document.documentElement.dataset.mode=mode,mode);for(const width of [360,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode}/${width}: page must not overflow`);const geometry=await page.locator('[data-testid="code"] pre').evaluate(el=>({height:el.clientHeight,overflow:el.scrollHeight>el.clientHeight,whiteSpace:getComputedStyle(el).whiteSpace}));assert.ok(geometry.height<=400&&geometry.overflow);assert.equal(geometry.whiteSpace,'pre');assert.equal(await page.locator('[data-testid="wrapped"] pre').evaluate(el=>getComputedStyle(el).whiteSpace),'pre-wrap');}}
 results.push('Long code is bounded and wrap is opt-in at360/1440 in both themes');
 assert.deepEqual(errors,[]);fs.mkdirSync('artifacts/code-block',{recursive:true});await page.screenshot({path:'artifacts/code-block/code-block-1440-dark.png',fullPage:true});
 console.log(results.join('\n'));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();await server.close();fs.writeFileSync('.work/code-block-verification.json',JSON.stringify({started:started.toISOString(),finished:new Date().toISOString(),passed:!process.exitCode,results,errors},null,2)+'\n');}
