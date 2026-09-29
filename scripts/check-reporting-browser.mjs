import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.REPORTING_BROWSER_URL ?? "http://localhost:3100/cojeev-ui";
const api = process.env.REPORTING_BROWSER_API ?? "http://localhost:8787";
const output = process.env.REPORTING_BROWSER_OUTPUT ?? ".work/reporting/browser";
const config = await fetch(`${api}/v1/config`).then(response => response.json());
assert.equal(config.local, true, "Browser writes are allowed only against an explicitly local reporting service.");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(api).hostname), "Use a loopback reporting API.");
await mkdir(output, { recursive: true });
const adminToken = (await readFile(process.env.REPORTING_ADMIN_TOKEN_FILE ?? ".work/reporting/local-admin-token", "utf8")).trim();
const browser = await chromium.launch({ headless: true });
const failures = [], results = [], pageErrors = [], hydrationErrors = [];
let activePage;
const run = Date.now().toString(36);
const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf3sAAAAASUVORK5CYII=", "base64");
const screenshot = async (page, name) => { if (await page.locator(".report-launcher").count()) await page.waitForFunction(() => document.querySelector(".report-launcher")?.disabled === false); await page.screenshot({ path: `${output}/${name}.png`, fullPage: false, caret: "initial" }); };
const panel = page => page.getByRole("dialog", { name: "Request a feature or report a bug", exact: true });
const open = async page => { await page.getByRole("button", { name: "Request a feature / Report a bug" }).click(); await panel(page).waitFor(); await page.getByRole("button", { name: "More", exact: true }).waitFor(); };
const fill = async (page, kind, title) => {
  const kindTab = panel(page).getByRole("tab", { name: kind === "bug" ? "Report a bug" : "Request a feature", exact: true });
  await kindTab.click();
  assert.equal(await kindTab.getAttribute("aria-selected"), "true");
  await page.getByRole("textbox", { name: kind === "bug" ? "Short summary" : "What component do you want?", exact: true }).fill(title);
  await page.getByRole("textbox", { name: kind === "bug" ? "What happened?" : "How would you use it?", exact: true }).fill("Local browser verification. Reference: https://example.com/reference");
  await page.getByRole("textbox", { name: "Your email", exact: true }).fill(`browser-${run}@example.com`);
};
// A send now ends on the fresh form with a banner; only a send with files still uploading shows the receipt heading.
const accepted = async page => page.getByRole("heading", { name: /Your (request|report) is received/ }).or(page.locator(".report-sent-banner")).first().waitFor();
const sentBanner = (page, kind) => page.locator(".report-sent-banner").filter({ hasText: kind === "bug" ? "Report sent. Check your inbox for a receipt." : "Request sent. Check your inbox for a receipt." });
const sentToggle = page => page.getByRole("button", { name: /^Sent from this browser · \d+$/ });
const sentCount = async page => (await sentToggle(page).count()) ? Number((await sentToggle(page).innerText()).match(/(\d+)\s*$/)[1]) : 0;
const expandSent = async page => { if ((await sentToggle(page).getAttribute("aria-expanded")) !== "true") await sentToggle(page).click(); };
const sentRow = (page, title) => page.locator(".report-sent-row", { hasText: title });
const openSentRow = async (page, title) => { await expandSent(page); const row = sentRow(page, title); if ((await row.getAttribute("aria-expanded")) !== "true") await row.click(); await page.locator(".report-sent-detail").waitFor(); };
// Reads what is stored on this device, as plain facts: which tabs hold a receipt or files, and which reports the list holds.
const stored = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open("cojeev-reporting-v1", 1);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const store = open.result.transaction("drafts").objectStore("drafts"), workspace = store.get("workspace"), sent = store.get("sent");
    sent.onsuccess = () => {
      const drafts = workspace.result?.drafts ?? {}, tab = kind => ({ title: drafts[kind]?.title ?? "", files: drafts[kind]?.files?.length ?? 0, receipt: drafts[kind]?.receipt?.id ?? null });
      resolve({ request: tab("request"), bug: tab("bug"), sent: (sent.result ?? []).map(entry => entry.receipt.id), titles: (sent.result ?? []).map(entry => entry.title) });
      open.result.close();
    };
  };
}));
const seedStore = (page, values) => page.evaluate(entries => new Promise((resolve, reject) => {
  const open = indexedDB.open("cojeev-reporting-v1", 1);
  open.onupgradeneeded = () => open.result.createObjectStore("drafts");
  open.onerror = () => reject(open.error);
  open.onsuccess = () => { const tx = open.result.transaction("drafts", "readwrite"); for (const [key, value] of Object.entries(entries)) tx.objectStore("drafts").put(value, key); tx.oncomplete = () => { open.result.close(); resolve(); }; };
}), values);
const assertFits = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && Array.from(document.querySelectorAll(".report-sheet")).every(node => node.scrollWidth <= node.clientWidth + 1)), "No page or panel horizontal overflow");
const localOnly = context => context.route(/^https?:\/\//, route => {
  const url = new URL(route.request().url());
  return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.abort();
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  await localOnly(context);
  await context.route(`${api}/v1/config`, async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...(await response.json()), emailEnabled: true } }); });
  const page = await context.newPage(); activePage = page; page.on("pageerror", error => pageErrors.push(error.message)); page.on("console", entry => { if (entry.type() === "error" && /hydrat/i.test(entry.text())) hydrationErrors.push(entry.text()); });
  await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(page);
  {
    const more = page.getByRole("button", { name: "More", exact: true });
    const sendTop = () => page.getByRole("button", { name: /^Review (request|report)$/ }).evaluate(node => node.getBoundingClientRect().top);
    const before = await sendTop();
    await page.getByRole("textbox", { name: /^(What component do you want\?|Short summary)$/ }).fill(`Footer ${run}`);
    await panel(page).getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    assert.equal(await sendTop(), before, "The Send row does not move when a status message appears");
    await more.focus(); await page.keyboard.press("Enter");
    assert.deepEqual(await page.getByRole("menuitem").allInnerTexts(), ["Clear draft", "Request board", "Open a saved receipt"]);
    await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "menuitem");
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "More");
    await panel(page).waitFor({ state: "visible" });
    results.push("More opens by keyboard with Clear draft, Request board and Open a saved receipt; Escape closes only the menu; the footer does not jump");
    await panel(page).getByRole("textbox", { name: /^(What component do you want\?|Short summary)$/ }).fill("");
  }
  for (const [tab, text] of [["Request a feature", "We aim to build requests within 36 hours"], ["Report a bug", "Adds device info, recent errors, failed routes and clicks."]]) {
    await panel(page).getByRole("tab", { name: tab, exact: true }).click();
    const info = page.getByRole("button", { name: "How this works", exact: true }), pop = page.getByRole("dialog", { name: "How this works", exact: true });
    await info.focus(); await page.keyboard.press("Enter"); await pop.waitFor();
    assert.ok((await pop.innerText()).includes("PNG, JPEG, WebP, MP4 or WebM. Up to 6 files, 10 MB each, 30 MB total. Screenshots are taken only when you ask, and you check each one first."));
    assert.ok((await pop.innerText()).includes(text));
    assert.ok(await pop.evaluate(node => node.contains(document.activeElement)), "Focus moves into the popover");
    await page.keyboard.press("Escape"); await pop.waitFor({ state: "hidden" });
    await info.evaluate(node => new Promise(resolve => { const end = Date.now() + 2000; (function poll() { if (node === document.activeElement || Date.now() > end) resolve(); else setTimeout(poll, 25); })(); }));
    assert.ok(await info.evaluate(node => node === document.activeElement), "Focus returns to How this works");
    assert.ok(await panel(page).isVisible(), "Escape closes only the popover");
  }
  results.push("The info popover opens by keyboard, holds focus, and Escape closes only it and returns focus to How this works");
  for (const [tab, fields] of [["Request a feature", [["What component do you want?", "e.g. A date range picker"], ["How would you use it?", "Who needs it and why. Links welcome."], ["Your email", "you@example.com"]]], ["Report a bug", [["Short summary", "e.g. The menu closes before I can choose"], ["What happened?", "What you did, what you expected, what you saw."], ["Your email", "you@example.com"]]]]) {
    await panel(page).getByRole("tab", { name: tab, exact: true }).click();
    for (const [label, placeholder] of fields) assert.equal(await panel(page).getByLabel(label, { exact: true }).getAttribute("placeholder"), placeholder, `${tab}: ${label}`);
  }
  results.push("Both tabs show the new labels and placeholders");
  for (const tab of ["Request a feature", "Report a bug"]) {
    await panel(page).getByRole("tab", { name: tab, exact: true }).click();
    await panel(page).locator("#email-help").getByText("Private. Used only for updates.", { exact: true }).waitFor();
    assert.equal((await panel(page).locator("#email-help").innerText()).trim(), "Private. Used only for updates.");
    assert.ok(!(await panel(page).innerText()).includes("not connected"), "The stale email notice is gone");
  }
  results.push("Email hint reads Private. Used only for updates. on both tabs when email is on, and the stale notice is gone");
  await panel(page).getByRole("tab", { name: "Request a feature", exact: true }).click();
  await page.evaluate(() => {
    const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf3sAAAAASUVORK5CYII="), c => c.charCodeAt(0))], "dropped.png", { type: "image/png" }));
    window.__dropTransfer = transfer;
    document.querySelector('.report-sheet input[name="email"]').dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await panel(page).getByText("Drop files to attach", { exact: true }).waitFor({ state: "visible" });
  await screenshot(page, "drop-overlay-desktop");
  await page.evaluate(() => document.querySelector('.report-sheet input[name="email"]').dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: window.__dropTransfer })));
  await panel(page).getByAltText("Attachment preview: dropped.png").waitFor();
  await panel(page).getByRole("button", { name: "Remove dropped.png", exact: true }).click();
  await panel(page).getByAltText("Attachment preview: dropped.png").waitFor({ state: "detached" });
  const textDrag = await page.evaluate(() => {
    const transfer = new DataTransfer(); transfer.setData("text/plain", "just text");
    const event = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer });
    document.querySelector('.report-sheet input[name="email"]').dispatchEvent(event);
    return { prevented: event.defaultPrevented, overlay: !!document.querySelector(".report-drop-overlay") };
  });
  assert.deepEqual(textDrag, { prevented: false, overlay: false }, "A text drag is neither cancelled nor shown as a file drop");
  results.push("Dropping a file anywhere on the form shows Drop files to attach and attaches it");
  {
    let lookups = 0;
    const topicBody = { requests: [
      { id: "5d9f3a1e-0000-4000-8000-000000000001", title: "Calendar range", status: "received", componentUrl: null, createdAt: 1790000000000, updatedAt: 1790000000000, demand: 12, approved: true },
      { id: "a7698a7b-0000-4000-8000-000000000002", title: "Component request a7698a7b", status: "received", componentUrl: null, createdAt: 1790000000000, updatedAt: 1790000000000, demand: 1, approved: false }
    ], hasMore: false };
    await context.route(`${api}/v1/requests?**`, async route => { lookups += 1; await route.fulfill({ json: topicBody }); });
    const titleBox = page.getByRole("textbox", { name: "What component do you want?", exact: true });
    await titleBox.fill("");
    await titleBox.fill("Ca"); await page.waitForTimeout(600);
    assert.equal(lookups, 0, "No lookup below 3 characters");
    assert.equal(await panel(page).getByRole("heading", { name: "Others want this too", exact: true }).count(), 0);
    await titleBox.fill("Calendar");
    await panel(page).getByRole("heading", { name: "Others want this too", exact: true }).waitFor();
    const section = panel(page).locator(".report-suggestions", { has: page.getByRole("heading", { name: "Others want this too", exact: true }) });
    assert.equal(await section.getByRole("button").count(), 1);
    assert.equal((await section.getByRole("button").innerText()).replace(/\s+/g, " ").trim(), "Calendar range · 12 people · Join");
    assert.ok(!(await panel(page).innerText()).includes("Component request"));
    const lib = panel(page).locator(".report-suggestions", { has: page.getByRole("heading", { name: "Already in the library", exact: true }) }).getByRole("link", { name: "Calendar", exact: true });
    assert.equal((await lib.innerText()).replace(/\s+/g, " ").trim(), "Calendar");
    results.push("Only approved requests appear under Others want this too, as Calendar range · 12 people · Join; library matches show the title only; no lookup below 3 characters");
    await section.getByRole("button").click();
    await panel(page).getByText("Joining this request. Your email counts once.", { exact: true }).waitFor();
    assert.ok(await titleBox.isDisabled()); assert.equal(await titleBox.inputValue(), "Calendar range");
    await panel(page).getByText("Optional", { exact: true }).waitFor();
    assert.equal(await page.getByLabel("How would you use it?", { exact: true }).evaluate(n => n.tagName), "TEXTAREA");
    await panel(page).getByRole("button", { name: "Ask for something else", exact: true }).click();
    await panel(page).getByText("Joining this request. Your email counts once.", { exact: true }).waitFor({ state: "detached" });
    assert.ok(await titleBox.isEnabled());
    results.push("Joining an approved request shows the short notice and Optional tag; Ask for something else leaves it");
    await context.unroute(`${api}/v1/requests?**`);
    await titleBox.fill("");
  }
  await fill(page, "request", `Browser request ${run}`);
  // The status may still read "Draft saved" from the drop step, so prove the typed title reached storage.
  await page.waitForFunction(title => new Promise(resolve => {
    const open = indexedDB.open("cojeev-reporting-v1", 1);
    open.onerror = () => resolve(false);
    open.onsuccess = () => { const read = open.result.transaction("drafts").objectStore("drafts").get("workspace"); read.onsuccess = () => { open.result.close(); resolve(read.result?.drafts?.request?.title === title); }; read.onerror = () => resolve(false); };
  }), `Browser request ${run}`);
  await panel(page).getByRole("status").getByText("Draft saved", { exact: true }).waitFor();
  results.push("Typing saves the draft and the status line says Draft saved");
  await page.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "reference.png", mimeType: "image/png", buffer: imageBytes });
  await page.getByAltText("Attachment preview: reference.png").waitFor();
  await page.getByRole("button", { name: "Close reporting panel" }).click();
  await page.reload({ waitUntil: "domcontentloaded" }); await open(page);
  assert.equal(await page.getByLabel("What component do you want?", { exact: true }).inputValue(), `Browser request ${run}`);
  await page.getByAltText("Attachment preview: reference.png").waitFor();
  results.push("Draft fields and File survive closing and reloading via IndexedDB");
  // Bug tab: it holds no files, so this is text alone, closed and reloaded with no wait.
  await panel(page).getByRole("tab", { name: "Report a bug", exact: true }).click();
  await page.getByLabel("Short summary", { exact: true }).fill(`Quick close ${run}`);
  await page.getByRole("button", { name: "Close reporting panel" }).click();
  await page.reload({ waitUntil: "domcontentloaded" }); await open(page);
  assert.equal(await page.getByLabel("Short summary", { exact: true }).inputValue(), `Quick close ${run}`);
  await page.getByLabel("Short summary", { exact: true }).fill("");
  await panel(page).getByRole("tab", { name: "Request a feature", exact: true }).click();
  results.push("closing_right_after_typing_keeps_the_draft");
  await page.getByLabel("What component do you want?", { exact: true }).fill("Chart for person@example.com");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await page.getByLabel("What component do you want?", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("What component do you want?", { exact: true }).inputValue(), "Chart for person@example.com");
  await page.getByAltText("Attachment preview: reference.png").waitFor();
  await page.getByLabel("What component do you want?", { exact: true }).fill(`Browser request ${run}`);
  results.push("A real public-title 422 returns to an editable draft with fields and files intact");
  await panel(page).evaluate(node => { node.scrollTop = 0; }); await assertFits(page); await screenshot(page, "request-desktop-light");
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; }); await screenshot(page, "request-desktop-dark");
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByRole("heading", { name: "Ready to send?" }).waitFor();
  await page.getByText("Private until we approve your title.", { exact: true }).waitFor();
  assert.equal((await page.locator(".report-json summary").innerText()).trim(), "See exactly what will be sent");
  await page.getByText("By sending you approve everything shown, including anything visible in your files. Files and technical details are deleted after 30 days; your email and report after 180.", { exact: true }).waitFor();
  const payloads = []; let first = true;
  await page.route(`${api}/v1/reports`, async route => {
    payloads.push(route.request().postDataJSON()); const response = await route.fetch();
    if (first) { first = false; await route.abort("failed"); } else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await page.getByRole("button", { name: "Retry this exact report", exact: true }).waitFor();
  await page.getByRole("button", { name: "Retry this exact report", exact: true }).click();
  await sentBanner(page, "request").waitFor();
  assert.equal(payloads.length, 2); assert.deepEqual(payloads[0].report, payloads[1].report); assert.equal(payloads[0].token, payloads[1].token);
  await page.unroute(`${api}/v1/reports`);
  const requestId = payloads[0].report.id;
  const requestDetail = await fetch(`${api}/v1/admin/reports/${requestId}`, { headers: { Authorization: `Bearer ${adminToken}` } }).then(response => response.json());
  assert.equal(requestDetail.report.title, `Browser request ${run}`); assert.equal(requestDetail.attachments[0].state, "uploaded");
  results.push("Ambiguous accepted response safely retries the exact UUID, token and payload; D1 report and R2 attachment are real");
  // The form is fresh again; the receipt is read from the opened row of the sent list.
  await page.locator(".report-sent-banner").getByRole("link", { name: "View", exact: true }).click();
  await page.locator(".report-sent-detail").waitFor();
  await page.getByText("Status: Received", { exact: true }).waitFor();
  await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
  await page.locator(".report-delivery summary", { hasText: "Delivery details" }).click();
  {
    const terms = await page.locator(".report-delivery dt").allInnerTexts();
    assert.ok(terms.includes("Email receipt") && terms.includes("Issue"), "Delivery details holds the Email receipt and Issue rows");
    assert.equal(await page.locator(".report-delivery .report-receipt-id code").innerText(), payloads[0].report.id);
  }
  results.push("The receipt shows one status line, and Delivery details with the Email receipt and Issue rows and the report ID (read from the opened sent row; the expectation sentence is asserted on the receipt step while an upload is held open)");
  assert.equal(await page.getByText("Tracked as", { exact: false }).count(), 0, "No issue number, no Tracked as");
  await page.route(`${api}/v1/reports/${requestId}`, async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...(await response.json()), issueNumber: 412, issueUrl: "https://github.com/luv-jeri/cojeev-ui/issues/412" } }); });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  assert.equal(await page.getByRole("link", { name: "#412", exact: true }).getAttribute("href"), "https://github.com/luv-jeri/cojeev-ui/issues/412");
  await page.getByText("Tracked as", { exact: false }).first().waitFor();
  await page.unroute(`${api}/v1/reports/${requestId}`);
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await page.getByText("Tracked as", { exact: false }).first().waitFor({ state: "detached" });
  results.push("The receipt links the public issue once it exists");
  await screenshot(page, "request-receipt");
  {
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download receipt", exact: true }).click()]);
    await download.saveAs(`${output}/receipt.json`);
    // The form is already fresh after a send, so there is no "Start another" press. Type something first: the import must leave it alone.
    const typed = `Typed before import ${run}`;
    await page.getByRole("textbox", { name: "What component do you want?", exact: true }).fill(typed);
    const before = await sentCount(page);
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.focus(); await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Clear draft", exact: true }).waitFor();
    // Radix moves focus one item per press once the menu has settled; wait for each move.
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Clear draft");
    for (const next of ["Request board", "Open a saved receipt"]) {
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(text => document.activeElement?.textContent?.trim() === text, next);
    }
    // Close the list first, so an open row left from earlier cannot pass for the import's own result.
    await page.keyboard.press("Escape");
    await sentToggle(page).click();
    await page.locator(".report-sent-detail").waitFor({ state: "detached" });
    assert.equal(await sentToggle(page).getAttribute("aria-expanded"), "false");
    await more.focus(); await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Open a saved receipt", exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Clear draft");
    for (const next of ["Request board", "Open a saved receipt"]) {
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(text => document.activeElement?.textContent?.trim() === text, next);
    }
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles(`${output}/receipt.json`);
    await page.locator(".report-sent-detail").waitFor();
    assert.equal(await sentToggle(page).getAttribute("aria-expanded"), "true", "The import expands the list");
    assert.equal(await sentRow(page, `Browser request ${run}`).getAttribute("aria-expanded"), "true", "The imported entry's row is open");
    assert.equal(await panel(page).getByRole("alert").count(), 0, "No error after the import");
    // The Delivery details block may still be open from the earlier read, so read its text without toggling it.
    assert.equal(await page.locator(".report-sent-detail .report-receipt-id code").textContent(), requestId);
    assert.equal(await page.getByRole("heading", { name: /is received/ }).count(), 0, "No receipt heading after an import");
    assert.equal(await page.getByRole("textbox", { name: "What component do you want?", exact: true }).inputValue(), typed, "The form typed before is unchanged");
    assert.equal(await sentCount(page), before, "A receipt already in the list is not added twice");
    results.push("A downloaded receipt reopens through More, Open a saved receipt, by keyboard");
    {
      // Forget it, then import the same file again: now it joins the list, opened, and the form is still untouched.
      await page.getByRole("button", { name: "Remove from this device", exact: true }).click();
      await sentToggle(page).waitFor({ state: "detached" });
      await more.click(); await page.getByRole("menuitem", { name: "Open a saved receipt", exact: true }).click();
      await page.getByLabel("Import a saved receipt", { exact: true }).setInputFiles(`${output}/receipt.json`);
      await page.locator(".report-sent-detail").waitFor();
      assert.equal(await sentCount(page), 1);
      assert.equal(await sentRow(page, "Imported request").getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator(".report-sent-detail .report-receipt-id code").count() + await page.locator(".report-sent-detail .report-delivery").count(), 2);
      assert.equal(await page.getByRole("textbox", { name: "What component do you want?", exact: true }).inputValue(), typed);
      assert.equal(await page.getByRole("heading", { name: /is received/ }).count(), 0);
      assert.equal(await page.locator(".report-sent-banner").count(), 0, "An import shows no banner");
      results.push("imported_receipt_joins_the_list");
    }
  }
  await fill(page, "bug", `Browser bug ${run}`);
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; console.warn("Browser test warning Bearer secret-test-value person@example.com"); });
  const detailsToggle = page.getByRole("button", { name: "Include browser details", exact: true }), reviewDetails = page.getByRole("button", { name: "Review browser details", exact: true });
  assert.equal(await detailsToggle.getAttribute("aria-pressed"), "false");
  assert.equal(await page.locator(".report-diagnostic-groups details").count(), 0);
  await detailsToggle.click();
  assert.equal(await detailsToggle.getAttribute("aria-pressed"), "true");
  await page.getByText("Browser details included", { exact: true }).waitFor();
  assert.equal(await page.locator(".report-diagnostic-groups details").count(), 0);
  await reviewDetails.click();
  assert.equal(await page.locator(".report-diagnostic-groups details").count(), 4);
  const reviewedDiagnostics = await page.locator(".report-diagnostic-groups pre").allTextContents();
  await page.getByRole("button", { name: "Close reporting panel", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" }); await open(page);
  await reviewDetails.click();
  assert.deepEqual(await page.locator(".report-diagnostic-groups pre").allTextContents(), reviewedDiagnostics);
  await reviewDetails.click();
  await panel(page).getByRole("tab", { name: "Request a feature", exact: true }).click();
  await panel(page).getByRole("tab", { name: "Report a bug", exact: true }).click();
  assert.equal(await detailsToggle.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".report-diagnostic-groups details").count(), 0);
  assert.equal(await reviewDetails.getAttribute("aria-expanded"), "false");
  results.push("After reload and a tab switch, browser details stay included, the toggle stays pressed, and the groups stay collapsed until Review");
  await page.getByRole("button", { name: "Pin elements", exact: true }).click();
  const pinDialog = page.getByRole("dialog", { name: "Pin elements", exact: true }); await pinDialog.waitFor();
  const beforePin = page.url();
  await page.getByRole("link", { name: "Cojeev UI", exact: true }).click(); assert.equal(page.url(), beforePin, "Picker intercepts link navigation");
  await pinDialog.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  await page.keyboard.press("Escape"); await panel(page).waitFor();
  assert.ok(await page.locator(".report-pins li").count() >= 1);
  const firstPin = page.locator(".report-pins li").first();
  assert.ok((await firstPin.textContent()).trim().startsWith("1 · "));
  assert.ok((await firstPin.getAttribute("title"))?.length > 0);
  assert.ok(await page.getByRole("button", { name: "Remove pin 1", exact: true }).isVisible());
  results.push("A pin shows as a chip whose title holds its path and whose x removes it");
  results.push("Pointer pins intercept navigation; keyboard selection and Escape restore the panel");
  await panel(page).evaluate(node => { node.scrollTop = 0; }); await screenshot(page, "bug-desktop-dark");
  await page.evaluate(() => {
    const spacer = document.createElement("div"); spacer.id = "capture-test-spacer"; spacer.style.height = "1400px"; document.body.append(spacer);
    const secret = document.createElement("div"); secret.id = "capture-test-private"; secret.dataset.private = ""; secret.style.cssText = "position:fixed;left:20px;top:250px;width:100px;height:100px;background:rgb(255,0,255);z-index:40"; secret.textContent = "PRIVATE TEST"; document.body.append(secret);
  });
  await page.getByRole("button", { name: "Full page", exact: true }).click();
  await page.getByRole("heading", { name: "Review your screenshot", exact: true }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".report-crop img")?.naturalHeight > 1100);
  const captureEvidence = await page.locator(".report-crop img").evaluate(img => {
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let magenta = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 255) magenta++;
    return { height: img.naturalHeight, magenta };
  });
  assert.ok(captureEvidence.height > 1100); assert.equal(captureEvidence.magenta, 0, "Private magenta region must not appear in capture");
  await page.getByRole("button", { name: "Discard screenshot", exact: true }).click();
  await page.evaluate(() => { document.getElementById("capture-test-spacer").style.height = "24000px"; });
  results.push("Full-page screenshot extends beyond the viewport and excludes a data-private region by pixel proof");
  await page.getByRole("button", { name: "Select area", exact: true }).click();
  await page.getByRole("dialog", { name: "Select area", exact: true }).waitFor();
  await page.getByLabel("Left px", { exact: true }).fill("40");
  await page.getByLabel("Top px", { exact: true }).fill("60");
  await page.getByLabel("Width px", { exact: true }).fill("600");
  await page.getByLabel("Height px", { exact: true }).fill("400");
  await page.getByRole("button", { name: "Capture area", exact: true }).click();
  await page.getByRole("heading", { name: "Review your screenshot", exact: true }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".report-crop img")?.naturalHeight === 400);
  await page.evaluate(() => { document.getElementById("capture-test-spacer")?.remove(); document.getElementById("capture-test-private")?.remove(); });
  results.push("Area capture renders the selected 600x400 rectangle on a document taller than 24000px");
  await screenshot(page, "screenshot-crop-review");
  await page.getByLabel("Left %", { exact: true }).fill("10"); await page.getByLabel("Width %", { exact: true }).fill("80");
  await page.getByRole("button", { name: "Use this crop", exact: true }).click();
  await page.getByAltText("Attachment preview: cropped-screenshot.png").waitFor();
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await panel(page).evaluate(node => { node.scrollTop = 0; }); await screenshot(page, "bug-desktop-light");
  await reviewDetails.click();
  const actionsGroup = page.locator(".report-diagnostic-groups details", { hasText: "Recent actions" });
  await actionsGroup.locator("summary").click();
  await actionsGroup.getByRole("button", { name: "Remove this group", exact: true }).click();
  assert.equal(await page.locator(".report-diagnostic-groups details").count(), 3);
  results.push("One browser-details group can be removed before sending");
  await page.getByRole("button", { name: "Review report", exact: true }).click();
  await page.getByText("Private. The public issue shows only a reference.", { exact: true }).waitFor();
  results.push("The review shows the short privacy line, See exactly what will be sent, and the visible consent sentence");
  const bugPayload = await page.locator(".report-json pre").textContent().then(JSON.parse);
  assert.equal(bugPayload.diagnostics.environment.theme, "dark"); assert.ok(bugPayload.diagnostics.console.some(event => event.message.includes("[redacted]"))); assert.ok(!JSON.stringify(bugPayload.diagnostics).includes("secret-test-value"));
  assert.equal(bugPayload.diagnostics.actions, undefined); assert.ok(bugPayload.diagnostics.environment);
  assert.ok(bugPayload.pins.length >= 1); assert.equal(bugPayload.attachments.length, 1);
  // Hold the upload for a moment so the receipt step, and its expectation sentence, can be read.
  await page.route(/\/v1\/reports\/[^/]+\/attachments\//, async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
  await page.getByRole("button", { name: "Send report", exact: true }).click(); await accepted(page);
  await page.getByText("We’re looking into it. We’ll email you when it’s tracked, and again when it’s fixed.", { exact: true }).waitFor();
  await sentBanner(page, "bug").waitFor({ timeout: 20000 });
  await page.unroute(/\/v1\/reports\/[^/]+\/attachments\//);
  await page.locator(".report-sent-banner").getByRole("link", { name: "View", exact: true }).click();
  await page.locator(".report-sent-detail").waitFor();
  await page.getByText("Status: Received", { exact: true }).waitFor();
  await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
  await page.locator(".report-delivery summary", { hasText: "Delivery details" }).click();
  assert.equal(await page.locator(".report-delivery .report-receipt-id code").innerText(), bugPayload.id);
  const bugDetail = await fetch(`${api}/v1/admin/reports/${bugPayload.id}`, { headers: { Authorization: `Bearer ${adminToken}` } }).then(response => response.json());
  assert.equal(bugDetail.report.kind, "bug"); assert.equal(bugDetail.attachments[0].state, "uploaded");
  results.push("Bug diagnostics require explicit inclusion; captured data-mode and reviewed warnings survive reload unchanged, secrets redact, capture and crop upload to the local Worker");
  {
    // Two reports are in the list now: the bug just sent (newest) and the imported request.
    await page.getByRole("tab", { name: "Request a feature", exact: true }).click();
    await expandSent(page);
    const rows = page.locator(".report-sent-row");
    assert.equal(await rows.count(), 2);
    assert.ok((await rows.nth(0).innerText()).includes(`Browser bug ${run}`), "Newest first");
    assert.ok((await rows.nth(1).innerText()).includes("Imported request"));
    for (const index of [0, 1]) {
      const row = rows.nth(index);
      assert.equal(await row.locator("svg").first().getAttribute("aria-hidden"), "true", "The kind icon is decorative");
      assert.ok(/\b\d{1,2}\b/.test(await row.locator(".report-sent-row-meta").innerText()) && (await row.locator(".report-sent-row-meta").innerText()).includes("Received"), "Date and status word");
    }
    await openSentRow(page, `Browser bug ${run}`);
    const detail = page.locator(".report-sent-detail");
    await detail.getByText("Status: Received", { exact: true }).waitFor();
    await detail.locator("summary", { hasText: "Delivery details" }).waitFor();
    for (const name of ["Refresh status", "Download receipt"]) await detail.getByRole("button", { name, exact: true }).waitFor();
    const track = detail.getByRole("link", { name: "Track this report", exact: true });
    assert.match(await track.getAttribute("href"), /\/track\/#[0-9a-f-]{36}\.[0-9a-f]{64}$/);
    await track.click();
    await page.getByRole("heading", { name: "Your report", exact: true }).waitFor();
    await page.locator("li[aria-current='step']").waitFor();
    results.push("sent_list_shows_reports_from_this_browser");
    await page.goBack(); await page.waitForFunction(() => document.querySelector(".report-launcher")?.disabled === false);
    // The widget lives in the root layout, so the panel may still be open after a client-side back.
    if (!(await panel(page).isVisible())) await open(page);
    await expandSent(page);

    // Forgetting one entry: the warning sits above the button, and only that entry goes.
    await openSentRow(page, "Imported request");
    const warning = page.locator(".report-sent-detail .report-warning"), forget = page.getByRole("button", { name: "Remove from this device", exact: true });
    assert.equal((await warning.innerText()).trim(), "This key is the only way to check this report from here.");
    assert.ok((await warning.boundingBox()).y < (await forget.boundingBox()).y, "The warning is above the button");
    const beforeForget = await stored(page);
    await forget.click();
    await page.waitForFunction(() => document.querySelectorAll(".report-sent-row").length === 1);
    const afterForget = await stored(page);
    assert.equal(afterForget.sent.length, 1); assert.deepEqual(afterForget.sent, beforeForget.sent.filter(id => id !== requestId));
    assert.ok(!(await page.locator(".report-sent-list").innerText()).includes("Imported request"));
    assert.ok((await page.locator(".report-sent-list").innerText()).includes(`Browser bug ${run}`));
    results.push("remove_from_this_device_forgets_only_that_entry");
  }
  {
    // A send with no files ends on a fresh form, on both tabs.
    const titleOf = kind => page.getByRole("textbox", { name: kind === "bug" ? "Short summary" : "What component do you want?", exact: true });
    const tab = name => panel(page).getByRole("tab", { name, exact: true });
    await tab("Request a feature").click();
    await titleOf("request").fill(`Marker request ${run}`);
    let count = await sentCount(page);
    await fill(page, "bug", `Fresh bug ${run}`);
    await page.getByRole("button", { name: "Review report", exact: true }).click();
    await page.getByRole("button", { name: "Send report", exact: true }).click();
    await sentBanner(page, "bug").waitFor();
    assert.equal(await page.getByRole("heading", { name: /is received/ }).count(), 0);
    for (const label of ["Short summary", "What happened?", "Your email"]) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), "", `Fresh form: ${label}`);
    await page.getByRole("button", { name: "Review report", exact: true }).waitFor();
    assert.equal(await sentBanner(page, "bug").getByRole("link", { name: "View", exact: true }).count(), 1);
    assert.equal(await sentCount(page), count + 1);
    await tab("Request a feature").click();
    assert.equal(await titleOf("request").inputValue(), `Marker request ${run}`, "The other tab's draft is untouched");
    assert.equal(await page.locator(".report-sent-banner").count(), 0, "A tab switch hides the banner");
    await tab("Report a bug").click();
    assert.equal(await page.locator(".report-sent-banner").count(), 0, "The banner does not come back");
    await tab("Request a feature").click();
    count = await sentCount(page);
    await fill(page, "request", `Fresh request ${run}`);
    await page.getByRole("button", { name: "Review request", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).click();
    await sentBanner(page, "request").waitFor();
    for (const label of ["What component do you want?", "How would you use it?", "Your email"]) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), "", `Fresh form: ${label}`);
    assert.equal(await sentCount(page), count + 1);
    await tab("Report a bug").click();
    assert.equal(await titleOf("bug").inputValue(), "", "The bug tab was left alone");
    await tab("Request a feature").click();
    await sentBanner(page, "request").waitFor({ state: "detached" });
    await fill(page, "request", `Fresh request again ${run}`);
    await page.getByRole("button", { name: "Review request", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).click();
    await sentBanner(page, "request").waitFor();
    await titleOf("request").press("x");
    await sentBanner(page, "request").waitFor({ state: "detached" });
    results.push("after_send_returns_to_a_fresh_form");
  }
  {
    // Files still uploading keep the receipt, and the draft with its file, until the last one is stored.
    const upload = /\/v1\/reports\/[^/]+\/attachments\//;
    const tab = name => panel(page).getByRole("tab", { name, exact: true });
    await tab("Request a feature").click();
    await fill(page, "request", `Held upload ${run}`);
    await page.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "held.png", mimeType: "image/png", buffer: imageBytes });
    await page.getByAltText("Attachment preview: held.png").waitFor();
    const before = await stored(page), count = await sentCount(page);
    let release; const gate = new Promise(resolve => { release = resolve; });
    await page.route(upload, async route => { await gate; await route.continue(); });
    await page.getByRole("button", { name: "Review request", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).click();
    await page.getByRole("heading", { name: "Your request is received.", exact: true }).waitFor();
    await page.getByText("0 of 1 files uploaded", { exact: true }).waitFor();
    await page.getByText("We’ll email you when we’ve looked at it, and again when it’s live.", { exact: true }).waitFor();
    const during = await stored(page);
    assert.deepEqual(during.sent, before.sent, "The list is unchanged while uploading");
    assert.equal(during.request.files, 1, "The draft's file is still stored"); assert.ok(during.request.receipt, "The receipt is already in the draft");
    release();
    await sentBanner(page, "request").waitFor();
    assert.equal(await sentCount(page), count + 1);
    const done = await stored(page);
    assert.equal(done.request.files, 0); assert.equal(done.request.receipt, null); assert.equal(done.sent.length, count + 1);
    await page.unroute(upload);
    results.push("pending_uploads_keep_the_receipt_until_done");

    // A failed upload clears nothing, survives a reload, and finishes on retry.
    await fill(page, "request", `Failed upload ${run}`);
    await page.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "failed.png", mimeType: "image/png", buffer: imageBytes });
    await page.getByAltText("Attachment preview: failed.png").waitFor();
    const beforeFail = await stored(page);
    await page.route(upload, route => route.fulfill({ status: 500, json: { error: "Upload failed on purpose." } }));
    await page.getByRole("button", { name: "Review request", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).click();
    await page.getByRole("button", { name: "Retry remaining uploads", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Your request is received.", exact: true }).waitFor();
    assert.deepEqual((await stored(page)).sent, beforeFail.sent, "A failed upload adds nothing to the list");
    // The receipt step has no More menu, so open the panel without waiting for it.
    await page.reload({ waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: "Request a feature / Report a bug" }).click(); await panel(page).waitFor();
    await page.getByRole("button", { name: "Retry remaining uploads", exact: true }).waitFor();
    const reloaded = await stored(page);
    assert.equal(reloaded.request.files, 1, "The file is still in the draft after a reload"); assert.ok(reloaded.request.receipt); assert.deepEqual(reloaded.sent, beforeFail.sent);
    await page.unroute(upload);
    await page.getByRole("button", { name: "Retry remaining uploads", exact: true }).click();
    await sentBanner(page, "request").waitFor();
    const finished = await stored(page);
    assert.equal(finished.request.files, 0); assert.equal(finished.sent.length, beforeFail.sent.length + 1);
    results.push("failed_upload_clears_nothing");
  }
  await page.goto(`${base}/feedback-admin/?report=${bugPayload.id}`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".report-launcher").count(), 0);
  await page.getByLabel("Maintainer token", { exact: true }).fill(adminToken); await page.getByRole("button", { name: "Unlock reports", exact: true }).click();
  await page.getByRole("heading", { name: `Browser bug ${run}`, exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("in_progress"); await page.getByRole("button", { name: "Save status", exact: true }).click();
  await page.getByText("Status saved. Relevant updates are queued for delivery.", { exact: true }).waitFor();
  await screenshot(page, "admin-desktop");
  assert.equal(await page.evaluate(() => localStorage.getItem("reporting-admin-token")), null);
  await page.getByRole("button", { name: "Lock reports", exact: true }).click(); await page.getByLabel("Maintainer token", { exact: true }).waitFor();
  results.push("Maintainer deep link unlock, private read, real status update, and lock work; launcher is absent on admin");
  await context.close();

  {
    // Stored state from an older build: the list is capped on the way in, and a receipt sitting in a draft is moved.
    const seeded = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
    await localOnly(seeded);
    const seedPage = await seeded.newPage(); activePage = seedPage; seedPage.on("pageerror", error => pageErrors.push(error.message));
    const receiptFor = (id, extra = {}) => ({ id, token: "a".repeat(64), status: "received", topicId: null, email: "pending", issue: "pending", attachments: [], ...extra });
    // The admin page mounts no widget, so nothing rewrites the store while it is seeded.
    await seedPage.goto(`${base}/feedback-admin/`, { waitUntil: "domcontentloaded" });
    const many = Array.from({ length: 51 }, (_, n) => ({ kind: "bug", title: `Seed ${n}`, sentAt: 1790000000000 + n, receipt: receiptFor(`00000000-0000-4000-8000-${String(n).padStart(12, "0")}`) }));
    await seedStore(seedPage, { sent: many });
    await seedPage.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(seedPage);
    await sentToggle(seedPage).waitFor();
    assert.equal(await sentCount(seedPage), 50);
    await sentToggle(seedPage).click();
    await seedPage.getByText("Only the newest 50 are kept. Download a receipt to keep an older one.", { exact: true }).waitFor();
    const seededTitles = await seedPage.locator(".report-sent-row-title").allInnerTexts();
    assert.equal(seededTitles.length, 50); assert.ok(!seededTitles.includes("Seed 0"), "The oldest one dropped");
    results.push("sent_list_keeps_the_newest_50");

    const legacyId = "11111111-1111-4111-8111-111111111111";
    await seedPage.goto(`${base}/feedback-admin/`, { waitUntil: "domcontentloaded" });
    await seedStore(seedPage, { sent: [], workspace: { activeKind: "request", drafts: { request: { ...{ kind: "request", title: "Old receipt title", description: "", email: "", pins: [], files: [], diagnostics: null, frozen: null, attempted: true }, receipt: receiptFor(legacyId) } } } });
    await seedPage.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(seedPage);
    await sentToggle(seedPage).waitFor();
    assert.equal(await sentCount(seedPage), 1);
    await seedPage.getByRole("button", { name: "Review request", exact: true }).waitFor();
    assert.equal(await seedPage.getByLabel("What component do you want?", { exact: true }).inputValue(), "");
    await seedPage.waitForFunction(() => new Promise(resolve => { const open = indexedDB.open("cojeev-reporting-v1", 1); open.onsuccess = () => { const read = open.result.transaction("drafts").objectStore("drafts").get("workspace"); read.onsuccess = () => { open.result.close(); resolve(!read.result?.drafts?.request?.receipt); }; }; }));
    assert.deepEqual((await stored(seedPage)).sent, [legacyId]);
    assert.equal((await stored(seedPage)).request.receipt, null, "The stored workspace no longer holds the receipt");
    results.push("legacy_receipt_moves_into_the_list");
    await seeded.close();
  }
  {
    // Nothing written later may bring a sent report, or its files, back into the form.
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
    await localOnly(fresh);
    const gone = await fresh.newPage(); activePage = gone; gone.on("pageerror", error => pageErrors.push(error.message));
    await gone.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(gone);
    await fill(gone, "request", `Never back ${run}`);
    await gone.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "never-back.png", mimeType: "image/png", buffer: imageBytes });
    await gone.getByAltText("Attachment preview: never-back.png").waitFor();
    await gone.getByRole("button", { name: "Review request", exact: true }).click();
    await gone.getByRole("button", { name: "Send request", exact: true }).click();
    await sentBanner(gone, "request").waitFor();
    await gone.getByRole("button", { name: "Review request", exact: true }).waitFor();
    // Typing on the other tab makes the widget write the whole workspace once more.
    await panel(gone).getByRole("tab", { name: "Report a bug", exact: true }).click();
    await gone.getByLabel("Short summary", { exact: true }).fill("x");
    await gone.waitForFunction(() => new Promise(resolve => { const open = indexedDB.open("cojeev-reporting-v1", 1); open.onsuccess = () => { const read = open.result.transaction("drafts").objectStore("drafts").get("workspace"); read.onsuccess = () => { open.result.close(); resolve(read.result?.drafts?.bug?.title === "x"); }; }; }));
    await gone.reload({ waitUntil: "domcontentloaded" }); await open(gone);
    await panel(gone).getByRole("tab", { name: "Request a feature", exact: true }).click();
    await gone.getByRole("button", { name: "Review request", exact: true }).waitFor();
    assert.equal(await gone.getByLabel("What component do you want?", { exact: true }).inputValue(), "");
    assert.equal(await gone.getByRole("heading", { name: /is received/ }).count(), 0, "No receipt screen");
    assert.equal(await gone.getByAltText("Attachment preview: never-back.png").count(), 0, "No file in the form");
    await expandSent(gone);
    assert.equal(await gone.locator(".report-sent-row").count(), 1, "One row in the list");
    const kept = await stored(gone);
    assert.equal(kept.request.receipt, null); assert.equal(kept.request.files, 0); assert.equal(kept.sent.length, 1);
    // Two tabs: one that loaded before the send must not bring the report back.
    const emptyRequestTab = async (context, label) => {
      const view = await context.newPage(); view.on("pageerror", error => pageErrors.push(error.message));
      await view.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(view);
      await panel(view).getByRole("tab", { name: "Request a feature", exact: true }).click();
      await view.getByRole("button", { name: "Review request", exact: true }).waitFor();
      assert.equal(await view.getByLabel("What component do you want?", { exact: true }).inputValue(), "", `${label}: empty form`);
      assert.equal(await view.getByRole("heading", { name: /is received/ }).count(), 0, `${label}: no receipt screen`);
      assert.equal(await view.getByAltText(/Attachment preview/).count(), 0, `${label}: no file`);
      await expandSent(view);
      const rowsNow = await view.locator(".report-sent-row").count();
      const kept = await stored(view);
      assert.equal(kept.request.receipt, null, `${label}: stored receipt`); assert.equal(kept.request.files, 0, `${label}: stored files`);
      await view.close();
      return rowsNow;
    };
    const before = (await stored(gone)).sent.length;
    {
      // S3: tab B loads while A holds a typed request with a file, then A sends.
      await fill(gone, "request", `Two tabs ${run}`);
      await gone.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "two-tabs.png", mimeType: "image/png", buffer: imageBytes });
      await gone.getByAltText("Attachment preview: two-tabs.png").waitFor();
      await gone.waitForFunction(() => new Promise(resolve => { const open = indexedDB.open("cojeev-reporting-v1", 1); open.onsuccess = () => { const read = open.result.transaction("drafts").objectStore("drafts").get("workspace"); read.onsuccess = () => { open.result.close(); resolve(read.result?.drafts?.request?.files?.length === 1); }; }; }));
      const other = await fresh.newPage(); other.on("pageerror", error => pageErrors.push(error.message));
      await other.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await open(other);
      await other.getByAltText("Attachment preview: two-tabs.png").waitFor();
      await gone.bringToFront();
      await gone.getByRole("button", { name: "Review request", exact: true }).click();
      await gone.getByRole("button", { name: "Send request", exact: true }).click();
      await sentBanner(gone, "request").waitFor();
      // B is idle and shows the old form; it must write nothing when it is hidden or closed.
      await other.evaluate(() => { window.dispatchEvent(new Event("pagehide")); });
      await other.waitForTimeout(700);
      assert.equal(await emptyRequestTab(fresh, "S3"), before + 1, "S3: one sent row");
      // B, shown again, follows storage: the sent row and an empty form.
      await other.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
      await other.getByLabel("What component do you want?", { exact: true }).waitFor();
      await other.waitForFunction(() => document.querySelector('input[name="title"]')?.value === "");
      assert.equal(await other.getByAltText(/Attachment preview/).count(), 0, "B shows no old file once visible");
      assert.equal(await sentCount(other), before + 1, "B shows the sent row once visible");
      results.push("a_second_tab_shows_the_sent_report_once_visible");
      await other.close();
    }
    {
      // S3c: tab B loads while A's upload is held; A finishes; B then fires pagehide.
      const upload = /\/v1\/reports\/[^/]+\/attachments\//;
      await fill(gone, "request", `Mid upload ${run}`);
      await gone.getByLabel("Attach images or videos", { exact: true }).setInputFiles({ name: "mid.png", mimeType: "image/png", buffer: imageBytes });
      await gone.getByAltText("Attachment preview: mid.png").waitFor();
      let release; const gate = new Promise(resolve => { release = resolve; });
      await gone.route(upload, async route => { await gate; await route.continue(); });
      await gone.getByRole("button", { name: "Review request", exact: true }).click();
      await gone.getByRole("button", { name: "Send request", exact: true }).click();
      await gone.getByText("0 of 1 files uploaded", { exact: true }).waitFor();
      const other = await fresh.newPage(); other.on("pageerror", error => pageErrors.push(error.message));
      await other.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await other.getByRole("button", { name: "Request a feature / Report a bug" }).click();
      await other.getByText("0 of 1 files uploaded", { exact: true }).waitFor();
      release();
      await sentBanner(gone, "request").waitFor();
      await other.evaluate(() => { window.dispatchEvent(new Event("pagehide")); });
      await other.waitForTimeout(700);
      await gone.unroute(upload);
      assert.equal(await emptyRequestTab(fresh, "S3c"), before + 2, "S3c: one more sent row");
      await other.close();
    }
    results.push("a_sent_report_never_comes_back_into_the_form");
    await fresh.close();
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await localOnly(mobile);
  const mobilePage = await mobile.newPage(); activePage = mobilePage; mobilePage.on("pageerror", error => pageErrors.push(error.message)); mobilePage.on("console", entry => { if (entry.type() === "error" && /hydrat/i.test(entry.text())) hydrationErrors.push(entry.text()); });
  await mobilePage.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" }); await screenshot(mobilePage, "request-board-mobile"); await open(mobilePage);
  {
    await panel(mobilePage).getByRole("tab", { name: "Report a bug", exact: true }).click();
    const info = mobilePage.getByRole("button", { name: "How this works", exact: true }), pop = mobilePage.getByRole("dialog", { name: "How this works", exact: true });
    await info.evaluate(node => node.scrollIntoView({ block: "end" })); await info.tap(); await pop.waitFor();
    const box = await pop.boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, "Popover stays inside the phone viewport");
    const scroll = await pop.evaluate(node => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflowY: getComputedStyle(node).overflowY }));
    console.log("popover scroll probe", JSON.stringify(scroll));
    if (scroll.scrollHeight > scroll.clientHeight) assert.ok(["auto", "scroll"].includes(scroll.overflowY), "A popover taller than its box scrolls");
    await panel(mobilePage).locator("#email-help").tap(); await pop.waitFor({ state: "hidden" });
    assert.ok(await panel(mobilePage).isVisible(), "An outside tap closes only the popover");
  }
  results.push("On a 390px phone the info popover opens by tap, stays inside the viewport near the bottom, and an outside tap closes only it");
  for (const tab of ["Request a feature", "Report a bug"]) {
    await panel(mobilePage).getByRole("tab", { name: tab, exact: true }).click();
    await panel(mobilePage).locator("#email-help").getByText("Private. Email updates are off; save your receipt.", { exact: true }).waitFor();
    assert.equal((await panel(mobilePage).locator("#email-help").innerText()).trim(), "Private. Email updates are off; save your receipt.");
    assert.ok(!(await panel(mobilePage).innerText()).includes("not connected"), "The stale email notice is gone");
  }
  results.push("With email off, both tabs show Private. Email updates are off; save your receipt. in the hint slot");
  await fill(mobilePage, "request", "A mobile calendar with date ranges"); await panel(mobilePage).evaluate(node => { node.scrollTop = 0; }); await assertFits(mobilePage); await screenshot(mobilePage, "request-mobile-light");
  await fill(mobilePage, "bug", "The control is difficult to select on my phone"); await panel(mobilePage).evaluate(node => { node.scrollTop = 0; }); await screenshot(mobilePage, "bug-mobile-light");
  await mobilePage.evaluate(() => { document.documentElement.dataset.mode = "dark"; }); await screenshot(mobilePage, "bug-mobile-dark");
  await mobilePage.getByRole("button", { name: "More", exact: true }).click(); await mobilePage.getByRole("menuitem", { name: "Clear draft", exact: true }).click();
  await mobile.close(); results.push("Mobile request/bug forms and light/dark layouts fit a 390px viewport");
} catch (error) { failures.push(error.stack ?? String(error)); if (activePage && !activePage.isClosed()) { await activePage.screenshot({path: `${output}/failure.png`}); await writeFile(`${output}/failure.txt`, await activePage.locator("body").ariaSnapshot()); } }
finally { await browser.close(); }
const report = { results, failures, pageErrors, hydrationErrors, screenshots: output };
await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length || pageErrors.length || hydrationErrors.length) process.exitCode = 1;
