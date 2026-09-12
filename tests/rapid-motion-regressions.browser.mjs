/**
 * Real-browser regressions for RF-M-001 and RF-M-002. No server is started.
 * CLI: POLISH_URL=http://127.0.0.1:4320/cojeev-ui node tests/rapid-motion-regressions.browser.mjs
 * The exported runner also accepts a CUA tab's playwright API and CDP capability.
 */
export async function checkRapidMotion({ page, cdp, navigate, base = "http://127.0.0.1:4320/cojeev-ui" }) {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const read = async (selector) => {
    const response = await cdp.send("Runtime.evaluate", {
      expression: `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
        const host = document.querySelector(${JSON.stringify(selector)});
        resolve(host ? {
          running: host.dataset.running,
          pink: getComputedStyle(host).getPropertyValue("--v-pink"),
          canvas: host.querySelector("canvas")?.toDataURL(),
          images: Array.from(host.querySelectorAll("img"), image => ({ src: image.src, transform: image.style.transform }))
        } : null);
      })))`,
      awaitPromise: true, returnByValue: true,
    });
    check(!response.exceptionDetails, "Browser observation failed");
    check(response.result?.value, `Missing mounted specimen: ${selector}`);
    return response.result.value;
  };

  for (const [id, label] of [["orbit-images", "orbit"], ["infinite-spiral", "spiral"]]) {
    await navigate(`${base}/docs/${id}/`);
    const selector = `[data-slot="${id}"]`;
    await page.getByRole("button", { name: "Replace images", exact: true }).waitFor({ state: "visible" });
    await read(selector);
    await page.getByRole("button", { name: `Pause ${label}`, exact: true }).click();
    await page.getByRole("button", { name: `Resume ${label}`, exact: true }).waitFor({ state: "visible" });
    const before = await read(selector);
    check(before.running === "false", `${id}: pause did not stop motion`);
    await page.getByRole("button", { name: "Replace images", exact: true }).click();
    const after = await read(selector);
    check(after.running === "false", `${id}: replacing images resumed paused motion`);
    check(after.images.length === before.images.length && after.images.length === 6, `${id}: fixture must replace six images without changing count`);
    check(after.images.map(image => image.src).join() !== before.images.map(image => image.src).join(), `${id}: image content did not change`);
    check(after.images.every(image => image.transform), `${id}: replacement images lost their positions`);
    check(new Set(after.images.map(image => image.transform)).size === 6, `${id}: replacement images overlap at one position`);
    results.push({ id: "RF-M-001", component: id, check: "same-count replacement preserves six positioned images while paused", passed: true });
  }

  await navigate(`${base}/docs/magic-rings/`);
  const selector = '[data-slot="magic-rings"]';
  await page.getByRole("button", { name: "Pause effect", exact: true }).waitFor({ state: "visible" });
  await read(selector);
  await page.getByRole("button", { name: "Pause effect", exact: true }).click();
  await page.getByRole("button", { name: "Resume effect", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Colour and contrast", exact: true }).click();
  const palette = page.getByRole("combobox", { name: "Colour palette", exact: true });
  const original = (await palette.innerText()).trim();
  const alternate = original === "Grove" ? "Paper" : "Grove";
  const before = await read(selector);
  try {
    await palette.click();
    await page.getByRole("option", { name: alternate, exact: true }).click();
    const after = await read(selector);
    check(after.running === "false", "magic-rings: palette change resumed paused motion");
    check(after.pink !== before.pink, "magic-rings: palette control did not apply a different accent");
    check(after.canvas !== before.canvas, "magic-rings: paused canvas retained its previous palette");
    const still = await read(selector);
    check(still.canvas === after.canvas, "magic-rings: paused frame continued changing after repaint");
    results.push({ id: "RF-M-002", component: "magic-rings", check: "palette repaints paused canvas and remains still", passed: true });
  } finally {
    await palette.click();
    await page.getByRole("option", { name: original, exact: true }).click();
    await palette.press("Escape");
    await read(selector);
  }
  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("rapid-motion-regressions.browser.mjs")) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const results = await checkRapidMotion({ page, cdp, navigate: url => page.goto(url), base: process.env.POLISH_URL });
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
}
