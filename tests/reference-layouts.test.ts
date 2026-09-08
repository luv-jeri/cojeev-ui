import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileSwapOrder, swapLayoutItems, shouldDismissDrawer, supportDestination } from "../registry/sahajiv/lib/reference-layouts";

test("swap preserves every identity and does not mutate caller order",()=>{
 const source=["a","b","c"];assert.deepEqual(swapLayoutItems(source,"a","c"),["c","b","a"]);assert.deepEqual(source,["a","b","c"]);
 assert.deepEqual(swapLayoutItems(source,"missing","c"),source);assert.deepEqual(swapLayoutItems(source,"a","a"),source);
});
test("new and removed caller items reconcile without losing saved ordering",()=>{
 assert.deepEqual(reconcileSwapOrder(["c","a","b"],["a","c","d"]),["c","a","d"]);
 assert.deepEqual(reconcileSwapOrder(["a","a","ghost"],["a","b","b"]),["a","b"]);
});
test("drawer dismiss requires movement toward its physical edge",()=>{
 assert(shouldDismissDrawer(-110,300,"left"));assert(!shouldDismissDrawer(110,300,"left"));
 assert(shouldDismissDrawer(110,300,"right"));assert(!shouldDismissDrawer(20,300,"right"));
 assert(!shouldDismissDrawer(NaN,300,"left"));
});
test("support destination accepts navigable caller URLs and rejects executable schemes",()=>{
 assert.equal(supportDestination("https://example.com/support"),"https://example.com/support");
 assert.equal(supportDestination("/about#support"),"/about#support");
 assert.equal(supportDestination("javascript:alert(1)"),undefined);assert.equal(supportDestination(""),undefined);
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageMasking } from "../registry/sahajiv/ui/image-masking";
import { BuyMeCoffee } from "../registry/sahajiv/ui/buy-me-coffee";
import { Swapy } from "../registry/sahajiv/ui/swapy";
import { MotionDrawer } from "../registry/sahajiv/ui/motion-drawer";
import { LinearModal } from "../registry/sahajiv/ui/linear-modal";

test("both image methods preserve a semantic caller image and optional caption",()=>{
 for(const method of ["mask","clip"] as const){
  const html=renderToStaticMarkup(React.createElement(ImageMasking,{src:"/study.svg",alt:"An ink landscape",caption:"A small study",method}));
  assert(html.includes('alt="An ink landscape"'));assert(html.includes("<figcaption>A small study</figcaption>"));
  assert(html.includes(method==="mask"?"mask-image:":"clipPathUnits=\"objectBoundingBox\""));
 }
});
test("multiple clipped image instances have distinct reusable SVG identifiers",()=>{
 const html=renderToStaticMarkup(React.createElement("div",null,...[0,1].map(key=>React.createElement(ImageMasking,{key,src:"/study.svg",alt:"Landscape",method:"clip"}))));
 const ids=[...html.matchAll(/<clipPath id="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);
});
test("support link uses caller destination and becomes explicitly unavailable without a safe href",()=>{
 const real=renderToStaticMarkup(React.createElement(BuyMeCoffee,{href:"/help#support",actionLabel:"Ways to help"}));assert(real.includes('href="/help#support"'));assert(real.includes("Ways to help"));
 const unavailable=renderToStaticMarkup(React.createElement(BuyMeCoffee,{href:"javascript:alert(1)"}));assert(!unavailable.includes("href="));assert(unavailable.includes('aria-disabled="true"'));assert(unavailable.includes("Support link unavailable"));
});
test("swappable cards render caller order and real keyboard alternatives",()=>{
 const items=[{id:"a",label:"First",content:"One"},{id:"b",label:"Second",content:"Two"},{id:"c",label:"Third",content:"Three"}];
 const html=renderToStaticMarkup(React.createElement(Swapy,{items,order:["c","a","b"]}));
 assert.deepEqual([...html.matchAll(/data-swap-id="([^"]+)"/g)].map(match=>match[1]),["c","a","b"]);
 assert(html.includes('aria-label="Move Third"'));assert(html.includes('aria-label="Move First earlier"'));assert(html.includes('role="status"'));
 const empty=renderToStaticMarkup(React.createElement(Swapy,{items:[]}));assert(empty.includes("No cards to arrange."));
});
test("layout entry controls have native dialog triggers with accessible names",()=>{
 const drawer=renderToStaticMarkup(React.createElement(MotionDrawer,{title:"Chapters",triggerLabel:"Open chapters"},"Navigation"));assert(drawer.includes('aria-haspopup="dialog"'));assert(drawer.includes("Open chapters"));
 const card=renderToStaticMarkup(React.createElement(LinearModal,{title:"A study",description:"Explore its details",src:"/art.svg",alt:"Art study"},"Long content"));assert(card.includes('aria-haspopup="dialog"'));assert(card.includes('aria-label="Read A study"'));assert(card.includes('data-state="closed"'));
});
