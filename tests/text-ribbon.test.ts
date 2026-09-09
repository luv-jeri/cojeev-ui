import test from "node:test";
import assert from "node:assert/strict";
import { ribbonCopies, ribbonPeriod, advanceRibbonPhase, moveRibbonPhase, textRibbonPath } from "../registry/cojeev/lib/text-ribbon-path";

test("a repeated ribbon has enough text across the complete negative-offset cycle", () => {
  for (const path of [608,940,1300]) for(const phrase of [12,250,2000]) {
    const count = ribbonCopies(path,phrase);
    assert(count*phrase-phrase>=path);
    assert(count<=200);
  }
  assert.equal(ribbonCopies(NaN,0),1);
});

test("dragging wraps exactly while invalid geometry and flat curves stay bounded", () => {
  assert.equal(moveRibbonPhase(28, -1000, 300), 228);
  assert.equal(moveRibbonPhase(228, 1000, 300), 28);
  assert.equal(moveRibbonPhase(2, Infinity, 300), 0);
  assert.equal(textRibbonPath("wave", -4), textRibbonPath("wave", 0));
  assert.equal(textRibbonPath("arch", 4), textRibbonPath("arch", 1));
  assert.equal(textRibbonPath("circle").endsWith("Z"), true);
});

test("forward/backward wrap is periodic and a stalled frame cannot leap the ribbon", () => {
  assert.equal(advanceRibbonPhase(249,.05,40,250),1);
  assert.equal(advanceRibbonPhase(1,.05,-40,250),249);
  assert.equal(advanceRibbonPhase(10,900,40,250),12);
  assert.equal(advanceRibbonPhase(10,.03,40,0),0);
});

test("closed-loop periods meet at a phrase boundary rather than colliding mid-word", () => {
  for(const width of [400,720,1200]) {
    const unit=ribbonPeriod(1200,width,true);
    assert.equal(1200/unit,Math.round(1200/unit));
  }
  assert.equal(ribbonPeriod(1200,720,false),720);
  assert.equal(ribbonPeriod(1200,9000,true),9000);
});
