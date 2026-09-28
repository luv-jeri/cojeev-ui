import assert from "node:assert/strict";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Icon,loadLucideIcons} from "../registry/cojeev/ui/icon";

// Runs in its own process so the Lucide pack is genuinely unloaded at the start.
test("a Lucide-only icon keeps its footprint until its lazily loaded geometry arrives",async()=>{
  const authored=renderToStaticMarkup(createElement(Icon,{name:"check",feedback:false}));
  const before=renderToStaticMarkup(createElement(Icon,{name:"briefcase",feedback:false}));
  assert.match(authored,/<path /,"authored icons never wait for the pack");
  assert.match(before,/viewBox="0 0 24 24"/);
  assert.doesNotMatch(before,/<path /);
  await loadLucideIcons();
  assert.match(renderToStaticMarkup(createElement(Icon,{name:"briefcase",feedback:false})),/<path /);
  assert.throws(()=>renderToStaticMarkup(createElement(Icon,{name:"not-an-icon"})),/Unknown Cojeev icon/);
});
