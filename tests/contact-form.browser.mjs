// Start Next with contact enabled and NEXT_PUBLIC_REPORTING_API_URL=http://127.0.0.1:8791.
// Uses an isolated in-memory Worker/D1 and fixture-only Resend and Turnstile adapters.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { chromium } from 'playwright';

const draftedMail=href=>{const url=new URL(href);return url.protocol==='mailto:'&&url.pathname==='hellosanjaygautam@gmail.com'&&url.searchParams.get('subject')==="Let's work together"&&/^Hi Sanjay,\r\n/.test(url.searchParams.get('body')??'');};
const site=process.env.CONTACT_BROWSER_URL??'http://127.0.0.1:3100/cojeev-ui';
assert.ok(['localhost','127.0.0.1'].includes(new URL(site).hostname),'Only check a local app.');
const origin=new URL(site).origin,output='output/playwright/contact-form';
const compiled=await build({stdin:{contents:`import worker from './workers/reporting/src/index.ts';
  globalThis.fetch=async(_url,init)=>JSON.parse(init.body).reply_to==='about@example.com'?new Response(null,{status:500}):Response.json({id:crypto.randomUUID()});export default worker;`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{ALLOWED_ORIGINS:origin,SITE_URL:site,LOCAL_MODE:'true',ENVIRONMENT:'production',EMAIL_ENABLED:'true',EMAIL_FROM:'hello@cojeev.com',CONTACT_NOTIFICATION_EMAIL:'owner@example.com',RESEND_API_KEY:'fixture-only-key'}}));
let browser;
try {
  const db=await mf.getD1Database('DB');
  for(const name of (await readdir('workers/reporting/migrations')).filter(n=>n.endsWith('.sql')).sort()) await db.exec((await readFile(`workers/reporting/migrations/${name}`,'utf8')).replace(/\n/g,' '));
  await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce',colorScheme:'dark'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  let configFails=true,rateLimit=true,securityFails=true,loseResponse=true;const submissions=[];
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(el,options){el.textContent='Security check (local fixture)';window.contactChallenge=options;if(!window.contactHoldVerification)options.callback('fixture-only-verification');return 'fixture';},remove(){}};`}));
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
    if(securityFails) {securityFails=false;return route.fulfill({status:403,headers,body:JSON.stringify({error:'The security check expired. Please try again.'})});}
    const response=await mf.dispatchFetch('http://localhost/v1/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':body.id},body:JSON.stringify(body)});
    if(loseResponse) {loseResponse=false;await response.text();return route.abort('failed');}
    return route.fulfill({status:response.status,headers,body:await response.text()});
  });
  await page.goto(`${site}/work-with-me/`,{waitUntil:'networkidle'});
  const form=page.locator('.contact-form'),name=form.getByLabel('Name',{exact:true}),email=form.getByLabel('Email',{exact:true}),message=form.getByLabel('Message',{exact:true}),send=form.getByRole('button',{name:'Send message',exact:true});
  await form.getByRole('button',{name:'Retry connection'}).waitFor();
  assert.match(await page.locator('#contact').ariaSnapshot(),/status/,'Empty live region remains in the accessibility tree.');
  assert.equal(await page.locator('.contact-status').evaluate(el=>getComputedStyle(el).position),'absolute');
  await name.fill('Local Visitor');await email.fill('visitor@example.com');await message.fill('A local browser check for a considered interface.');
  configFails=false;await form.getByRole('button',{name:'Retry connection'}).click();await send.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  const verificationRetry=form.getByRole('button',{name:'Retry verification'});
  assert.equal(await verificationRetry.count(),0,'No retry before a verification failure.');
  // The provider can recover on its own: success must clear errors without a remount.
  await page.evaluate(()=>{window.mountedContactChallenge=window.contactChallenge;window.contactChallenge['error-callback']();});
  await form.getByRole('alert').filter({hasText:'Verification failed'}).waitFor();
  await verificationRetry.waitFor();
  await page.evaluate(()=>window.contactChallenge.callback('fixture-only-recovered-verification'));
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  assert.equal(await form.getByRole('alert').count(),0,'Successful verification clears the widget error.');
  assert.equal(await verificationRetry.count(),0);
  assert.equal(await page.evaluate(()=>window.contactChallenge===window.mountedContactChallenge),true,'Recovery uses the same mounted widget.');
  for(const callback of ['error-callback','expired-callback']) {
    await page.evaluate(key=>window.contactChallenge[key](),callback);
    await verificationRetry.waitFor();await verificationRetry.click();
    await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
    assert.equal(await verificationRetry.count(),0);
  }
  // A hostname missing from the widget's settings cannot be retried away, so the visitor is pointed to Email me.
  await page.evaluate(()=>window.contactChallenge['error-callback']('110200'));
  await form.getByRole('alert').filter({hasText:'not enabled for this web address'}).waitFor();
  await form.getByText('You can use Email me instead.',{exact:true}).waitFor();
  assert.equal(await verificationRetry.count(),0,'A setup error offers no retry.');
  await page.evaluate(()=>window.contactChallenge.callback('fixture-only-recovered-verification'));
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  assert.equal(await form.getByText('You can use Email me instead.',{exact:true}).count(),0);
  await email.fill('invalid');assert.equal(await email.evaluate(element=>element.validity.typeMismatch),true);await email.fill('visitor@example.com');
  await form.scrollIntoViewIfNeeded();
  assert.ok(await form.evaluate(element=>element.getBoundingClientRect().left>=0&&element.getBoundingClientRect().right<=innerWidth),'Form fits 360px.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow.');
  await page.screenshot({path:`${output}/360-dark.png`});
  await send.click();await form.getByRole('alert').filter({hasText:'Too many messages'}).waitFor();
  assert.equal(await message.inputValue(),'A local browser check for a considered interface.');assert.equal(await name.getAttribute('readonly'),null);
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  assert.equal(await verificationRetry.count(),0,'Rate limiting does not show verification retry.');
  await page.evaluate(()=>{window.contactHoldVerification=true;});
  await send.click();await form.getByRole('alert').filter({hasText:'security check expired'}).waitFor();
  await verificationRetry.waitFor();await page.evaluate(()=>{window.contactHoldVerification=false;});await verificationRetry.click();
  await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  await send.click();await form.getByRole('alert').filter({hasText:'connection was interrupted'}).waitFor();assert.notEqual(await name.getAttribute('readonly'),null);
  assert.equal(await verificationRetry.count(),0,'A lost response does not show verification retry.');await page.waitForFunction(()=>!document.querySelector('.contact-form button[type="submit"]').disabled);
  await send.click();await page.locator('.contact-status').filter({hasText:"Thanks, Local Visitor. Your message is on its way. I'll reply to visitor@example.com."}).waitFor();
  assert.equal(submissions.length,4);assert.notEqual(submissions[0].id,submissions[1].id);assert.notEqual(submissions[1].id,submissions[2].id);assert.equal(submissions[2].id,submissions[3].id);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM contact_messages').first()).n,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM email_attempts').first()).n,1);
  assert.equal(await page.getByRole('link',{name:'Email me',exact:true}).count(),2);
  for(const link of await page.getByRole('link',{name:'Email me',exact:true}).all()) assert.ok(draftedMail(await link.getAttribute('href')),'Email me opens a drafted message.');
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({colorScheme:'light'});
  await page.goto(`${site}/about/`,{waitUntil:'networkidle'});
  const heroContact=page.locator('.creator-hero').getByRole('link',{name:'Send me a message',exact:true});
  assert.equal(await heroContact.getAttribute('href'),'#contact');
  assert.ok((await heroContact.getAttribute('class')).includes('story-link-primary'));
  await page.screenshot({path:`${output}/hero-1440-light.png`});
  await heroContact.click();await page.waitForURL(`${site}/about/#contact`);
  await page.waitForFunction(()=>{const top=document.getElementById('contact').getBoundingClientRect().top;return top>=0&&top<innerHeight;});
  assert.equal(new URL(page.url()).pathname,'/cojeev-ui/about/');
  await form.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/1440-light.png`});
  await name.fill('About Visitor');await email.fill('about@example.com');await message.fill('Writing from the about page in the local fixture.');await send.click();
  await page.locator('.contact-status').filter({hasText:"Thanks, About Visitor. Your message is saved, but email delivery isn't confirmed yet. I'll keep retrying for up to a day. If it's urgent, use Email me instead."}).waitFor();
  assert.equal((await db.prepare('SELECT page FROM contact_messages WHERE email=?').bind('about@example.com').first()).page,'/cojeev-ui/about/');
  assert.equal((await db.prepare('SELECT delivery_status FROM contact_messages WHERE email=?').bind('about@example.com').first()).delivery_status,'needs_review');
  const queuedFallback=page.locator('.maker-write').getByRole('link',{name:'Email me',exact:true});
  await queuedFallback.waitFor({state:'visible'});
  assert.ok(draftedMail(await queuedFallback.getAttribute('href')));
  assert.deepEqual(errors,[]);console.log('PASS: both maker routes, config retry, native validation, accessible empty status, error/expiry/403-only security retry, no retry for a setup error, queued acknowledgement, hero anchor, rate limit, retained draft, lost-response UUID retry, one email attempt, secondary email links, 360px dark and desktop light.');
} finally {await browser?.close();await mf.dispose();}
