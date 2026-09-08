import assert from "node:assert/strict";
import test from "node:test";
import { canEditRejectedSubmission, manifestFiles, receiptSecret, ReportingError } from "../lib/reporting/client";
import { LIMITS } from "../lib/reporting/contracts";
import { captureDimensions } from "../lib/reporting/capture";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
test("attachment manifest hashes original bytes and preserves retry identity", async () => {
  const file = new File([png], "reference.png", { type: "image/png" });
  const files = [{ id: crypto.randomUUID(), file }];
  const first = await manifestFiles(files), second = await manifestFiles(files);
  assert.deepEqual(first, second); assert.equal(first[0].id, files[0].id); assert.match(first[0].sha256, /^[a-f0-9]{64}$/);
  const different = await manifestFiles([{ ...files[0], file: new File([png, new Uint8Array([1])], "reference.png", { type: "image/png" }) }]);
  assert.notEqual(first[0].sha256, different[0].sha256);
});
test("attachment intake refuses disguised files and count/total limits", async () => {
  await assert.rejects(manifestFiles([{ id: crypto.randomUUID(), file: new File(["<svg>"], "fake.png", { type: "image/png" }) }]), /does not match/);
  await assert.rejects(manifestFiles(Array.from({ length: LIMITS.files + 1 }, () => ({ id: crypto.randomUUID(), file: new File([png], "x.png", { type: "image/png" }) }))), /six/);
  await assert.rejects(manifestFiles(Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), file: new File([new Uint8Array(8 * 1024 * 1024)], "x.png", { type: "image/png" }) }))), /30 MiB/);
});
test("receipt secrets are independent 256-bit random values", () => {
  const first = receiptSecret(), second = receiptSecret(); assert.match(first, /^[a-f0-9]{64}$/); assert.notEqual(first, second);
});
test("first definite validation failures remain editable while uncertain retries stay frozen", () => {
  assert.equal(canEditRejectedSubmission(new ReportingError("Invalid public title", 422), false), true);
  assert.equal(canEditRejectedSubmission(new ReportingError("Invalid public title", 422), true), false);
  for (const status of [0, 408, 409, 500, 502, 503]) assert.equal(canEditRejectedSubmission(new ReportingError("Uncertain", status), false), false);
});
test("viewport capture does not inherit full-page height limits", () => {
  assert.deepEqual(captureDimensions("viewport", 1440, 45000, 900), { width: 1440, height: 900 });
  assert.throws(() => captureDimensions("page", 1440, 45000, 900), /too large/);
});
