import assert from "node:assert/strict";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {load} from "cheerio";
import {OrganismComposition,FocusSession,InviteCard,normalizeFocusDuration,focusSecondsRemaining} from "../registry/cojeev/ui/organism-composition";
import {OrganismAssembly} from "../registry/cojeev/ui/organism-assembly";
import {AssemblyPart} from "../registry/cojeev/ui/assembly-part";
import {Button} from "../registry/cojeev/ui/button";

test("profile uses native actions without a permanent form; expanded notes reuse InputGroup",()=>{
 const $=load(renderToStaticMarkup(createElement(OrganismComposition,{kind:"profile"})));
 assert.equal($("[data-assembly-part=cover][data-slot=card]").length,1);
 assert.equal($("button[data-assembly-part=primary][data-slot=button]").length,1);
 assert.equal($("input").length,0);
 const expanded=load(renderToStaticMarkup(createElement(OrganismComposition,{kind:"profile",defaultState:{profileComposer:true}})));
 assert.equal(expanded("[data-slot=input-group] input").length,1);
 assert.equal(expanded("[data-slot=input-group] button").length,1);
});
test("task panel and dock preserve native button semantics; chat starts with real seeded bubbles",()=>{
 const panel=load(renderToStaticMarkup(createElement(OrganismComposition,{kind:"side-panel"})));
 assert.equal(panel("button[data-slot=item-item]").length,3);
 assert.equal(panel("button[data-slot=item-item][aria-pressed=true]").length,1);
 const dock=load(renderToStaticMarkup(createElement(OrganismComposition,{kind:"dock"})));
 assert.equal(dock("button[aria-label=Files]").length,1);
 assert.equal(dock("input").length,0);
 const chat=load(renderToStaticMarkup(createElement(OrganismComposition,{kind:"chat"})));
 assert.equal(chat("[data-slot=bubble-content]").length,3);
 assert.equal(chat("[data-slot=bubble-content].-me").length,1);
 assert.equal(chat("input[aria-label='Your message']").length,1);
 assert.equal(chat("button[aria-label='Send message'][disabled]").length,1);
});
test("released native root has no assembly clip or motion locks and keeps caller semantics",()=>{
 const props={identity:"action",rect:{x:20,y:30,width:120,height:40},release:true,children:createElement(Button,{disabled:true,"aria-label":"Owned native action"},"Action")};
 const html=renderToStaticMarkup(createElement(AssemblyPart,props));
 const $=load(html),root=$("[data-assembly-part=action]");
 assert.equal(root.prop("tagName"),"BUTTON");assert.equal(root.attr("data-slot"),"button");
 assert.equal(root.attr("data-motion"),undefined);assert.equal(root.attr("data-flow"),undefined);
 assert(!root.attr("style")!.includes("clip-path"));assert(!root.attr("style")!.includes("translate"));
 assert(root.attr("style")!.includes("left:20px"));assert(root.is("[disabled]"));
});
test("studio exposes exactly six named choices plus explicit playback controls",()=>{
 const $=load(renderToStaticMarkup(createElement(OrganismAssembly)));
 assert.deepEqual($("[aria-label='Choose a composition'] button").map((_,el)=>$(el).text()).get(),["Profile","Panel","Dock","Chat","Focus","Invite"]);
 assert.equal($("button[aria-label='Replay assembly']").length,1);
 assert(!$.text().includes("Eight little parts"));
});

test("focus clock uses elapsed time rather than counting interval callbacks",()=>{
 const started=1_000_000,deadline=started+25*60*1000;
 assert.equal(focusSecondsRemaining(deadline,started),1500);
 assert.equal(focusSecondsRemaining(deadline,started+10*60*1000),900);
 assert.equal(focusSecondsRemaining(deadline,deadline+60_000),0);
 assert.equal(focusSecondsRemaining(Number.NaN,started),0);
 assert.equal(normalizeFocusDuration(Number.NaN),1500);
 assert.equal(normalizeFocusDuration(0),1);
 assert.equal(normalizeFocusDuration(100_000),86400);
});
test("focus and invite expose usable native controls and honest local state",()=>{
 const focus=load(renderToStaticMarkup(createElement(FocusSession,{durationSeconds:300,defaultState:{focusRemainingSeconds:123}})));
 assert.equal(focus('[role=timer]').text(),'02:03');
 assert.equal(focus('[data-assembly-part=primary]').text(),'Resume');
 assert.equal(focus('button[aria-label="Reset focus session"]').length,1);
 assert(focus.text().includes('No sound, no notifications.'));
 const invite=load(renderToStaticMarkup(createElement(InviteCard,{inviteDate:'Friday',defaultState:{rsvp:'yes'},participants:[{name:'Mia',initials:'M'}]})));
 assert.equal(invite('[data-assembly-part=primary][aria-pressed=true]').length,1);
 assert.equal(invite('[data-assembly-part=secondary][aria-pressed=false]').length,1);
 assert.equal(invite('[data-slot=avatar][aria-label=Mia]').length,1);
 assert(invite.text().includes('Friday'));
});
