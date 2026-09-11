import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const visit = async (id) => {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
  };
  await visit("resizable");
  const group = page
    .locator("[data-example-role=interactive] [data-slot=resizable]")
    .first();
  const handle = group.getByRole("separator");
  const panel = group.locator("[data-slot=resizable-panel]").first();
  await handle.focus();
  const vertical =
    (await handle.getAttribute("aria-orientation")) === "horizontal";
  const axis = vertical ? "height" : "width";
  const width = await panel.evaluate(
    (e, axis) => e.getBoundingClientRect()[axis],
    axis,
  );
  await handle.press(vertical ? "ArrowDown" : "ArrowRight");
  await page.waitForFunction(
    ({ w, axis }) =>
      document
        .querySelector(
          "[data-example-role=interactive] [data-slot=resizable-panel]",
        )
        .getBoundingClientRect()[axis] > w,
    { w: width, axis },
  );
  const ports = group.locator("[data-radix-scroll-area-viewport]");
  const candidates = await ports.all();
  let long;
  for (const port of candidates)
    if (await port.evaluate((e) => e.scrollHeight > e.clientHeight + 8)) {
      long = port;
      break;
    }
  assert.ok(long, "One panel has genuinely overflowing caller content");
  await long.hover();
  await page.mouse.wheel(0, 350);
  await page.waitForFunction(
    (e) => e.scrollTop > 0,
    await long.elementHandle(),
  );
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + (vertical ? 0 : 25),
    box.y + box.height / 2 + (vertical ? 25 : 0),
    {
      steps: 5,
    },
  );
  await page.mouse.up();
  assert.ok(
    (await panel.evaluate((e, axis) => e.getBoundingClientRect()[axis], axis)) >
      width,
  );
  assert.equal(
    await group.getByText("Morning pages", { exact: true }).count(),
    1,
    "Resize keeps caller content mounted",
  );
  await visit("scroll-reveal");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const story = page
    .getByRole("region", { name: "Scrollable story preview", exact: true })
    .first();
  const words = story.locator("[data-slot=scroll-reveal]");
  await story.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document.querySelector(
        "[data-example-role=interactive] [data-slot=scroll-reveal]",
      )?.dataset.running === "true",
  );
  const before = Number(await words.getAttribute("data-progress"));
  await story.hover();
  await page.mouse.wheel(0, 350);
  await page.waitForFunction(
    (p) =>
      Number(
        document.querySelector(
          "[data-example-role=interactive] [data-slot=scroll-reveal]",
        ).dataset.progress,
      ) > p,
    before,
  );
  assert.ok(
    (await story.evaluate((e) => e.scrollTop)) > 0,
    "Actual viewport scroll drives reveal",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document.querySelector(
        "[data-example-role=interactive] [data-slot=scroll-reveal]",
      ).dataset.progress === "1.000",
  );
  await page
    .getByRole("button", {
      name: "Request a feature or report a bug",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Request a feature or report a bug",
    exact: true,
  });
  const textarea = dialog.getByLabel("Details, inspiration & links", {
    exact: true,
  });
  await textarea.fill(
    Array.from({ length: 70 }, (_, i) => `Local verification line ${i}`).join(
      "\n",
    ),
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".report-sheet textarea")?.dataset
        .elementScrollbar === "mounted",
  );
  assert.ok(await textarea.evaluate((e) => e.scrollHeight > e.clientHeight));
  await textarea.focus();
  await textarea.press("Control+End");
  assert.ok((await textarea.evaluate((e) => e.scrollTop)) > 0);
  await dialog
    .getByLabel("Component title", { exact: true })
    .fill("Local scrolling check");
  await dialog
    .getByLabel("Your email", { exact: true })
    .fill("local-check@example.com");
  await dialog
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await dialog.locator(".report-json summary").click();
  const source = dialog
    .locator(".report-source [data-radix-scroll-area-viewport]")
    .first();
  await source.scrollIntoViewIfNeeded();
  await source.hover();
  await page.mouse.wheel(0, 400);
  await page.waitForFunction(
    () =>
      document.querySelector(".report-source [data-radix-scroll-area-viewport]")
        ?.scrollTop > 0,
  );
  assert.ok(
    await dialog
      .getByRole("button", { name: "Send request", exact: true })
      .isDisabled(),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS native resize keys/drag, retained children, wheel-owned story progress/quiet, native textarea editing and report source scrolling without submission",
  );
} finally {
  await browser.close();
}
