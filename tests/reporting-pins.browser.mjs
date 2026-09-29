import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Run against a served build: POLISH_URL=http://127.0.0.1:4320/cojeev-ui REPORTING_BROWSER_API=http://127.0.0.1:8787 node --test tests/reporting-pins.browser.mjs
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const api = process.env.REPORTING_BROWSER_API ?? "http://127.0.0.1:8787";
const SECRET = "secret-value-123";
const KNOWN = "Known paragraph text";
const THIRD = "Third paragraph";

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

const panel = page => page.getByRole("dialog", { name: "Request a feature or report a bug", exact: true });
const picker = page => page.getByRole("dialog", { name: "Pin elements", exact: true });
const region = page => picker(page).locator('[aria-live="polite"]');
const markers = page => page.locator("[data-reporting-chrome] .report-pin-marker");
const chips = page => page.locator(".report-pins .report-chip-text");
const done = page => picker(page).getByRole("button", { name: "Done", exact: true });

async function until(read, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) { const value = await read(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.fail(`timed out: ${label}`);
}

// Fields whose content would leak through textContent (textarea, select, contenteditable, script, style, data-private) or .value (input).
const FIXTURE = `
<div id="t15" style="position:absolute;top:220px;left:5%;width:520px;z-index:5;background:#fff;color:#111;padding:12px;border:1px solid #ccc">
  <p id="t15-known">${KNOWN}</p>
  <p id="t15-third">${THIRD}</p>
  <p id="t15-long">${"abcdefghi ".repeat(10)}x</p>
  <div id="t15-wrap"><span>Account details</span>
    <input id="t15-input" aria-label="Account name">
    <textarea id="t15-area">${SECRET}</textarea>
    <select id="t15-select"><option>${SECRET}</option></select>
    <div id="t15-edit" contenteditable="true">${SECRET}</div>
    <span data-private>${SECRET}</span>
    <style>.t15-unused { content: "${SECRET}"; }</style>
    <script type="text/plain">${SECRET}</script>
  </div>
</div>
<p id="t15-edge" style="position:fixed;top:400px;right:0;width:60px;margin:0;z-index:5;background:#fff;color:#111">Rightmost paragraph text here</p>
<div id="t15-spacer" style="height:3000px"></div>`;

async function openPage({ width = 1440, height = 1000 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await context.route(/^https?:\/\//, route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Request a feature / Report a bug" }).click();
  await panel(page).waitFor();
  await page.getByRole("button", { name: "More", exact: true }).waitFor();
  await panel(page).getByRole("tab", { name: "Report a bug", exact: true }).click();
  await page.evaluate(({ html, secret }) => {
    document.body.insertAdjacentHTML("beforeend", html);
    document.querySelector("#t15-input").value = secret;
  }, { html: FIXTURE, secret: SECRET });
  return { context, page };
}
const startPinning = async page => { await panel(page).getByRole("button", { name: "Pin elements", exact: true }).click(); await picker(page).waitFor(); };
const pinAt = (page, selector, position = undefined) => page.locator(selector).click(position ? { position } : {});
const box = (page, selector) => page.locator(selector).evaluate(node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const storedWorkspace = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open("cojeev-reporting-v1");
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const get = open.result.transaction("drafts").objectStore("drafts").get("workspace");
    get.onsuccess = () => { open.result.close(); resolve(JSON.stringify(get.result ?? null)); };
    get.onerror = () => reject(get.error);
  };
}));
const fillBug = async page => {
  await page.getByRole("textbox", { name: "Short summary", exact: true }).fill("Pin label check");
  await page.getByRole("textbox", { name: "What happened?", exact: true }).fill("Checking that pin labels stay on this device.");
  await page.getByRole("textbox", { name: "Your email", exact: true }).fill("pins@example.com");
};

test("pin_marks_the_element_on_the_page", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    const selectors = ["#t15-known", "#t15-third", "#t15-long"];
    for (const selector of selectors) await pinAt(page, selector);
    await until(async () => (await markers(page).count()) === 3, "three markers");
    assert.deepEqual(await markers(page).locator("span").allTextContents(), ["1", "2", "3"]);
    const inChrome = await page.locator("[data-reporting-chrome] .report-pin-marker").count();
    assert.equal(inChrome, await page.locator(".report-pin-marker").count(), "markers live only inside the picker portal");
    for (const [index, selector] of selectors.entries()) {
      const marker = await markers(page).nth(index).evaluate(node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
      assert.ok(overlaps(marker, await box(page, selector)), `marker ${index + 1} overlaps ${selector}`);
    }
  } finally { await context.close(); }
});

test("pin_announces_a_readable_name", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    assert.equal((await region(page).textContent()).trim(), "Choose an element on this page.");
    await pinAt(page, "#t15-known");
    await until(async () => (await region(page).textContent()) === `Pinned 1 · Paragraph “${KNOWN}”`, "PN1");
    assert.equal(await picker(page).locator('[aria-live="polite"]').count(), 1, "one polite region");
    await page.locator("#t15-third").hover();
    await until(async () => (await page.locator(".report-pin-tag").textContent()) === `Paragraph “${THIRD}”`, "PN3 hover tag");
    assert.equal(await picker(page).getAttribute("aria-label"), "Pin elements");
  } finally { await context.close(); }
});

test("pin_tag_stays_inside_the_viewport", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    await page.locator("#t15-edge").hover();
    await until(async () => (await page.locator(".report-pin-tag").count()) === 1, "tag");
    const tag = await until(async () => { const r = await box(page, ".report-pin-tag"); return r.width > 0 ? r : null; }, "tag box");
    const inside = await until(async () => { const r = await box(page, ".report-pin-tag"); return r.left >= 0 && r.right <= 1440 && r.top >= 0 ? r : null; }, `tag inside the viewport (was ${JSON.stringify(tag)})`);
    assert.ok(inside.right <= 1440);
  } finally { await context.close(); }
});

test("clicking_a_pinned_element_unpins_it", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    await pinAt(page, "#t15-known");
    await until(async () => (await markers(page).count()) === 1, "one marker");
    await pinAt(page, "#t15-known");
    await until(async () => (await markers(page).count()) === 0, "marker removed by second click");
    assert.ok((await picker(page).locator("strong").textContent()).includes("· 0/"), "toolbar counter dropped");
    assert.equal(await region(page).textContent(), "Removed pin 1");
    await done(page).click();
    await panel(page).waitFor();
    assert.equal(await chips(page).count(), 0, "no chip after Done");

    // Enter behaves the same.
    await startPinning(page);
    await page.locator("#t15-known").hover();
    await page.keyboard.press("Enter");
    await until(async () => (await markers(page).count()) === 1, "Enter pins");
    await page.keyboard.press("Enter");
    await until(async () => (await markers(page).count()) === 0, "Enter unpins");
    assert.equal(await region(page).textContent(), "Removed pin 1");

    // Mini chips remove a pin and renumber the rest.
    await pinAt(page, "#t15-known"); await pinAt(page, "#t15-third");
    await until(async () => (await markers(page).count()) === 2, "two markers");
    assert.deepEqual(await picker(page).locator(".report-pin-mini button").allTextContents(), ["1 · Paragraph", "2 · Paragraph"]);
    await picker(page).getByRole("button", { name: "Remove pin 1", exact: true }).hover();
    await until(async () => (await markers(page).first().getAttribute("data-active")) === "true", "hover highlights the marker");
    await picker(page).getByRole("button", { name: "Remove pin 1", exact: true }).click();
    await until(async () => (await markers(page).count()) === 1, "chip removes the pin");
    assert.equal(await region(page).textContent(), "Removed pin 1");
    assert.deepEqual(await markers(page).locator("span").allTextContents(), ["1"]);
    assert.ok(overlaps(await markers(page).first().evaluate(node => node.getBoundingClientRect().toJSON()), await box(page, "#t15-third")), "the second element is the one left");
    assert.equal(await picker(page).getByRole("button", { name: /^Remove pin/ }).count(), 1);

    // Undo pin removes the last pin with PN2.
    await picker(page).getByRole("button", { name: "Undo pin", exact: true }).click();
    await until(async () => (await markers(page).count()) === 0, "Undo pin");
    assert.equal(await region(page).textContent(), "Removed pin 1");
  } finally { await context.close(); }
});

test("pin_markers_follow_scroll", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    await pinAt(page, "#t15-known");
    await until(async () => (await markers(page).count()) === 1, "marker");
    const synced = async () => { const m = await box(page, ".report-pin-marker"), e = await box(page, "#t15-known"); return { m, e, ok: Math.abs(m.top - e.top) <= 1 && Math.abs(m.left - e.left) <= 1 }; };
    const before = (await synced()).e.top;
    await page.evaluate(() => window.scrollBy(0, 200));
    const afterScroll = await until(async () => { const s = await synced(); return s.ok && Math.abs(s.e.top - (before - 200)) <= 1 ? s : null; }, "marker follows the 200px scroll");
    assert.ok(Math.abs(afterScroll.m.top - (before - 200)) <= 1);
    const leftBefore = afterScroll.e.left;
    await page.setViewportSize({ width: 1100, height: 900 });
    const afterResize = await until(async () => { const s = await synced(); return s.ok && Math.abs(s.e.left - leftBefore) > 5 ? s : null; }, "marker follows the resize");
    assert.ok(afterResize.ok);
  } finally { await context.close(); }
});

test("pin_chip_shows_kind_and_text", async () => {
  const { context, page } = await openPage();
  try {
    await startPinning(page);
    await pinAt(page, "#t15-known"); await pinAt(page, "#t15-long");
    await until(async () => (await markers(page).count()) === 2, "two markers");
    await done(page).click();
    await panel(page).waitFor();
    const texts = await chips(page).allTextContents();
    assert.equal(texts[0], `1 · Paragraph “${KNOWN}”`);
    const title = await page.locator(".report-pins li").first().getAttribute("title");
    assert.equal(await page.evaluate(path => document.querySelector(path)?.id, title), "t15-known", "title is the path");
    assert.equal(await panel(page).getByRole("button", { name: "Remove pin 1", exact: true }).count(), 1);
    const long = texts[1].match(/^2 · Paragraph “(.*)”$/)?.[1];
    assert.ok(long, `long chip has text: ${texts[1]}`);
    assert.ok(Array.from(long).length <= 61 && long.endsWith("…"), `capped at 60 plus an ellipsis: ${long}`);
  } finally { await context.close(); }
});

test("pin_label_never_reads_field_values", async () => {
  const { context, page } = await openPage();
  try {
    assert.ok(await page.locator("#t15-wrap").evaluate(node => node.textContent.includes("secret-value-123")), "control: a textContent walk would leak");
    await startPinning(page);
    await page.locator("#t15-wrap").hover({ position: { x: 3, y: 3 } });
    await until(async () => (await page.locator(".report-pin-tag").count()) === 1, "hover tag");
    const tagText = await page.locator(".report-pin-tag").textContent();
    assert.ok(tagText.includes("Account details"), `the wrapper still gets its visible text: ${tagText}`);
    await pinAt(page, "#t15-wrap", { x: 3, y: 3 });
    await until(async () => (await markers(page).count()) === 1, "wrapper pinned");
    const seen = [tagText, await region(page).textContent(), await picker(page).locator(".report-pin-mini").textContent()];
    assert.ok(seen[1].startsWith("Pinned 1 · Element “Account details"), seen[1]);
    await done(page).click();
    await panel(page).waitFor();
    seen.push(await panel(page).locator(".report-pins").innerHTML());
    const stored = await until(async () => { const value = await storedWorkspace(page); return value.includes("Account details") ? value : null; }, "the draft is saved with the label");
    seen.push(stored);
    await fillBug(page);
    await panel(page).getByRole("button", { name: "Review report", exact: true }).click();
    seen.push(await page.locator(".report-json pre").textContent());
    for (const text of seen) assert.ok(!text.includes(SECRET), `no field value in: ${text.slice(0, 120)}`);
  } finally { await context.close(); }
});

test("pin_label_is_not_submitted", async () => {
  const { context, page } = await openPage();
  try {
    const bodies = [];
    await page.route(`${api}/v1/reports`, async route => { bodies.push(route.request().postDataJSON()); await route.continue(); });
    await startPinning(page);
    await pinAt(page, "#t15-known"); await pinAt(page, "#t15-third");
    await until(async () => (await markers(page).count()) === 2, "two markers");
    await done(page).click();
    await panel(page).waitFor();
    await fillBug(page);
    const stored = JSON.parse(await until(async () => { const value = await storedWorkspace(page); return value.includes(KNOWN) ? value : null; }, "the draft is saved with the label"));
    assert.ok(stored.drafts.bug.pins.every(pin => typeof pin.label === "string" && pin.label.length), "the stored draft keeps the label until the send");
    await panel(page).getByRole("button", { name: "Review report", exact: true }).click();
    const reviewed = await page.locator(".report-json pre").textContent();
    const hasLabelKey = value => Array.isArray(value) ? value.some(hasLabelKey) : value && typeof value === "object" ? Object.entries(value).some(([key, inner]) => key === "label" || hasLabelKey(inner)) : false;
    const review = JSON.parse(reviewed);
    assert.ok(!hasLabelKey(review), `the review JSON has no label key: ${reviewed.match(/.{0,40}label.{0,40}/)?.[0]}`);
    assert.ok(!reviewed.includes("Paragraph “"), "no label text in the review JSON");
    assert.equal(review.pins.length, 2);
    await panel(page).getByRole("button", { name: "Send report", exact: true }).click();
    await page.getByRole("heading", { name: /Your report is received/ }).waitFor();
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].report.pins.length, 2);
    for (const pin of bodies[0].report.pins) assert.deepEqual(Object.keys(pin).sort(), ["path", "tag", "x", "y"]);
    assert.ok(!JSON.stringify(bodies[0]).includes("Paragraph “"), "no label text in the request");
  } finally { await context.close(); }
});
