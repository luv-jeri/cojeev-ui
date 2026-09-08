import { test } from "node:test";
import assert from "node:assert/strict";
import { getReadingTrailState } from "../registry/sahajiv/ui/reading-trail";

// These fixtures catch wrong active-section boundaries, unbounded percentages,
// and a final section that cannot reach the viewport's activation line.
const sections = [{ id: "start", top: 100 }, { id: "middle", top: 800 }, { id: "end", top: 1500 }];
test("reading progress starts at the article and follows the scrollable range", () => {
  assert.deepEqual(getReadingTrailState(sections, 0, 600, 2200, 0), { activeId: "start", progress: 0 });
  assert.deepEqual(getReadingTrailState(sections, 850, 600, 2200, 0), { activeId: "middle", progress: .5 });
  assert.deepEqual(getReadingTrailState(sections, 2000, 600, 2200, 0), { activeId: "end", progress: 1 });
});
test("the last section becomes current at the bottom even when it cannot reach the top", () => {
  assert.deepEqual(getReadingTrailState(sections, 1400, 800, 2200, 0), { activeId: "end", progress: 1 });
});
test("geometry uses document order, offsets, and safe values for missing targets", () => {
  assert.equal(getReadingTrailState([...sections].reverse(), 780, 600, 2200, 24).activeId, "middle");
  assert.deepEqual(getReadingTrailState([], 200, 600, 2200), { activeId: null, progress: 0 });
  assert.deepEqual(getReadingTrailState([{ id: "bad", top: NaN }], 0, 600, 2200), { activeId: null, progress: 0 });
  assert.deepEqual(getReadingTrailState([{ id: "short", top: 0 }], 0, 800, 400), { activeId: "short", progress: 1 });
  assert.equal(getReadingTrailState(sections, NaN, 600, 2200).progress, 0);
});

test("disabled living links remove destinations while normal links preserve browser navigation attributes", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LivingLink } = await import("../registry/sahajiv/ui/living-link");
  const normal = renderToStaticMarkup(React.createElement(LivingLink, { href: "/notes", target: "_blank", rel: "noopener" }, "Read notes"));
  assert.match(normal, /href="\/notes"/);
  assert.match(normal, /target="_blank"/);
  assert.match(normal, /rel="noopener"/);
  const disabled = renderToStaticMarkup(React.createElement(LivingLink, { href: "/notes", disabled: true }, "Read notes"));
  assert.doesNotMatch(disabled, /href=/);
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(disabled, /tabindex="-1"/);
});
