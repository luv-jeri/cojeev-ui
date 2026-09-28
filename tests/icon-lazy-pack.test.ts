import assert from "node:assert/strict";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Icon,loadLucideIcons} from "../registry/cojeev/ui/icon";

// Runs in its own process so the Lucide pack is genuinely unloaded at the start.
test("a Lucide-only icon keeps its footprint until its lazily loaded geometry arrives",async()=>{
  const authored=renderToStaticMarkup(createElement(Icon,{name:"check",feedback:false}));
  const before=renderToStaticMarkup(createElement(Icon,{name:"anchor",feedback:false}));
  assert.match(authored,/<path /,"authored icons never wait for the pack");
  assert.match(before,/viewBox="0 0 24 24"/);
  assert.doesNotMatch(before,/<path /);
  await loadLucideIcons();
  assert.match(renderToStaticMarkup(createElement(Icon,{name:"anchor",feedback:false})),/<path /);
  assert.throws(()=>renderToStaticMarkup(createElement(Icon,{name:"not-an-icon"})),/Unknown Cojeev icon/);
});

test("in a browser, hydration renders what the server rendered even after the pack has loaded",async()=>{
  await loadLucideIcons();
  const global=globalThis as {window?:unknown};
  const previous=global.window;
  // A lazily hydrated boundary can start after another icon fetched the pack. Its server snapshot
  // must still say "not loaded", or React reports a hydration mismatch (#418) and re-renders.
  global.window={};
  try {
    assert.doesNotMatch(renderToStaticMarkup(createElement(Icon,{name:"anchor",feedback:false})),/<path /);
    assert.match(renderToStaticMarkup(createElement(Icon,{name:"check",feedback:false})),/<path /,"authored icons are always in the server HTML");
  } finally {
    if(previous===undefined)delete global.window;else global.window=previous;
  }
});
