/** Targeted current-source proof; serves existing out/ assets and never builds the site.
 * Run with node scripts/check-calendar-button-lifecycle.mjs [--output=output/playwright/custom].
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
import fs from "node:fs";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, webkit, devices } from "playwright";
import { preview } from "vite";
const output = path.resolve(
  repoRoot,
  args.output || "output/playwright/calendar-button-lifecycle",
);
fs.mkdirSync(output, { recursive: true });
const server = await preview({
  configFile: false,
  root: repoRoot,
  base: "/sahajiv-ui/",
  build: { outDir: path.join(repoRoot, "out") },
  preview: { host: "127.0.0.1", port: 0 },
});
const base = `http://127.0.0.1:${server.httpServer.address().port}/sahajiv-ui`;
const fixture = await build({
  tsconfig: path.join(repoRoot, "tsconfig.json"),
  stdin: {
    sourcefile: "calendar-button.tsx",
    loader: "tsx",
    resolveDir: repoRoot,
    contents: `
import React from'react';import{createRoot}from'react-dom/client';import{Calendar}from'./registry/sahajiv/ui/calendar';import{Button}from'./registry/sahajiv/ui/button';
const host=document.createElement('div');host.id='finite-fixture';host.style.cssText='position:fixed;top:16px;left:16px;width:min(358px,calc(100vw - 32px));padding:16px;background:var(--v-canvas);z-index:10';document.body.append(host);
function Fixture(){const[loading,setLoading]=React.useState(false);return <><Calendar defaultMonth={new Date(2026,8,1)}/><div style={{display:'flex',gap:10,marginTop:16}}><Button id='subject-button' loading={loading}>Submit</Button><Button onClick={()=>setLoading(v=>!v)}>Toggle loading</Button></div></>};createRoot(host).render(<Fixture/>);
`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const results = [];
try {
  for (const [engine, width, theme] of [
    [chromium, 1440, "light"],
    [webkit, 390, "dark"],
  ]) {
    const browser = await engine.launch();
    const context = await browser.newContext({
      ...(engine === webkit ? devices["iPhone 13"] : {}),
      viewport: { width, height: 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(base + "/docs/calendar/");
      await page.locator("[data-example=calendar]").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content:
          fs.readFileSync(
            path.join(repoRoot, "registry/sahajiv/styles/calendar.css"),
            "utf8",
          ) +
          "\n" +
          fs.readFileSync(
            path.join(repoRoot, "registry/sahajiv/styles/button.css"),
            "utf8",
          ),
      });
      await page.addScriptTag({ content: fixture.outputFiles[0].text });
      const root = page.locator("#finite-fixture");
      const cal = root.locator("[data-slot=calendar]");
      await cal.waitFor();
      const next = cal.getByRole("button", { name: "Next month" }),
        prev = cal.getByRole("button", { name: "Previous month" });
      const retained = cal.locator("[data-animated-month][aria-hidden=true]");
      await next.click();
      await retained.waitFor();
      assert.equal(await retained.getAttribute("inert"), "");
      assert.equal(await retained.locator("[id]").count(), 0);
      assert((await retained.textContent()).includes("September"));
      assert((await cal.textContent()).includes("October"));
      const entering = cal.locator(".v-cal__weeks-after-enter");
      await entering.waitFor();
      const entry = await entering.evaluate((e) => ({
        animation: getComputedStyle(e).animationName,
        opacity: getComputedStyle(e).opacity,
        transform: getComputedStyle(e).transform,
      }));
      assert.equal(entry.animation, "v-cal-month-in-right");
      await page.screenshot({
        path: `${output}/month-enter-${width}-${theme}.png`,
      });
      await retained.waitFor({ state: "detached" });
      await prev.focus();
      await prev.press("Enter");
      await retained.waitFor();
      assert((await cal.textContent()).includes("September"));
      await retained.waitFor({ state: "detached" });
      await next.click();
      await prev.click();
      await retained.waitFor({ state: "detached" });
      assert((await cal.textContent()).includes("September"));
      const button = root.locator("#subject-button"),
        toggle = root.getByRole("button", { name: "Toggle loading" });
      await button.evaluate((e) => (window.__sameButton = e));
      const height = await button.evaluate((e) => e.offsetHeight);
      await toggle.click();
      const loader = button.locator("[data-slot=button-loading]");
      await loader.waitFor();
      assert.equal(await button.getAttribute("aria-busy"), "true");
      await page.waitForTimeout(250);
      await toggle.click();
      await button.locator("[data-motion-exiting=true]").waitFor();
      assert.equal(await button.getAttribute("aria-busy"), null);
      await loader.waitFor({ state: "detached" });
      assert.equal(await button.evaluate((e) => e.offsetHeight), height);
      assert(await button.evaluate((e) => window.__sameButton === e));
      const quiet = [];
      for (const mode of ["reduced", "off", "flow-off"]) {
        await page.emulateMedia({
          reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
        });
        await page.evaluate((mode) => {
          localStorage.removeItem("v-motion");
          localStorage.removeItem("v-flow-v1");
          if (mode === "off")
            localStorage.setItem(
              "v-motion",
              JSON.stringify({ v: 3, mode: "off", cats: {} }),
            );
          if (mode === "flow-off")
            localStorage.setItem(
              "v-flow-v1",
              JSON.stringify({
                variant: "off",
                hover: true,
                speed: 1,
                intensity: 1,
                hoverStrength: 1,
              }),
            );
          window.dispatchEvent(new CustomEvent("v-motion-change"));
          window.dispatchEvent(new CustomEvent("v-flow"));
        }, mode);
        await page.waitForTimeout(70);
        await next.click();
        assert.equal(await retained.count(), 0);
        await prev.click();
        await toggle.click();
        await loader.waitFor();
        assert.equal(await loader.getAttribute("data-motion-quiet"), "true");
        await toggle.click();
        await loader.waitFor({ state: "detached" });
        quiet.push(mode);
      }
      assert.deepEqual(errors, []);
      await page.waitForTimeout(600);
      console.log(
        "REST-PAINT",
        await button.evaluate((e) => ({
          busy: e.getAttribute("aria-busy"),
          disabled: e.getAttribute("aria-disabled"),
          fill: e.style.getPropertyValue("--mfill"),
          primary: getComputedStyle(e).getPropertyValue("--primary"),
          color: getComputedStyle(e).color,
        })),
      );
      await root.screenshot({
        path: `${output}/settled-${width}-${theme}.png`,
      });
      results.push({
        engine: engine === webkit ? "WebKit" : "Chromium",
        width,
        theme,
        status: "PASS",
        entry,
        quiet,
        monthPointerAndKeyboard: true,
        rapidReversal: true,
        oldMonthInert: true,
        stableButton: true,
        errors,
      });
      console.log(JSON.stringify(results.at(-1)));
    } catch (error) {
      results.push({
        engine: engine === webkit ? "WebKit" : "Chromium",
        width,
        theme,
        status: "FAIL",
        error: error.stack,
        errors,
      });
      await page
        .screenshot({ path: `${output}/failure-${width}-${theme}.png` })
        .catch(() => {});
      console.log(error.stack);
      process.exitCode = 1;
    } finally {
      await context.close();
      await browser.close();
    }
  }
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
}
