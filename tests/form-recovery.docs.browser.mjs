import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/form-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const cases = {
  field: ["Stacked", "Inline", "Integrated"],
  "input-group": ["Address", "Quantity", "Composer"],
  textarea: ["Writing", "Composer", "Response"],
  input: ["Contour", "Editorial", "Inset"],
  label: ["Required", "Optional", "Help"],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(12000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const select = async (name, value) => {
    await page.getByRole("combobox", { name: `Example ${name}` }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  for (const [id, approaches] of Object.entries(cases)) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const example = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
    for (const value of approaches)
      assert.equal(
        await page
          .locator(
            `[data-example-role="gallery"][data-variant="${value.toLowerCase()}"]`,
          )
          .count(),
        1,
        `${id}: ${value} must be directly discoverable`,
      );
    const entry = example.locator("input:not(:disabled),textarea").first();
    const entryId = await entry.getAttribute("id");
    assert.ok(entryId && await example.locator(`label[for="${entryId}"]`).count(), `${id}: visible label targets the native entry`);
    if (id === "field") {
      await entry.fill("ab");
      await example.getByRole("button", { name: "Check name" }).click();
      assert.equal(await entry.getAttribute("aria-invalid"), "true");
      const descriptionIds = (
        await entry.getAttribute("aria-describedby")
      ).split(" ");
      assert.equal(
        descriptionIds.length,
        2,
        "help and error both remain associated",
      );
      for (const name of approaches) {
        await select("approach", name);
        assert.equal(await entry.inputValue(), "ab");
        assert.equal(await example.getByRole("alert").count(), 1);
      }
      await entry.fill("A place for ideas");
      await example.getByRole("button", { name: "Check name" }).click();
      assert.match(await example.getByRole("status").innerText(), /ready/);
      assert.equal(await entry.getAttribute("aria-invalid"), null);
      await select("approach", "Inline");
      const label = await example
          .locator('[data-slot="field-label"]')
          .boundingBox(),
        control = await entry.boundingBox();
      assert.ok(
        control.x > label.x + label.width,
        "Inline puts explanation beside the control at a useful width",
      );
    } else if (id === "input-group") {
      await entry.fill("saved-address");
      await example.getByRole("button", { name: "Save address" }).click();
      assert.match(
        await example.getByRole("status").innerText(),
        /saved-address/,
      );
      await select("approach", "Quantity");
      const quantity = example.getByRole("spinbutton", { name: "Copies" });
      await quantity.fill("3");
      await example.getByRole("button", { name: "Add copies" }).click();
      assert.match(await example.getByRole("status").innerText(), /3 copies/);
      await select("approach", "Composer");
      await example
        .getByRole("textbox", { name: "Message" })
        .fill("Keep this thought");
      await example.getByRole("button", { name: "Send message" }).click();
      assert.match(
        await example.getByRole("status").innerText(),
        /Keep this thought/,
      );
      await select("approach", "Address");
      assert.equal(await entry.inputValue(), "saved-address");
    } else if (id === "textarea") {
      await entry.fill("A draft worth keeping");
      for (const name of approaches) {
        await select("approach", name);
        assert.equal(await entry.inputValue(), "A draft worth keeping");
      }
      assert.equal(await entry.getAttribute("maxLength"), "240");
      assert.match(
        await example.locator('[data-slot="textarea-count"]').innerText(),
        /21.*240/,
      );
      await example.getByRole("button", { name: "Keep note" }).click();
      assert.match(await example.getByRole("status").innerText(), /Kept/);
      await entry.fill("line\n".repeat(40));
      const bar=example.getByRole("scrollbar",{name:"Text scroll position"});
      await bar.waitFor(); assert.equal(await bar.getAttribute("aria-controls"),entryId);
      await bar.focus(); await bar.press("End");
      await page.waitForFunction(()=>document.querySelector('[data-example-role="interactive"] textarea')?.scrollTop>0);
      await entry.fill("A draft worth keeping");
    } else if (id === "input") {
      await entry.fill("A title that stays");
      for (const name of approaches) {
        await select("approach", name);
        assert.equal(await entry.inputValue(), "A title that stays");
      }
      await example.getByRole("button", { name: "Clear input" }).click();
      assert.equal(await entry.inputValue(), "");
      assert.equal(
        await entry.evaluate((e) => e === document.activeElement),
        true,
      );
      assert.ok(
        (
          await example
            .getByRole("button", { name: "Clear input" })
            .boundingBox()
        ).height >= 44,
        "clear has a real touch target",
      );
      await entry.fill("Ready for tomorrow");
    } else {
      for (const name of approaches) {
        await select("approach", name);
        const label = example.locator("label").first();
        await label.click();
        assert.equal(
          await entry.evaluate((e) => e === document.activeElement),
          true,
        );
        assert.equal(
          (await entry.getAttribute("required")) !== null,
          name === "Required",
        );
        if (name === "Help")
          assert.ok(await entry.getAttribute("aria-describedby"));
      }
    }
    for (const width of [390, 1280])
      for (const theme of ["light", "dark"])
        for (const name of approaches) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (theme) => (document.documentElement.dataset.mode = theme),
            theme,
          );
          await select("approach", name);
          await example.evaluate((e) => e.scrollIntoView({ block: "center" }));
          await page.mouse.move(width - 15, 16);
          await page.waitForTimeout(160);
          assert.ok(
            await example.evaluate((e) => {
              const box = e.getBoundingClientRect();
              return [
                ...e.querySelectorAll(
                  'input,textarea,button,[data-slot="field-label"]',
                ),
              ].every((node) => {
                const rect = node.getBoundingClientRect();
                return rect.left >= box.left - 1 && rect.right <= box.right + 1;
              });
            }),
            `${id}/${name}: no escaping field content`,
          );
          await example.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${theme}.png`,
          });
        }
    if (id !== "label") {
      if (id === "input") await select("approach", "Contour");
      else await select("field surface", "Contour");
      await select("corners", "Square");
      const shell = example
        .locator(
          '[data-slot="input"],[data-slot="input-group"],[data-slot="textarea-composer"],[data-slot="textarea"]',
        )
        .first();
      assert.equal(
        await shell.evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
        "0px",
      );
      await select("corners", "Pill");
      assert.ok(
        parseFloat(
          await shell.evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
        ) > 0,
      );
      if (id === "input") await select("approach", "Editorial");
      else await select("field surface", "Editorial");
      assert.equal(
        await page.getByRole("combobox", { name: "Example corners" }).count(),
        0,
        "borderless editorial must not advertise ineffective corners",
      );
      if(id!=="input"){
        await page.locator('.docs-playground [data-slot="preview"]').first().getByRole("button",{name:"Copy code",exact:true}).click();
        assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/fieldAppearance="editorial"/,"copied example carries the independently selected surface");
      }
    }
    console.log(
      `PASS ${id}: real approaches, native editing/feedback, responsive themes and corner scope`,
    );
  }
} finally {
  await browser.close();
}
