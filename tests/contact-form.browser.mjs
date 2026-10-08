// Start Next with contact enabled and NEXT_PUBLIC_REPORTING_API_URL=http://127.0.0.1:8791.
// Uses an isolated in-memory Worker/D1 and fixture-only Resend and Turnstile adapters.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { chromium } from 'playwright';

const site=process.env.CONTACT_BROWSER_URL??'http://127.0.0.1:3100/cojeev-ui';
assert.ok(['localhost','127.0.0.1'].includes(new URL(site).hostname),'Only check a local app.');
const origin=new URL(site).origin,output='output/playwright/contact-form';
const compiled=await build({stdin:{contents:`import worker from './workers/reporting/src/index.ts';
  globalThis.fetch=async()=>Response.json({id:crypto.randomUUID()});export default worker;`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{ALLOWED_ORIGINS:origin,SITE_URL:site,LOCAL_MODE:'true',ENVIRONMENT:'production',EMAIL_ENABLED:'true',EMAIL_FROM:'hello@cojeev.com',CONTACT_NOTIFICATION_EMAIL:'owner@example.com',RESEND_API_KEY:'fixture-only-key'}}));
let browser;
try {
  const db=await mf.getD1Database('DB');
  for(const name of (await readdir('workers/reporting/migrations')).filter(n=>n.endsWith('.sql')).sort()) await db.exec((await readFile(`workers/reporting/migrations/${name}`,'utf8')).replace(/\n/g,' '));
  await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce',colorScheme:'dark'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  let configFails=true,rateLimit=true,loseResponse=true;const submissions=[];
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(el,options){el.textContent='Security check (local fixture)';options.callback('fixture-only-verification');return 'fixture';},remove(){}};`}));
  await context.route('http://127.0.0.1:8791/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
    if(request.method()==='OPTIONS') return route.fulfill({status:204,headers});
    if(path==='/v1/config') {
      if(configFails) {return route.fulfill({status:503,headers,body:JSON.stringify({error:'Fixture unavailable'})});}
      return route.fulfill({headers,body:JSON.stringify({emailEnabled:true,turnstileSiteKey:'fixture-only-site-key',local:false})});
    }
    assert.equal(path,'/v1/contact');const body=request.postDataJSON();submissions.push(body);
    if(rateLimit) {rateLimit=false;return route.fulfill({status:429,headers,body:JSON.stringify({error:'Too many messages. Please try again later.'})});}
    const response=await mf.dispatchFetch('http://localhost/v1/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':body.id},body:JSON.stringify(body)});
    if(loseResponse) {loseResponse=false;await response.text();return route.abort('failed');}
    return route.fulfill({status:response.status,headers,body:await response.text()});
  });
  await page.goto(`${site}/work-with-me/`,{waitUntil:'networkidle'});
  const form=page.locator('.contact-form'),name=form.getByLabel('Name',{exact:true}),email=form.getByLabel('Email',{exact:true}),message=form.getByLabel('Message',{exact:true}),send=form.getByRole('button',{name:'Send message',exact:true});
  await form.getByRole('button',{name:'Retry connection'}).waitFor();
  await name.fill('Local Visitor');await email.fill('visitor@example.com');await message.fill('A local browser check for a considered interface.');
  configFails=false;await form.getByRole('button',{name:'Retry connection'}).click();await send.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  await email.fill('invalid');assert.equal(await email.evaluate(element=>element.validity.typeMismatch),true);await email.fill('visitor@example.com');
  await form.scrollIntoViewIfNeeded();
  assert.ok(await form.evaluate(element=>element.getBoundingClientRect().left>=0&&element.getBoundingClientRect().right<=innerWidth),'Form fits 360px.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow.');
  await page.screenshot({path:`${output}/360-dark.png`});
  await send.click();await form.getByRole('alert').filter({hasText:'Too many messages'}).waitFor();
  assert.equal(await message.inputValue(),'A local browser check for a considered interface.');assert.equal(await name.getAttribute('readonly'),null);
  await form.getByRole('button',{name:'Retry verification'}).click();
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  await send.click();await form.getByRole('alert').filter({hasText:'connection was interrupted'}).waitFor();assert.notEqual(await name.getAttribute('readonly'),null);
  await form.getByRole('button',{name:'Retry verification'}).click();await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  await send.click();await page.locator('.contact-status').filter({hasText:"Thanks, Local Visitor. Your message is on its way. I'll reply to visitor@example.com."}).waitFor();
  assert.equal(submissions.length,3);assert.notEqual(submissions[0].id,submissions[1].id);assert.equal(submissions[1].id,submissions[2].id);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM contact_messages').first()).n,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM email_attempts').first()).n,1);
  assert.equal(await page.getByRole('link',{name:'Email me',exact:true}).count(),2);
  for(const link of await page.getByRole('link',{name:'Email me',exact:true}).all()) assert.equal(await link.getAttribute('href'),'mailto:hellosanjaygautam@gmail.com');
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({colorScheme:'light'});
  await page.goto(`${site}/about/`,{waitUntil:'networkidle'});await form.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/1440-light.png`});
  await name.fill('About Visitor');await email.fill('about@example.com');await message.fill('Writing from the about page in the local fixture.');await send.click();
  await page.locator('.contact-status').filter({hasText:'Thanks, About Visitor.'}).waitFor();
  assert.equal((await db.prepare('SELECT page FROM contact_messages WHERE email=?').bind('about@example.com').first()).page,'/cojeev-ui/about/');
  assert.deepEqual(errors,[]);console.log('PASS: both maker routes, config retry, native validation, security retry, rate limit, retained draft, lost-response UUID retry, one email attempt, secondary email links, 360px dark and desktop light.');
} finally {await browser?.close();await mf.dispose();}
