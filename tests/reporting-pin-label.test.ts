import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReport } from "../lib/reporting/contracts";
import { capLabelText, kindFromTag, pinAnnouncement, pinChipText, submittedPins, type DraftPin } from "../lib/reporting/pin-label";

test("submittedPins drops the label and keeps path, tag, x and y", () => {
  const drafts: DraftPin[] = [
    { path: "main > p:nth-of-type(2)", tag: "p", x: 0.25, y: 0.5, label: "Paragraph “Hello”" },
    { path: "main > button", tag: "button", x: 0.1, y: 0.9 },
  ];
  const sent = submittedPins(drafts);
  assert.deepEqual(sent.map(pin => Object.keys(pin)), [["path", "tag", "x", "y"], ["path", "tag", "x", "y"]]);
  assert.deepEqual(sent.map(pin => pin.path), drafts.map(pin => pin.path));
  const report = validateReport({ id: "c0994f8a-24c3-4f09-83cc-a6ecb14cc033", kind: "bug", title: "Menu closes early", description: "Open the menu and click.", email: "a@example.com", references: [], pins: sent, attachments: [], diagnostics: null });
  assert.equal(report.pins.length, 2);
});

test("kindFromTag maps every row of the table and falls back to Element", () => {
  const table: Record<string, string[]> = {
    Button: ["button"], Link: ["a"], Heading: ["h1", "h2", "h3", "h4", "h5", "h6"], Paragraph: ["p"],
    Image: ["img", "picture", "svg"], "List item": ["li"], Input: ["input", "textarea", "select"],
    Section: ["section", "article", "main", "aside", "nav", "header", "footer"], Code: ["pre", "code"],
    Table: ["table", "thead", "tbody", "tr", "td", "th"],
  };
  for (const [kind, tags] of Object.entries(table)) for (const tag of tags) assert.equal(kindFromTag(tag), kind, tag);
  assert.equal(kindFromTag("div", "button"), "Button");
  assert.equal(kindFromTag("div"), "Element");
  assert.equal(kindFromTag("span", null), "Element");
});

test("pinChipText uses the label, else the kind word", () => {
  assert.equal(pinChipText({ path: "a", tag: "p", x: 0, y: 0, label: "Paragraph “Hi”" }, 3), "3 · Paragraph “Hi”");
  assert.equal(pinChipText({ path: "a", tag: "h2", x: 0, y: 0 }, 1), "1 · Heading");
});

test("capLabelText is at most 60 characters plus an ellipsis", () => {
  assert.equal(capLabelText("  a \n b  "), "a b");
  assert.equal(capLabelText("x".repeat(60)), "x".repeat(60));
  assert.equal(capLabelText("y".repeat(100)), `${"y".repeat(60)}…`);
  assert.equal(capLabelText(`${"z".repeat(59)} tail`), `${"z".repeat(59)}…`);
  assert.equal(capLabelText("   "), "");
});

test("pinAnnouncement words", () => {
  const pin = { path: "a", tag: "p", x: 0, y: 0, label: "Paragraph “Hi”" };
  assert.equal(pinAnnouncement("pinned", 3, pin), "Pinned 3 · Paragraph “Hi”");
  assert.equal(pinAnnouncement("pinned", 1, { path: "a", tag: "h2", x: 0, y: 0 }), "Pinned 1 · Heading");
  assert.equal(pinAnnouncement("removed", 2), "Removed pin 2");
});
