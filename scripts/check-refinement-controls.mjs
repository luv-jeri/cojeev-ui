/** Two-width/two-theme current-source control proof. Uses the running docs CSS,
 * mounts real components, and writes local screenshots/receipts. No site build. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...v] = arg.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const output = path.resolve(
  root,
  args.output || "output/playwright/refinement-controls/round-1",
);
fs.mkdirSync(output, { recursive: true });
const base = args.url || "http://127.0.0.1:4320/sahajiv-ui";
const bundle = await build({
  entryPoints: [path.join(root, "scripts/fixtures/refined-controls.tsx")],
  tsconfig: path.join(root, "tsconfig.json"),
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const css = `body{background:var(--v-canvas);color:var(--v-text)}#refinement-fixture{padding:32px;max-width:1140px;margin:0 auto;min-width:0}#refinement-fixture h1{font-family:var(--font-display);font-size:34px;line-height:1.1;margin:12px 0 44px;letter-spacing:-.025em}#refinement-fixture h2{font-family:var(--font-display);font-size:26px;margin:0 0 24px;line-height:1.2}#refinement-fixture h3{font-size:13px;font-weight:600;margin-bottom:16px;text-transform:capitalize}#refinement-fixture section{margin-bottom:52px;min-width:0}.rf-button-matrix{display:grid;gap:22px;margin-top:24px}.rf-button-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.rf-button-row>b{width:75px;font-size:12px}.rf-selector-matrix{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:32px}.rf-selector-panel{display:grid;gap:8px;align-content:start}.rf-selector-panel [role=radiogroup]{margin-top:8px;padding-top:12px;border-top:1px solid var(--v-border)}.rf-two-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px;align-items:start}.rf-questionnaire-matrix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px}#events{display:block;font-size:12px;overflow-wrap:anywhere}@media(max-width:600px){#refinement-fixture{padding:24px 20px}.rf-two-column,.rf-questionnaire-matrix{grid-template-columns:1fr;gap:32px}.rf-button-row{gap:10px}.rf-button-row>b{width:100%}#refinement-fixture h1{font-size:29px}.rf-selector-matrix{grid-template-columns:1fr}}`;
const browser = await chromium.launch();
const results = [];
function rgb(s) {
  const values = s.match(/[\d.]+/g)?.map(Number);
  return values?.slice(0, 3) || [0, 0, 0];
}
function contrast(a, b) {
  const L = (c) => {
    const v = rgb(c).map((n) => {
      n /= 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const x = L(a),
    y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const paint = (locator) =>
  locator.evaluate((e) => {
    const svg = e.querySelector(":scope > svg.v-morph"),
      p = svg?.querySelector("[data-morph-body]"),
      s = getComputedStyle(e);
    return {
      fill: p ? getComputedStyle(p).fill : s.backgroundColor,
      host: s.backgroundColor,
      foreground: s.color,
      svgOpacity: svg ? getComputedStyle(svg).opacity : "1",
      mode: e.dataset.morph,
      disabled: e.getAttribute("aria-disabled"),
      busy: e.getAttribute("aria-busy"),
    };
  });
try {
  for (const width of [390, 1440])
    for (const theme of ["light", "dark"]) {
      const record = {
        width,
        theme,
        status: "RUNNING",
        checks: [],
        paints: [],
        errors: [],
      };
      results.push(record);
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on("pageerror", (e) => record.errors.push(e.message));
      try {
        await page.goto(base + "/docs/button/");
        await page.locator("[data-example=button]").waitFor();
        await page.evaluate((theme) => {
          document.documentElement.dataset.mode = theme;
          localStorage.removeItem("v-motion");
          localStorage.removeItem("v-flow-v1");
          localStorage.removeItem("v-morph-v4");
        }, theme);
        await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        await page.locator("#refinement-fixture").waitFor();
        await page.evaluate(() => window.__setRefinementMode("active"));
        await page.evaluate(() => document.fonts.ready);
        const shot = async (name, locator) => {
          await locator.scrollIntoViewIfNeeded();
          await locator.screenshot({
            path: path.join(output, `${width}-${theme}-${name}.png`),
          });
        };
        if (args.only === "motion") {
          const panel = page.locator("[data-shape-case=organic]");
          for (const kind of ["checkbox", "radio"]) {
            const owner =
              kind === "checkbox"
                ? panel.locator("[data-case=check]")
                : panel.getByRole("radio", { name: "One good option" });
            await owner.scrollIntoViewIfNeeded();
            const body = owner.locator(
              "[data-slot=selector-surface-host] > svg.v-morph [data-morph-body]",
            );
            await body.waitFor({ state: "attached" });
            await page.mouse.move(width - 2, 2);
            await page.waitForTimeout(300);
            const before = await body.getAttribute("d");
            const rect = await owner
              .locator("[data-slot=selector-surface-host]")
              .boundingBox();
            await page.mouse.move(
              rect.x + rect.width + 7,
              rect.y + rect.height / 2,
            );
            await page.waitForTimeout(180);
            const near = await body.getAttribute("d");
            assert.notEqual(
              near,
              before,
              `${kind} pointer attraction must change the real contour`,
            );
            await shot(`organic-${kind}-attract`, panel);
            await page.mouse.move(width - 2, 2);
            await owner.focus();
            const prePress = await body.getAttribute("d");
            await page.keyboard.down("Space");
            await page.waitForTimeout(70);
            const pressed = await body.getAttribute("d");
            await page.keyboard.up("Space");
            assert.notEqual(
              pressed,
              prePress,
              `${kind} keyboard press must reach the shared body`,
            );
            record.checks.push(
              `${kind}: actual pointer contour and keyboard press deformation`,
            );
          }
          const picker = page.locator("#date-picker").getByRole("button");
          record.paints.push({
            state: "date-trigger-final",
            ...(await paint(picker)),
          });
          await shot("date-picker-final", page.locator("#date-picker"));
          for (const variant of ["default", "compact"]) {
            const drop = page.locator(
              `[data-drop-case=${variant}] [data-slot=dropzone]`,
            );
            await drop.scrollIntoViewIfNeeded();
            await drop.evaluate((e) =>
              e.dispatchEvent(
                new DragEvent("dragenter", {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: new DataTransfer(),
                }),
              ),
            );
            assert.equal(await drop.getAttribute("data-state"), "over");
            await shot(`dropzone-${variant}-drag`, drop);
            await drop.evaluate((e) => {
              const data = new DataTransfer();
              data.items.add(
                new File(["hello"], "dropped-note.txt", { type: "text/plain" }),
              );
              e.dispatchEvent(
                new DragEvent("drop", {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: data,
                }),
              );
            });
            assert.equal(await drop.getAttribute("data-state"), "selected");
            assert((await drop.textContent()).includes("dropped-note.txt"));
            record.checks.push(
              `${variant}: drag state and actual dropped File callback`,
            );
          }
          for (const mode of ["off", "flow-off", "reduced"]) {
            await page.evaluate(
              (mode) =>
                window.__setRefinementMode(
                  mode === "reduced" ? "active" : mode,
                ),
              mode,
            );
            await page.emulateMedia({
              reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
            });
            await page.waitForTimeout(100);
            const glyphs = panel.locator("[data-slot=selector-glyph]");
            assert.equal(
              await glyphs.first().getAttribute("data-motion-quiet"),
              "true",
            );
            assert.equal(
              await panel
                .locator("[data-slot=selector-surface-host] > svg.v-morph")
                .count(),
              0,
            );
            const shapes = await panel
              .locator("[data-slot=selector-surface]")
              .evaluateAll((es) =>
                es.map((e) => ({
                  d: e.getAttribute("d"),
                  opacity: getComputedStyle(e).opacity,
                })),
              );
            await page.mouse.move(30, 250);
            await page.waitForTimeout(130);
            assert.deepEqual(
              await panel
                .locator("[data-slot=selector-surface]")
                .evaluateAll((es) =>
                  es.map((e) => ({
                    d: e.getAttribute("d"),
                    opacity: getComputedStyle(e).opacity,
                  })),
                ),
              shapes,
            );
            assert(shapes.every((shape) => shape.opacity === "1"));
            await shot(`organic-${mode}`, panel);
            record.checks.push(
              `${mode}: no body subscription, unchanged visible fallback contour`,
            );
          }
          assert.deepEqual(record.errors, []);
          record.status = "PASS";
          continue;
        }
        const sections = [
          "buttons",
          "selectors",
          "pictographic",
          "calendar-section",
          "dropzones",
          "questionnaires",
        ];
        if (!args["skip-overviews"])
          for (const id of sections) await shot(id, page.locator("#" + id));
        record.paints.push({
          state: "date-trigger-rest",
          ...(await paint(page.locator("#date-picker").getByRole("button"))),
        });
        const buttonRoot = page.locator("#buttons");
        await buttonRoot.locator("[data-case=secondary-rest]").hover();
        await page.waitForTimeout(180);
        const hover = await paint(
          buttonRoot.locator("[data-case=secondary-rest]"),
        );
        record.paints.push({ state: "secondary-hover", ...hover });
        await page.locator("#busy-toggle").click();
        await buttonRoot
          .locator("[data-case=default-busy] [data-slot=button-loading]")
          .waitFor();
        for (const variant of [
          "default",
          "secondary",
          "accent",
          "outline",
          "ghost",
          "danger",
        ])
          for (const state of ["rest", "disabled", "busy"]) {
            const p = await paint(
              buttonRoot.locator(`[data-case=${variant}-${state}]`),
            );
            const effective =
              p.fill === "none" || p.fill === "rgba(0, 0, 0, 0)"
                ? p.host
                : p.fill;
            record.paints.push({
              variant,
              state,
              ...p,
              contrast: contrast(p.foreground, effective),
            });
            if (variant !== "outline" && variant !== "ghost") {
              assert.equal(p.svgOpacity, "1");
              assert(
                contrast(p.foreground, effective) >= 4.5,
                `${variant}/${state} contrast`,
              );
            }
          }
        await shot("buttons-busy", buttonRoot);
        await page.locator("#busy-toggle").click();
        await buttonRoot
          .locator("[data-slot=button-loading]")
          .first()
          .waitFor({ state: "detached" });
        record.checks.push(
          "Button states, actual SVG opacity and text/fill contrast",
        );
        for (const shape of [
          "organic",
          "pebble",
          "rounded",
          "circle",
          "leaf",
          "flower",
        ]) {
          const panel = page.locator(`[data-shape-case=${shape}]`);
          const cb = panel.locator("[data-case=check]");
          await cb.click();
          assert.equal(await cb.getAttribute("aria-checked"), "true");
          await cb.press("Space");
          assert.equal(await cb.getAttribute("aria-checked"), "false");
          const group = panel.getByRole("radiogroup");
          await group.getByRole("radio", { name: "One good option" }).focus();
          await page.keyboard.press("ArrowDown", { delay: 60 });
          await page.waitForFunction(
            (shape) =>
              document
                .querySelector(
                  `[data-shape-case=${shape}] [role=radio][data-state=checked]`,
                )
                ?.textContent.includes("Another way"),
            shape,
          );
          assert.equal(
            await group
              .getByRole("radio", { name: "Another way" })
              .getAttribute("aria-checked"),
            "true",
          );
          assert.equal(
            await panel
              .getByRole("checkbox", { name: "Managed selection" })
              .getAttribute("aria-checked"),
            "true",
          );
          await shot(`selector-${shape}`, panel);
        }
        record.checks.push(
          "Six shapes: pointer checkbox, Space toggle, radio ArrowDown, disabled checked and indeterminate states",
        );
        const cal = page.locator("#calendar");
        await cal.getByRole("button", { name: "Next month" }).click();
        await cal.locator("[data-animated-month][aria-hidden=true]").waitFor();
        await shot("calendar-moving", cal);
        await cal
          .locator("[data-animated-month][aria-hidden=true]")
          .waitFor({ state: "detached" });
        await cal.getByRole("button", { name: "Previous month" }).focus();
        await page.keyboard.press("Enter");
        await cal
          .locator("[data-animated-month][aria-hidden=true]")
          .waitFor({ state: "detached" });
        await cal.locator('[data-slot=calendar-day][data-d="17"]').click();
        assert((await cal.textContent()).includes("17 September"));
        record.checks.push(
          "Calendar retained month pointer/Enter and selected callback",
        );
        const picker = page.locator("#date-picker").getByRole("button");
        await picker.click();
        const popup = page.locator("[data-slot=date-picker-content]");
        await popup.waitFor();
        await shot("date-picker-open", popup);
        const bounds = await popup.boundingBox();
        assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        await popup.locator('[data-slot=calendar-day][data-d="21"]').click();
        await popup.waitFor({ state: "hidden" });
        assert(
          (await page.locator("#date-picker").textContent()).includes(
            "21/09/2026",
          ),
        );
        assert(await picker.evaluate((e) => e === document.activeElement));
        record.checks.push(
          "Date popup bounded, select callback, close and focus return",
        );
        for (const variant of ["default", "compact"]) {
          const drop = page.locator(
            `[data-drop-case=${variant}] [data-slot=dropzone]`,
          );
          const input = drop.locator("input[type=file]");
          await drop.focus();
          const chooserPromise = page.waitForEvent("filechooser");
          await drop.press("Enter");
          const chooser = await chooserPromise;
          await chooser.setFiles({
            name: "A thoughtful note.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("A useful local note."),
          });
          assert.equal(await drop.getAttribute("data-state"), "selected");
          assert((await drop.textContent()).includes("A thoughtful note.txt"));
          await shot(`dropzone-${variant}-selected`, drop);
          await input.setInputFiles({
            name: "too-large.txt",
            mimeType: "text/plain",
            buffer: Buffer.alloc(5000),
          });
          assert.equal(await drop.getAttribute("data-state"), "error");
          assert((await drop.textContent()).includes("smaller than 4 KB"));
          await shot(`dropzone-${variant}-error`, drop);
          await input.setInputFiles({
            name: "not-accepted.zip",
            mimeType: "application/zip",
            buffer: Buffer.from("zip"),
          });
          assert((await drop.textContent()).includes("not accepted"));
        }
        record.checks.push(
          "Both Dropzones: keyboard chooser, real accepted File, size/type rejection and visible receipt",
        );
        for (const shape of [
          "organic",
          "pebble",
          "rounded",
          "circle",
          "leaf",
          "flower",
        ]) {
          const q = page.locator(`[data-questionnaire-case=${shape}]`);
          await q.getByText("Making", { exact: true }).click();
          assert(await q.locator("input[value=Making]").isChecked());
          await q.locator("input[value=Making]").focus();
          await page.keyboard.press("ArrowDown", { delay: 60 });
          assert(await q.locator("input[value=Resting]").isChecked());
          await shot(`questionnaire-${shape}-selected`, q);
        }
        record.checks.push(
          "Questionnaire: all six shapes, native radio pointer/arrow and progress callbacks",
        );
        for (const mode of ["off", "flow-off", "reduced"]) {
          await page.evaluate(
            (mode) =>
              window.__setRefinementMode(mode === "reduced" ? "active" : mode),
            mode,
          );
          await page.emulateMedia({
            reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
          });
          await page.waitForTimeout(80);
          const cb = page.locator(
            "[data-shape-case=organic] [data-case=check]",
          );
          await cb.click();
          assert.equal(
            await cb
              .locator("[data-slot=selector-glyph]")
              .getAttribute("data-motion-quiet"),
            "true",
          );
          await cb.click();
          await page.locator("#busy-toggle").click();
          await buttonRoot
            .locator("[data-case=secondary-busy] [data-slot=button-loading]")
            .waitFor();
          record.paints.push({
            mode,
            ...(await paint(buttonRoot.locator("[data-case=secondary-busy]"))),
          });
          await shot(`buttons-${mode}`, buttonRoot);
          await page.locator("#busy-toggle").click();
          await buttonRoot
            .locator("[data-slot=button-loading]")
            .first()
            .waitFor({ state: "detached" });
          await cal.getByRole("button", { name: "Next month" }).click();
          assert.equal(
            await cal
              .locator("[data-animated-month][aria-hidden=true]")
              .count(),
            0,
          );
          await cal.getByRole("button", { name: "Previous month" }).click();
        }
        record.checks.push(
          "Off, Flow Off, reduced: quiet selector, actual busy surface, immediate month replacement",
        );
        assert.deepEqual(record.errors, []);
        const viewportBounds = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        record.bounds = viewportBounds;
        assert(viewportBounds.document <= width + 1);
        record.status = "PASS";
      } catch (error) {
        record.status = "FAIL";
        record.error = error.stack;
        await page
          .screenshot({
            path: path.join(output, `${width}-${theme}-failure.png`),
          })
          .catch(() => {});
        process.exitCode = 1;
      } finally {
        await context.close();
        console.log(
          JSON.stringify({
            width,
            theme,
            status: record.status,
            checks: record.checks.length,
            error: record.error,
            errors: record.errors,
          }),
        );
      }
    }
} finally {
  await browser.close();
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
}
