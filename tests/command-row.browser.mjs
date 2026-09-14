import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:4320/cojeev-ui/docs/command/',{waitUntil:'domcontentloaded'});
 await page.locator('.report-launcher:not(:disabled)').waitFor();
 const row=page.locator('[data-example-role="interactive"] [data-slot="command-item"]').filter({hasText:'New note'});
 await row.click();
 const metrics=await row.evaluate(el=>({height:el.getBoundingClientRect().height,enter:getComputedStyle(el,'::after').display}));
 assert.equal(metrics.enter,'none','A shortcut and generated Enter cue must not create a fourth grid child/new row');
 assert.ok(metrics.height<=64,'A one-line command keeps one row');
 console.log('PASS: command shortcut row has one trailing cue and no extra line.');
}finally{await browser.close()}
