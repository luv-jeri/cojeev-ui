/** The approved homepage: one profile stage, one filtered gallery, one contact close.
    Runs against a coordinated dev server (BASE_URL) or the existing static export (--serve). */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({
  configFile: false, base: "/cojeev-ui/", build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = (process.env.BASE_URL ?? (staticServer
  ? `http://127.0.0.1:${staticServer.httpServer.address().port}/cojeev-ui`
  : "http://127.0.0.1:4336/cojeev-ui")).replace(/\/$/, "");
const output = path.resolve(process.env.OUTPUT_DIR ?? "output/playwright/homepage-gallery");
await fs.mkdir(output, { recursive: true });
/** CHECK_ONLY narrows a local red/green run; the report carries it so a partial run cannot read as a full pass. */
const only = process.env.CHECK_ONLY ?? "";
const report = { startedAt: new Date().toISOString(), base, checks: [], filtered: only || null };

async function record(name, run) {
  if (only && !name.includes(only)) return;
  try {
    report.checks.push({ name, status: "PASS", evidence: await run() });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: "FAIL", error: error.stack });
    console.log(`FAIL ${name}\n${error.stack}`);
  }
}

const browser = await chromium.launch();
/** Every context blocks the analytics host so verification never sends synthetic events. */
async function open(browserContextOptions = {}, prepare) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ...browserContextOptions });
  await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
  if (prepare) await context.addInitScript(prepare);
  const page = await context.newPage();
  // A dev server compiles a route on first request, so give navigation real headroom.
  page.setDefaultTimeout(Number(process.env.CHECK_TIMEOUT ?? 20000));
  page.setDefaultNavigationTimeout(Number(process.env.CHECK_NAV_TIMEOUT ?? 45000));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-profile-stage]").waitFor();
  // The shared morph runtime only marks a host once React has hydrated this page.
  await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
  return { context, page, errors };
}

const fieldSelector = '[data-profile-stage] [data-slot="pigment-field"]';
const stageOf = page => page.locator("[data-profile-stage]");
const liveOf = page => page.locator("[data-profile-live]");
const galleryOf = page => page.locator("#featured-components");
const visibleSpecimens = async page =>
  (await galleryOf(page).locator("[data-featured-component]:not([hidden])").evaluateAll(nodes => nodes.map(node => node.dataset.featuredComponent))).sort();

try {
  await record("the stage offers three treatments and each one changes the live composition", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    const evidence = {};
    for (const [label, treatment] of [["Classic", "classic"], ["Fold", "fold"], ["Stack", "stack"]]) {
      await stage.getByRole("button", { name: label, exact: true }).click();
      await page.waitForFunction(value => document.querySelector("[data-profile-stage]")?.dataset.treatment === value, treatment);
      assert.equal(await stage.getByRole("button", { name: label, exact: true }).getAttribute("aria-pressed"), "true", `${label} must report itself as the selected treatment`);
      assert.equal(await liveOf(page).getAttribute("data-treatment"), treatment, `${label} must promote the ${treatment} composition`);
      assert.equal(await liveOf(page).count(), 1, "Only one live profile may be selected at a time");
      // A distinct treatment is a different composition: measured geometry, not a class string.
      evidence[treatment] = await liveOf(page).evaluate(node => {
        const box = name => {
          const part = node.querySelector(`[data-profile-part="${name}"]`);
          if (!part || part.hidden) return null;
          const rect = part.getBoundingClientRect();
          return { x: Math.round(rect.x), y: Math.round(rect.y), right: Math.round(rect.right) };
        };
        const avatar = box("avatar"), identity = box("identity");
        return JSON.stringify({
          shown: [...node.querySelectorAll("[data-profile-part]")].filter(part => !part.hidden).map(part => part.dataset.profilePart),
          identityBesideAvatar: Boolean(avatar && identity && identity.x >= avatar.right - 4),
          sheets: node.querySelectorAll(".profile-live__sheet:not([hidden])").length,
        });
      });
      const quiet = await stage.locator("[data-profile-preview]").all();
      assert.equal(quiet.length, 2, "The two unselected treatments stay as quiet previews");
      for (const preview of quiet) {
        assert.equal(await preview.locator("button,a,input,textarea,select,[tabindex]").count(), 0, "A quiet preview must not nest interactive controls");
        assert.match(await preview.getAttribute("aria-label") ?? "", /^Show the (Classic|Fold|Stack) treatment$/);
      }
    }
    assert.equal(new Set(Object.values(evidence)).size, 3, `Classic, Fold and Stack must differ structurally: ${JSON.stringify(evidence)}`);
    await stage.locator("[data-profile-preview]").first().click();
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "classic");
    assert.deepEqual(errors, []);
    await context.close();
    return evidence;
  });

  await record("the assembly paints named parts in order, settles, and survives interruption", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    const order = ["surface", "avatar", "identity", "bio", "actions"];
    const settleTimes = async () => stage.evaluate((node, names) => Object.fromEntries(names.map(name => {
      const part = node.querySelector(`[data-profile-part="${name}"]`);
      return [name, part && !part.hidden ? Number(part.dataset.paintSettled ?? NaN) : null];
    })), order);
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "settled");
    // An interrupted replay must be abandoned, not raced: fire a second one mid-paint.
    await stage.getByRole("button", { name: "Replay assembly", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "painting");
    // Measured against the stage, so a page that is still smooth-scrolling cannot fake a move.
    const seat = () => stage.evaluate(node => {
      const part = node.querySelector('[data-profile-part="actions"]').getBoundingClientRect(), host = node.getBoundingClientRect();
      return { x: Math.round(part.x - host.x), y: Math.round(part.y - host.y), width: Math.round(part.width) };
    });
    const frozen = await seat();
    await stage.getByRole("button", { name: "Replay assembly", exact: true }).click();
    const moving = await seat();
    const dim = await stage.locator('[data-profile-part="actions"]').evaluate(node => Number(getComputedStyle(node).opacity));
    // Mid-paint, the follow control must still take focus and still be the top element at its own centre.
    const follow = stage.locator('[data-profile-part="actions"] button').first();
    await follow.focus();
    const reachable = await follow.evaluate(node => {
      const box = node.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
      const masked = [...document.querySelectorAll("[data-profile-live] *")].some(element =>
        element.contains(node) && getComputedStyle(element).clipPath !== "none");
      return { focusable: node === document.activeElement, hitTested: node === top || node.contains(top), masked };
    });
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "settled");
    const times = await settleTimes();
    const sequenced = order.filter(name => times[name] !== null).map(name => times[name]);
    assert.ok(sequenced.every(Number.isFinite), `Every visible part must record when it settled: ${JSON.stringify(times)}`);
    assert.deepEqual(sequenced, [...sequenced].sort((a, b) => a - b), `Parts must settle in the assembly order: ${JSON.stringify(times)}`);
    assert.ok(new Set(sequenced).size >= 4, `Parts must settle at distinct times, not together: ${JSON.stringify(times)}`);
    assert.ok(sequenced.at(-1) < 4000, `The assembly must be finite: ${JSON.stringify(times)}`);
    assert.equal(await stage.getAttribute("data-sequence"), "2");
    // The hit target never travels and never disappears while the assembly runs.
    assert.deepEqual(moving, frozen, "Interactive parts must not move during the assembly");
    assert.ok(dim >= 0.2, `Interactive parts must stay visible during the assembly, got opacity ${dim}`);
    assert.deepEqual(reachable, { focusable: true, hitTested: true, masked: false }, `Controls must stay keyboard reachable and unmasked while the assembly runs: ${JSON.stringify(reachable)}`);
    assert.deepEqual(errors, []);
    await context.close();
    return times;
  });

  await record("replay restarts the paint sequence and keeps follow, save and the local note", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    await stage.getByRole("button", { name: "Fold", exact: true }).click();
    await stage.getByRole("button", { name: "Follow", exact: true }).click();
    const follow = stage.getByRole("button", { name: /^Follow(ing)?$/ });
    await stage.getByRole("button", { name: "Save profile", exact: true }).click();
    await stage.getByRole("button", { name: "Message", exact: true }).click();
    const note = stage.getByRole("textbox", { name: "Your note", exact: true });
    await note.fill("A note that must survive a replay.");
    await stage.getByRole("button", { name: "Keep note", exact: true }).click();
    await stage.locator("[data-profile-notes] li").filter({ hasText: "A note that must survive a replay." }).waitFor();
    await note.fill("Still being written.");
    await page.evaluate(() => {
      window.__note = document.querySelector("[data-profile-stage] [data-profile-note]");
      window.__follow = document.querySelector('[data-profile-part="actions"] button');
    });
    const before = Number(await stage.getAttribute("data-sequence"));
    await stage.getByRole("button", { name: "Replay assembly", exact: true }).click();
    await page.waitForFunction(value => Number(document.querySelector("[data-profile-stage]")?.dataset.sequence) > value, before);
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "painting");
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "settled");
    assert.equal(await page.evaluate(() => window.__note === document.querySelector("[data-profile-stage] [data-profile-note]")), true, "Replay must not remount the form");
    assert.equal(await note.inputValue(), "Still being written.", "An unkept draft survives the replay");
    assert.equal(await stage.locator("[data-profile-notes] li").innerText(), "A note that must survive a replay.", "The kept note keeps its actual content");
    assert.equal(await stage.getAttribute("data-treatment"), "fold");
    // A treatment is a different composition of the same nodes, not a rebuilt lookalike.
    await stage.getByRole("button", { name: "Stack", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "stack");
    assert.equal(await page.evaluate(() => window.__note === document.querySelector("[data-profile-stage] [data-profile-note]") && window.__follow === document.querySelector('[data-profile-part="actions"] button')), true, "Switching a treatment must keep the same native controls");
    assert.equal(await note.inputValue(), "Still being written.");
    assert.equal(await stage.locator("[data-profile-notes] li").innerText(), "A note that must survive a replay.");
    assert.equal(await follow.getAttribute("aria-pressed"), "true");
    assert.equal(await follow.innerText(), "Following", "The follow control keeps its own state through a replay");
    assert.equal(await stage.getByRole("button", { name: "Save profile", exact: true }).getAttribute("aria-pressed"), "true");
    const sequence = await stage.getAttribute("data-sequence");
    assert.deepEqual(errors, []);
    await context.close();
    return { sequence };
  });

  await record("the local note reports only what actually happened", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    await stage.getByRole("button", { name: "Message", exact: true }).click();
    const keep = stage.getByRole("button", { name: "Keep note", exact: true });
    assert.equal(await keep.isDisabled(), true, "An empty note cannot be kept");
    await stage.getByRole("textbox", { name: "Your note", exact: true }).fill("Kept locally.");
    await keep.click();
    assert.deepEqual(await stage.locator("[data-profile-notes] li").allInnerTexts(), ["Kept locally."], "A kept note must actually retain what was written");
    const status = await stage.getByRole("status").innerText();
    assert.match(status, /this page/i, `Local feedback must say where the note went: ${status}`);
    assert.doesNotMatch(status, /\b(sent|delivered|received|posted)\b/i, `Local feedback must never claim a remote send: ${status}`);
    assert.deepEqual(errors, []);
    await context.close();
    return { status };
  });

  await record("rapid treatment switching settles on the latest intent", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    for (const label of ["Stack", "Classic", "Fold", "Stack", "Fold"]) await stage.getByRole("button", { name: label, exact: true }).click({ delay: 0 });
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "fold");
    assert.equal(await liveOf(page).getAttribute("data-treatment"), "fold");
    assert.equal(await stage.locator('[role="group"] button[aria-pressed="true"]').count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
    return { settled: "fold" };
  });

  await record("the treatment selector is reachable and operable from the keyboard", async () => {
    const { context, page, errors } = await open();
    const stage = stageOf(page);
    const fold = stage.getByRole("button", { name: "Fold", exact: true });
    await fold.focus();
    assert.equal(await fold.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "fold");
    const replay = stage.getByRole("button", { name: "Replay assembly", exact: true });
    await replay.focus();
    const ring = await replay.evaluate(node => {
      const style = getComputedStyle(node);
      return { focusVisible: node.matches(":focus-visible"), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
    });
    assert.equal(ring.focusVisible, true, `Keyboard focus must reach the focus-visible state: ${JSON.stringify(ring)}`);
    assert.notEqual(ring.outlineStyle, "none", `Keyboard focus must draw a visible indicator: ${JSON.stringify(ring)}`);
    assert.ok(ring.outlineWidth > 0, `The focus indicator must have real width: ${JSON.stringify(ring)}`);
    await page.keyboard.press(" ");
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.phase === "settled");
    assert.deepEqual(errors, []);
    await context.close();
    return { ring };
  });

  await record("the gallery shows four bounded live components with separate documentation links", async () => {
    const { context, page, errors } = await open();
    const gallery = galleryOf(page);
    assert.deepEqual(await visibleSpecimens(page), ["bento-grid", "command", "motion-drawer", "slider"]);
    for (const [id, title] of [["slider", "Rubber Slider"], ["motion-drawer", "Motion Drawer"], ["bento-grid", "Bento Grid"], ["command", "Command"]]) {
      const article = gallery.locator(`[data-featured-component="${id}"]`);
      await article.getByRole("heading", { name: title, exact: true }).waitFor();
      assert.ok((await article.locator("p").first().innerText()).trim().length > 8, `${title} needs a stated purpose`);
      const docs = article.getByRole("link", { name: `${title} documentation`, exact: true });
      assert.match(await docs.getAttribute("href"), new RegExp(`/docs/${id}/$`), `${title} needs its own documentation link`);
    }
    // Each preview is the real component, not a picture of one.
    await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().focus();
    const before = await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().getAttribute("aria-valuenow");
    await page.keyboard.press("ArrowRight");
    assert.notEqual(await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().getAttribute("aria-valuenow"), before, "The rubber slider must move");
    await gallery.getByRole("button", { name: "Open drawer", exact: true }).click();
    await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor({ state: "hidden" });
    assert.ok(await gallery.locator('[data-featured-component="bento-grid"] [data-bento-tile]').count() >= 4, "The bento grid renders real tiles");
    const search = gallery.getByRole("combobox", { name: "Search components", exact: true });
    await search.fill("dial");
    await gallery.getByRole("option", { name: /Dialog/ }).first().waitFor();
    await page.keyboard.press("Enter");
    await page.waitForURL(url => url.pathname.endsWith("/docs/dialog/"), { timeout: 45000 });
    assert.deepEqual(errors, []);
    await context.close();
    return { navigated: "/docs/dialog/" };
  });

  await record("filters change the contents and never erase intentional state", async () => {
    const { context, page, errors } = await open();
    const gallery = galleryOf(page);
    await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().focus();
    for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
    const moved = await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().getAttribute("aria-valuenow");
    const sets = {};
    for (const label of ["Motion", "Layout", "Featured"]) {
      await gallery.getByRole("button", { name: label, exact: true }).click();
      await page.waitForFunction(value => document.querySelector("#featured-components")?.dataset.filter === value.toLowerCase(), label);
      assert.equal(await gallery.getByRole("button", { name: label, exact: true }).getAttribute("aria-pressed"), "true");
      sets[label] = await visibleSpecimens(page);
      assert.equal(sets[label].length, 4, `${label} must show a full shelf`);
    }
    assert.equal(new Set(Object.values(sets).map(list => list.join(","))).size, 3, `Each filter must show genuinely different contents: ${JSON.stringify(sets)}`);
    assert.equal(await gallery.locator('[data-featured-component="slider"] [role="slider"]').first().getAttribute("aria-valuenow"), moved, "Filtering must not erase a value the reader set");
    assert.deepEqual(errors, []);
    await context.close();
    return sets;
  });

  await record("the two grouped previews keep one compact pill of choices, not a bare button row", async () => {
    const evidence = {};
    // Both specimens live outside the default Featured filter, so nothing else in this suite ever renders them.
    const grouped = [
      ["Motion", "agent-state", "agent-state", "status", [["Work", "working"], ["Done", "complete"], ["Think", "thinking"]]],
      ["Layout", "pattern-background", "pattern-background", "pattern", [["Pebbles", "pebbles"], ["Folds", "folds"], ["Weave", "weave"]]],
    ];
    for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
      const { context, page, errors } = await open({ viewport });
      const gallery = galleryOf(page);
      for (const [filter, id, slot, attribute, choices] of grouped) {
        await gallery.getByRole("button", { name: filter, exact: true }).click();
        await page.waitForFunction(value => document.querySelector("#featured-components")?.dataset.filter === value, filter.toLowerCase());
        const specimen = gallery.locator(`[data-featured-component="${id}"]`);
        const group = specimen.locator(".launch-choices");
        await group.waitFor();
        // Measured paint and geometry, because a bare unstyled row is still operable and no other gate sees it.
        const layout = await group.evaluate(node => {
          const style = getComputedStyle(node), box = node.getBoundingClientRect();
          const demo = node.closest(".launch-specimen-demo").getBoundingClientRect();
          const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
          const buttons = [...node.querySelectorAll('[data-slot="button"]')].map(button => {
            const rect = button.getBoundingClientRect(), own = getComputedStyle(button);
            return { top: Math.round(rect.top), font: parseFloat(own.fontSize), inline: parseFloat(own.paddingInlineStart) };
          });
          return {
            display: style.display,
            painted: channels.length === 3 || (channels.length === 4 && channels[3] > 0),
            background: style.backgroundColor,
            padding: parseFloat(style.paddingTop),
            radius: parseFloat(style.borderTopLeftRadius),
            height: Math.round(box.height),
            rows: new Set(buttons.map(button => button.top)).size,
            inside: box.left >= demo.left - 1 && box.right <= demo.right + 1,
            font: Math.max(...buttons.map(button => button.font)),
            inline: Math.max(...buttons.map(button => button.inline)),
            buttons: buttons.length,
          };
        });
        const where = `${id} at ${viewport.width}px`;
        assert.equal(layout.buttons, 3, `${where} must offer its three choices: ${JSON.stringify(layout)}`);
        assert.equal(layout.display, "flex", `${where} must group its choices in one row: ${JSON.stringify(layout)}`);
        assert.equal(layout.painted, true, `${where} must paint the group, not leave a bare button row: ${JSON.stringify(layout)}`);
        assert.ok(layout.padding > 0, `${where} must inset its choices from the group edge: ${JSON.stringify(layout)}`);
        assert.ok(layout.radius >= layout.height / 2, `${where} must read as a pill: ${JSON.stringify(layout)}`);
        assert.equal(layout.rows, 1, `${where} must keep every choice on one row: ${JSON.stringify(layout)}`);
        assert.equal(layout.inside, true, `${where} must stay inside its bounded demo: ${JSON.stringify(layout)}`);
        // A 202px demo box carries smaller controls than the page's own filter pills.
        assert.ok(layout.font <= 12 && layout.inline <= 12, `${where} must use the small shared button sizing: ${JSON.stringify(layout)}`);
        for (const [label, value] of choices) {
          const choice = group.getByRole("button", { name: label, exact: true });
          await choice.click();
          await page.waitForFunction(([selector, key, expected]) => document.querySelector(selector)?.dataset[key] === expected,
            [`[data-featured-component="${id}"] [data-slot="${slot}"]`, attribute, value]);
          assert.equal(await choice.getAttribute("aria-pressed"), "true", `${where}: ${label} must report itself as chosen`);
        }
        evidence[`${viewport.width}-${id}`] = layout;
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    return evidence;
  });

  await record("the contact close keeps the verified contact routes, privacy and motion controls", async () => {
    const { context, page, errors } = await open();
    const contact = page.locator("[data-contact-close]");
    await contact.getByRole("heading", { name: "Like how this feels?", exact: true }).waitFor();
    assert.match(await contact.getByRole("link", { name: /Work with me/ }).getAttribute("href"), /\/work-with-me\/$/);
    assert.match(await contact.getByRole("link", { name: /GitHub/ }).getAttribute("href"), /^https:\/\/github\.com\//);
    assert.equal(await page.locator("[data-contact-close] form, [data-contact-close] input").count(), 0, "The homepage must not imply an unverified contact form");
    const footer = page.locator(".story-footer");
    await footer.getByRole("link", { name: "Privacy", exact: true }).waitFor();
    await footer.locator(".story-motion-control").waitFor();
    // The decorative wave must never clip the focusable close.
    const clipped = await contact.evaluate(node => {
      const link = node.querySelector("a");
      const box = link.getBoundingClientRect(), host = node.getBoundingClientRect();
      return box.top < host.top || box.bottom > host.bottom || getComputedStyle(node).overflow === "hidden" && box.height === 0;
    });
    assert.equal(clipped, false, "Decorative paint must not clip the contact actions");
    assert.deepEqual(errors, []);
    await context.close();
    return { ok: true };
  });

  await record("a touch viewport keeps one live card and the labelled treatment selector", async () => {
    const { context, page, errors } = await open({ viewport: { width: 390, height: 844 } });
    const stage = stageOf(page);
    const shown = await stage.locator("[data-profile-preview]").evaluateAll(nodes => nodes.filter(node => node.getClientRects().length > 0).length);
    assert.equal(shown, 0, "A touch viewport shows one live card, not three");
    assert.equal(await liveOf(page).isVisible(), true);
    for (const label of ["Classic", "Fold", "Stack"]) {
      assert.equal(await stage.getByRole("button", { name: label, exact: true }).isVisible(), true, `${label} must stay reachable on a touch viewport`);
    }
    await stage.getByRole("button", { name: "Stack", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "stack");
    assert.equal(await liveOf(page).getAttribute("data-treatment"), "stack");
    assert.deepEqual(errors, []);
    await context.close();
    return { previewsShown: shown };
  });

  await record("the skip link rests off screen, appears on focus and moves focus into the page", async () => {
    const { context, page, errors } = await open();
    const skip = page.locator(".story-skip");
    const resting = await skip.evaluate(node => ({ top: Math.round(node.getBoundingClientRect().top), computed: getComputedStyle(node).top }));
    assert.ok(resting.top < 0, `The skip link must rest off screen: ${JSON.stringify(resting)}`);
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.activeElement?.classList.contains("story-skip"));
    const focused = await skip.evaluate(node => ({ top: Math.round(node.getBoundingClientRect().top), outline: getComputedStyle(node).outlineStyle }));
    assert.ok(focused.top >= 0, `Keyboard focus must bring the skip link on screen: ${JSON.stringify(focused)}`);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#story-main");
    const landed = await page.evaluate(() => {
      const main = document.querySelector("#story-main");
      return main.contains(document.activeElement) || document.activeElement === main || document.activeElement === document.body;
    });
    assert.equal(landed, true, "Activating the skip link must move past the header");
    assert.deepEqual(errors, []);
    await context.close();
    return { resting, focused };
  });

  await record("the gallery controls stay reachable under the page's floating launcher", async () => {
    const { context, page, errors } = await open();
    await galleryOf(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const reach = await page.evaluate(() => {
      const probe = selector => {
        const element = document.querySelector(selector);
        if (!element) return "missing";
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
        return element === top || element.contains(top) ? "reachable" : `covered by ${top?.className || top?.tagName}`;
      };
      return {
        commandInput: probe('[data-featured-component="command"] input'),
        commandDocs: probe('[data-featured-component="command"] .launch-specimen__docs'),
        bentoDocs: probe('[data-featured-component="bento-grid"] .launch-specimen__docs'),
        allComponents: probe("#featured-components .launch-gallery__all"),
      };
    });
    assert.deepEqual(Object.values(reach), ["reachable", "reachable", "reachable", "reachable"], `Every gallery control must be reachable at a resting viewport: ${JSON.stringify(reach)}`);
    assert.deepEqual(errors, []);
    await context.close();
    return reach;
  });

  await record("the page holds together at 320px without horizontal overflow", async () => {
    const { context, page, errors } = await open({ viewport: { width: 320, height: 720 } });
    await galleryOf(page).waitFor();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - innerWidth,
      widest: [...document.querySelectorAll(".launch-home *")]
        .filter(node => node.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 5).map(node => `${node.tagName.toLowerCase()}.${node.className?.toString().split(" ")[0] ?? ""}`),
    }));
    assert.ok(overflow.document <= 1, `320px must not scroll sideways: ${JSON.stringify(overflow)}`);
    await stageOf(page).getByRole("button", { name: "Stack", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "stack");
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, "Every treatment must fit 320px");
    assert.deepEqual(errors, []);
    await context.close();
    return overflow;
  });

  for (const [name, options, prepare] of [
    ["reduced motion", { reducedMotion: "reduce" }, undefined],
    ["Motion Off", {}, () => localStorage.setItem("v-motion", JSON.stringify({ v: 3, mode: "off", cats: {} }))],
    ["Flow Off", {}, () => localStorage.setItem("v-flow-v1", JSON.stringify({ variant: "off", speed: 1 }))],
  ]) {
    await record(`${name} settles the stage immediately and disables replay`, async () => {
      const { context, page, errors } = await open(options, prepare);
      const stage = stageOf(page);
      assert.equal(await stage.getAttribute("data-phase"), "settled", `${name} must render the settled state immediately`);
      assert.equal(await stage.getByRole("button", { name: "Replay assembly", exact: true }).isDisabled(), true, `${name} must disable an animation replay that cannot run`);
      await stage.getByRole("button", { name: "Stack", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "stack");
      assert.equal(await stage.getAttribute("data-phase"), "settled");
      assert.equal(await stage.getByRole("button", { name: "Message", exact: true }).isEnabled(), true, `${name} keeps the composition usable`);
      // "pending" is the state before the field has started; it proves nothing about stillness.
      await page.waitForFunction(selector => document.querySelector(selector)?.dataset.renderer !== "pending", fieldSelector, { timeout: 20000 });
      const field = page.locator(fieldSelector);
      const renderer = await field.getAttribute("data-renderer"), moving = await field.getAttribute("data-moving");
      assert.equal(renderer, "webgl", `${name} must be judged against a live renderer, not an absent one: ${renderer}`);
      assert.equal(moving, "false", `${name} must hold the background still`);
      assert.deepEqual(errors, []);
      await context.close();
      return { renderer, moving };
    });
  }

  /* Offscreen suspension is driven natively, by the component's own IntersectionObserver.
     The hidden-document half is SIMULATED: no automation route available here (tab switch,
     Page.setWebLifecycleState, or a real window minimise, under either Playwright's Chromium
     or installed Chrome) actually changes visibilityState, so the check presents both platform
     properties the source reads — document.visibilityState for useMotionVisibility and
     document.hidden for the shader's own draw guard — and fires the real event. A genuinely
     backgrounded tab remains an owner acceptance item; this check does not establish it. */
  await record("the stage background runs, stops offscreen and resumes, and stops on a simulated hidden document", async () => {
    const { context, page, errors } = await open();
    const field = page.locator(fieldSelector);
    await field.waitFor();
    const settle = value => page.waitForFunction(([selector, want]) => document.querySelector(selector)?.dataset.moving === want, [fieldSelector, value], { timeout: 20000 });
    const state = async label => ({
      label,
      moving: await field.getAttribute("data-moving"),
      renderer: await field.getAttribute("data-renderer"),
      ...await page.evaluate(() => ({ visibilityState: document.visibilityState, hidden: document.hidden })),
    });
    const present = value => page.evaluate(want => {
      if (want === null) { delete document.hidden; delete document.visibilityState; }
      else {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => want });
        Object.defineProperty(document, "hidden", { configurable: true, get: () => want === "hidden" });
      }
      document.dispatchEvent(new Event("visibilitychange"));
    }, value);

    // No stop means anything until the field is genuinely running in this viewport.
    await page.waitForFunction(selector => document.querySelector(selector)?.dataset.renderer === "webgl", fieldSelector, { timeout: 20000 });
    await settle("true");
    const running = await state("running");
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await settle("false");
    const offscreen = await state("offscreen");
    await page.evaluate(() => scrollTo(0, 0));
    await settle("true");
    const resumed = await state("back in view");
    await present("hidden");
    await settle("false");
    const hidden = await state("hidden document");
    await present(null);
    await settle("true");
    const restored = await state("visible again");

    assert.equal(running.moving, "true", `The field must actually run before a stop can prove anything: ${JSON.stringify(running)}`);
    assert.equal(offscreen.moving, "false", `An offscreen field must stop working: ${JSON.stringify(offscreen)}`);
    assert.equal(resumed.moving, "true", `The field must resume once the stage is back in view: ${JSON.stringify(resumed)}`);
    // The simulation only counts if the page really reported itself hidden on both properties the source reads.
    assert.deepEqual({ visibilityState: hidden.visibilityState, hidden: hidden.hidden }, { visibilityState: "hidden", hidden: true }, `The hidden case must present a hidden document: ${JSON.stringify(hidden)}`);
    assert.equal(hidden.moving, "false", `A hidden document must stop the field: ${JSON.stringify(hidden)}`);
    assert.deepEqual({ visibilityState: restored.visibilityState, hidden: restored.hidden }, { visibilityState: "visible", hidden: false }, `Restoring must hand back a visible document: ${JSON.stringify(restored)}`);
    assert.equal(restored.moving, "true", `The field must resume once the document is visible again: ${JSON.stringify(restored)}`);
    assert.deepEqual(errors, []);
    await context.close();
    return { phases: [running, offscreen, resumed, hidden, restored], nativeTabHiding: "not exercised: no automation route changes visibilityState here" };
  });

  await record("the replaced opening and the shape playground are gone from the homepage", async () => {
    const { context, page, errors } = await open();
    assert.equal(await page.locator(".shape-workbench-section, [data-shape-studio]").count(), 0, "The homepage no longer carries the shape playground");
    assert.equal(await page.locator('.launch-hero [data-slot="organism-assembly"]').count(), 0, "The crowded assembly opening is replaced by the profile stage");
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
    return { headings: await page.getByRole("heading").allInnerTexts().catch(() => []) };
  });
} finally {
  await browser.close();
  if (staticServer) await new Promise(resolve => staticServer.httpServer.close(resolve));
}

report.finishedAt = new Date().toISOString();
report.status = report.checks.length && report.checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}: ${report.checks.filter(check => check.status === "PASS").length}/${report.checks.length}${only ? ` (filtered by CHECK_ONLY=${only}; not a full run)` : ""}`);
if (report.status !== "PASS") process.exitCode = 1;
