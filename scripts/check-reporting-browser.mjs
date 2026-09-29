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
const open = async page => { await page.getByRole("button", { name: "Request a feature / Report a bug" }).click(); await panel(page).waitFor(); await page.getByRole("button", { name: "Clear draft", exact: true }).waitFor(); };
const fill = async (page, kind, title) => {
  const kindTab = panel(page).getByRole("tab", { name: kind === "bug" ? "Report a bug" : "Request a feature", exact: true });
  await kindTab.click();
  assert.equal(await kindTab.getAttribute("aria-selected"), "true");
  await page.getByRole("textbox", { name: kind === "bug" ? "Short summary" : "What component do you want?", exact: true }).fill(title);
  await page.getByRole("textbox", { name: kind === "bug" ? "What happened?" : "How would you use it?", exact: true }).fill("Local browser verification. Reference: https://example.com/reference");
  await page.getByRole("textbox", { name: "Your email", exact: true }).fill(`browser-${run}@example.com`);
};
const accepted = async page => page.getByRole("heading", { name: /Your (request|report) is received/ }).waitFor();
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
  await accepted(page); await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
  assert.equal(payloads.length, 2); assert.deepEqual(payloads[0].report, payloads[1].report); assert.equal(payloads[0].token, payloads[1].token);
  await page.unroute(`${api}/v1/reports`);
  const requestId = payloads[0].report.id;
  const requestDetail = await fetch(`${api}/v1/admin/reports/${requestId}`, { headers: { Authorization: `Bearer ${adminToken}` } }).then(response => response.json());
  assert.equal(requestDetail.report.title, `Browser request ${run}`); assert.equal(requestDetail.attachments[0].state, "uploaded");
  results.push("Ambiguous accepted response safely retries the exact UUID, token and payload; D1 report and R2 attachment are real");
  await page.getByText("We’ll email you when we’ve looked at it, and again when it’s live.", { exact: true }).waitFor();
  await page.getByText("Status: Received", { exact: true }).waitFor();
  await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
  await page.locator(".report-delivery summary", { hasText: "Delivery details" }).click();
  {
    const terms = await page.locator(".report-delivery dt").allInnerTexts();
    assert.ok(terms.includes("Email receipt") && terms.includes("Issue"), "Delivery details holds the Email receipt and Issue rows");
    assert.equal(await page.locator(".report-delivery .report-receipt-id code").innerText(), payloads[0].report.id);
  }
  results.push("The receipt shows the expectation sentence, one status line, and Delivery details with the Email receipt and Issue rows and the report ID");
  assert.equal(await page.getByText("Tracked as", { exact: false }).count(), 0, "No issue number, no Tracked as");
  await page.route(`${api}/v1/reports/${requestId}`, async route => { const response = await route.fetch(); await route.fulfill({ response, json: { ...(await response.json()), issueNumber: 412, issueUrl: "https://github.com/luv-jeri/cojeev-ui/issues/412" } }); });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  assert.equal(await page.getByRole("link", { name: "#412", exact: true }).getAttribute("href"), "https://github.com/luv-jeri/cojeev-ui/issues/412");
  await page.getByText("Tracked as", { exact: false }).first().waitFor();
  await page.unroute(`${api}/v1/reports/${requestId}`);
  await page.getByRole("button", { name: "Refresh status", exact: true }).click(); await accepted(page);
  await page.getByText("Tracked as", { exact: false }).waitFor({ state: "detached" });
  results.push("The receipt links the public issue once it exists");
  await screenshot(page, "request-receipt");
  await page.getByRole("button", { name: "Start another", exact: true }).click();
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
  await page.getByRole("button", { name: "Send report", exact: true }).click(); await accepted(page); await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
  await page.getByText("We’re looking into it. We’ll email you when it’s tracked, and again when it’s fixed.", { exact: true }).waitFor();
  await page.getByText("Status: Received", { exact: true }).waitFor();
  await page.locator(".report-delivery summary", { hasText: "Delivery details" }).click();
  assert.equal(await page.locator(".report-delivery .report-receipt-id code").innerText(), bugPayload.id);
  const bugDetail = await fetch(`${api}/v1/admin/reports/${bugPayload.id}`, { headers: { Authorization: `Bearer ${adminToken}` } }).then(response => response.json());
  assert.equal(bugDetail.report.kind, "bug"); assert.equal(bugDetail.attachments[0].state, "uploaded");
  results.push("Bug diagnostics require explicit inclusion; captured data-mode and reviewed warnings survive reload unchanged, secrets redact, capture and crop upload to the local Worker");
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
  await mobilePage.getByRole("button", { name: "Clear draft", exact: true }).click();
  await mobile.close(); results.push("Mobile request/bug forms and light/dark layouts fit a 390px viewport");
} catch (error) { failures.push(error.stack ?? String(error)); if (activePage && !activePage.isClosed()) { await activePage.screenshot({path: `${output}/failure.png`}); await writeFile(`${output}/failure.txt`, await activePage.locator("body").ariaSnapshot()); } }
finally { await browser.close(); }
const report = { results, failures, pageErrors, hydrationErrors, screenshots: output };
await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length || pageErrors.length || hydrationErrors.length) process.exitCode = 1;
