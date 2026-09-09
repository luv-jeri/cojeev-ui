import test from "node:test";
import assert from "node:assert/strict";
import { graphemes, bounded, proximityWeight, caretFrame, fallStep, scrollWordProgress } from "../registry/cojeev/lib/reference-text-math";

test("grapheme segmentation preserves families, flags, and combining marks", () => {
  assert.deepEqual(graphemes("A👨‍👩‍👧‍👦🇮🇳é"), ["A", "👨‍👩‍👧‍👦", "🇮🇳", "é"]);
});
test("non-finite and extreme public values remain bounded", () => {
  assert.equal(bounded(NaN, 1, 8, 4), 4);
  assert.equal(bounded(Infinity, 1, 8, 4), 4);
  assert.equal(bounded(-90, 1, 8, 4), 1);
  assert.equal(proximityWeight(0, 120, 300, 800), 800);
  assert.equal(proximityWeight(900, 120, 300, 800), 300);
});
test("caret has full readable start and final content and never splits a grapheme", () => {
  assert.equal(caretFrame("Before", "👩‍🚀 ready", 0).text, "Before");
  assert.equal(caretFrame("Before", "👩‍🚀 ready", 1).text, "👩‍🚀 ready");
  for (let p=0; p<=1; p+=.01) {
    const frame = caretFrame("Before", "👩‍🚀 ready", p);
    if (frame.phase === "typing") assert.ok("👩‍🚀 ready".startsWith(frame.text));
  }
});
test("falling body remains inside stage even after a long suspended frame", () => {
  const next = fallStep({x:500,y:500,vx:200,vy:500,w:80,h:32,angle:0}, 260, 180, 5000, 900);
  assert.ok(next.x >= 0 && next.x <= 180);
  assert.ok(next.y >= 0 && next.y <= 148);
});
test("scroll reveal endpoints preserve every word", () => {
  for(let i=0;i<50;i++) assert.equal(scrollWordProgress(1,i,50), 1);
  assert.equal(scrollWordProgress(0,0,50),0);
});


test("all new effects render readable still content before browser APIs exist", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const cases = [
    ["typography-vortex", "TypographyVortex"], ["particle-text", "ParticleText"],
    ["warp-text", "WarpText"], ["variable-proximity", "VariableProximity"],
    ["falling-text", "FallingText"], ["scroll-reveal", "ScrollReveal"],
    ["word-stream", "WordStream"], ["caret-swap", "CaretSwap"], ["zoom-words", "ZoomWords"],
  ];
  for (const [id, name] of cases) {
    const imported = await import(`../registry/cojeev/ui/${id}.tsx`);
    const html = renderToStaticMarkup(React.createElement(imported[name], id === "caret-swap" ? { fromText: "Before", toText: "A 👩‍🚀 thought", paused: true } : { text: "A 👩‍🚀 thought", paused: true }));
    assert.ok(html.includes(`data-slot="${id}"`), id);
    assert.ok(html.includes("A 👩‍🚀 thought"), `${id}: complete text remains in DOM`);
    assert.ok(html.includes('data-running="false"'), `${id}: never claims animation on the server`);
    assert.ok(!html.includes("NaN"), `${id}: finite markup`);
  }
});

test("pressure extreme axes produce finite still output", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { VariableProximity } = await import("../registry/cojeev/ui/variable-proximity");
  const html = renderToStaticMarkup(React.createElement(VariableProximity, { text: "wide", variant: "pressure", fromWeight: -999, toWeight: Infinity, radius: NaN }));
  assert.ok(html.includes('&quot;wght&quot; 200, &quot;wdth&quot; 75'));
  assert.ok(!html.includes("Infinity") && !html.includes("NaN"));
});
