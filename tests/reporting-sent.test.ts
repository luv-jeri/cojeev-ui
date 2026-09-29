import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, mergeSent, pullLegacyReceipts, SENT_LIMIT, type SentEntry } from "../lib/reporting/draft";
import { sentStatusWord } from "../lib/reporting/receipt-labels";
import type { Receipt } from "../lib/reporting/contracts";

const receipt = (id: string, attachments: Receipt["attachments"] = [], extra: Partial<Receipt> = {}): Receipt =>
  ({ id, token: "t".repeat(64), status: "received", topicId: null, email: "pending", issue: "pending", attachments, ...extra });
const entry = (n: number, sentAt = n, title = `Report ${n}`): SentEntry => ({ kind: "bug", title, sentAt, receipt: receipt(`id-${n}`) });

test("sent_list_keeps_the_newest_50", () => {
  const many = Array.from({ length: SENT_LIMIT + 1 }, (_, n) => entry(n));
  const merged = mergeSent([], many);
  assert.equal(merged.length, SENT_LIMIT);
  assert.equal(merged[0].sentAt, SENT_LIMIT);
  assert.ok(!merged.some(item => item.sentAt === 0), "the oldest entry drops off");
  // A duplicate keeps its title and date and takes the new receipt, without adding a row.
  const again = mergeSent(merged, [{ ...entry(7, 999, "Renamed"), receipt: receipt("id-7", [], { status: "planned" }) }]);
  assert.equal(again.length, SENT_LIMIT);
  const seven = again.find(item => item.receipt.id === "id-7")!;
  assert.deepEqual([seven.title, seven.sentAt, seven.receipt.status], ["Report 7", 7, "planned"]);
  // Ties keep a stable order and never lose a row.
  const tied = mergeSent([], [entry(1, 5), entry(2, 5), entry(3, 5)]);
  assert.deepEqual(tied.map(item => item.receipt.id), ["id-1", "id-2", "id-3"]);
  assert.equal(mergeSent([entry(1)], []).length, 1);
});

test("legacy_receipt_moves_into_the_list", () => {
  const request = { ...emptyDraft(), kind: "request" as const, title: "Old title", receipt: receipt("r1", [{ id: "a", state: "uploaded" }]), frozen: { token: "k", report: { title: "Frozen title" } } as never };
  const bug = { ...emptyDraft(), kind: "bug" as const, title: "", receipt: receipt("r2", [{ id: "b", state: "expired" }]) };
  const both = pullLegacyReceipts({ activeKind: "request", drafts: { request, bug } }, 1234);
  assert.deepEqual(both.entries.map(item => [item.kind, item.title, item.sentAt, item.receipt.id]), [["request", "Frozen title", 1234, "r1"], ["bug", "Imported report", 1234, "r2"]]);
  assert.deepEqual(both.workspace.drafts, { request: { ...emptyDraft(), kind: "request" }, bug: { ...emptyDraft(), kind: "bug" } });
  const other = { ...emptyDraft(), kind: "bug" as const, title: "Half typed", email: "a@b.co" };
  const one = pullLegacyReceipts({ activeKind: "bug", drafts: { request, bug: other } }, 1);
  assert.equal(one.entries.length, 1);
  assert.equal(one.workspace.drafts.bug, other, "the other tab is untouched");
  assert.equal(one.workspace.activeKind, "bug");
});

test("legacy_receipt_with_unfinished_uploads_stays_put", () => {
  const pending = { ...emptyDraft(), kind: "request" as const, receipt: receipt("r3", [{ id: "a", state: "uploaded" }, { id: "b", state: "pending" }]) };
  const workspace = { activeKind: "request" as const, drafts: { request: pending } };
  const result = pullLegacyReceipts(workspace, 1);
  assert.deepEqual(result.entries, []);
  assert.equal(result.workspace.drafts.request, pending);
});

test("sentStatusWord names the issue, else the status", () => {
  assert.equal(sentStatusWord("bug", receipt("a", [], { issueNumber: 412 })), "Tracked as #412");
  assert.equal(sentStatusWord("bug", receipt("a", [], { status: "resolved" })), "Resolved");
  assert.equal(sentStatusWord("request", receipt("a", [], { status: "resolved" })), "Live");
  assert.equal(sentStatusWord("request", receipt("a")), "Received");
});
