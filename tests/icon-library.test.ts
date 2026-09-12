import assert from "node:assert/strict";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Icon,iconNames,getIconMotionFrame} from "../registry/cojeev/ui/icon";

test("the complete icon library has unique names, real geometry and visible motion targets",()=>{
  assert.ok(iconNames.length>=1703,`Expected complete pack, got ${iconNames.length}`);
  assert.equal(new Set(iconNames).size,iconNames.length);
  for(const name of iconNames){
    const html=renderToStaticMarkup(createElement(Icon,{name,feedback:false}));
    assert.match(html,/<(path|rect|circle|ellipse|line|polyline|polygon) /,name);
    const frame=getIconMotionFrame(name,.25);
    assert.ok(Object.keys(frame).length,name);
    for(const [part,value] of Object.entries(frame)){
      assert.ok(html.includes(`data-icon-part="${part}"`),`${name}: missing part ${part}`);
      assert.doesNotMatch(JSON.stringify(value),/NaN|Infinity/,name);
    }
  }
});
test("treatments share a fixed SVG footprint without decorative geometry becoming motion parts",()=>{
  for(const treatment of ["outline","duotone","organic"] as const){
    const html=renderToStaticMarkup(createElement(Icon,{name:"camera",treatment,tone:"pink",feedback:false}));
    assert.match(html,/viewBox="0 0 24 24"/);
    assert.match(html,new RegExp(`data-icon-treatment="${treatment}"`));
    assert.equal((html.match(/data-icon-part="glyph"/g)??[]).length,1);
  }
});

test("organic treatment reshapes ink strokes instead of placing plain Lucide ink on a blob",()=>{
  const html=renderToStaticMarkup(createElement(Icon,{name:"menu",treatment:"organic",tone:"pink",feedback:false}));
  assert.match(html,/data-icon-organic-line/);
  assert.match(html,/data-icon-organic-rest/);
  assert.doesNotMatch(html,/data-icon-backdrop/);
});
