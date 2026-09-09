import { test } from "node:test";
import assert from "node:assert/strict";
import { galleryIndex, galleryOffset, spiralPlacement, waveBoundary, transitionLayers, ditherCells, stepGalleryTransition } from "../registry/cojeev/lib/reference-gallery-geometry";

test("selection wraps in either direction and remains valid after item removal", () => {
 assert.equal(galleryIndex(-1, 4), 3); assert.equal(galleryIndex(12, 5), 2);
 assert.equal(galleryIndex(NaN, 3), 0); assert.equal(galleryIndex(3, 0), -1);
 assert.equal(galleryOffset(0, 5, 6), 1);
});
test("spiral cycles vertically through depth instead of tracing a flat orbit", () => {
 const a=spiralPlacement(0,6,320), b=spiralPlacement(1,6,320);
 assert.notEqual(a.y,b.y); assert.notEqual(a.scale,b.scale);
 assert.deepEqual(spiralPlacement(6,6,320),a);
 for(let i=-20;i<20;i++) { const p=spiralPlacement(i/3,6,320); assert(Math.abs(p.x)<160); assert(Number.isFinite(p.scale)); }
});
test("interrupted transition reverses from its current position without jumping", () => {
 const first=stepGalleryTransition(.35,1,100,1000);
 assert(first>.35 && first<1);
 const reverse=stepGalleryTransition(first,0,10,1000);
 assert(reverse<first && reverse>first-.1);
 assert.equal(stepGalleryTransition(.3,1,100,0),1);
 assert.equal(stepGalleryTransition(.3,0,100,NaN),0);
});
test("grain and dither cover a scene exchange but expose exact endpoints", () => {
 for(const kind of ["grain","dither"] as const) {
  assert.deepEqual(transitionLayers(0,kind),{first:1,second:0,cover:0});
  assert.deepEqual(transitionLayers(1,kind),{first:0,second:1,cover:0});
  const middle=transitionLayers(.5,kind); assert.equal(middle.cover,1); assert.equal(middle.first,0); assert.equal(middle.second,0);
 }
});
test("wave starts below content, ends above it and has a curved middle", () => {
 assert(waveBoundary(0,0)>1); assert(waveBoundary(1,0)<0);
 assert.notEqual(waveBoundary(.5,0),waveBoundary(.5,.25));
});
test("ordered dither is deterministic, bounded, and fills at cover peak", () => {
 assert.deepEqual(ditherCells(.4),ditherCells(.4));
 assert.equal(ditherCells(0).length,0); assert.equal(ditherCells(1).length,256);
 assert(ditherCells(.4).length>0 && ditherCells(.4).length<256);
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GrainDissolve } from "../registry/cojeev/ui/grain-dissolve";
import { WaveWipe } from "../registry/cojeev/ui/wave-wipe";
import { DitherDissolve } from "../registry/cojeev/ui/dither-dissolve";
import { AccordionGallery } from "../registry/cojeev/ui/accordion-gallery";
import { OptionWheel } from "../registry/cojeev/ui/option-wheel";

test("all transitions keep the outgoing interactive subtree inert for both initial targets",()=>{
 for(const Component of [GrainDissolve,WaveWipe,DitherDissolve]) for(const active of [false,true]) {
  const html=renderToStaticMarkup(React.createElement(Component,{active,first:React.createElement("button",null,"First action"),second:React.createElement("button",null,"Second action")}));
  assert.equal((html.match(/ inert=""/g)??[]).length,1);
  const hidden=html.match(/<div[^>]*aria-hidden="true"[^>]*>.*?<\/div>/)?.[0];
  assert(hidden?.includes(active?"First action":"Second action"));
  assert(!hidden?.includes(active?"Second action":"First action"));
 }
});
test("gallery SSR has exactly one selected option, even with invalid controlled values",()=>{
 const items=[{id:"a",label:"First",title:"First",src:"/a.svg",alt:"First study"},{id:"b",label:"Second",title:"Second",src:"/b.svg",alt:"Second study"}];
 const wheel=renderToStaticMarkup(React.createElement(OptionWheel,{items,selectedIndex:99}));
 assert.equal((wheel.match(/aria-selected="true"/g)??[]).length,1);
 assert(wheel.includes('role="listbox"'));
 const accordion=renderToStaticMarkup(React.createElement(AccordionGallery,{items,selectedIndex:NaN}));
 assert.equal((accordion.match(/aria-expanded="true"/g)??[]).length,1);
 assert.equal((accordion.match(/ hidden=""/g)??[]).length,1);
});
test("empty selectors render an explicit empty state without a fake selection",()=>{
 const wheel=renderToStaticMarkup(React.createElement(OptionWheel,{items:[]}));
 assert(wheel.includes("No options available."));assert(!wheel.includes('aria-selected="true"'));
 const gallery=renderToStaticMarkup(React.createElement(AccordionGallery,{items:[]}));assert(gallery.includes("No gallery items."));
});
