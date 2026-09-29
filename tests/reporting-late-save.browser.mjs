import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Run by scripts/run-reporting-browser.mjs, or on its own: POLISH_URL=http://127.0.0.1:4381/cojeev-ui node --test tests/reporting-late-save.browser.mjs
// The API is faked in the browser, so this spends none of the fixture's send limit. It is a separate script because
// it needs many sends and a page-level timing hook that the main journey should not carry.
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const api = process.env.REPORTING_BROWSER_API ?? "http://127.0.0.1:8787";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

// React runs a save effect from a scheduler message. Delaying that message by a few milliseconds while a send finishes lets
// the IndexedDB commit complete first, so the effect for the pre-send draft runs after it, as when the scheduler yields for paint.
const delayScheduler = ms => {
  const Real = window.MessageChannel;
  window.__delayScheduler = false;
  window.MessageChannel = function () {
    const channel = new Real(), post = channel.port2.postMessage.bind(channel.port2);
    channel.port2.postMessage = (...args) => (window.__delayScheduler ? setTimeout(() => post(...args), ms) : post(...args));
    return channel;
  };
};
const storedReceipt = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open("cojeev-reporting-v1", 1);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const read = open.result.transaction("drafts").objectStore("drafts").get("workspace");
    read.onsuccess = () => { open.result.close(); resolve(read.result?.drafts?.request?.receipt?.id ?? null); };
  };
}));

test("a_late_save_after_a_send_never_restores_the_receipt", async () => {
  const browser = await chromium.launch();
  const hits = [];
  try {
    for (const delay of [3, 4]) {
      for (let run = 0; run < 5; run += 1) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
        await context.addInitScript(delayScheduler, delay);
        await context.route(`${api}/**`, route => {
          const request = route.request(), path = new URL(request.url()).pathname, json = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
          if (request.method() === "OPTIONS") return json({});
          if (path === "/v1/config") return json({ emailEnabled: true, turnstileSiteKey: "", local: true });
          if (path === "/v1/requests") return json({ requests: [] });
          if (path === "/v1/reports" && request.method() === "POST") {
            const { report, token } = request.postDataJSON();
            return json({ id: report.id, token, kind: report.kind, status: "received", topicId: null, email: "pending", issue: "pending", statusKey: "b".repeat(64), attachments: [] }, 201);
          }
          return json({ error: "unexpected" }, 500);
        });
        const page = await context.newPage();
        await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.querySelector(".report-launcher")?.disabled === false, null, { timeout: 30000 });
        await page.getByRole("button", { name: "Request a feature / Report a bug" }).click();
        await page.getByRole("textbox", { name: "What component do you want?", exact: true }).fill(`Late save ${delay}.${run}`);
        await page.getByRole("textbox", { name: "How would you use it?", exact: true }).fill("Timing check.");
        await page.getByRole("textbox", { name: "Your email", exact: true }).fill("late-save@example.com");
        await page.getByRole("button", { name: "Review request", exact: true }).click();
        await page.evaluate(() => { window.__delayScheduler = true; });
        await page.getByRole("button", { name: "Send request", exact: true }).click();
        await page.locator(".report-sent-banner").waitFor({ timeout: 60000 });
        await page.evaluate(() => { window.__delayScheduler = false; });
        await page.waitForTimeout(500);
        // Leaving the page flushes any save still queued; the receipt must not be what it writes.
        await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
        await page.waitForTimeout(500);
        if (await storedReceipt(page)) hits.push(`${delay}ms run ${run}`);
        await context.close();
      }
    }
  } finally { await browser.close(); }
  assert.deepEqual(hits, [], "A sent receipt was written back into the request draft");
});
