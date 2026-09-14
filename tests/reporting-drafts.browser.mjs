import assert from "node:assert/strict";
import { chromium } from "playwright";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: 'export * from "./lib/reporting/draft";', resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", globalName: "draftStore", platform: "browser" });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route("http://drafts.test/", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Draft storage test</title>" }));
  await page.goto("http://drafts.test/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  assert(await page.evaluate(() => typeof draftStore.loadDraftWorkspace === "function"), "Workspace storage exposes independent draft loading");
  const result = await page.evaluate(async () => {
    const legacy = { ...draftStore.emptyDraft(), kind: "bug", title: "Legacy bug", attempted: true, frozen: { token: "private-retry-key", report: { id: "existing-report" } }, files: [{ id: "attachment", file: new File(["original"], "evidence.txt", { type: "text/plain" }) }] };
    await draftStore.saveDraft(legacy);
    const migrated = await draftStore.loadDraftWorkspace();
    const workspace = { ...migrated, activeKind: "request", drafts: { ...migrated.drafts, request: { ...draftStore.emptyDraft(), title: "New request" } } };
    await draftStore.saveDraftWorkspace(workspace);
    const restored = await draftStore.loadDraftWorkspace();
    const old = await draftStore.loadDraft();
    await draftStore.saveDraftWorkspace({ ...restored, drafts: { ...restored.drafts, request: draftStore.emptyDraft() } });
    const cleared = await draftStore.loadDraftWorkspace();
    return { active: migrated.activeKind, title: restored.drafts.request.title, bugTitle: restored.drafts.bug.title, token: restored.drafts.bug.frozen.token, attempted: restored.drafts.bug.attempted, file: await restored.drafts.bug.files[0].file.text(), old, clearedRequest: cleared.drafts.request.title, retainedBug: cleared.drafts.bug.title };
  });
  assert.deepEqual(result, { active: "bug", title: "New request", bugTitle: "Legacy bug", token: "private-retry-key", attempted: true, file: "original", old: null, clearedRequest: "", retainedBug: "Legacy bug" });
  console.log("PASS: legacy draft migration retains files/retry key; workspace saves and clears each kind independently.");
} finally { await browser.close(); }
