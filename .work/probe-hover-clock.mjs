import fs from 'node:fs';
import {chromium} from 'playwright';
const v=fs.readFileSync('reference/sahajiv-handoff-v4/js/v.js','utf8');
const clock=v.slice(v.indexOf('window.V.clock=t=>'),v.indexOf('/* a duration token',v.indexOf('window.V.clock=t=>')));
const css=fs.readFileSync('reference/sahajiv-handoff-v4/css/flow.css','utf8');
const tokens=fs.readFileSync('reference/sahajiv-handoff-v4/tokens/tokens.css','utf8');
const browser=await chromium.launch();const rows=[];
try{for(const wallDelay of [0,250]){
 const page=await browser.newPage({viewport:{width:768,height:500}});
 await page.setContent(`<style>${tokens}${css}#group{position:relative;width:300px;height:40px;--hov-w:96px;--hov-h:40px;--hov-o:0;--flow-speed:1;--flow-hover:1}button{width:96px;height:40px}</style><div id="group" class="v-glide"><button>Two</button><span class="v-glide__hover"><i></i></span></div>`);
 await page.addScriptTag({content:'window.V={};'+clock});
 await page.evaluate(()=>{document.getElementById('group').addEventListener('pointerover',()=>document.getElementById('group').style.setProperty('--hov-o','1'));V.clock(100000)});
 await page.getByRole('button',{name:'Two'}).hover();
 if(wallDelay)await page.waitForTimeout(wallDelay);
 const states=await page.evaluate(()=>{const g=document.getElementById('group'),layer=g.querySelector('.v-glide__hover'),samples=[];const sample=(label,time)=>{V.clock(time);samples.push({label,time,opacity:getComputedStyle(layer).opacity,animations:document.getAnimations().map(a=>({property:a.transitionProperty,time:a.currentTime,at:a.__vz,state:a.playState}))})};sample('ghost',100016);g.style.setProperty('--hov-o','0');sample('pointerdown',100016);sample('15ms after pointerdown',100031);return samples});
 rows.push({wallDelay,states});await page.close();
}}finally{await browser.close()}
const result={sourceClock:'reference/sahajiv-handoff-v4/js/v.js:83-85',sourceStyle:'reference/sahajiv-handoff-v4/css/flow.css:104',token:'--t-flow-fade-sm=.16s (tokens.css:165)',scope:'Literal source clock and full source flow stylesheet, identical minimal DOM, native pointerover, only wall time before first clock changes.',rows};
fs.writeFileSync('artifacts/gate-motion-hover-clock-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
