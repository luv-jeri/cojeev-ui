import assert from "node:assert/strict";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Icon, iconActionNames, getIconDirection, getIconMotionFrame} from "../registry/cojeev/ui/icon";
import {IconExample} from "../components/examples/action-icons";

const names = ["check", "check-circle", "close", "activity", "alert", "info", "loader", "refresh", "search", "bell", "download", "upload", "copy", "settings", "trash", "plus", "send", "heart", "star", "thumbs-up"];
test("action names render recognizable geometry with visible SSR state", () => {
  for (const name of names) {
    const html = renderToStaticMarkup(createElement(Icon, {name, feedback:false}));
    assert.match(html, /<(path|circle|rect|line|polyline) /, name);
    assert.match(html, /viewBox="0 0 24 24"/, name);
    assert.doesNotMatch(html, /stroke-dashoffset|opacity="0"/, name);
  }
  for (const [alias, canonical] of [["check-circle","circle-check"],["close","x"],["alert","triangle-alert"],["loader","loader-circle"],["refresh","refresh-cw"],["trash","trash-2"]]) {
    const geometry = (name:string) => renderToStaticMarkup(createElement(Icon,{name,feedback:false})).replace(/data-icon-name="[^"]+"/, "");
    assert.equal(geometry(alias), geometry(canonical));
  }
});
test("direction follows geometry, including short aliases and the paper plane", () => {
  for (const [name, expected] of [["arrow-left",[-1,0]],["arrow-l",[-1,0]],["chevron-up",[0,-1]],["arrow-down-right",[1,1]],["arrow-ur",[1,-1]],["send",[1,-1]],["download",[0,1]],["upload",[0,-1]]] as const) assert.deepEqual(getIconDirection(name),expected,name);
});
test("semantic parts preserve the stationary tray, ring and bin", () => {
  const download = getIconMotionFrame("download",.5);
  assert.equal(download["1"],undefined); // Tray stays fixed.
  assert.equal(download["0"].transform,download["2"].transform);
  assert.match(download["0"].transform!,/translate\(0 [1-9]/);
  assert.match(getIconMotionFrame("upload",.5)["0"].transform!,/translate\(0 -/);
  assert.equal(getIconMotionFrame("check-circle",.5)["0"],undefined);
  assert.equal(getIconMotionFrame("settings",.5)["1"],undefined);
  assert.equal(getIconMotionFrame("trash",.5)["2"],undefined);
  assert.equal(getIconMotionFrame("trash",.5)["3"].transform,getIconMotionFrame("trash",.5)["4"].transform);
});
test("motion progress and amplitude remain finite at malformed inputs", () => {
  for (const name of names) for(const p of [NaN,Infinity,-10,10]) {
    const frame=getIconMotionFrame(name,p,NaN);
    assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);
  }
  assert.deepEqual(getIconMotionFrame("download",.5,0),{});
  assert.equal(getIconMotionFrame("check",1)["0"].draw,1);
});

test("media, time, files and commerce animate their working part", () => {
  const frame=(name:string)=>getIconMotionFrame(name,.25);
  assert.equal(frame("volume-2")["0"],undefined,"speaker stays fixed while waves travel");
  assert.ok(frame("volume-2")["1"]?.transform);
  assert.equal(frame("camera")["0"],undefined,"camera body stays fixed");
  assert.ok(frame("camera")["1"]?.transform);
  assert.equal(frame("clock")["0"],undefined,"clock face stays fixed");
  assert.match(frame("clock")["1"].transform!,/rotate/);
  assert.equal(frame("file-text")["0"],undefined,"document page stays fixed");
  assert.ok(frame("file-text")["3"]?.draw!==undefined);
  assert.equal(frame("gift")["1"],undefined,"box stays fixed while lid opens");
  assert.ok(frame("gift")["3"]?.transform);
  assert.equal(frame("bar-chart-3")["0"],undefined,"chart axis stays fixed");
  assert.ok(frame("bar-chart-3")["2"]?.transform);
});

test("every action recipe targets real rendered geometry and preserves visible SSR", () => {
  for (const name of iconActionNames) {
    const html=renderToStaticMarkup(createElement(Icon,{name,feedback:false}));
    assert.match(html,/<(path|rect|circle|ellipse|line|polyline|polygon) /,name);
    assert.doesNotMatch(html,/stroke-dashoffset|opacity="0"/,name);
    for(const progress of [0,.25,.75,1]) for(const [part,frame] of Object.entries(getIconMotionFrame(name,progress))) {
      assert.ok(html.includes(`data-icon-part="${part}"`),`${name} targets existing part ${part}`);
      assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/,name);
    }
  }
});

test("icon explorer composes one native search input with an inline clear affordance and card tiles",()=>{
  const html=renderToStaticMarkup(createElement(IconExample,{}));
  assert.match(html,/data-slot="input-group"/);
  assert.match(html,/data-slot="input-group-input"/);
  assert.doesNotMatch(html,/>Clear search</);
  assert.match(html,/data-r="12"/);
});
