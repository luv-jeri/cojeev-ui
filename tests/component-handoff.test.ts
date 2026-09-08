import test from "node:test";
import assert from "node:assert/strict";
import { componentHandoffNotes, componentHandoffPacket, handoffCodeFence } from "../lib/component-handoff";
import type { CatalogEntry, ComponentGuide } from "../lib/catalog";

const entry: CatalogEntry = {
  name:"word-relay", title:"Word Relay", description:"A readable phrase exchange.",
  meta:{category:"Text & motion", api:[{name:"WordRelay",props:[{name:"words",type:"readonly string[]",required:true,description:"The phrases to display."}]}],source:{reviewOnly:true,variants:["pink"],sizes:[],states:["paused"]},fidelity:"original",baseComponent:false},
};
const guide: ComponentGuide = {description:entry.description,category:entry.meta.category,usage:["Keep the sentence readable."],accessibility:["Pause automatic movement."],related:["text-reveal"]};

test("handoff names local availability and keeps real API and dependencies together", () => {
  const notes = componentHandoffNotes(entry, guide, ["button","word-relay","button"]);
  assert.match(notes,/not yet available from the public registry/);
  assert.doesNotMatch(notes,/npx|https:\/\/.*\/r\//);
  assert.equal(notes.match(/^- button$/gm)?.length,1);
  assert.match(notes,/words \(required\): readonly string\[\]/);
  assert.match(notes,/Pause automatic movement/);
});

test("selected guide preserves code and states which preview settings are captured", () => {
  const source = 'const example = `a ``` fence`;\nconst emoji = "🌱";';
  const packet = componentHandoffPacket(componentHandoffNotes(entry,guide,[]),source,"olive","sm");
  assert.match(packet,/Variant: olive\nSize: sm/);
  assert.match(packet,/inside the interactive example are not serialized/);
  assert(packet.includes(source));
  assert.equal(handoffCodeFence(source),"````tsx\n"+source+"\n````");
});

test("existing components do not imply local changes are already published", () => {
  const notes = componentHandoffNotes({...entry,meta:{...entry.meta,source:{...entry.meta.source,reviewOnly:false}}},guide,[]);
  assert.match(notes,/public release can differ from this preview/);
  assert.doesNotMatch(notes,/not yet available/);
});
