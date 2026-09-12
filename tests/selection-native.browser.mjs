import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (await fetch(`${origin}/cojeev-ui/docs/select/`)).text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
      (await fetch(new URL(m[1], origin))).text(),
    ),
  )
).join("\n");
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{MultiSelect}from'./registry/cojeev/ui/multi-select';import{Select,SelectTrigger,SelectValue,SelectContent,SelectItem}from'./registry/cojeev/ui/select';import{NativeSelect,NativeSelectOption}from'./registry/cojeev/ui/native-select';
const root=createRoot(document.getElementById('root'));window.changes=[];
const options=[{value:'writing',label:'Writing'},{value:'locked',label:'Locked',disabled:true},...Array.from({length:30},(_,i)=>({value:'item-'+i,label:'Item '+i}))];
function Fixture({presentation='tokens',disabled=false,refuse=false,controlled=false,resetKey=0}){return <form key={resetKey} onSubmit={e=>e.preventDefault()} onReset={e=>{if(window.preventReset)e.preventDefault()}}>
<MultiSelect label="Workspaces" presentation={presentation} options={options} value={controlled ? ['writing','locked','retired'] : undefined} defaultValue={['writing','locked','retired']} onValueChange={values=>window.changes.push(values)} name="workspaces" disabled={disabled} error="Review these choices." description="Some choices are locked."/>
<label htmlFor="native">Native rhythm</label><NativeSelect ref={n=>window.native=n} id="native" name="native" value={refuse?'a':undefined} defaultValue={refuse?undefined:'a'} onChange={e=>window.changes.push(e.target.value)} disabled={disabled}><NativeSelectOption value="a">Alpha</NativeSelectOption><NativeSelectOption value="b" disabled>Blocked</NativeSelectOption><NativeSelectOption value="c">Charlie</NativeSelectOption></NativeSelect>
<label htmlFor="custom">Custom rhythm</label><Select name="custom" value={refuse?'a':undefined} defaultValue={refuse?undefined:'a'} onValueChange={v=>window.changes.push(v)} disabled={disabled}><SelectTrigger ref={n=>window.trigger=n} id="custom"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="a" description="First choice">Alpha</SelectItem><SelectItem value="b" disabled>Blocked</SelectItem><SelectItem value="c" description="Final choice">Charlie</SelectItem></SelectContent></Select>
<button type="reset">Reset</button></form>}
window.renderSelection=props=>flushSync(()=>root.render(<Fixture {...props}/>));window.renderSelection({});`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 700, height: 900 },
    reducedMotion: "reduce",
  });
  await page.setContent(
    '<style>form{max-width:460px;padding:24px;display:grid;gap:16px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const formValues = () =>
    page.evaluate(() =>
      new FormData(document.querySelector("form")).getAll("workspaces"),
    );
  assert.deepEqual(await formValues(), ["writing", "locked", "retired"]);
  assert.equal(
    await page.getByRole("button", { name: "Remove Locked" }).isDisabled(),
    true,
  );
  for (const presentation of ["summary", "checklist", "tokens"]) {
    await page.evaluate(
      (p) => window.renderSelection({ presentation: p, resetKey: p }),
      presentation,
    );
    if (presentation === "summary")
      await page
        .getByRole("button", { name: "Workspaces", exact: true })
        .click();
    const remove = page.getByRole("button", { name: "Remove retired" });
    assert.equal(
      await remove.count(),
      1,
      `${presentation}: unknown selected values remain removable`,
    );
    await remove.click();
    assert.deepEqual(await formValues(), ["writing", "locked"]);
    if (presentation === "summary") await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.waitForFunction(() =>
      new FormData(document.querySelector("form"))
        .getAll("workspaces")
        .includes("retired"),
    );
    assert.deepEqual(
      await formValues(),
      ["writing", "locked", "retired"],
      `${presentation}: native reset restores defaults`,
    );
  }
  await page.evaluate(() =>
    window.renderSelection({ presentation: "checklist", resetKey: 100 }),
  );
  const writing = page.getByRole("checkbox", { name: "Writing", exact: true });
  const search = page.getByRole("searchbox", { name: "Search Workspaces" });
  await search.focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await writing.evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Item 0", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("End");
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Item 29", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Space");
  assert.ok((await formValues()).includes("item-29"));
  try {
    await page
      .locator('[data-slot="multi-select"] [data-slot="scroll-area-thumb"]')
      .waitFor({ timeout: 8000 });
  } catch (error) {
    console.log(
      await page
        .locator('[data-slot="scroll-area-viewport"]')
        .evaluateAll((nodes) =>
          nodes.map((el) => ({
            client: el.clientHeight,
            scroll: el.scrollHeight,
            style: el.getAttribute("style"),
            parent: el.parentElement.outerHTML.slice(0, 1200),
          })),
        ),
    );
    throw error;
  }
  await page.getByLabel("Native rhythm").selectOption("c");
  await page.getByRole("combobox", { name: "Custom rhythm" }).click();
  await page.getByRole("option", { name: "Charlie", exact: true }).click();
  await page.evaluate(() => (window.preventReset = true));
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.ok((await formValues()).includes("item-29"));
  assert.equal(await page.getByLabel("Native rhythm").inputValue(), "c");
  assert.equal(
    await page.getByRole("combobox", { name: "Custom rhythm" }).innerText(),
    "Charlie",
  );
  await page.evaluate(() => (window.preventReset = false));
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForFunction(
    () =>
      new FormData(document.querySelector("form")).getAll("workspaces")
        .length === 3,
  );
  assert.equal(await page.getByLabel("Native rhythm").inputValue(), "a");
  assert.equal(
    await page.getByRole("combobox", { name: "Custom rhythm" }).innerText(),
    "Alpha",
  );
  await page.evaluate(() => {
    window.preventReset = false;
    window.renderSelection({
      presentation: "checklist",
      controlled: true,
      refuse: true,
    });
  });
  await writing.click();
  assert.ok(
    (await formValues()).includes("writing"),
    "Controlled refusal is honored",
  );
  const native = page.getByLabel("Native rhythm"),
    custom = page.getByRole("combobox", { name: "Custom rhythm" });
  assert.equal(
    await native.evaluate(
      (e) => e === window.native && e instanceof HTMLSelectElement,
    ),
    true,
  );
  assert.equal(
    await custom.evaluate(
      (e) => e === window.trigger && e instanceof HTMLButtonElement,
    ),
    true,
  );
  await native.selectOption("c");
  assert.equal(await native.inputValue(), "a");
  await custom.click();
  await page.getByRole("option", { name: "Charlie", exact: true }).click();
  assert.equal(await custom.innerText(), "Alpha");
  await page.evaluate(() =>
    window.renderSelection({ presentation: "summary", disabled: true }),
  );
  assert.deepEqual(await formValues(), []);
  assert.equal(
    await page
      .getByRole("button", { name: "Workspaces", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(await native.isDisabled(), true);
  assert.equal(await custom.isDisabled(), true);
  await page.evaluate(() =>
    window.renderSelection({ presentation: "checklist", disabled: true }),
  );
  assert.equal(await search.isDisabled(), true);
  await page.evaluate(() =>
    window.renderSelection({ presentation: "tokens", resetKey: 200 }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const target of [
    page.locator('.v-multi-select__trigger'),
    page.locator('#native'),
    page.locator('#custom'),
  ]) {
    await page.keyboard.press("Escape");
    await target.scrollIntoViewIfNeeded();
    const before = await target.boundingBox();
    await page.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await page.mouse.down();
    await page.waitForTimeout(100);
    const after = await target.boundingBox();
    assert.ok(
      Math.abs(after.x - before.x) < 0.05 &&
        Math.abs(after.y - before.y) < 0.05 &&
        Math.abs(after.width - before.width) < 0.05 &&
        Math.abs(after.height - before.height) < 0.05,
      "Held selection target stays stationary",
    );
    await page.mouse.up();
    await page.keyboard.press("Escape");
  }
  console.log(
    "PASS selection native labels/ref/form/reset, locked/unknown values, all presentations, keyboard/scroll, controlled refusal, disabled state and stable held targets",
  );
} finally {
  await browser.close();
}
