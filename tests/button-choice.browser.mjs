/** Real Button fixture: in-memory bundle/CSS; no application route or server. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { chromium } from "playwright";

const bundle = await build({
  stdin: { contents: `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import { flushSync } from "react-dom";
    import { Button } from "./registry/cojeev/ui/button";
    const root = createRoot(document.getElementById("root"));
    window.activations = 0;
    window.renderButton = ({ native = false, label = "Notebook", ...props } = {}) => {
      flushSync(() => root.render(<div data-motion={native ? "off" : undefined}>
        <Button id="subject" {...props} onClick={() => window.activations++}>
          {props.asChild ? <a href="#chosen">{label}</a> : label}
        </Button>
      </div>));
    };
    window.renderButton({ shape: "card" });
  `, loader: "tsx", resolveDir: process.cwd() },
  bundle: true, write: false, format: "iife", platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const css = await postcss([tailwindcss()]).process(`
  @layer theme, base, components, utilities, cojeev-states, cojeev-morph;
  @import "tailwindcss" source(none);
  @source "./registry/cojeev/ui/button.tsx";
  @import "./registry/cojeev/styles/tokens.css";
  @import "./registry/cojeev/styles/theme.css";
  @import "./registry/cojeev/styles/button.css" layer(cojeev-states);
  @import "./registry/cojeev/styles/morph.css" layer(cojeev-morph);
`, { from: `${process.cwd()}/button-choice-fixture.css` });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 }, reducedMotion: "reduce" });
  await page.setContent('<style>body{padding:30px}#root{width:400px}</style><div id="root"></div>');
  await page.addStyleTag({ content: css.css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const subject = page.locator("#subject");
  await subject.waitFor();
  await subject.locator("[data-morph-body]").waitFor({ state: "attached" });

  // Regression mutation: changing only CSS rounding while the painter retains
  // a pill radius fails this check against the actual visible SVG path.
  const paint = await subject.evaluate(element => {
    const path = element.querySelector("[data-morph-body]");
    return {
      start: path.getAttribute("d").match(/^M([\d.]+) /)?.[1],
      nearCorner: path.isPointInFill(new DOMPoint(4, 4)),
      outsideCorner: path.isPointInFill(new DOMPoint(1, 1)),
      fill: getComputedStyle(path).fill,
    };
  });
  assert.equal(Number(paint.start), 12, "painted morph must start at the authored 12px corner radius");
  assert.equal(paint.nearCorner, true, "12px painted corner includes (4,4), unlike a pill");
  assert.equal(paint.outsideCorner, false, "corner remains rounded rather than square");
  assert.notEqual(paint.fill, "none", "test measures a painted body");

  const render = async props => {
    await page.evaluate(props => window.renderButton(props), props);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const geometry = () => subject.evaluate(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    const path = element.querySelector("[data-morph-body]");
    return {
      radius: style.borderTopLeftRadius, padding: style.padding,
      whiteSpace: style.whiteSpace, minHeight: style.minHeight,
      width: box.width, height: box.height,
      paintedRadius: path ? Number(path.getAttribute("d").match(/^M([\d.]+) /)?.[1]) : null,
    };
  });
  for (const native of [false, true]) {
    for (const mode of ["light", "dark"]) {
      await page.evaluate(mode => { document.documentElement.dataset.mode = mode; }, mode);
      for (const size of ["sm", "default", "lg"]) {
        await render({ shape: "card", native, size });
        const box = await geometry();
        assert.equal(box.radius, "12px", `${native ? "native" : "morph"} ${mode} ${size} CSS corner`);
        assert.equal(box.paintedRadius, native ? null : 12);
        assert.equal(box.padding, "12px");
        assert.equal(box.whiteSpace, "normal");
        assert.equal(box.minHeight, "44px");
        assert.ok(box.height >= 44 && box.height < 60, "one-line choice stays compact");
        assert.ok(box.width < 200, "card does not force full width");
      }
      for (const variant of ["default", "accent", "secondary", "outline", "ghost", "danger", "block"]) {
        await render({ shape: "card", native, variant });
        const box = await geometry();
        assert.equal(box.radius, "12px", `${variant} retains the card corner`);
        assert.equal(box.paintedRadius, native || variant === "ghost" ? null : 12);
        if (variant === "block") assert.equal(box.width, 400, "existing block variant still opts into full width");
      }
      await render({ shape: "card", native, style: { width: 150, lineHeight: "20px" }, label: "A longer notebook choice that wraps onto several readable lines" });
      const wrapped = await geometry();
      assert.equal(wrapped.width, 150, "caller owns width");
      assert.ok(wrapped.height > 64, "auto height grows to contain wrapped content");
      assert.ok(await subject.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element.lastChild);
        const text = range.getBoundingClientRect(), box = element.getBoundingClientRect();
        return text.top >= box.top + 11 && text.bottom <= box.bottom - 11 && text.left >= box.left && text.right <= box.right;
      }), "wrapped text stays inside the card padding (decorative morph overflow is excluded)");
    }
  }

  // Reusing one mounted Button must not leave a radius cached from the old shape.
  await render({ shape: "pill" });
  assert.equal((await geometry()).paintedRadius, 20, "explicit pill keeps original 40px control geometry");
  await render({ shape: "card" });
  assert.equal((await geometry()).paintedRadius, 12, "live switch paints card radius");
  await render({});
  assert.equal((await geometry()).height, 40, "omitted shape keeps original height");
  assert.equal((await geometry()).paintedRadius, 20, "switch back restores pill radius");

  await render({ shape: "card", "aria-pressed": false });
  await subject.click();
  assert.equal(await page.evaluate(() => window.activations), 1);
  assert.equal(await subject.getAttribute("aria-pressed"), "false", "selection belongs to the caller");
  await subject.press("Enter");
  await subject.press("Space");
  assert.equal(await page.evaluate(() => window.activations), 3, "native keyboard activation stays intact");
  for (const asChild of [false, true]) {
    for (const blocked of [{ disabled: true }, { loading: true }, { "aria-disabled": true }]) {
      await render({ shape: "card", asChild, ...blocked });
      assert.equal((await geometry()).paintedRadius, 12, "state changes keep the card painter");
      await subject.dispatchEvent("click");
      assert.equal(await page.evaluate(() => window.activations), 3, "disabled and busy card activation is blocked");
      assert.equal(await page.evaluate(() => location.hash), "", "blocked slotted link cannot navigate");
    }
  }
  await render({ shape: "card", asChild: true });
  assert.equal(await subject.evaluate(element => element.tagName), "A");
  await subject.click();
  assert.equal(await page.evaluate(() => window.activations), 4);
  assert.equal(await page.evaluate(() => location.hash), "#chosen", "enabled asChild link keeps navigation");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await render({ shape: "card" });
  assert.equal((await geometry()).paintedRadius, 12, "normal motion starts from the same authored corner");
  console.log("PASS card Button native/SVG 12px corners, sizes/variants/themes, wrapping, live shape changes, keyboard, loading/disabled and asChild");
} finally {
  await browser.close();
}
