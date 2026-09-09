/** Targeted current-source proof; serves existing out/ assets and never builds the site.
 * Run with node scripts/check-button-paint.mjs [--output=output/playwright/custom].
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
import { webkit, devices } from "playwright";
import { preview } from "vite";
const output = path.resolve(
  repoRoot,
  args.output || "output/playwright/button-paint",
);
fs.mkdirSync(output, { recursive: true });
const server = await preview({
  configFile: false,
  root: repoRoot,
  base: "/cojeev-ui/",
  build: { outDir: path.join(repoRoot, "out") },
  preview: { host: "127.0.0.1", port: 0 },
});
const base = `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`;
const fixture = await build({
  tsconfig: path.join(repoRoot, "tsconfig.json"),
  stdin: {
    sourcefile: "button-paint.tsx",
    loader: "tsx",
    resolveDir: repoRoot,
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{Button}from'./registry/cojeev/ui/button';const host=document.createElement('div');host.id='paint-fixture';host.style.cssText='position:fixed;top:16px;left:16px;width:358px;padding:16px;background:var(--v-canvas);z-index:10';document.body.append(host);function Fixture(){const[loading,setLoading]=React.useState(false);return <><Button id='paint-subject' loading={loading}>Submit</Button><Button onClick={()=>setLoading(v=>!v)}>Toggle loading</Button></>};createRoot(host).render(<Fixture/>);`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const browser = await webkit.launch();
const results = [];
try {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/docs/button/");
  await page.locator("[data-example=button]").waitFor();
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-mode", "dark"),
  );
  await page.addStyleTag({
    content: fs.readFileSync(
      path.join(repoRoot, "registry/cojeev/styles/button.css"),
      "utf8",
    ),
  });
  await page.addScriptTag({ content: fixture.outputFiles[0].text });
  const root = page.locator("#paint-fixture"),
    button = root.locator("#paint-subject"),
    toggle = root.getByRole("button", { name: "Toggle loading" });
  await button.waitFor();
  const paint = () =>
    button.evaluate((e) => {
      const clone = e.cloneNode(true);
      clone.removeAttribute("id");
      clone.classList.remove("v-morph-host", "v-morph-live", "v-morph-rel");
      clone.querySelectorAll("svg.v-morph").forEach((s) => s.remove());
      clone.style.removeProperty("--mfill");
      clone.style.setProperty("transition-property", "none", "important");
      clone.style.position = "fixed";
      clone.style.visibility = "hidden";
      e.parentElement.append(clone);
      const expected = getComputedStyle(clone);
      const result = {
        busy: e.getAttribute("aria-busy"),
        disabled: e.getAttribute("aria-disabled"),
        actualFill: getComputedStyle(
          e.querySelector("svg.v-morph [data-morph-body]"),
        ).fill,
        actualForeground: getComputedStyle(e).color,
        expectedFill: expected.backgroundColor,
        expectedForeground: expected.color,
      };
      clone.remove();
      return result;
    });
  for (const mode of ["active", "flow-off"]) {
    await page.evaluate((mode) => {
      localStorage.removeItem("v-motion");
      localStorage.removeItem("v-flow-v1");
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
    await page.waitForTimeout(100);
    await toggle.tap();
    await button.locator("[data-slot=button-loading]").waitFor();
    await page.waitForTimeout(400);
    const busy = await paint();
    await toggle.tap();
    await button
      .locator("[data-slot=button-loading]")
      .waitFor({ state: "detached" });
    await page.waitForTimeout(650);
    const rest = await paint();
    const record = {
      mode,
      busy,
      rest,
      status:
        busy.actualFill === busy.expectedFill &&
        rest.actualFill === rest.expectedFill &&
        rest.actualForeground === rest.expectedForeground
          ? "PASS"
          : "FAIL",
    };
    results.push(record);
    await root.screenshot({ path: `${output}/${mode}-rest.png` });
    console.log(JSON.stringify(record));
  }
  assert.deepEqual(errors, []);
  if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
}
