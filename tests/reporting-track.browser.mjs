import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Run by scripts/run-reporting-browser.mjs, which sets POLISH_URL and REPORTING_BROWSER_API.
const base = process.env.POLISH_URL;
const api = process.env.REPORTING_BROWSER_API;
const id = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const key = "ab12".repeat(16);
const issueUrl = "https://github.com/example/repo/issues/412";
const sentAt = Date.UTC(2026, 8, 29, 12);
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" };

async function withPage(run) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ timezoneId: "UTC", locale: "en-GB" });
    await run(await context.newPage());
  } finally { await browser.close(); }
}
/** Answers every status request and records it. */
async function serve(page, respond) {
  const seen = [];
  await page.route(`${api}/v1/status/*`, route => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    seen.push({ url: request.url(), authorization: request.headers().authorization });
    const { status = 200, body = {} } = respond(request) ?? {};
    return route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
  });
  return seen;
}
const leaks = { title: "SECRET-TITLE", description: "SECRET-DESCRIPTION", email: "secret@example.com" };

test("track_page_shows_the_stage_from_the_fragment", async () => {
  const cases = [
    { name: "received", body: { kind: "request", stage: "received", attachments: 0 }, text: "Received" },
    { name: "reviewing", body: { kind: "bug", stage: "reviewing", attachments: 2 }, text: "Being reviewed" },
    { name: "tracked", body: { kind: "bug", stage: "tracked", issueNumber: 412, issueUrl, attachments: 1 }, link: "Tracked as #412" },
    { name: "fixed request", body: { kind: "request", stage: "fixed", attachments: 0 }, text: "Live", heading: "Your request" },
    { name: "fixed bug", body: { kind: "bug", stage: "fixed", attachments: 0 }, text: "Fixed", heading: "Your report" },
    { name: "closed", body: { kind: "bug", stage: "closed", attachments: 0 }, closed: true },
  ];
  for (const item of cases) await withPage(async page => {
    const seen = await serve(page, () => ({ body: { ...item.body, sentAt, ...leaks } }));
    await page.goto(`${base}/track/#${id}.${key}`);
    const result = page.getByRole("status");
    await result.getByText("Sent 29 September 2026").waitFor();
    assert.equal(seen.length, 1, item.name);
    assert.ok(new URL(seen[0].url).pathname.endsWith(`/v1/status/${id}`), item.name);
    assert.equal(seen[0].authorization, `Bearer ${key}`, item.name);
    await page.getByRole("heading", { name: item.heading ?? (item.body.kind === "bug" ? "Your report" : "Your request"), exact: true }).waitFor();
    if (item.link) {
      const link = result.getByRole("link", { name: item.link, exact: true });
      assert.equal(await link.getAttribute("href"), issueUrl);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    }
    if (item.text) assert.equal(await result.getByText(item.text, { exact: true }).isVisible(), true, item.name);
    if (item.closed) {
      await result.getByText("Closed", { exact: true }).waitFor();
      await result.getByText("We checked your report, but it isn’t something we can act on, so we’ve closed it.").waitFor();
      assert.equal(await result.locator("ol").count(), 0, "closed replaces the stepper");
    } else {
      assert.equal(await result.locator("ol li[aria-current='step']").count(), 1, item.name);
    }
    const attached = item.body.attachments;
    const line = attached === 1 ? "1 file attached" : `${attached} files attached`;
    assert.equal(await result.getByText(/files? attached/).count(), attached > 0 ? 1 : 0, item.name);
    if (attached > 0) await result.getByText(line, { exact: true }).waitFor();
    const text = await page.locator("body").innerText();
    for (const value of Object.values(leaks)) assert.ok(!text.includes(value), `${item.name} renders no ${value}`);
  });
});

test("track page reports not found for a wrong key or a malformed fragment", async () => {
  const notFound = "Check the link in your email, or open your report from the browser you sent it from.";
  await withPage(async page => {
    const seen = await serve(page, () => ({ status: 404, body: { error: "Not found" } }));
    await page.goto(`${base}/track/#${id}.${key}`);
    await page.getByRole("heading", { name: "Report not found", exact: true }).waitFor();
    await page.getByText(notFound).waitFor();
    assert.equal(seen.length, 1);
  });
  for (const hash of ["", "#abc", `#${id}.${"ab12".repeat(15)}xyz1`, `#${id}.${key.toUpperCase()}`]) await withPage(async page => {
    const seen = await serve(page, () => ({ body: {} }));
    await page.goto(`${base}/track/${hash}`);
    await page.getByRole("heading", { name: "Report not found", exact: true }).waitFor();
    await page.getByText(notFound).waitFor();
    await page.waitForTimeout(500);
    assert.equal(seen.length, 0, `no API call for ${JSON.stringify(hash)}`);
  });
  await withPage(async page => {
    let fail = true;
    const seen = await serve(page, () => fail ? { status: 500, body: {} } : { body: { kind: "bug", stage: "received", sentAt, attachments: 0 } });
    await page.goto(`${base}/track/#${id}.${key}`);
    await page.getByText("We couldn’t check this report right now. Try again in a moment.").waitFor();
    fail = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByText("Received", { exact: true }).waitFor();
    assert.equal(seen.length, 2);
  });
});

test("track page never sends the key anywhere except one Authorization header", async () => {
  await withPage(async page => {
    await serve(page, () => ({ body: { kind: "bug", stage: "received", sentAt, attachments: 0 } }));
    const requests = [];
    page.on("request", request => requests.push(request));
    await page.goto(`${base}/track/#${id}.${key}`);
    await page.getByText("Sent 29 September 2026").waitFor();
    await page.waitForTimeout(1500);
    let carriers = 0;
    for (const request of requests) {
      assert.ok(!request.url().includes(key), `url ${request.url()}`);
      assert.ok(!(request.postData() ?? "").includes(key), `body of ${request.url()}`);
      for (const [name, value] of Object.entries(await request.allHeaders())) {
        if (!value.includes(key)) continue;
        assert.equal(name, "authorization");
        assert.equal(value, `Bearer ${key}`);
        carriers += 1;
      }
    }
    assert.equal(carriers, 1, "exactly one request carries the key, in one header");
    assert.ok(page.url().endsWith(`#${id}.${key}`), "the fragment stays in the address bar");
  });
});
