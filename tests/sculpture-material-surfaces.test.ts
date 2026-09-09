import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {GlassSculpture} from "../registry/cojeev/ui/glass-sculpture";
import {FlowSculpture} from "../registry/cojeev/ui/flow-sculpture";
import {ParticleSculpture} from "../registry/cojeev/ui/particle-sculpture";

test("all three materials have geometry-derived still previews before GPU initialization",()=>{
 for(const Component of [GlassSculpture,FlowSculpture,ParticleSculpture]){
  const html=renderToStaticMarkup(React.createElement(Component,{paused:true}));
  assert.match(html,/<svg/);assert.match(html,/<path d="M/);assert.match(html,/Static shape preview/);assert.match(html,/data-renderer="pending"/);assert.doesNotMatch(html,/NaN|Infinity/);
 }
});
test("invalid geometry is reported instead of being replaced with a different sculpture",()=>{
 for(const Component of [GlassSculpture,FlowSculpture,ParticleSculpture]){
  const html=renderToStaticMarkup(React.createElement(Component,{geometry:{positions:[1,2,NaN]}}));
  assert.match(html,/role="status"/);assert.match(html,/data-renderer="error"/);assert.doesNotMatch(html,/<svg/);
 }
});
