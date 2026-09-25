/**
 * Controlled props — a supplied `value` / `checked` must make the component
 * refuse to self-mutate, while its `on*Change` still fires with the requested
 * next value, and a parent re-render must move it.
 *
 * Why this exists: `table-native.browser.mjs` covers DataTable's controlled
 * page/filter/ref and nothing else. Every other controlled component in the
 * registry shares one implementation shape —
 *   `const selected = value ?? uncontrolled; … if (value === undefined) setUncontrolled(next)`
 * — and that `if` is the whole contract. Deleting it converts a controlled
 * component into an uncontrolled one *silently*: it still looks right in every
 * demo, because demos wire the callback back into state. The bug only appears
 * for a consumer who deliberately holds the value fixed, and it appears as
 * "React state diverged from my prop" much later.
 *
 * The gate asserts BOTH directions, because refusing every click is also a bug:
 *   1. Refusal   — click, and the rendered state must NOT move, while the
 *                  callback still reports exactly one request with the right value.
 *   2. Obedience — the parent writes the new value and re-renders, and the
 *                  component must follow. Without this, "refusal" alone would
 *                  pass on a component that simply ignores input.
 *
 * Runs against the existing docs server for its stylesheet only; never starts one.
 */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";

const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui";

const bundle = await build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {Switch} from './registry/cojeev/ui/switch';
import {Checkbox} from './registry/cojeev/ui/checkbox';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './registry/cojeev/ui/tabs';
window.requests=[];
window.state={switchOn:true,checked:false,tab:'one'};
const root=createRoot(document.getElementById('root'));
window.show=()=>flushSync(()=>root.render(<div style={{display:'grid',gap:24}}>
<Switch aria-label="Frozen switch" checked={window.state.switchOn} onCheckedChange={v=>window.requests.push(['switch',v])}/>
<Checkbox aria-label="Frozen checkbox" checked={window.state.checked} onCheckedChange={v=>window.requests.push(['checkbox',v])}>Frozen checkbox</Checkbox>
<Tabs value={window.state.tab} onValueChange={v=>window.requests.push(['tabs',v])}>
<TabsList><TabsTrigger value="one">One</TabsTrigger><TabsTrigger value="two">Two</TabsTrigger></TabsList>
<TabsContent value="one">First panel</TabsContent><TabsContent value="two">Second panel</TabsContent>
</Tabs>
</div>));
window.show();
`,
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});

const html = await fetch(`${base}/docs/tabs/`).then((r) => r.text());
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) =>
      fetch(new URL(m[1], base)).then((r) => r.text()),
    ),
  )
).join("\n");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<div id="root" style="padding:24px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });

  // A controlled component is allowed to *re-request* its value: Radix Tabs fires
  // onValueChange from the trigger's mousedown handler, and then again from focus,
  // because isSelected is still false while the parent refuses to move `value`.
  // That is correct controlled behaviour, so the contract is "at least one request,
  // every request carrying the right value, and no self-mutation" — not "exactly one".
  const requested = async (kind) =>
    (await page.evaluate(() => window.requests))
      .filter((entry) => entry[0] === kind)
      .map((entry) => entry[1]);
  const assertRequested = async (kind, expected, message) => {
    const seen = await requested(kind);
    assert.ok(seen.length >= 1, `${message} — no change was reported`);
    assert.ok(
      seen.every((value) => value === expected),
      `${message} — reported ${JSON.stringify(seen)}, expected every report to be ${JSON.stringify(expected)}`,
    );
  };
  const setState = (patch) =>
    page.evaluate((next) => {
      Object.assign(window.state, next);
      window.show();
    }, patch);

  // --- Switch -------------------------------------------------------------
  const switchEl = page.getByRole("switch", { name: "Frozen switch", exact: true });
  assert.equal(await switchEl.getAttribute("aria-checked"), "true", "switch starts checked");

  await switchEl.click();
  await assertRequested("switch", false, "a controlled Switch must still report the requested change");
  assert.equal(
    await switchEl.getAttribute("aria-checked"),
    "true",
    "a controlled Switch must NOT move on its own — it ignored the checked prop",
  );

  await setState({ switchOn: false });
  assert.equal(
    await switchEl.getAttribute("aria-checked"),
    "false",
    "a controlled Switch must follow the parent once the prop changes",
  );

  // --- Checkbox -----------------------------------------------------------
  const checkbox = page.getByRole("checkbox", { name: "Frozen checkbox", exact: true });
  await checkbox.click();
  await assertRequested("checkbox", true, "a controlled Checkbox must still report the requested change");
  assert.equal(
    await checkbox.getAttribute("aria-checked"),
    "false",
    "a controlled Checkbox must NOT move on its own",
  );

  await setState({ checked: true });
  assert.equal(
    await checkbox.getAttribute("aria-checked"),
    "true",
    "a controlled Checkbox must follow the parent once the prop changes",
  );

  // --- Tabs ---------------------------------------------------------------
  const one = page.getByRole("tab", { name: "One", exact: true });
  const two = page.getByRole("tab", { name: "Two", exact: true });
  assert.equal(await one.getAttribute("aria-selected"), "true", "tabs start on 'one'");
  assert.equal(await page.getByText("First panel", { exact: true }).isVisible(), true);

  await two.click();
  await assertRequested("tabs", "two", "a controlled Tabs must still report the requested change");
  assert.equal(
    await one.getAttribute("aria-selected"),
    "true",
    "a controlled Tabs must NOT move on its own — it ignored the value prop",
  );
  assert.equal(
    await two.getAttribute("aria-selected"),
    "false",
    "the clicked controlled tab must stay unselected until the parent moves it",
  );
  assert.equal(
    await page.getByText("First panel", { exact: true }).isVisible(),
    true,
    "a controlled Tabs must keep showing the panel its value prop names",
  );

  await setState({ tab: "two" });
  assert.equal(await two.getAttribute("aria-selected"), "true", "a controlled Tabs must follow the parent");
  assert.equal(
    await page.getByText("Second panel", { exact: true }).isVisible(),
    true,
    "the panel must follow the controlled value",
  );

  assert.deepEqual(errors, [], `controlled interaction raised ${errors.length} page error(s)`);
  console.log(
    "PASS controlled props: Switch, Checkbox and Tabs refuse to self-mutate on a supplied value/checked, report the requested change, and follow the parent on re-render",
  );
} finally {
  await browser.close();
}
