import assert from "node:assert/strict";
const { build } = await import(process.env.BENTO_ESBUILD ?? "esbuild");
const { chromium } = await import(process.env.BENTO_PLAYWRIGHT ?? "playwright");
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const warmRequire = process.env.BENTO_DEPS
  ? createRequire(`${process.env.BENTO_DEPS}/package.json`)
  : null;
const bundle = await build({
  stdin: {
    contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {BentoBuilder} from './registry/cojeev/ui/bento-builder';
      import {BentoGrid} from './registry/cojeev/ui/bento-grid';
      import {BentoExample} from './components/examples/bento';
      import {generateBento} from './registry/cojeev/lib/bento-layout';
      const root=createRoot(document.getElementById('root'));let key=0;
      window.mountBento=(layout)=>flushSync(()=>root.render(<><BentoBuilder key={++key} initialLayout={layout} onChange={value=>window.result=value}/><section id="renderer"><BentoGrid layout={generateBento()} variant="interlock"/></section></>));
      window.mountExample=(variant)=>flushSync(()=>root.render(<BentoExample variant={variant}/>));
      window.mountReadingGrid=(variant,long=false)=>flushSync(()=>root.render(<div style={{width:780,maxWidth:'100%'}}><BentoGrid layout={long?{...generateBento(),tiles:generateBento().tiles.map(t=>({...t,label:'A very long user label with meaningful words and an_unbroken_identifier_that_must_still_wrap_safely'}))}:generateBento()} variant={variant}/></div>));
      window.mountGrid=(layout)=>flushSync(()=>root.render(<BentoGrid layout={layout} variant="classic" id="invalid-grid" className="caller-class" style={{marginTop:17}} aria-label="Caller grid" ref={node=>{if(node){window.gridRef=node.id;return ()=>{window.gridCleanup=(window.gridCleanup??0)+1;};}}} onClick={()=>window.gridClicks=(window.gridClicks??0)+1}/>));
      window.mountBento();`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  plugins: warmRequire
    ? [
        {
          name: "warm-dependencies",
          setup(build) {
            build.onResolve({ filter: /^[^./]/ }, (args) =>
              args.path.startsWith("@/")
                ? undefined
                : { path: warmRequire.resolve(args.path) },
            );
          },
        },
      ]
    : [],
  define: { "process.env.NODE_ENV": '"production"' },
});
const runtime = warmRequire ?? createRequire(import.meta.url);
const postcss = runtime("postcss"),
  tailwind = runtime("@tailwindcss/postcss");
const styles = [
  "button",
  "input",
  "native-select",
  "scroll-area",
  "icon",
  "spinner",
  "presence",
  "bento-grid",
  "bento-builder",
];
const cssResult = await postcss([tailwind()]).process(
  `@layer theme,base,components,utilities,cojeev-states,cojeev-flow,cojeev-morph,cojeev-accessibility;
 @import "${runtime.resolve("tailwindcss/index.css")}" source(none);
 ${["button", "input", "native-select", "scroll-area", "icon", "spinner", "presence"].map((name) => `@source "./registry/cojeev/ui/${name}.tsx";`).join("\n")}
 ${["tokens", "theme", "base"].map((name) => `@import "./registry/cojeev/styles/${name}.css";`).join("\n")}
 ${styles.map((name) => `@import "./registry/cojeev/styles/${name}.css" layer(cojeev-states);`).join("\n")}
 @import "./registry/cojeev/styles/flow-press.css" layer(cojeev-flow);
 @import "./registry/cojeev/styles/morph.css" layer(cojeev-morph);
 `,
  { from: `${process.cwd()}/bento-fixture.css` },
);
const css = cssResult.css;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 1000 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await page.route("http://localhost/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>body{margin:24px}#renderer{margin-top:48px}</style><div id="root"></div>',
    }),
  );
  await page.goto("http://localhost/");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const editor = page.locator('[data-slot="bento-builder"]');
  await editor.waitFor();
  const state = () => page.evaluate(() => window.result);
  for (const name of ["Showcase", "Gallery", "Editorial"]) {
    await editor.getByRole("button", { name, exact: true }).click();
    assert.equal((await state()).template, name);
  }
  await editor.getByRole("button", { name: "Dashboard", exact: true }).click();
  assert.equal((await state()).template, "Dashboard");
  await editor.getByLabel("Tile label", { exact: true }).fill('A "real" note');
  await editor.getByRole("button", { name: "Save label", exact: true }).click();
  const before = await state();
  await editor.getByRole("button", { name: "Randomize", exact: true }).click();
  assert.deepEqual(
    (await state()).layout.tiles.map((t) => [t.id, t.label]),
    before.layout.tiles.map((t) => [t.id, t.label]),
  );
  assert.notEqual((await state()).layout.seed, before.layout.seed);
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await state(), before);
  await editor.getByRole("button", { name: "Redo", exact: true }).click();
  assert.notEqual((await state()).layout.seed, before.layout.seed);
  await editor.getByLabel("Columns", { exact: true }).selectOption("7");
  assert.equal((await state()).layout.columns, 7);
  await editor.getByLabel("Rows", { exact: true }).selectOption("5");
  assert.equal((await state()).layout.rows, 5);
  const swapBefore = await state();
  await editor
    .getByLabel("Swap with", { exact: true })
    .selectOption(swapBefore.layout.tiles[1].id);
  await editor.getByRole("button", { name: "Swap tiles", exact: true }).click();
  assert.equal(
    (await state()).layout.tiles[0].id,
    swapBefore.layout.tiles[1].id,
  );
  await editor.getByRole("button", { name: "Interlock", exact: true }).click();
  const beforeReshape = await state();
  const paint = editor.locator(".v-bento__paint path").first();
  const oldPaint = await paint.getAttribute("d");
  await editor
    .getByRole("button", { name: "Reshape edges", exact: true })
    .click();
  assert.deepEqual(
    (await state()).layout.tiles,
    beforeReshape.layout.tiles,
    "reshaping retains all content and rectangles",
  );
  assert.notEqual((await state()).layout.seed, beforeReshape.layout.seed);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  const stillPaint = await paint.getAttribute("d");
  assert.notEqual(stillPaint, oldPaint);
  const oldCoordinates = oldPaint.match(/-?\d+(?:\.\d+)?/g).map(Number),
    newCoordinates = stillPaint.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.ok(
    Math.max(
      ...newCoordinates.map((coordinate, index) =>
        Math.abs(coordinate - oldCoordinates[index]),
      ),
    ) > 0.015,
    "reshaping produces visible curvature change rather than adjacent-seed noise",
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await paint.getAttribute("d"),
    stillPaint,
    "reduced-motion edges settle immediately",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await editor
    .getByRole("button", { name: "Reshape edges", exact: true })
    .click();
  await page.waitForTimeout(70);
  const duringPaint = await paint.getAttribute("d");
  await page.waitForTimeout(350);
  const settledPaint = await paint.getAttribute("d");
  assert.notEqual(
    duringPaint,
    stillPaint,
    "normal motion advances the shared edges",
  );
  assert.notEqual(
    duringPaint,
    settledPaint,
    "normal motion has a real intermediate path",
  );
  assert.deepEqual((await state()).layout.tiles, beforeReshape.layout.tiles);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor
    .getByRole("button", { name: "Copy layout", exact: true })
    .click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const exported = JSON.parse(copied.match(/const layout = ([\s\S]*?);\n/)[1]);
  assert.deepEqual(exported, (await state()).layout);
  assert.match(copied, /variant="interlock"/);
  await editor.getByLabel("Columns", { exact: true }).selectOption("2");
  await editor.getByLabel("Rows", { exact: true }).selectOption("2");
  assert.equal(
    (await state()).layout.rows,
    5,
    "2 by 2 is rejected when it cannot retain six tiles",
  );
  assert.equal((await state()).layout.tiles.length, 6);
  const tile = editor.locator("[data-bento-tile]").first();
  await tile.scrollIntoViewIfNeeded();
  const box = await tile.boundingBox();
  const cancelled = await state();
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 50);
  assert.equal(
    await editor
      .locator(".v-bento-builder__board")
      .getAttribute("data-dragging"),
    "swap",
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.deepEqual(await state(), cancelled);
  const fixture = {
    columns: 4,
    rows: 4,
    seed: 7,
    tiles: [
      { id: "a", label: "First", x: 0, y: 0, width: 2, height: 4 },
      { id: "b", label: "Second", x: 2, y: 0, width: 2, height: 4 },
    ],
  };
  await page.evaluate((layout) => window.mountBento(layout), fixture);
  for (const kind of ["swap", "resize"]) {
    await page.evaluate((layout) => window.mountBento(layout), fixture);
    const start =
      kind === "swap"
        ? editor.locator('[data-bento-tile="a"] button')
        : editor.getByRole("button", {
            name: "Resize right seam",
            exact: true,
          });
    await start.scrollIntoViewIfNeeded();
    const startBox = await start.boundingBox(),
      targetBox = await editor.locator('[data-bento-tile="b"]').boundingBox();
    await page.evaluate(() => {
      document.body.tabIndex = -1;
      document.body.focus();
    });
    assert.equal(
      await page.evaluate(() => document.activeElement === document.body),
      true,
    );
    await page.mouse.move(
      startBox.x + startBox.width / 2,
      startBox.y + startBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 5 },
    );
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.deepEqual(
      (await state()).layout,
      fixture,
      `${kind} Escape must cancel the first drag from external focus`,
    );
  }
  const handle = editor.getByRole("button", {
    name: "Resize right seam",
    exact: true,
  });
  assert.equal(await handle.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44}),true,"resize handle has a44px hit target on both axes");
  await handle.scrollIntoViewIfNeeded();
  const captureBox=await handle.boundingBox();
  await handle.evaluate(el=>el.addEventListener('pointerdown',event=>window.capturePointer=event.pointerId,{once:true}));
  await page.mouse.move(captureBox.x+captureBox.width/2,captureBox.y+captureBox.height/2);await page.mouse.down();
  await page.mouse.move(captureBox.x+captureBox.width/2+1,captureBox.y+captureBox.height/2);
  await handle.evaluate(el=>el.releasePointerCapture(window.capturePointer));
  await page.mouse.move(captureBox.x+captureBox.width/2+2,captureBox.y+captureBox.height/2);
  assert.equal(await editor.locator('.v-bento-builder__board').getAttribute('data-dragging'),null,'lost capture cancels stale gesture');
  await page.mouse.up();
  await handle.focus();
  await handle.press("ArrowRight");
  assert.deepEqual(
    (await state()).layout.tiles.map((t) => [t.x, t.width]),
    [
      [0, 3],
      [3, 1],
    ],
  );
  await handle.press("ArrowRight");
  assert.deepEqual(
    (await state()).layout.tiles.map((t) => t.width),
    [3, 1],
    "illegal collapse is rejected",
  );
  const blocked = page.locator('[data-slot="bento-edit-feedback"]');
  assert.equal(
    await blocked.count(),
    1,
    "blocked resize explains its limit beside the control",
  );
  assert.match(await blocked.innerText(), /neighbor.*one cell/i);
  assert.equal(
    await blocked.evaluate((el) => getComputedStyle(el).pointerEvents),
    "none",
    "feedback never steals the drag",
  );
  await handle.press("ArrowLeft");
  assert.equal(
    await blocked.count(),
    0,
    "valid keyboard resize clears the rejection",
  );
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox(),
    bb = await editor.locator(".v-bento-builder__board").boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width * 0.75, hb.y + hb.height / 2, {
    steps: 8,
  });
  assert.equal(await editor.locator('[data-bento-tile="a"]').evaluate(el=>el.style.gridColumn),'1 / span 3','valid preview is applied before pointer release');
  await page.mouse.up();
  assert.deepEqual(
    (await state()).layout.tiles.map((t) => [t.x, t.width]),
    [
      [0, 3],
      [3, 1],
    ],
    "pointer seam snaps to the hand-checked partition",
  );
  const source = editor.locator('[data-bento-tile="a"] button'),
    destination = editor.locator('[data-bento-tile="b"] button');
  await source.scrollIntoViewIfNeeded();
  const sb = await source.boundingBox(),
    db = await destination.boundingBox();
  await page.mouse.move(sb.x + 40, sb.y + 40);
  await page.mouse.down();
  await page.mouse.move(db.x + db.width / 2, db.y + 40, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(
    (await state()).layout.tiles.map((t) => t.id),
    ["b", "a"],
    "pointer drag swaps stable content positions",
  );
  for (const mode of ["Classic", "Interlock"]) {
    await page.evaluate((layout) => window.mountBento(layout), fixture);
    await editor.getByRole("button", { name: mode, exact: true }).click();
    await handle.scrollIntoViewIfNeeded();
    const edge = await handle.boundingBox();
    const canvas = await editor
      .locator(".v-bento-builder__board")
      .boundingBox();
    const y = edge.y + edge.height / 2;
    const pressEdge = async () => {
      const current = await handle.boundingBox();
      await page.mouse.move(current.x + current.width / 2, y);
      await page.mouse.down();
    };
    // Even a valid no-op preview must not overwrite the rejection on release.
    await pressEdge();
    await page.mouse.move(canvas.x + canvas.width / 2 + 1, y);
    await page.mouse.move(canvas.x + canvas.width, y);
    assert.equal(
      await blocked.count(),
      1,
      `${mode}: invalid pointer movement has local feedback`,
    );
    await page.mouse.up();
    assert.deepEqual((await state()).layout, fixture);
    assert.equal(
      await blocked.count(),
      1,
      `${mode}: release retains the blocked reason`,
    );
    assert.doesNotMatch(
      await editor.getByRole("status").innerText(),
      /seam moved/i,
    );
    assert.equal(
      await editor
        .getByRole("button", { name: "Undo", exact: true })
        .isDisabled(),
      mode === "Classic",
      "rejected resize adds no history entry",
    );
    await page.keyboard.press("Escape");
    assert.equal(await blocked.count(), 0, "Escape dismisses the hint");

    // Overshooting keeps the last valid preview, with an accurate explanation.
    await pressEdge();
    await page.mouse.move(canvas.x + canvas.width * 0.75, y);
    await page.mouse.move(canvas.x + canvas.width, y);
    await page.mouse.up();
    assert.deepEqual(
      (await state()).layout.tiles.map((t) => t.width),
      [3, 1],
    );
    assert.match(await blocked.innerText(), /last valid size kept/i);
    assert.match(
      await editor.getByRole("status").innerText(),
      /last valid size kept/i,
    );
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual(
      (await state()).layout,
      fixture,
      "one Undo reverses the accepted part of the drag",
    );
    assert.equal(await blocked.count(), 0);

    // Returning from a rejected position to a legal one clears feedback immediately.
    await handle.scrollIntoViewIfNeeded();
    await pressEdge();
    await page.mouse.move(canvas.x + canvas.width, y);
    assert.equal(await blocked.count(), 1);
    await page.mouse.move(canvas.x + canvas.width * 0.75, y);
    assert.equal(await blocked.count(), 0);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.deepEqual(
      (await state()).layout,
      fixture,
      "cancel still discards the entire preview",
    );

    const tileBox = await source.boundingBox();
    await source.click();
    assert.equal(
      await blocked.count(),
      0,
      "ordinary tile selection is not an invalid drop",
    );
    await page.mouse.move(tileBox.x + 40, tileBox.y + 40);
    await page.mouse.down();
    await page.mouse.move(
      canvas.x + canvas.width / 2,
      canvas.y + canvas.height + 16,
    );
    await page.mouse.up();
    assert.match(await blocked.innerText(), /drop onto another tile/i);
    assert.deepEqual(
      (await state()).layout,
      fixture,
      "dropping outside leaves the arrangement unchanged",
    );
    await source.click();
    assert.equal(
      await blocked.count(),
      0,
      "a new selection dismisses the rejected-drop hint",
    );
  }
  await page.evaluate((layout) => window.mountBento(layout), fixture);
  await editor.locator("summary").click();
  await editor
    .getByRole("button", { name: "Move left seam backward", exact: true })
    .click();
  assert.match(await blocked.innerText(), /outside edge stays fixed/i);
  assert.deepEqual(
    (await state()).layout,
    fixture,
    "button resizing also preserves the fixed outside edge",
  );
  await page.keyboard.press("Escape");
  assert.equal(await blocked.count(), 0);
  await mkdir("output/playwright/bento", { recursive: true });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ["light", "dark"]) {
      await page.evaluate(
        ({ layout, mode }) => {
          document.documentElement.dataset.mode = mode;
          window.mountBento(layout);
        },
        { layout: fixture, mode },
      );
      await handle.scrollIntoViewIfNeeded();
      await handle.press("ArrowRight");
      await handle.press("ArrowRight");
      const hint = await blocked.boundingBox();
      assert.ok(
        hint.x >= 0 && hint.x + hint.width <= width,
        "hint stays within the viewport horizontally",
      );
      assert.ok(
        hint.y >= 0 && hint.y + hint.height <= 1000,
        "hint stays within the viewport vertically",
      );
      assert.equal(
        await blocked.getAttribute("aria-hidden"),
        "true",
        "the existing live status announces the reason without a duplicate announcement",
      );
      await page.screenshot({
        path: `output/playwright/bento/blocked-${width}-${mode}.png`,
      });
      await page.keyboard.press("Escape");
      assert.equal(await blocked.count(), 0);
      await handle.press("ArrowRight");
      await page.evaluate(() => window.scrollBy(0, 80));
      await blocked.waitFor({ state: "detached" });
    }
  }
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.evaluate(() => window.mountBento());
  assert.ok(
    await editor
      .locator('[data-slot="scroll-area-viewport"]')
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    "the entire Bento canvas is visible without vertical clipping",
  );
  await mkdir("output/playwright/bento", { recursive: true });
  for (const width of [1100, 390])
    for (const mode of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate((mode) => {
        document.documentElement.dataset.mode = mode;
      }, mode);
      await page.screenshot({
        path: `output/playwright/bento/fixture-${width}-${mode}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (width === 390)
        assert.equal(
          await page
            .locator("#renderer .v-bento")
            .evaluate((el) => getComputedStyle(el).display),
          "flex",
        );
    }
  for (const invalid of [
    { ...fixture, tiles: [] },
    { ...fixture, tiles: [{ ...fixture.tiles[0], x: -1 }, fixture.tiles[1]] },
  ]) {
    await page.evaluate((layout) => window.mountBento(layout), invalid);
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /grid|tile/i);
  }
  await page.evaluate(() => window.mountExample("classic"));
  await editor
    .getByLabel("Tile label", { exact: true })
    .fill("Retain this edited idea");
  await editor.getByRole("button", { name: "Save label", exact: true }).click();
  await editor
    .getByRole("button", { name: "Copy layout", exact: true })
    .click();
  const beforeVariant = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  await page.evaluate(() => window.mountExample("interlock"));
  assert.equal(
    await editor
      .locator('[data-slot="bento-grid"]')
      .getAttribute("data-variant"),
    "interlock",
    "outer docs variant changes the mounted builder",
  );
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(
    await editor
      .locator('[data-slot="bento-grid"]')
      .getAttribute("data-variant"),
    "classic",
  );
  await editor.getByRole("button", { name: "Redo", exact: true }).click();
  assert.equal(
    await editor
      .locator('[data-slot="bento-grid"]')
      .getAttribute("data-variant"),
    "interlock",
  );
  await editor
    .getByRole("button", { name: "Copy layout", exact: true })
    .click();
  const afterVariant = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  assert.deepEqual(
    JSON.parse(afterVariant.match(/const layout = ([\s\S]*?);\n/)[1]),
    JSON.parse(beforeVariant.match(/const layout = ([\s\S]*?);\n/)[1]),
    "outer variant change retains edited layout",
  );
  assert.match(afterVariant, /variant="interlock"/);
  await editor.getByRole("button", { name: "Classic", exact: true }).click();
  await page.evaluate(() => window.mountExample("interlock"));
  assert.equal(
    await editor
      .locator('[data-slot="bento-grid"]')
      .getAttribute("data-variant"),
    "classic",
    "same external prop rerender preserves internal selection",
  );
  await page.evaluate(
    (layout) => window.mountGrid({ ...layout, tiles: [] }),
    fixture,
  );
  const invalidGrid = page.getByRole("alert");
  assert.equal(await invalidGrid.getAttribute("class"), "caller-class");
  assert.equal(
    await invalidGrid.evaluate((el) => getComputedStyle(el).marginTop),
    "17px",
  );
  assert.equal(await invalidGrid.getAttribute("aria-label"), "Caller grid");
  assert.equal(await page.evaluate(() => window.gridRef), "invalid-grid");
  await invalidGrid.click();
  assert.equal(await page.evaluate(() => window.gridClicks), 1);
  await page.evaluate(() => window.mountBento());
  assert.equal(await page.evaluate(() => window.gridCleanup), 1);
  for (const width of [1440, 390])
    for (const variant of ["classic", "interlock"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (variant) => window.mountReadingGrid(variant),
        variant,
      );
      const label = page
        .locator(".v-bento__label")
        .filter({ hasText: "In progress" });
      assert.equal(
        await label.evaluate((el) => {
          const node = el.firstChild,
            start = node.textContent.indexOf("progress"),
            range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + 8);
          return new Set(
            [...range.getClientRects()].map((rect) => Math.round(rect.top)),
          ).size;
        }),
        1,
        `${variant} progress fits on one line at ${width}px viewport`,
      );
      await page.screenshot({
        path: `output/playwright/bento/reading-${width}-${variant}.png`,
        fullPage: true,
      });
      await page.evaluate(
        (variant) => window.mountReadingGrid(variant, true),
        variant,
      );
      assert.ok(
        await page.locator(".v-bento__label").evaluateAll((labels) =>
          labels.every((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const tile = el.parentElement.getBoundingClientRect();
            const style = getComputedStyle(el.parentElement);
            return [...range.getClientRects()].every(
              (rect) =>
                rect.left >= tile.left + parseFloat(style.paddingLeft) &&
                rect.right <= tile.right - parseFloat(style.paddingRight) + 1 &&
                rect.bottom <=
                  tile.bottom - parseFloat(style.paddingBottom) + 1,
            );
          }),
        ),
        `${variant} long labels wrap inside their tiles`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
  console.log(
    "PASS Bento real browser templates, label, randomize, dimensions, swap, history, Escape, actual clipboard and responsive bounds",
  );
} finally {
  await browser.close();
}
