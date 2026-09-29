// Runs the triage dashboard against the LOCAL Worker. Start `npm run reporting:dev` first (http://localhost:8787).
// Not part of `npm test`: node tests/triage-dashboard.browser.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const api = "http://localhost:8787", dash = "http://127.0.0.1:4330";
const output = process.env.TRIAGE_BROWSER_OUTPUT ?? ".work/reporting/triage-browser";
const config = await fetch(`${api}/v1/config`).then(r => r.json()).catch(() => assert.fail("Start `npm run reporting:dev` first."));
assert.equal(config.local, true, "Only run against an explicitly local reporting service.");
const token = (await readFile(".work/reporting/local-admin-token", "utf8")).trim();
await mkdir(output, { recursive: true });

const admin = (path, init = {}) => fetch(`${api}/v1/admin${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Origin: api, "Content-Type": "application/json" } });
const run = randomBytes(3).toString("hex");
async function seed(kind, title) {
  const id = randomUUID();
  const res = await fetch(`${api}/v1/reports`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3100" },
    body: JSON.stringify({ token: randomBytes(32).toString("hex"), report: { id, kind, title, description: `Local triage check ${run}. Something specific and long enough.`, email: `triage-${run}@example.com`, references: [], pins: [], attachments: [], diagnostics: null } }),
  });
  assert.ok(res.ok, `seed ${kind}: ${res.status} ${await res.text()}`);
  return id;
}
const verdict = (id, decision, title) => admin(`/reports/${id}/triage`, { method: "PUT", body: JSON.stringify({ decision, by: "ai", reason: "Seeded verdict.", title, body: `Drafted body for ${title}.`, model: "seed" }) }).then(r => assert.ok(r.ok, `verdict ${r.status}`));

const bugTitle = `Approved bug ${run}`, reqTitle = `Rejected request ${run}`, waitTitle = `Waiting report ${run}`;
const bug = await seed("bug", `Raw bug ${run}`), req = await seed("request", `Raw request ${run}`);
await seed("bug", waitTitle);
await verdict(bug, "approved", bugTitle); await verdict(req, "rejected", reqTitle);

const vite = spawn("npx", ["vite", "--config", "apps/triage/vite.config.ts"], { env: { ...process.env, TRIAGE_API: api, REPORTING_ADMIN_TOKEN: token }, stdio: ["ignore", "pipe", "pipe"] });
let viteLog = ""; vite.stdout.on("data", d => viteLog += d); vite.stderr.on("data", d => viteLog += d);
const results = [], failures = [], bodies = [];
const test = async (name, fn) => { try { await fn(); results.push(`ok: ${name}`); } catch (e) { failures.push(`${name}\n${e.stack ?? e}`); } };
let browser;
try {
  for (let i = 0; ; i++) { if (await fetch(dash).then(r => r.ok, () => false)) break; assert.ok(i < 100 && vite.exitCode === null, `Vite did not start:\n${viteLog}`); await new Promise(r => setTimeout(r, 250)); }
  browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })).newPage();
  const pageErrors = []; page.on("pageerror", e => pageErrors.push(e.message));
  const requestSecrets = [];
  page.on("request", r => { if (JSON.stringify([r.url(), r.headers(), r.postData()]).includes(token)) requestSecrets.push(r.url()); });
  page.on("response", async r => { try { bodies.push([r.url(), await r.text()]); } catch { /* redirects and empty bodies have none */ } });
  await page.goto(dash, { waitUntil: "networkidle" });
  const row = title => page.locator(".tri-row", { hasText: title });
  const pick = title => page.getByRole("button", { name: title, exact: true });
  // The views live in the sidebar; each button's name is its label plus its count.
  const view = name => page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: new RegExp(`^${name} \\d+$`) });
  const apiState = async id => (await (await admin(`/reports/${id}`)).json()).report;

  await test("counts, tabs and trust badges render from the API", async () => {
    const { counts } = await (await admin("/reports?offset=0")).json();
    for (const [label, n] of [["Needs your check", counts.unverified], ["Approved", counts.approved], ["Rejected", counts.rejected], ["Waiting for AI", counts.pending], ["All", counts.pending + counts.approved + counts.rejected]]) {
      assert.equal((await view(label).locator(".v-nav__count").textContent()).trim(), String(n), label);
    }
    await pick(bugTitle).waitFor();
    assert.ok(await row(bugTitle).getByText("AI only — not re-verified").isVisible());
    await view("Rejected").click(); await pick(reqTitle).waitFor();
    assert.ok(await row(reqTitle).getByText("Rejected", { exact: true }).first().isVisible());
    await view("Waiting for AI").click(); await pick(waitTitle).waitFor();
    assert.ok(await row(waitTitle).getByText("Waiting for AI").first().isVisible());
    await view("Approved").click(); await pick(bugTitle).waitFor();
    await view("All").click(); await pick(bugTitle).waitFor(); await pick(reqTitle).waitFor(); await pick(waitTitle).waitFor();
    await view("Needs your check").click(); await pick(bugTitle).waitFor();
  });

  await test("the waiting hint shows npm run triage with the pending count", async () => {
    const { counts } = await (await admin("/reports?offset=0")).json();
    const hint = page.locator("p.tri-hint").first();
    assert.equal((await hint.textContent()).replace(/\s+/g, " ").trim(), `Run npm run triage to process ${counts.pending} waiting ${counts.pending === 1 ? "report" : "reports"}.`);
    await view("Waiting for AI").click(); await pick(waitTitle).click();
    await page.getByText("Waiting for the AI — run", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Mark verified|Overturn/ }).count(), 0, "pending reports offer no decision buttons");
    await view("Needs your check").click();
  });

  await test("mark verified calls POST verify and flips the badge", async () => {
    await pick(bugTitle).click();
    const posted = page.waitForRequest(r => r.method() === "POST" && r.url().endsWith(`/api/reports/${bug}/verify`));
    await page.getByRole("button", { name: "Mark verified", exact: true }).click(); await posted;
    // The row leaves this view, so focus goes to the heading of the report that took its place, never <body>.
    await page.waitForFunction(() => document.activeElement?.matches(".tri-panel__head h2"));
    await view("Approved").click(); await pick(bugTitle).waitFor();
    await row(bugTitle).getByText("Verified by you").waitFor();
    assert.ok((await apiState(bug)).verified_at);
  });

  await test("action errors show inline in plain words and the list reloads", async () => {
    await pick(bugTitle).click();
    await page.route(`**/api/reports/${bug}/triage`, r => r.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "This report has expired." }) }));
    await page.getByRole("button", { name: /^Overturn/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "This report has expired." }).waitFor();
    await page.unroute(`**/api/reports/${bug}/triage`);
    assert.equal((await apiState(bug)).triage_state, "approved");
  });

  await test("overturn shows the consequence text before calling PUT with by:owner", async () => {
    await view("Rejected").click(); await pick(reqTitle).click();
    await page.getByRole("button", { name: "Overturn → Approve", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByText("Publishes a GitHub issue (or links the existing one for this request) and emails the reporter.").waitFor();
    assert.equal((await apiState(req)).triage_state, "rejected", "nothing is sent before confirming");
    const put = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith(`/api/reports/${req}/triage`));
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    assert.deepEqual((await put).postDataJSON(), { decision: "approved", by: "owner" });
    await page.waitForFunction(async id => (await (await fetch(`/api/reports/${id}`)).json()).report.triage_state === "approved", req);
    const after = await apiState(req); assert.equal(after.triage_by, "owner");
  });

  await test("tabs and the overturn dialog work by keyboard alone", async () => {
    await page.reload({ waitUntil: "networkidle" });
    const active = name => page.locator('.tri-rail [aria-current="page"]', { hasText: name }).waitFor();
    await view("Needs your check").focus();
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await active("Approved");
    await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Enter"); await active("Needs your check");
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Enter"); await active("All");
    await pick(bugTitle).waitFor();
    const onRow = () => page.evaluate(() => document.activeElement?.className === "tri-pick");
    for (let i = 0; i < 5 && !(await onRow()); i++) await page.keyboard.press("Tab"); // theme switch and Refresh come first
    assert.ok(await onRow(), "Tab from the views reaches a row button");
    await page.keyboard.press("Home");
    const first = await page.evaluate(() => document.activeElement?.textContent);
    await page.keyboard.press("ArrowDown");
    assert.ok(await page.evaluate(t => document.activeElement?.className === "tri-pick" && document.activeElement.textContent !== t && document.activeElement.getAttribute("aria-current") === "true", first), "ArrowDown moves to and selects the next row");
    await pick(bugTitle).focus(); await page.keyboard.press("Enter");
    const overturn = page.getByRole("button", { name: /^Overturn/ });
    await overturn.waitFor();
    for (let i = 0; i < 200 && !(await overturn.evaluate(n => n === document.activeElement)); i++) await page.keyboard.press("Tab");
    assert.ok(await overturn.evaluate(n => n === document.activeElement), "Overturn reachable with Tab");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog"); await dialog.waitFor();
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')), "focus moves into the dialog");
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    assert.ok(await overturn.evaluate(n => n === document.activeElement), "focus returns to the trigger");
    await page.keyboard.press("Enter"); await dialog.waitFor();
    await page.keyboard.press("Enter"); await dialog.waitFor({ state: "hidden" });
    assert.equal((await apiState(bug)).triage_state, "approved", "the default keyboard action is Cancel");
  });

  // Screenshot before the asset scan: fetching /vite.config.ts makes Vite's dependency optimizer
  // try to bundle Node packages, which can reload the page mid-step.
  try {
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: /^All \d+$/ }).click(); await pick(waitTitle).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${output}/dashboard-live.png` });
  } catch (e) { failures.push(`screenshot: ${e.stack ?? e}`); }

  await test("no page request or served asset contains the admin token", async () => {
    await page.reload({ waitUntil: "networkidle" });
    // Page checks first: the Node-side fetches of /vite.config.ts and /proxy.ts below can make Vite's optimizer reload the page.
    assert.ok(!(await page.content()).includes(token), "page.content()");
    assert.deepEqual(requestSecrets, []);
    for (const p of ["/", "/main.tsx", "/dashboard.tsx", "/api.ts", "/proxy.ts", "/vite.config.ts"]) bodies.push([p, await fetch(dash + p).then(r => r.text()).catch(() => "")]);
    assert.ok(bodies.length > 8, "response bodies were captured");
    assert.ok(bodies.some(([u]) => u.endsWith(".tsx")) && bodies.some(([u]) => u.includes("/api/reports")));
    assert.deepEqual(bodies.filter(([, b]) => b.includes(token)).map(([u]) => u), []);
    // R28: the repo root is fs-allowed, so .work must be denied explicitly.
    const leak = await fetch(`${dash}/@fs${process.cwd()}/.work/reporting/local-admin-token`);
    assert.ok(!(await leak.text()).includes(token), "/@fs .work token file");
    assert.notEqual(leak.status, 200);
  });

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join("; ")}`);
} catch (e) { failures.push(e.stack ?? String(e)); }
finally { await browser?.close(); vite.kill(); }
const report = { results, failures, screenshot: `${output}/dashboard-live.png` };
await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
