import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReport, redact, safeRoute, matchesMedia, findComponents } from "../lib/reporting/contracts";

const valid = () => ({ id: "c0994f8a-24c3-4f09-83cc-a6ecb14cc033", kind: "bug", title: "Button disappears", description: "Switch to dark mode and click the menu.", email: "a@example.com", references: [], pins: [], attachments: [], diagnostics: null });
test("ui_diagnostics_preserve_only_safe_public_routes", () => {
  const cases = [
    ["https://cojeev.com/ui/docs/button/?t=1#x", "/ui/docs/button/"],
    ["https://cojeev.com/ui/requests/?t=1#x", "/ui/requests/"],
    ["https://cojeev.com/ui/?t=1#x", "/ui/"],
    ["https://beta.000h.cojeev.com/ui/docs/date-picker/", "/ui/docs/date-picker/"],
    ["/ui/feedback-admin/?report=1", "/:segment/:segment/"],
    ["/ui/track/#abc", "/:segment/:segment/"],
    ["/ui/workspace/x", "/:segment/:segment/:segment"],
    ["/ui/docs/button/private/", "/:segment/:segment/:segment/:segment/"],
    ["/uikit/docs/button/", "/:segment/:segment/:segment/"],
    ["/ui-other/requests/", "/:segment/:segment/"],
    ["/cojeev-ui/", "/cojeev-ui/"],
    ["/cojeev-ui/docs/button/?t=1#x", "/cojeev-ui/docs/button/"],
    ["/cojeev-ui/requests/", "/cojeev-ui/requests/"],
  ];
  for (const [source, expected] of cases) {
    const url = new URL(source, "https://cojeev.com").href;
    assert.equal(safeRoute(source), expected, source);
    assert.equal(redact(url), expected, `redacted diagnostics: ${source}`);
    const diagnostics = validateReport({ ...valid(), diagnostics: { environment: { page: url } } }).diagnostics;
    assert.equal(diagnostics?.environment?.page, expected, `validated diagnostics: ${source}`);
  }
});
test("accepts a bounded report, preserves intentional prose, requires email", () => {
  assert.equal(validateReport(valid()).description, valid().description);
  assert.throws(() => validateReport({ ...valid(), email: "" }), /email/i);
  assert.throws(() => validateReport({ ...valid(), description: "x".repeat(6001) }), /6000/);
});
test("rejects unexpected technical keys, executable references and unsafe pin selectors", () => {
  assert.throws(() => validateReport({ ...valid(), references: ["javascript:alert(1)"] }), /reference/i);
  assert.throws(() => validateReport({ ...valid(), diagnostics: { cookies: "secret" } }), /diagnostic/i);
  assert.throws(() => validateReport({ ...valid(), pins: [{ path: "#sensitive-email", tag: "input", x: 2, y: 3 }] }), /pin/i);
});
test("redacts credential and personal patterns and strips dynamic route values", () => {
  const text = redact("Bearer abcdef123456 email=user@example.com token=abc123 https://site.test/api/person/alice?key=secret");
  assert.ok(!text.includes("abcdef123456") && !text.includes("user@example.com") && !text.includes("abc123"));
  assert.equal(safeRoute("https://site.test/api/person/alice?key=secret"), "/:segment/:segment/:segment");
  assert.equal(safeRoute("https://site.test/cojeev-ui/docs/button/?token=x"), "/cojeev-ui/docs/button/");
});
test("package versions survive the email scrub; wrapped addresses do not", () => {
  for (const v of ["react@18.2.0", "next@15.1.0", "@radix-ui/react-dialog@1.1.2"]) assert.equal(redact(v), v);
  assert.ok(!redact("_john.smith@gmail.com_").includes("john"));
  assert.equal(redact("(jane@x.io)"), "([email])");
  assert.equal(validateReport({ ...valid(), title: "Support react@19.1.0 in the date picker" }).title, "Support react@19.1.0 in the date picker");
});
test("redacts quoted JSON credentials and secrets containing spaces", () => {
  const source = String.raw`{"password":"private phrase","api_key":"private-key","cookie":"session=private-cookie","secret":"escaped\"private-value"} token='private token'`;
  const result = redact(source);
  for (const secret of ["private phrase", "private-key", "private-cookie", "private-value", "private token"]) assert.ok(!result.includes(secret), secret);
  const report = validateReport({ ...valid(), diagnostics: { console: [{ at: "2026-09-09", kind: "log", message: source }] } });
  assert.equal(report.diagnostics?.console?.[0].message, result);
});
test("verifies media magic bytes rather than trusting extension", () => {
  assert.equal(matchesMedia(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png"), true);
  assert.equal(matchesMedia(new TextEncoder().encode("<svg>bad</svg>"), "image/png"), false);
});
test("component matching uses names and titles without matching all stop words", () => {
  const entries = [{ name: "date-picker", title: "Date picker", description: "Choose a date" }, { name: "button", title: "Button", description: "Press an action" }];
  assert.equal(findComponents("I want a date picker", entries)[0]?.name, "date-picker");
  assert.deepEqual(findComponents("I want a", entries), []);
});

test("redact keeps its 1000-character default for existing callers", () => {
  assert.equal(redact("x".repeat(5000)).length, 1000);
  assert.equal(redact("x".repeat(5000), 20000).length, 5000);
});
