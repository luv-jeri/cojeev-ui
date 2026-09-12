import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { MotionDrawerExample } from "../components/examples/motion-drawer";

const cases = [
  { variant: "default", trigger: "Explore chapters", receipt: "Overview is open." },
  { variant: "floating", trigger: "Open quick actions", receipt: "Note unpinned · Notifications off." },
  { variant: "stack", trigger: "Choose a chapter", receipt: "Reading Overview." },
  { variant: "bottom", trigger: "Change layout", receipt: "Notebook layout selected." },
];

for (const { variant, trigger, receipt } of cases) {
  test(`${variant} exposes its own drawer task and a readable result in full and compact examples`, () => {
    for (const compact of [false, true]) {
      const $ = load(renderToStaticMarkup(createElement(MotionDrawerExample, { variant, compact })));
      const triggers = $('[aria-haspopup="dialog"]');
      assert.equal(triggers.length, 1, "each specimen must launch just its own drawer");
      const triggerLabel = triggers.clone();
      triggerLabel.find('[aria-hidden="true"]').remove();
      assert.equal(triggerLabel.text().trim(), trigger);
      assert.equal($('[role="status"]').text().trim(), receipt, "the local outcome stays visible outside the drawer");
    }
  });
}
