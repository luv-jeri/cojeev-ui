import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (await fetch(`${origin}/cojeev-ui/docs/input/`)).text();
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
import{Input,InputWrapper,InputControl,InputClear}from'./registry/cojeev/ui/input';
import{Field,FieldLabel,FieldControl,FieldDescription,FieldError}from'./registry/cojeev/ui/field';
import{Textarea}from'./registry/cojeev/ui/textarea';
const root=createRoot(document.getElementById('root'));window.calls=[];
function Fixture({layout,appearance='contour',refuse=false,preventClear=false}){const[value,setValue]=React.useState('A first draft');return <form onSubmit={e=>e.preventDefault()}>
<Field controlId="name" layout={layout} appearance={appearance} invalid><FieldLabel>Name</FieldLabel><InputWrapper appearance={appearance} ref={node=>window.wrapper=node}><FieldControl><InputControl name="name" ref={node=>window.input=node} value={value} required onChange={e=>{window.calls.push(e.target.value);if(!refuse)setValue(e.target.value)}}/></FieldControl><InputClear ref={node=>window.clear=node} onClick={e=>{if(preventClear)e.preventDefault()}} onClear={()=>{window.calls.push('clear');if(!refuse)setValue('')}}/></InputWrapper><FieldDescription>Use a unique name.</FieldDescription><FieldError>Try another name.</FieldError></Field>
<label htmlFor="notes">Notes</label><Textarea id="notes" name="notes" ref={node=>window.textarea=node} defaultValue="Kept locally"/><Input aria-label="Locked" name="locked" disabled value="Managed"/><Input aria-label="Read only" name="read" readOnly value="Available" nativeSize={12}/>
</form>}
window.renderForm=props=>flushSync(()=>root.render(<Fixture {...props}/>));window.renderForm({});`,
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
    viewport: { width: 700, height: 700 },
    reducedMotion: "reduce",
  });
  await page.setContent(
    '<style>form{max-width:480px;padding:24px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const input = page.getByRole("textbox", { name: "Name", exact: true }),
    clear = page.getByRole("button", { name: "Clear input" });
  assert.equal(await input.evaluate((e) => e === window.input), true);
  assert.equal(
    await clear.evaluate(
      (e) => e === window.clear && e instanceof HTMLButtonElement,
    ),
    true,
  );
  assert.equal(
    await page
      .locator('[data-slot="input"]')
      .first()
      .evaluate((e) => e === window.wrapper),
    true,
  );
  assert.equal(
    await page.locator('[data-slot="field"]').getAttribute("data-layout"),
    null,
    "omitted layout preserves legacy default",
  );
  assert.equal(await input.getAttribute("aria-invalid"), "true");
  const ids = (await input.getAttribute("aria-describedby")).split(" ");
  assert.equal(ids.length, 2);
  for (const id of ids)
    assert.equal(await page.locator(`[id="${id}"]`).count(), 1);
  await page.locator('label[for="name"]').click();
  assert.equal(await input.evaluate((e) => e === document.activeElement), true);
  await input.fill("An edited draft");
  await input.press("Home");
  await input.press("ArrowRight");
  await input.press("Shift+ArrowRight");
  assert.equal(
    await input.evaluate((e) => e.selectionEnd - e.selectionStart),
    1,
  );
  for (const layout of ["stacked", "inline", "integrated"])
    for (const appearance of ["contour", "editorial", "inset"]) {
      await page.evaluate((config) => window.renderForm(config), {
        layout,
        appearance,
      });
      assert.equal(await input.inputValue(), "An edited draft");
      assert.equal(await input.evaluate((e) => e === window.input), true);
    }
  assert.deepEqual(
    await page.evaluate(() => [
      ...new FormData(document.querySelector("form")),
    ]),
    [
      ["name", "An edited draft"],
      ["notes", "Kept locally"],
      ["read", "Available"],
    ],
  );
  assert.equal(
    await page.getByRole("textbox", { name: "Read only" }).getAttribute("size"),
    "12",
  );
  await page.evaluate(() => {
    window.calls = [];
    window.renderForm({ preventClear: true });
  });
  await clear.click();
  assert.deepEqual(await page.evaluate(() => window.calls), []);
  assert.equal(await input.inputValue(), "An edited draft");
  await page.evaluate(() => {
    window.calls = [];
    window.renderForm({ refuse: true });
  });
  await clear.click();
  assert.deepEqual(await page.evaluate(() => window.calls), ["clear"]);
  assert.equal(await input.inputValue(), "An edited draft");
  await page.evaluate(() => window.renderForm({}));
  await clear.click();
  assert.equal(await input.inputValue(), "");
  assert.equal(await input.evaluate((e) => e.validity.valueMissing), true);
  const notes = page.getByRole("textbox", { name: "Notes" });
  await notes.fill("Line one\nLine two");
  assert.equal(await notes.evaluate((e) => e === window.textarea), true);
  assert.equal(await notes.inputValue(), "Line one\nLine two");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await input.fill("Pointer stable");
  const native = await input.boundingBox(),
    button = await clear.boundingBox();
  await page.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(120);
  assert.deepEqual(await clear.boundingBox(), button);
  assert.deepEqual(await input.boundingBox(), native);
  await page.mouse.up();
  assert.equal(
    await page.locator("[layout],[appearance],[radius],[nativeSize]").count(),
    0,
    "configuration props are consumed rather than leaked",
  );
  console.log(
    "PASS native form labels/help/error IDs, refs, all field layouts/surfaces, editing/selection, required/readOnly/disabled/submission, prevented clear, controlled refusal and stationary input/clear hit targets",
  );
} finally {
  await browser.close();
}
