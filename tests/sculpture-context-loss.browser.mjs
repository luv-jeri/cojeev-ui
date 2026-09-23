/**
 * WebGL context loss — the sculpture surfaces must degrade to a static preview
 * and come back, without throwing.
 *
 * Why this exists: `sculpture-stage.tsx` handles `webglcontextlost` /
 * `webglcontextrestored`, and nothing exercised either handler. A GPU reset, a
 * driver crash, a laptop waking from sleep or a browser reclaiming a background
 * tab all destroy a WebGL context, and it is the one failure a component cannot
 * opt out of. Untested, the likely regression is silent: a blank canvas that
 * still reports itself as rendered, or an unhandled `pageerror` storm.
 *
 * The contract asserted here, in order:
 *   1. A WebGL-active surface exposes NO `[data-slot="material-status"]`. That
 *      absence *is* the "webgl" state, so it is the precondition, not an
 *      accident.
 *   2. The canvas is decorative to assistive tech (`aria-hidden` + `inert`) and
 *      carries a real static preview (`[data-slot="material-still"]`), so
 *      nothing is lost when the GPU goes away.
 *   3. On context loss the host gains exactly one status node, `role="status"`,
 *      reading "3D material is unavailable." — an announced, honest fallback
 *      rather than a blank frame.
 *   4. `restoreContext()` returns it to the WebGL state (the status node goes
 *      away), which is what proves `onRestored` re-initialises instead of
 *      leaving the surface dead.
 *   5. No `pageerror` at any point.
 *
 * Runs against the existing docs server; never starts one.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const ROUTE = process.env.SCULPTURE_ROUTE ?? "/docs/particle-sculpture/";
const FALLBACK_TEXT = "3D material is unavailable.";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${BASE}${ROUTE}`);

  const canvases = page.locator('[data-slot="material-canvas"]');
  await canvases.first().waitFor({ timeout: 30000 });
  await canvases.first().scrollIntoViewIfNeeded();

  // A surface is WebGL-active exactly when its host carries no status node.
  const hostOf = (index) => canvases.nth(index).locator("xpath=..");
  const activeIndex = async () => {
    const total = await canvases.count();
    for (let i = 0; i < total; i += 1) {
      if ((await hostOf(i).locator('[data-slot="material-status"]').count()) === 0) return i;
    }
    return -1;
  };
  let index = -1;
  for (let attempt = 0; attempt < 30 && index < 0; attempt += 1) {
    await page.waitForTimeout(500);
    index = await activeIndex();
  }
  assert.notEqual(
    index,
    -1,
    `${ROUTE}: no WebGL surface ever reached the webgl state; this gate cannot assert a loss it never observed`,
  );

  const canvas = canvases.nth(index);
  const host = hostOf(index);

  // 2. Decorative to assistive tech, with a real still behind it.
  assert.equal(await canvas.getAttribute("aria-hidden"), "true", "the WebGL surface must stay decorative");
  assert.notEqual(await canvas.getAttribute("inert"), null, "the WebGL surface must stay inert");
  assert.equal(
    await host.locator('[data-slot="material-still"]').count(),
    1,
    "a WebGL surface must ship a static preview for the no-GPU case",
  );

  // 3. Force the loss, retaining the extension — it is unavailable once lost.
  const lost = await canvas.evaluate((el) => {
    const gl = el.getContext("webgl2") || el.getContext("webgl");
    if (!gl) return "NO_CONTEXT";
    const ext = gl.getExtension("WEBGL_lose_context");
    if (!ext) return "NO_EXTENSION";
    window.__contextLossProbe = ext;
    ext.loseContext();
    return "LOST";
  });
  assert.equal(lost, "LOST", `could not force a context loss: ${lost}`);
  await page.waitForTimeout(1000);

  assert.equal(
    await canvas.evaluate((el) => {
      const gl = el.getContext("webgl2") || el.getContext("webgl");
      return gl ? gl.isContextLost() : true;
    }),
    true,
    "the context did not actually report itself lost",
  );

  const fallback = host.locator('[data-slot="material-status"]');
  assert.equal(await fallback.count(), 1, "a lost context must produce exactly one status node");
  assert.equal(await fallback.getAttribute("role"), "status", "the fallback must be announced, not visual-only");
  assert.match(
    (await fallback.innerText()).trim(),
    new RegExp(FALLBACK_TEXT.replace(".", "\\.")),
    "the fallback must say the 3D material is unavailable",
  );

  // 4. Recovery — the part `onRestored` owns.
  assert.equal(
    await page.evaluate(() => {
      if (!window.__contextLossProbe) return "NO_STORED_EXTENSION";
      window.__contextLossProbe.restoreContext();
      return "RESTORED";
    }),
    "RESTORED",
    "the retained WEBGL_lose_context extension was lost, so recovery cannot be asserted",
  );
  let recovered = false;
  for (let attempt = 0; attempt < 12 && !recovered; attempt += 1) {
    await page.waitForTimeout(500);
    recovered = (await host.locator('[data-slot="material-status"]').count()) === 0;
  }
  assert.equal(
    recovered,
    true,
    "the sculpture did not return to the webgl state after the context was restored — onRestored does not re-initialise",
  );

  assert.deepEqual(errors, [], `context loss or recovery raised ${errors.length} page error(s)`);
  console.log(
    `PASS sculpture WebGL context loss on ${ROUTE}: static preview + announced fallback, then full recovery after restoreContext()`,
  );
  console.log("PASS sculpture WebGL surface stays aria-hidden and inert, with no page errors through loss and recovery");
} finally {
  await browser.close();
}
