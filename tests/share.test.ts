import { test } from "node:test";
import assert from "node:assert/strict";
import { shareLink, shareOrCopy, type ShareDeps } from "../lib/share";

const url = "https://x.test/docs/button/?utm_medium=share";
function deps(over: Partial<ShareDeps> = {}) {
  const calls = { share: 0, copy: 0 };
  const value = {
    share: async () => { calls.share++; },
    copy: async () => { calls.copy++; return true; },
    ...over,
  };
  return { value, calls };
}
const abort = () => Object.assign(new Error("cancelled"), { name: "AbortError" });

test("share link drops query and hash and adds utm_medium=share", () => {
  assert.equal(shareLink(new URL("https://x.test/docs/button/?private=drop#section")), url);
});

test("uses the share sheet when available and does not copy", async () => {
  const { value, calls } = deps();
  let shared;
  value.share = async (data) => { calls.share++; shared = data; };
  assert.equal(await shareOrCopy(value, url, "T"), "shared");
  assert.deepEqual(calls, { share: 1, copy: 0 });
  assert.deepEqual(shared, { title: "T", url });
});

test("canShare false skips the sheet and copies the clean link", async () => {
  let copied;
  let checked;
  const { value, calls } = deps({
    canShare: (data) => { checked = data; return false; },
    copy: async (text) => { copied = text; return true; },
  });
  assert.equal(await shareOrCopy(value, url, "T"), "copied");
  assert.equal(calls.share, 0);
  assert.deepEqual(checked, { url });
  assert.equal(copied, url);
});

test("a capability check error falls back to copy", async () => {
  const { value, calls } = deps({ canShare: () => { throw new Error("unavailable"); } });
  assert.equal(await shareOrCopy(value, url, "T"), "copied");
  assert.deepEqual(calls, { share: 0, copy: 1 });
});

test("falls back to copy when share is missing", async () => {
  const { value, calls } = deps({ share: undefined });
  assert.equal(await shareOrCopy(value, url, "T"), "copied");
  assert.equal(calls.copy, 1);
});

test("cancel (AbortError) does not copy and returns cancelled", async () => {
  const { value, calls } = deps({ share: async () => { throw abort(); } });
  assert.equal(await shareOrCopy(value, url, "T"), "cancelled");
  assert.equal(calls.copy, 0);
});

test("a non-abort share error falls back to copy", async () => {
  const { value, calls } = deps({ share: async () => { throw new Error("boom"); } });
  assert.equal(await shareOrCopy(value, url, "T"), "copied");
  assert.equal(calls.copy, 1);
});

test("copy failure returns failed", async () => {
  assert.equal(await shareOrCopy(deps({ share: undefined, copy: async () => false }).value, url, "T"), "failed");
  assert.equal(await shareOrCopy(deps({ share: undefined, copy: async () => { throw new Error("x"); } }).value, url, "T"), "failed");
});
