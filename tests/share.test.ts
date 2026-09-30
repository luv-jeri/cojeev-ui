import { test } from "node:test";
import assert from "node:assert/strict";
import { copyText, shareLink, shareOrCopy, type ShareDeps } from "../lib/share";

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

for (const succeeds of [true, false]) {
  test(`clipboard fallback restores focus, selections and scroll after ${succeeds ? "success" : "failure"}`, async () => {
    // A small DOM double models the browser's selection/focus side effects.
    const originalRange = { cloneRange: () => originalRange };
    let ranges = [originalRange];
    const input = {
      tagName: "INPUT", isConnected: true,
      selectionStart: 2, selectionEnd: 5, selectionDirection: "backward",
      focus: () => { document.activeElement = input; },
      setSelectionRange: (start: number, end: number, direction: string) => {
        input.selectionStart = start;
        input.selectionEnd = end;
        input.selectionDirection = direction;
      },
    };
    const selection = {
      get rangeCount() { return ranges.length; },
      getRangeAt: (i: number) => ranges[i],
      removeAllRanges: () => { ranges = []; },
      addRange: (range: typeof originalRange) => {
        ranges.push(range);
        input.setSelectionRange(0, 0, "none");
      },
    };
    let attached = false;
    const parent = { append: () => { attached = true; } };
    const textarea = {
      value: "", style: { cssText: "" },
      setAttribute: () => {},
      focus: () => { document.activeElement = textarea; },
      select: () => { ranges = []; },
      setSelectionRange: () => {},
      remove: () => { attached = false; },
    };
    const view = {
      navigator: { clipboard: { writeText: async () => { throw new Error("denied"); } } },
      scrollX: 23, scrollY: 145,
      scrollTo: (x: number, y: number) => { view.scrollX = x; view.scrollY = y; },
    };
    const document = {
      activeElement: input as typeof input | typeof textarea,
      getSelection: () => selection,
      defaultView: view,
      createElement: () => textarea,
      body: { append: () => { throw new Error("Fallback escaped the trigger scope"); } },
      execCommand: (command: string) => {
        assert.equal(command, "copy");
        assert.equal(textarea.value, "https://x.test/?utm_medium=share");
        assert.equal(attached, true);
        assert.equal(document.activeElement, textarea);
        view.scrollTo(0, 0);
        if (!succeeds) throw new Error("Copy denied");
        return true;
      },
    };
    const trigger = { ownerDocument: document, parentElement: parent } as unknown as HTMLButtonElement;
    assert.equal(await copyText("https://x.test/?utm_medium=share", trigger), succeeds);
    assert.equal(attached, false);
    assert.equal(document.activeElement, input);
    assert.deepEqual(ranges, [originalRange]);
    assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [2, 5, "backward"]);
    assert.deepEqual([view.scrollX, view.scrollY], [23, 145]);
  });
}
