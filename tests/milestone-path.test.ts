import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { elapsedOf, elapsedParts, planTravel } from "../registry/cojeev/lib/milestone-travel";
import { MilestonePath, type Milestone } from "../registry/cojeev/ui/milestone-path";

const noop = () => {};

test("durations count active time, freeze when done or waiting, and never guess", () => {
  const running = { kind: "running", startedAt: 1_000, elapsedMs: 5_000 } as const;
  assert.equal(elapsedOf(running, "current", 61_000), 65_000);
  assert.equal(elapsedOf(running, "current", null), undefined, "no client sample yet");
  assert.equal(elapsedOf(running, "current", 0), 5_000, "clock skew never counts backwards");
  assert.equal(elapsedOf({ kind: "frozen", elapsedMs: 42_000 }, "needs", 99_000), 42_000);
  assert.equal(elapsedOf({ kind: "frozen", elapsedMs: 42_000 }, "complete", null), 42_000);
  assert.equal(elapsedOf(running, "complete", 9), null, "a finished step cannot keep running");
  assert.equal(elapsedOf({ kind: "frozen", elapsedMs: 1 }, "current", 9), null);
  assert.equal(elapsedOf({ kind: "frozen", elapsedMs: 1 }, "upcoming", 9), null);
  assert.equal(elapsedOf({ kind: "frozen", elapsedMs: -1 }, "complete", 9), null);
  assert.equal(elapsedOf({ kind: "running", startedAt: Number.NaN }, "current", 9), null);
  assert.deepEqual(elapsedParts(65_400), ["1", "05"]);
  assert.deepEqual(elapsedParts(3_725_000), ["1", "02", "05"]);
  assert.deepEqual(elapsedParts(0), ["0", "00"]);
});

test("only a stable-id handoff travels; everything else re-anchors", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(planTravel(ids, ids, ["complete", "current", "upcoming"], 0, false), { kind: "handoff", from: 0, to: 1 });
  assert.deepEqual(planTravel(ids, ids, ["complete", "complete", "current"], 0, false), { kind: "handoff", from: 0, to: 2 }, "a skipped step is passed, not jumped");
  assert.deepEqual(planTravel(ids, ids, ["complete", "complete", "complete"], 2, false), { kind: "finish", at: 2 });
  assert.deepEqual(planTravel(ids, ids, ["complete", "needs", "upcoming"], 1, false), { kind: "recoil", at: 1 });
  assert.deepEqual(planTravel(ids, ids, ["complete", "current", "upcoming"], 1, true), { kind: "retry", at: 1 });
  assert.deepEqual(planTravel(ids, ids, ["complete", "current", "upcoming"], 1, false), { kind: "none" });
  assert.deepEqual(planTravel(ids, ["b", "a", "c"], ["complete", "current", "upcoming"], 0, false), { kind: "anchor" }, "reorder");
  assert.deepEqual(planTravel(ids, ids, ["current", "upcoming", "upcoming"], 1, false), { kind: "anchor" }, "moving backwards");
  assert.deepEqual(planTravel(ids, ids, ["upcoming", "upcoming", "upcoming"], -1, false), { kind: "none" });
});

test("server render: needs carries its action, running time waits for the client, upcoming has none", () => {
  const items: Milestone[] = [
    { id: "a", title: "Plan", state: "complete", duration: { kind: "frozen", elapsedMs: 65_000 }, details: "Two notes" },
    { id: "b", title: "Build", state: "needs", action: { label: "Try again", onAction: noop }, duration: { kind: "frozen", elapsedMs: 3_725_000 } },
    { id: "c", title: "Ship", state: "current", duration: { kind: "running", startedAt: 0 }, steps: [
      { id: "c1", title: "Pack", state: "complete" },
      { id: "c2", title: "Send", state: "current" },
    ] },
    { id: "d", title: "Rest", state: "upcoming" },
  ];
  const $ = load(renderToStaticMarkup(createElement(MilestonePath, { items })));
  const row = (id: string) => $(`[data-milestone-id="${id}"]`);
  assert.equal(row("a").find(".v-milestone-path__duration").text(), "Elapsed time 1:05");
  const summary = row("a").find("details summary");
  assert.equal(summary.text(), "Details");
  const names = String(summary.attr("aria-labelledby")).split(" ").map((ref) => $(`[id="${ref}"]`).text());
  assert.deepEqual(names, ["Details", "Plan"], "named Details plus the title, without a second copy of the title");
  assert.equal(row("b").find(".v-milestone-path__status").text(), "Needs one action");
  assert.equal(row("b").find("button.v-milestone-path__action").text(), "Try again");
  assert.equal(row("b").find(".v-milestone-path__duration").first().text(), "Elapsed time 1:02:05");
  assert.equal(row("c").find(".v-milestone-path__duration").first().text(), "Elapsed time —");
  assert.equal(row("d").find(".v-milestone-path__duration").length, 0);
  // each list marks only its own active item
  assert.deepEqual($('[aria-current="step"]').map((_, el) => $(el).attr("data-milestone-id")).get(), ["b", "c", "c2"]);
  assert.equal($(".v-milestone-path__marker").not('[aria-hidden="true"]').length, 0);
  assert.equal($(".v-milestone-path__connection").not('[aria-hidden="true"]').length, 0);
  assert.equal($(".v-milestone-path__organism[aria-hidden=true]").length, 2, "one decorative layer per list");
});

test("needs without an action is rejected before its row renders", () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args.join(" "));
  try {
    const items = [
      { id: "ok", title: "Fine", state: "current" },
      { id: "bad", title: "Broken", state: "needs" },
    ] as unknown as Milestone[];
    const $ = load(renderToStaticMarkup(createElement(MilestonePath, { items })));
    assert.equal($('[data-milestone-id="bad"]').length, 0);
    assert.equal($('[data-milestone-id="ok"]').length, 1);
    assert.match(String(errors[0]), /"bad"/);
  } finally {
    console.error = original;
  }
  // @ts-expect-error needs requires an action
  const missing: Milestone = { id: "x", title: "X", state: "needs" };
  // @ts-expect-error a finished step cannot carry a running duration
  const running: Milestone = { id: "y", title: "Y", state: "complete", duration: { kind: "running", startedAt: 0 } };
  void missing;
  void running;
});
