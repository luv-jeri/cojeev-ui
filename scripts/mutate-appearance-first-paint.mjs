/**
 * Mutation evidence for `tests/appearance-first-paint.browser.mjs`.
 *
 * The review's finding was that the previous suite *passed* its first startup/reload
 * case with every client bundle replaced by empty JavaScript, and that its reload
 * re-seeded the storage it was supposed to be testing. Passing assertions are not
 * evidence unless they can fail, so this script applies three mutations to the same
 * running server and asserts that the corresponding guard in the suite fails.
 *
 * It deliberately mirrors the suite's assertions rather than calling them, because the
 * suite cannot be imported without launching its own browser. A mirror is weak
 * evidence, so every verdict here is held to five standards the earlier version did
 * not meet:
 *
 *  1. **A positive control runs first.** For every mutation the identical assertion
 *     path is executed against the *unmutated* server and must produce no failure
 *     at all. A mutation that "fails as expected" while the control also fails proves
 *     nothing.
 *  2. **The frame under test is pre-hydration.** The contrast mutation rewrites only
 *     the served HTML, so React would repair the mutated value from `localStorage` if
 *     it were allowed to run. The same network barrier the real startup suite uses
 *     holds every `/_next/**` bundle until the assertion has read the frame, and the
 *     provider's own `data-appearance="mounted"` marker is asserted on both sides of
 *     the read. Without this the mutation's detection was timing-dependent.
 *  3. **The mutation must be observed to have been applied.** The contrast mutation
 *     verifies the served bootstrap no longer contains the validation it removed; the
 *     hydration mutation verifies a bundle request was answered with empty JavaScript;
 *     the persistence mutation verifies its init script is present before the
 *     application writes. `verifyApplied` runs only *after* the assertion has driven
 *     the page, because that navigation is what makes the mutation observable.
 *  4. **The intended assertion must be the failure.** The verdict names the assertion
 *     it expects and requires the thrown error to carry it. Any other error is a
 *     failed run, not a successful detection.
 *  5. **Timeouts, missing selectors, non-2xx responses and storage exceptions never
 *     count as detection.** They say the page or the harness is broken, not that the
 *     guard works. The mount wait is short (4 s) precisely so that a hung page fails
 *     loudly here. Only Playwright's own wait timeout becomes the named mount
 *     assertion; every other rejection propagates as an infrastructure error.
 *
 * It is deliberately NOT part of `npm test`: it starts no server, drives a browser,
 * and only produces console evidence. Run:
 *
 *   POLISH_URL=http://127.0.0.1:4330/cojeev-ui node scripts/mutate-appearance-first-paint.mjs
 *
 *  - `no-hydration`     every `/_next/**` JS bundle is replaced by empty JavaScript.
 *                       The suite must fail waiting for `data-appearance="mounted"`.
 *  - `default-contrast` the served bootstrap has its stored-contrast handling removed,
 *                       so the pre-paint frame declares the default 60 while the
 *                       fixture stores 0. The suite's frame assertion must fail.
 *  - `no-persistence`   writes to `cojeev-appearance` are dropped after the fixture is
 *                       seeded, so the control change never reaches storage and the
 *                       unseeded reload must read the fixture, not the control.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = (process.env.POLISH_URL ?? process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui").replace(/\/$/, "");
/* The stored contrast is **0** — the value the frame assertion demands. The previous
 * harness seeded 60 while expecting 0, so the unmutated application failed the same
 * assertion the mutation was supposed to break, and the verdict was meaningless. */
const seed = { palette: "tide", contrast: 0 };
const SEED_FLAG = "mutation-seed-applied";
/* A literal from the generated bootstrap's state reader. Replacing it stops the stored
 * object from reaching `normalizeAppearance`, so the default contrast is painted; the
 * replacement is verified against the served response rather than assumed. */
const CONTRAST_MARKER = 'saved=raw?JSON.parse(raw):null';
const CONTRAST_REPLACEMENT = 'saved=null';

/* Page-side: seed once, then sample the same frame tuple the suite's pre-paint read
 * samples. The flag guard is what makes the reload in `assertPersistence` unseeded. */
function installSampler({ flag, appearance }) {
  try {
    if (!localStorage.getItem(flag)) {
      localStorage.setItem("cojeev-appearance", JSON.stringify(appearance));
      localStorage.setItem("cojeev-docs-theme", "light");
      localStorage.setItem(flag, "1");
    }
  } catch { /* the blocked-storage case is not under mutation here */ }
  window.frames = [];
  function sample() {
    if (document.body && document.querySelector(".docs-title-row h1")) {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      window.frames.push([root.dataset.palette ?? null, root.dataset.contrast ?? null, style.getPropertyValue("--v-text-3").trim().toUpperCase()]);
    }
    window.frame = requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}

/** Page-side: `Storage.prototype.setItem` stops persisting `cojeev-appearance` once
 * `silent` is set. The fixture seeding runs with `silent === false`, so the difference
 * this mutation makes is exactly the application's own write — the earlier version
 * stubbed `setItem` before the fixture was seeded and could not tell the two apart. */
function installStorageGate() {
  const original = Storage.prototype.setItem;
  window.__storageGate = { blocked: 0 };
  Storage.prototype.setItem = function (key, value) {
    if (window.__silentAppearanceWrite && key === "cojeev-appearance") { window.__storageGate.blocked += 1; return; }
    return original.call(this, key, value);
  };
}

/** The one `waitForFunction` outcome that means "the page settled without the thing
 * we waited for": Playwright's own timeout. Anything else — a closed page, a frame
 * navigation, a protocol error — is an infrastructure failure and must stay visible. */
function isWaitTimeout(error) {
  return error?.name === "TimeoutError" || /Timeout \d+ms exceeded/.test(String(error?.message ?? ""));
}

/** The suite's pre-paint assertion, at the same point in the page's life. Client
 * bundles are *held* by the caller for the read — in the mutant **and** its control,
 * because this is a property of the assertion rather than of the mutation: the
 * contrast mutation rewrites only the served HTML, so with hydration free to run
 * React restores the stored contrast from `localStorage` and the frame would be
 * sampled post-hydration depending on timing. The provider marker is asserted on both
 * sides of the read, so a value sampled from the mounted application is rejected
 * instead of reported as a pre-paint frame. */
async function assertPrePaint(page, { contrast }) {
  await page.goto(`${base}/docs/appearance/`, { waitUntil: "commit" });
  await page.locator(".docs-title-row h1").waitFor();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-contrast"), null, { timeout: 10000 });
  const painted = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.contrast,
    mounted: document.documentElement.dataset.appearance ?? null,
  }));
  assert.equal(painted.mounted, null, "the contrast frame was read after the provider mounted — the read raced hydration");
  assert.equal(painted.contrast, String(contrast), `pre-paint contrast was ${painted.contrast}, not the stored ${contrast}`);
  const after = await page.evaluate(() => document.documentElement.dataset.appearance ?? null);
  assert.equal(after, null, "the provider mounted while the contrast frame was being read — the read raced hydration");
}

/** The suite's mount assertion: the marker is written only by the provider's layout
 * effect, so empty bundles can never satisfy it. Only the deliberate missing-mount
 * timeout becomes that assertion; an unrelated page, transport or browser error must
 * propagate, because counting it as detection would make the verdict meaningless. */
async function assertMounted(page, timeout = 4000) {
  await page.goto(`${base}/docs/appearance/`, { waitUntil: "commit" });
  await page.locator(".docs-title-row h1").waitFor();
  await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout })
    .catch(error => { throw isWaitTimeout(error) ? new assert.AssertionError({ message: "the appearance provider never mounted" }) : error; });
}

/** The suite's persistence assertion: a real control change writes storage, then the
 * reload runs unseeded and must paint what the application stored. */
async function assertPersistence(page) {
  await page.goto(`${base}/docs/appearance/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout: 20000 })
    .catch(error => { throw isWaitTimeout(error) ? new assert.AssertionError({ message: "the appearance provider never mounted" }) : error; });
  const thumb = page.locator('[data-example="appearance"] [data-slot="appearance-controls"] [data-slot="slider-thumb"]').first();
  await thumb.waitFor();
  await thumb.focus();
  await page.evaluate(() => { window.__silentAppearanceWrite = true; });
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.documentElement.dataset.contrast === "100");
  const stored = await page.evaluate(() => localStorage.getItem("cojeev-appearance"));
  assert.deepEqual(JSON.parse(stored), { palette: "tide", contrast: 100 }, "the control wrote its value to storage");
  await page.reload({ waitUntil: "load" });
  await page.locator(".docs-title-row h1").waitFor();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const painted = await page.evaluate(() => document.documentElement.dataset.contrast);
  assert.equal(painted, "100", `the unseeded reload painted contrast ${painted}, not the 100 the control chose`);
}

/* Conditions that mean "the harness or the page is broken", not "the guard worked".
 * A mutation verdict built on one of these is not evidence. */
const NOT_A_DETECTION = /\b(Timeout|waitFor|locator|net::|ERR_|ECONNREFUSED|SecurityError|NS_ERROR)\b/i;

function classify(error) {
  const message = `${error?.name ?? ""}: ${error?.message ?? error}`;
  if (error?.name === "AssertionError" && !NOT_A_DETECTION.test(message)) return { kind: "assertion", message };
  return { kind: "not-a-detection", message };
}

/** Run one guard twice: unmutated (must not fail) and mutated (must fail on the
 * assertion we name). Returns a line of evidence, or throws.
 *
 * `holdsBundles` is a property of the *assertion*, not of the mutation: any guard
 * whose assertion reads a pre-hydration frame must hold the bundles in BOTH runs.
 * Tying the barrier to `mutate === "default-contrast"` meant the mutant read a
 * genuinely pre-hydration frame while its unmutated control raced hydration and
 * could fail for a correct implementation. */
async function guard({ name, expected, mutate, holdsBundles = false, verifyApplied, assertFailure }) {
  const mutant = await runOnce({ mutate, holdsBundles, verifyApplied, assertFailure });
  if (mutant.failure === null) throw new Error(`${name}: the mutation did NOT fail — the guard is not doing its job`);
  if (mutant.failure.kind !== "assertion") throw new Error(`${name}: the mutation failed for the wrong reason (${mutant.failure.kind}), so it is not evidence: ${mutant.failure.message.split("\n")[0]}`);
  if (!expected.test(mutant.failure.message)) throw new Error(`${name}: the mutation failed, but not on the assertion it targets. Saw: ${mutant.failure.message.split("\n")[0]}`);

  const control = await runOnce({ mutate: null, holdsBundles, verifyApplied: null, assertFailure });
  if (control.failure) throw new Error(`${name}: the unmutated control ALSO failed (${control.failure.kind}): ${control.failure.message.split("\n")[0]}`);
  if (control.mutationApplied) throw new Error(`${name}: the control reports the mutation as applied`);

  /* `held` is printed for the guards that arm the barrier, so "the frame under test
   * was pre-hydration" is a visible measurement in both runs rather than an
   * inference from the code path. */
  const barrier = holdsBundles ? ` [bundles held: mutant ${mutant.held}, control ${control.held}]` : "";
  console.log(`PASS ${name}: control passes; mutation observed and the intended assertion failed — ${mutant.failure.message.split("\n")[0]}${barrier}`);
}

async function runOnce({ mutate, holdsBundles = false, verifyApplied, assertFailure }) {
  const browser = await chromium.launch();
  /* Declared outside the `try` so the `finally` can always settle the barrier, even
   * when the body throws before the route is registered. */
  let releaseBundles = () => {};
  try {
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSampler, { flag: SEED_FLAG, appearance: seed });
    const page = await context.newPage();
    const evidence = { applied: false, detail: [], held: 0 };

    /* The same network barrier the real startup suite uses: while it is armed every
     * `/_next/**` bundle waits, so the frame the contrast assertion reads is genuinely
     * pre-hydration and React cannot repair the mutated served value before it is
     * sampled. It is armed whenever the *assertion* needs a pre-hydration read — in
     * both the mutant and its control — because a control that races hydration can
     * fail a correct implementation. The other two mutations need the application to
     * execute, and a bundle-replacement or dropped-write mutation is exactly what the
     * barrier would mask. `held` counts the requests the barrier actually stopped, so
     * "the bundles were held" is measured rather than asserted. */
    const bundles = new Promise(resolve => { releaseBundles = resolve; });
    if (holdsBundles) {
      await page.route("**/_next/**/*.js*", async route => {
        evidence.held += 1;
        await bundles;
        await route.continue().catch(() => { /* a page closed after the verdict is not a failure */ });
      });
    }

    if (mutate === "no-hydration") {
      /* Empty JavaScript for every bundle. Only counted as applied once a bundle
       * request has actually been answered, which the route handler records. */
      await page.route("**/_next/**/*.js*", route => {
        evidence.applied = true;
        return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
      });
    } else if (mutate === "default-contrast") {
      /* The bootstrap normalizes the stored object through the runtime's
       * `normalizeAppearance`, so the mutation cuts that object off at the source: the
       * stored 0 never reaches the normalizer and the default 60 is painted. The
       * replacement is verified on the served body, not assumed. */
      await page.route("**/docs/appearance/**", async route => {
        const response = await route.fetch();
        const body = await response.text();
        const occurrences = body.split(CONTRAST_MARKER).length - 1;
        /* Next's response carries the inline bootstrap more than once (the document and
         * its Flight payload), so every occurrence is replaced and the verdict is based
         * on the marker being *gone*, not on a particular count. */
        const mutated = body.split(CONTRAST_MARKER).join(CONTRAST_REPLACEMENT);
        if (!occurrences) evidence.detail.push("the served response did not contain the snippet the mutation replaces");
        else if (mutated.includes(CONTRAST_MARKER)) evidence.detail.push("the replacement left the snippet in place");
        else { evidence.applied = true; evidence.detail.push(`replaced ${occurrences} occurrence(s)`); }
        await route.fulfill({ response, body: mutated });
      });
    } else if (mutate === "no-persistence") {
      await page.addInitScript(installStorageGate);
      evidence.applied = true; // the init script is proven by the counter it leaves behind
    }

    /* The assertion drives the page, which is what makes the mutation observable, so
     * it runs first. The barrier is released only once the assertion is done with it
     * (or it never mattered because no assertion is holding bundles). */
    let failure = null;
    try {
      await assertFailure(page, context);
    } catch (error) {
      failure = classify(error);
    } finally {
      releaseBundles();
    }

    /* A mutation whose replacement never became observable is not evidence even when
     * the mutant happened to fail, so every verdict is gated on this after the fact. */
    if (verifyApplied && !verifyApplied(evidence)) {
      throw new Error(`${mutate}: the mutation was never observed as applied${evidence.detail.length ? ` (${evidence.detail.join("; ")})` : ""}`);
    }
    if (mutate === "no-persistence") {
      const blocked = await page.evaluate(() => window.__storageGate?.blocked ?? 0);
      if (!blocked) throw new Error("no-persistence: the application never attempted an appearance write, so the mutation was never exercised");
      evidence.detail.push(`blocked ${blocked} application write(s)`);
    }
    if (holdsBundles && evidence.held === 0) {
      throw new Error(`${mutate ?? "the control"}: the network barrier gated no bundle request, so the frame under test was not held pre-hydration`);
    }
    return { failure, mutationApplied: evidence.applied, held: evidence.held, evidence: evidence.detail };
  } finally {
    releaseBundles();
    await browser.close();
  }
}

await guard({
  name: "no-hydration",
  expected: /never mounted/i,
  mutate: "no-hydration",
  verifyApplied: evidence => evidence.applied,
  assertFailure: page => assertMounted(page),
});

await guard({
  name: "default-contrast",
  expected: /pre-paint contrast was/i,
  mutate: "default-contrast",
  /* The read happens while the bundles are held, so the mutated HTML is what is
   * sampled; the mutation escapes only if hydration gets to repair it first. The
   * barrier is armed for the control too (`holdsBundles`, not `mutate`), and
   * `runOnce` requires it to have held something in both runs: a route pattern that
   * silently matched nothing would leave the read post-hydration and every verdict
   * built on it meaningless. */
  holdsBundles: true,
  verifyApplied: evidence => evidence.applied,
  assertFailure: page => assertPrePaint(page, { contrast: seed.contrast }),
});

await guard({
  name: "no-persistence",
  expected: /the unseeded reload painted contrast|the control wrote its value to storage/i,
  mutate: "no-persistence",
  /* Applied by construction (the init script is installed before the first request);
   * the counter check inside `runOnce` proves it was exercised. */
  verifyApplied: evidence => evidence.applied,
  assertFailure: page => assertPersistence(page),
});

console.log("PASS appearance first-paint mutations: each guard passes unmutated and fails on the assertion it targets when its mutation is applied");
