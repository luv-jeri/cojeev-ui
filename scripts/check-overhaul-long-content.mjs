/** Bounded 320px long-content consumer proof, loading existing docs CSS. No registry/Next build. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { build } from "esbuild";

const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const base = (args.url || "http://127.0.0.1:4320/sahajiv-ui").replace(/\/$/, "");
const output = path.resolve(args.output || "output/playwright/overhaul-long-content");
const ids = (args.ids || "card,alert,empty,bubble,message,item,attachment,field,input-group,textarea,table,data-table,dropdown,tooltip").split(",");
fs.mkdirSync(output, { recursive: true });
const prose = "Keep the original context together with the decision, the people involved, and the next practical step so that someone returning after a busy week can understand what happened and continue with confidence.";
const filename = "SeptemberResearchConversationArchiveWithCompleteSourceAttributionAndUnabridgedDecisionHistoryForTheCommunityGardenPlanningWorkshopAndFollowUpDocumentationFinalReviewedVersion20260908.pdf";
const source = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {Card,CardHeader,CardTitle,CardContent,CardDescription,CardFooter} from './registry/sahajiv/ui/card';
import {Alert,AlertIcon,AlertBody,AlertTitle,AlertDescription,AlertActions} from './registry/sahajiv/ui/alert';
import {Empty,EmptyTitle,EmptyDescription} from './registry/sahajiv/ui/empty';
import {Bubble,BubbleRow,BubbleContent} from './registry/sahajiv/ui/bubble';
import {Message,MessageContent,MessageDescription} from './registry/sahajiv/ui/message';
import {Item,ItemContent,ItemTitle,ItemDescription} from './registry/sahajiv/ui/item';
import {Attachment,AttachmentType,AttachmentName,AttachmentMeta,AttachmentActions,AttachmentAction} from './registry/sahajiv/ui/attachment';
import {Field,FieldLabel,FieldControl,FieldDescription,FieldError} from './registry/sahajiv/ui/field';
import {InputGroup,InputGroupTextarea,InputGroupButton,InputGroupText} from './registry/sahajiv/ui/input-group';
import {Textarea} from './registry/sahajiv/ui/textarea';
import {Input} from './registry/sahajiv/ui/input';
import {Button} from './registry/sahajiv/ui/button';
import {Icon} from './registry/sahajiv/ui/icon';
import {TableContainer,Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from './registry/sahajiv/ui/table';
import {DataTable} from './registry/sahajiv/ui/data-table';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './registry/sahajiv/ui/dropdown-menu';
import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from './registry/sahajiv/ui/tooltip';
const prose=${JSON.stringify(prose)}, filename=${JSON.stringify(filename)};
const receipt=id=>window.__longActions.push(id);
const action=id=><Button data-audit-action onClick={()=>receipt(id)}>Continue</Button>;
function Fixture({id}) {
const examples={
card:<Card><CardHeader><CardTitle>{filename}</CardTitle></CardHeader><CardContent><CardDescription>{prose}</CardDescription><CardDescription>{filename}</CardDescription></CardContent><CardFooter>{action(id)}</CardFooter></Card>,
alert:<Alert><AlertIcon aria-hidden='true'><Icon name='info'/></AlertIcon><AlertBody><AlertTitle>A complete account is ready</AlertTitle><AlertDescription>{prose} {filename}</AlertDescription><AlertActions>{action(id)}</AlertActions></AlertBody></Alert>,
empty:<Empty><EmptyTitle>Start with a little context</EmptyTitle><EmptyDescription>{prose} {filename}</EmptyDescription>{action(id)}</Empty>,
bubble:<Bubble><BubbleRow><BubbleContent>{prose} {filename}</BubbleContent></BubbleRow></Bubble>,
message:<Message><MessageContent><BubbleContent>{prose} {filename}</BubbleContent><MessageDescription>{prose} {filename}</MessageDescription>{action(id)}</MessageContent></Message>,
item:<Item data-audit-action onClick={()=>receipt(id)}><ItemContent><ItemTitle>{filename}</ItemTitle><ItemDescription>{prose} {filename}</ItemDescription></ItemContent></Item>,
attachment:<Attachment><AttachmentType>PDF</AttachmentType><div><AttachmentName title={filename}>{filename}</AttachmentName><AttachmentMeta>{prose}</AttachmentMeta></div><AttachmentActions><AttachmentAction data-audit-action aria-label={'Open '+filename} onClick={()=>receipt(id)}>↗</AttachmentAction></AttachmentActions></Attachment>,
field:<Field invalid><FieldLabel>Archive note</FieldLabel><FieldControl><Input defaultValue='A short title' /></FieldControl><FieldDescription>{prose} {filename}</FieldDescription><FieldError>{prose} {filename}</FieldError></Field>,
'input-group':<InputGroup><InputGroupTextarea aria-label='Archive message' defaultValue={prose+'\\n'+filename} rows={5}/><InputGroupText>{prose} {filename}</InputGroupText><InputGroupButton data-audit-action onClick={()=>receipt(id)}>Continue</InputGroupButton></InputGroup>,
textarea:<Textarea aria-label='Archive context' defaultValue={prose+'\\n'+filename} rows={5}/>,
table:<TableContainer aria-label='Complete archive records'><Table><TableHeader><TableRow><TableHead>File</TableHead><TableHead>Context</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>{filename}</TableCell><TableCell>{prose}</TableCell><TableCell>{action(id)}</TableCell></TableRow></TableBody></Table></TableContainer>,
'data-table':<DataTable caption='Complete archive records' data={[{id:'one',name:filename,note:prose}]} getRowId={r=>r.id} columns={[{id:'name',header:'File',accessorKey:'name'},{id:'note',header:'Context',accessorKey:'note'},{id:'actions',header:'Action',cell:()=>action(id)}]}/>,
dropdown:<DropdownMenu><DropdownMenuTrigger asChild><Button>Archive options</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={()=>receipt(id)}>{prose} {filename}</DropdownMenuItem><DropdownMenuItem onSelect={()=>receipt(id)}>Continue</DropdownMenuItem></DropdownMenuContent></DropdownMenu>,
tooltip:<TooltipProvider><Tooltip><TooltipTrigger asChild><Button>Archive details</Button></TooltipTrigger><TooltipContent>{prose} {filename}</TooltipContent></Tooltip></TooltipProvider>
}; return <section data-long-case={id}><h1 style={{fontSize:18,marginBottom:16}}>{id} · long content</h1><div data-audit-surface>{examples[id]}</div></section>;
}
window.__longActions=[];const root=createRoot(document.getElementById('long-content-fixture'));window.__showLongCase=id=>root.render(<Fixture key={id} id={id}/>);
`;
fs.writeFileSync(path.join(output,"fixture.tsx"),source);
const fixture = await build({ stdin:{sourcefile:"long-content-audit.tsx",loader:"tsx",resolveDir:process.cwd(),contents:source},bundle:true,write:false,format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent" });
const browser=await chromium.launch();const results=[];
try {
const reference=await browser.newPage();await reference.goto(`${base}/docs/card/`);await reference.locator('[data-example=card]').waitFor();
const css=await reference.locator('link[rel=stylesheet]').evaluateAll(links=>links.map(link=>link.href));assert.ok(css.length,"Existing docs CSS is required");await reference.close();
for(const theme of ["light","dark"]){
const context=await browser.newContext({viewport:{width:320,height:900},colorScheme:theme,reducedMotion:"no-preference"});const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
await page.route("**/__long-content-audit",route=>route.fulfill({contentType:"text/html",body:`<!doctype html><html data-mode="${theme}"><head><meta name="viewport" content="width=device-width, initial-scale=1">${css.map(href=>`<link rel="stylesheet" href="${href}">`).join("")}<style>body{margin:0;background:var(--v-canvas);color:var(--v-text)}#long-content-fixture{width:100%;padding:16px;box-sizing:border-box} [data-audit-surface]{width:100%}</style></head><body><main id="long-content-fixture"></main></body></html>`}));
await page.goto(`${new URL(base).origin}/__long-content-audit`);await page.addScriptTag({content:fixture.outputFiles[0].text});await page.evaluate(()=>document.fonts.ready);
for(const id of ids){const record={id,theme,width:320};try{
await page.evaluate(id=>window.__showLongCase(id),id);const root=page.locator(`[data-long-case="${id}"]`);await root.waitFor();await page.waitForTimeout(700);
if(id==="dropdown"){await root.getByRole("button").click();await page.locator('[data-slot=dropdown-menu-content]').waitFor();await page.waitForTimeout(650);}
if(id==="tooltip"){await root.getByRole("button").focus();await page.locator('[data-slot=tooltip-content]').waitFor();await page.waitForTimeout(650);}
record.bounds=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
const selector=id==="dropdown"?'[data-slot=dropdown-menu-content]':id==="tooltip"?'[data-slot=tooltip-content]':'[data-audit-surface]';
const surface=page.locator(selector);record.surface=await surface.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}});
await page.screenshot({path:path.join(output,`${id}-320-${theme}.png`),fullPage:true});
assert.ok(record.bounds.scrollWidth<=321,`Outer viewport overflow: ${JSON.stringify(record.bounds)}`);
assert.ok(record.surface.x>=-1&&record.surface.right<=321,`Surface outside viewport: ${JSON.stringify(record.surface)}`);
if(["table","data-table"].includes(id)){
const viewport=root.locator('[data-slot=table-container]');const start=await viewport.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(start.scroll>start.width,"Fixture requires real horizontal table content");await viewport.focus();await viewport.press("ArrowRight");await page.waitForTimeout(150);assert.ok(await viewport.evaluate(e=>e.scrollLeft)>0,"Keyboard scroll reaches overflowed cells");record.tableScroll=start;
}else{
const leaves=await surface.evaluate(e=>{const failures=[],surface=e.getBoundingClientRect();const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const text=walker.currentNode;if(!text.textContent.trim())continue;const owner=text.parentElement?.closest('[data-slot]');if(!owner||owner instanceof SVGElement||owner instanceof HTMLTextAreaElement||owner.closest('[aria-hidden=true],[data-slot=attachment-name],[data-slot=item-title]'))continue;const bounds=owner.getBoundingClientRect();if(!bounds.width)continue;const range=document.createRange();range.selectNodeContents(text);if([...range.getClientRects()].some(r=>r.left<Math.max(surface.left,bounds.left)-2||r.right>Math.min(surface.right,bounds.right)+2))failures.push({slot:owner.getAttribute('data-slot'),text:text.textContent.slice(0,40)});}return failures;});
assert.deepEqual(leaves,[],`Text clips or overflows inside surface: ${JSON.stringify(leaves)}`);
}
if(id==="attachment"){const name=root.locator('[data-slot=attachment-name]');assert.equal(await name.getAttribute('title'),filename);assert.equal(await name.textContent(),filename);record.filenameAccessible=true;}
if(id==="item"){assert.ok((await root.getByRole('button').ariaSnapshot()).includes(filename));record.filenameAccessible=true;}
if(id==="field"){const control=root.locator('input');const ids=(await control.getAttribute('aria-describedby')).split(' ');assert.equal(ids.length,2);record.fieldDescriptions=ids.length;}
if(["textarea","input-group"].includes(id)){const text=root.locator('textarea');assert.equal(await text.inputValue(),prose+'\n'+filename);await text.focus();for(let line=0;line<40;line++)await text.press('ArrowDown');record.textarea=await text.evaluate(e=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,selectionEnd:e.selectionEnd,length:e.value.length}));assert.ok(record.textarea.scrollWidth<=record.textarea.clientWidth+2,"Textarea wraps its long filename");assert.equal(record.textarea.selectionEnd,record.textarea.length,"Keyboard reaches complete filename");assert.ok(record.textarea.scrollTop>0,"Remaining multiline content scrolls into view");await page.screenshot({path:path.join(output,`${id}-end-320-${theme}.png`),fullPage:true});}
const action=root.locator('[data-audit-action]').first();if(await action.count()){await action.focus();await page.waitForTimeout(100);const b=await action.boundingBox();assert.ok(b.x>=-1&&b.x+b.width<=321,"Focused action remains horizontally reachable");await action.press('Enter');assert.ok(await page.evaluate(id=>window.__longActions.includes(id),id));await action.click();record.pointerAndKeyboardAction=true;}
if(id==="dropdown"){await page.getByRole('menuitem',{name:'Continue',exact:true}).focus();await page.keyboard.press('Enter');assert.ok(await page.evaluate(id=>window.__longActions.includes(id),id));record.keyboardMenuAction=true;}
if(id==="tooltip"){assert.ok((await page.getByRole('tooltip').textContent()).includes(filename));await page.keyboard.press('Escape');await page.locator('[data-slot=tooltip-content]').waitFor({state:'hidden'});record.fullTooltipAndEscape=true;}
assert.deepEqual(errors,[]);record.status='pass';console.log(`PASS ${id} 320 ${theme}`);
}catch(error){record.status='failed';record.error=error.message;process.exitCode=1;console.log(`FAIL ${id} 320 ${theme}: ${error.message}`);}finally{results.push(record);await page.keyboard.press('Escape').catch(()=>{});await page.waitForTimeout(150);}}
await context.close();}
}finally{await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({base,scope:'Long prose and unbroken filename at 320px light/dark; existing CSS and real primitives',proseLength:prose.length,filenameLength:filename.length,results},null,2));}
