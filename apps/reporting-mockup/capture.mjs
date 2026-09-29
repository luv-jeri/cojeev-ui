// Captures every mockup state with Playwright. Start the mockup first: npm run reporting:mockup
// Usage: node apps/reporting-mockup/capture.mjs [--only=<text in the file name>]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../.work/reporting-mockup");
const base = "http://127.0.0.1:4331/";
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7);

const DESKTOP = { width: 1440, height: 1000 };
const PHONE = { width: 390, height: 844 };
const LIGHT = ["light"];
const BOTH = ["light", "dark"];

const CORE = ["request-edit", "bug-edit", "request-review", "bug-review", "request-receipt", "bug-receipt"];
const EXTRA = ["request-suggestions", "request-joining", "bug-details-review", "bug-receipt-delivery", "bug-info-popover", "request-more-menu"];
const F_EXTRA = [
  "request-sent-banner", "sent-list-collapsed", "sent-detail", "capture-progress-1", "capture-progress-3",
  "track-received", "track-closed", "track-not-found",
];
const EMAILS = ["email-received", "email-tracked", "email-closed", "email-fixed"];

// group, caption, state, sizes, modes, bottom (also capture the pane scrolled to its end at 390)
const jobs = [];
const add = (group, state, caption, sizes, modes, bottom = false) => jobs.push({ group, state, caption, sizes, modes, bottom });
const captions = {
  "request-edit": "Request, edit (empty)", "bug-edit": "Bug, edit (filled)", "request-review": "Request, review",
  "bug-review": "Bug, review", "request-receipt": "Request, receipt", "bug-receipt": "Bug, receipt",
  "request-suggestions": "Request, suggestions", "request-joining": "Request, joining a request",
  "bug-details-review": "Bug, browser details reviewed", "bug-receipt-delivery": "Bug, receipt with Delivery details open",
  "bug-info-popover": "Bug, info popover", "request-more-menu": "Request, More menu",
  "bug-sent-banner": "Bug, fresh form after sending (banner)", "request-sent-banner": "Request, fresh form after sending (banner)",
  "sent-list-collapsed": "Sent list, collapsed", "sent-list-expanded": "Sent list, expanded", "sent-detail": "Sent list, one row open",
  "pin-mode": "Pin mode", "capture-progress-1": "Capture progress, step 1", "capture-progress-2": "Capture progress, step 2 (elapsed line)",
  "capture-progress-3": "Capture progress, step 3", "track-received": "Tracking page, received (request)",
  "track-tracked": "Tracking page, tracked (bug)", "track-closed": "Tracking page, closed", "track-not-found": "Tracking page, not found",
  "email-received": "Email, received", "email-tracked": "Email, tracked", "email-closed": "Email, closed", "email-fixed": "Email, fixed",
};
for (const s of CORE) add("Form", s, captions[s], [DESKTOP, PHONE], BOTH, true);
for (const s of EXTRA) add("Form", s, captions[s], [DESKTOP], LIGHT);
for (const s of ["bug-info-popover", "request-more-menu"]) add("Form", s, captions[s], [PHONE], LIGHT);
add("Sent list (F1, F2)", "bug-sent-banner", captions["bug-sent-banner"], [DESKTOP, PHONE], BOTH, true);
add("Sent list (F1, F2)", "sent-list-expanded", captions["sent-list-expanded"], [DESKTOP, PHONE], BOTH, true);
add("Pins (F3, F4)", "pin-mode", captions["pin-mode"], [DESKTOP, PHONE], BOTH);
add("Capture progress (F5)", "capture-progress-2", captions["capture-progress-2"], [DESKTOP, PHONE], BOTH);
add("Tracking page (F6)", "track-tracked", captions["track-tracked"], [DESKTOP, PHONE], BOTH);
for (const s of F_EXTRA) {
  const group = s.startsWith("capture") ? "Capture progress (F5)" : s.startsWith("track") ? "Tracking page (F6)" : "Sent list (F1, F2)";
  add(group, s, captions[s], [DESKTOP, PHONE], LIGHT);
}
for (const s of EMAILS) add("Emails (F6)", s, captions[s], [DESKTOP, PHONE], s === "email-received" || s === "email-tracked" ? BOTH : LIGHT);

const groupOrder = ["Form", "Sent list (F1, F2)", "Pins (F3, F4)", "Capture progress (F5)", "Tracking page (F6)", "Emails (F6)"];
const names = [];
const log = [];
const problems = [];
const say = (line) => { log.push(line); console.log(line); };

function fileName(state, width, mode, bottom) {
  return `${state}-${width}-${mode}${bottom ? "-bottom" : ""}.png`;
}

// Scroll the drawer's pane (or the page) to its end.
async function scrollToEnd(page) {
  await page.evaluate(() => {
    const roots = [document.querySelector('[role="dialog"]') ?? document.body, document.scrollingElement];
    let best = null;
    for (const root of roots) {
      for (const el of [root, ...root.querySelectorAll("*")]) {
        if (!el || el.scrollHeight <= el.clientHeight + 2) continue;
        const overflow = getComputedStyle(el).overflowY;
        if (el !== document.scrollingElement && overflow !== "auto" && overflow !== "scroll") continue;
        if (!best || el.scrollHeight - el.clientHeight > best.scrollHeight - best.clientHeight) best = el;
      }
    }
    if (best) best.scrollTop = best.scrollHeight;
  });
  await page.waitForTimeout(400);
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

const browser = await chromium.launch();
fs.mkdirSync(out, { recursive: true });
try {
  await fetch(base);
} catch {
  console.error(`The mockup is not running at ${base}. Start it with: npm run reporting:mockup`);
  process.exit(1);
}

for (const job of jobs) {
  const isEmail = job.state.startsWith("email-");
  for (const size of job.sizes) {
    for (const mode of job.modes) {
      const phone = size.width === PHONE.width;
      const variants = phone && job.bottom ? [false, true] : [false];
      for (const bottom of variants) {
        const name = fileName(job.state, size.width, mode, bottom);
        if (only && !name.includes(only)) continue;
        const context = await browser.newContext({
          viewport: size,
          colorScheme: mode,
          reducedMotion: "no-preference",
          isMobile: phone,
          hasTouch: phone,
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => problems.push(`${name}: page error: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") problems.push(`${name}: console error: ${message.text()}`);
        });
        const url = isEmail
          ? pathToFileURL(path.join(here, "emails", `${job.state.slice(6)}.html`)).href
          : `${base}?state=${job.state}&mode=${mode}`;
        await page.goto(url, { waitUntil: "load" });
        await settle(page);
        if (bottom) await scrollToEnd(page);
        // Horizontal overflow is a failure at any width: the document must not scroll sideways.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
        await page.screenshot({ path: path.join(out, name) });
        names.push({ name, group: job.group, caption: `${job.caption} · ${size.width}px · ${mode}${bottom ? " · scrolled to the end" : ""}` });
        say(`captured ${name}`);
        await context.close();
      }
    }
  }
}
await browser.close();

if (!only) {
  const sections = groupOrder
    .map((group) => {
      const items = names.filter((item) => item.group === group);
      return `<section><h2>${group}</h2><div class="grid">${items
        .map((item) => `<figure><a href="${item.name}"><img loading="lazy" src="${item.name}" alt="${item.caption}"></a><figcaption>${item.caption}<br><code>${item.name}</code></figcaption></figure>`)
        .join("")}</div></section>`;
    })
    .join("\n");
  fs.writeFileSync(
    path.join(out, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>000h reporting look: contact sheet</title>
<style>body{margin:0;padding:24px;background:#f8f6f1;color:#26282d;font:14px/1.4 system-ui,sans-serif}h1{font-size:22px}h2{margin:40px 0 12px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;align-items:start}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #b4b0ab;border-radius:8px;background:#fff}figcaption{margin-top:6px;font-size:12px}code{color:#464951}</style></head>
<body><h1>000h reporting look: ${names.length} captures</h1>${sections}</body></html>`,
  );
}
fs.writeFileSync(path.join(out, "capture.log"), [...log, "", `problems: ${problems.length}`, ...problems].join("\n") + "\n");
console.log(`${names.length} captures, ${problems.length} problems`);
for (const problem of problems) console.log(`  ${problem}`);
process.exit(problems.length ? 1 : 0);
