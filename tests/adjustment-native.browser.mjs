import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (
  await fetch(`${origin}/cojeev-ui/docs/number-input/`)
).text();
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
import{NumberInput}from'./registry/cojeev/ui/number-input';import{OptionWheel}from'./registry/cojeev/ui/option-wheel';
const root=createRoot(document.getElementById('root'));window.changes=[];window.selections=[];
const items=Array.from({length:7},(_,i)=>({id:'item-'+i,label:'Option '+i,description:'Detail '+i}));
function Fixture({presentation='stepper',wheel='arc',disabled=false,readOnly=false,refuse=false,empty=false,locale='en-US',resetKey=0}){return <form key={resetKey} onSubmit={e=>e.preventDefault()} onReset={e=>{if(window.preventReset)e.preventDefault()}}>
<label htmlFor="quantity">Quantity</label><NumberInput ref={n=>window.input=n} id="quantity" name="quantity" presentation={presentation} defaultValue={.5} value={refuse?.5:undefined} min={0} max={2} step={.25} locale={locale} disabled={disabled} readOnly={readOnly} onValueChange={v=>window.changes.push(v)}/>
<button type="reset">Reset</button><OptionWheel items={empty?[]:items} presentation={wheel} selectedIndex={refuse?0:undefined} onSelectionChange={v=>window.selections.push(v)} ref={n=>window.wheel=n} aria-label="Reading direction"/>
</form>};window.renderAdjustment=props=>flushSync(()=>root.render(<Fixture {...props}/>));window.renderAdjustment({});`,
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
    viewport: { width: 640, height: 900 },
    reducedMotion: "reduce",
  });
  await page.setContent(
    '<style>form{max-width:460px;padding:24px;display:grid;gap:16px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const input = page.getByRole("spinbutton", { name: "Quantity" });
  const value = () => input.getAttribute("aria-valuenow");
  const reset = () =>
    page.getByRole("button", { name: "Reset", exact: true }).click();
  for (const presentation of ["stepper", "quantity", "scrub"]) {
    await page.evaluate(
      (p) => window.renderAdjustment({ presentation: p, resetKey: p }),
      presentation,
    );
    assert.equal(
      await input.evaluate(
        (el) => el === window.input && el instanceof HTMLInputElement,
      ),
      true,
    );
    for (const label of ["Increase value", "Decrease value"]) {
      const box = await page
        .getByRole("button", { name: label, exact: true })
        .boundingBox();
      assert.ok(
        box.width >= 44 && box.height >= 44,
        `${presentation}: native step buttons have 44px targets`,
      );
    }
    await input.fill(".76");
    await input.press("ArrowUp");
    assert.equal(
      await value(),
      "1",
      "Off-step input aligns to the next valid step",
    );
    await page
      .getByRole("button", { name: "Increase value", exact: true })
      .click();
    assert.equal(await value(), "1.25");
    await page.evaluate(() => (window.preventReset = true));
    await reset();
    await page.waitForTimeout(20);
    assert.equal(await value(), "1.25", "Cancelled native reset is respected");
    await page.evaluate(() => (window.preventReset = false));
    await reset();
    await page.waitForFunction(
      () =>
        window.input.getAttribute("aria-valuenow") === ".5" ||
        window.input.getAttribute("aria-valuenow") === "0.5",
    );
    assert.equal(await input.inputValue(), "0.5");
    await input.fill("-");
    await input.press("Enter");
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    await input.press("Escape");
    assert.equal(await input.inputValue(), "0.5");
    await input.fill("");
    await input.press("Tab");
    assert.equal(await value(), null);
    await page
      .getByRole("button", { name: "Increase value", exact: true })
      .click();
    assert.equal(await value(), "0");
    await input.fill("20");
    await input.press("Tab");
    assert.equal(await value(), "2");
    assert.equal(
      await page
        .getByRole("button", { name: "Increase value", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page.evaluate(() =>
        new FormData(document.querySelector("form")).get("quantity"),
      ),
      "2",
    );
  }
  await page.evaluate(() =>
    window.renderAdjustment({
      presentation: "scrub",
      refuse: true,
      resetKey: "refuse",
    }),
  );
  await page
    .getByRole("button", { name: "Increase value", exact: true })
    .click();
  assert.equal(await value(), "0.5");
  const grip = page.getByRole("button", { name: "Drag to adjust value" });
  const g = await grip.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 80, g.y + g.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  assert.equal(
    await value(),
    "0.5",
    "A refusing controlled owner remains authoritative during scrub",
  );
  for (const props of [{ disabled: true }, { readOnly: true }]) {
    await page.evaluate(
      (p) =>
        window.renderAdjustment({
          ...p,
          presentation: "scrub",
          resetKey: JSON.stringify(p),
        }),
      props,
    );
    assert.equal(await grip.isDisabled(), true);
    assert.equal(
      await page
        .getByRole("button", { name: "Increase value", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(await input.isEditable(), false);
  }
  await page.evaluate(() =>
    window.renderAdjustment({ locale: "de-DE", resetKey: "locale" }),
  );
  await input.fill("1,25");
  await input.press("ArrowUp");
  assert.equal(await value(), "1.5");
  assert.equal(await input.inputValue(), "1,5");
  for (const presentation of ["arc", "reel", "compact"]) {
    await page.evaluate(
      (wheel) => window.renderAdjustment({ wheel, resetKey: wheel }),
      presentation,
    );
    const stage = page.getByRole("listbox", { name: "Reading direction" });
    await stage.focus();
    await stage.press("Home");
    const dispatch = (opts) =>
      stage.evaluate((el, opts) => {
        const e = new WheelEvent("wheel", {
          deltaY: 100,
          bubbles: true,
          cancelable: true,
          ...opts,
        });
        el.dispatchEvent(e);
        return e.defaultPrevented;
      }, opts);
    assert.equal(
      await dispatch({}),
      true,
      "An in-range wheel step owns the event",
    );
    await page.waitForFunction(
      () => window.wheel.dataset.selectedIndex === "1",
    );
    const retained = await stage
      .getByRole("option", { selected: true })
      .innerText();
    assert.equal(await dispatch({ ctrlKey: true }), false);
    assert.equal(await dispatch({ deltaX: 120, deltaY: 20 }), false);
    assert.equal(
      await stage.getByRole("option", { selected: true }).innerText(),
      retained,
    );
    await stage.press("End");
    assert.equal(
      await dispatch({}),
      false,
      "The last item releases page scroll",
    );
    await stage.press("Home");
    assert.equal(
      await dispatch({ deltaY: -100 }),
      false,
      "The first item releases page scroll",
    );
    await stage.press("ArrowDown");
    assert.equal(
      await stage.getByRole("option", { selected: true }).innerText(),
      "Option 1",
    );
    assert.equal(
      await stage.getAttribute("aria-activedescendant"),
      await stage.getByRole("option", { selected: true }).getAttribute("id"),
    );
    await page.getByRole("button", { name: "Previous option" }).click();
    await page.getByRole("button", { name: "Previous option" }).click();
    assert.equal(
      await stage.getByRole("option", { selected: true }).innerText(),
      "Option 6",
    );
  }
  await page.evaluate(() =>
    window.renderAdjustment({ refuse: true, resetKey: "wheel-refusal" }),
  );
  await page.getByRole("listbox").press("ArrowDown");
  assert.equal(
    await page.getByRole("option", { selected: true }).innerText(),
    "Option 0",
  );
  await page.evaluate(() =>
    window.renderAdjustment({ empty: true, resetKey: "empty" }),
  );
  assert.equal(await page.getByRole("option").count(), 0);
  await page.getByText("No options available.").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Next option" }).isDisabled(),
    true,
  );
  console.log(
    "PASS adjustment native: editable locale/steps/ref/forms/reset/disabled/controlled; wheel bounds/keyboard/ref/empty and native scroll release",
  );
} finally {
  await browser.close();
}
