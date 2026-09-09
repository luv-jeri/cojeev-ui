import test from "node:test";
import assert from "node:assert/strict";
import { decodeHeading, headingTiming, portalContour, normalizePortal } from "../registry/cojeev/lib/reference-additions-math";

test("heading decode preserves graphemes, spaces and exact completed content",()=>{
 const text="A 👩‍🚀 é idea";
 assert.equal(decodeHeading(text,1,8,{scrambleLength:5,preserveChance:0,tailChance:1}).join(""),text);
 for(let frame=0;frame<30;frame++){
  const out=decodeHeading(text,.3,frame,{scrambleLength:5,preserveChance:0,tailChance:1});
  assert.equal(out[1]," ");assert.equal(out[3]," ");assert.equal(out[5]," ");
  assert.ok(!out.join("").includes("\\ud83d"));
 }
});
test("decode is deterministic but changes unresolved noise with the frame",()=>{
 const opts={scrambleLength:10,preserveChance:0,tailChance:1};
 assert.deepEqual(decodeHeading("Readable words",.2,4,opts),decodeHeading("Readable words",.2,4,opts));
 assert.notDeepEqual(decodeHeading("Readable words",.2,4,opts),decodeHeading("Readable words",.2,5,opts));
});
test("long article timing and invalid public settings remain bounded",()=>{
 const timing=headingTiming(Infinity,9999,400);
 assert.ok(timing.duration<=3000);assert.ok(timing.delay*(400-1)<=1200);
 assert.deepEqual(normalizePortal(NaN,Infinity,-900),{speed:.7,intensity:1,distortion:0});
});
test("portal fallback paths are finite, repeatable and actually distorted",()=>{
 const a=portalContour(0,.7),b=portalContour(0,0);
 assert.equal(a,portalContour(0,.7));assert.notEqual(a,b);
 assert.ok(a.startsWith("M"));assert.ok(a.endsWith("Z"));assert.ok(!/NaN|Infinity/.test(a));
});

test("new components render real readable semantics and a deterministic still portal on the server",async()=>{
 const React=await import("react"),{renderToStaticMarkup}=await import("react-dom/server");
 const {ArticleHeadings}=await import("../registry/cojeev/ui/article-headings");
 const {PortalField}=await import("../registry/cojeev/ui/portal-field");
 const article=renderToStaticMarkup(React.createElement(ArticleHeadings,{items:[{id:"one",title:"A 👩‍🚀 idea",href:"#idea",meta:"6 min read"}],headingLevel:3,paused:true}));
 assert.ok(article.includes("<h3>"));assert.ok(article.includes('href="#idea"'));assert.ok(article.includes("A 👩‍🚀 idea"));assert.ok(article.includes('data-running="false"'));assert.ok(article.includes('aria-hidden="true" data-heading-visual'));
 const node=React.createElement(PortalField,{paused:true,distortion:NaN},React.createElement("h2",null,"An open possibility"));
 const first=renderToStaticMarkup(node),second=renderToStaticMarkup(node);
 assert.equal(first,second);assert.ok(first.includes("<h2>An open possibility</h2>"));assert.ok(first.includes('data-renderer="pending"'));assert.ok(first.includes('data-running="false"'));assert.ok(!first.includes("NaN"));
});
