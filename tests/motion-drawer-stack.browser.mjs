import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { MotionDrawer } from "./registry/cojeev/ui/motion-drawer";

      const root = createRoot(document.getElementById("root"));
      window.valueChanges = [];
      window.closeAutoFocusCalls = 0;

      function StatefulPane() {
        const [count, setCount] = React.useState(0);
        return <button onClick={() => setCount(value => value + 1)}>Count {count}</button>;
      }

      const panels = [
        { value: "a", label: "Overview", children: <><label>A note<input aria-label="A note" /></label><StatefulPane /></> },
        { value: "b", label: "Disabled details", disabled: true, children: <p>Disabled pane remains mounted</p> },
        { value: "c", label: "Review", children: <div>{Array.from({ length: 35 }, (_, index) => <p key={index}>Review row {index + 1}</p>)}</div> },
        { value: "d", label: "Archive", disabled: true, children: <p>Archive pane remains mounted</p> },
      ];

      function Harness({ controlled = false, disableAllPanels = false, disabledTrigger = false, drawerWidth, legacy = false, preventFocusReturn = false, side = "start", stagger = .09 }) {
        return <>
          <button id="background">Background action</button>
          <MotionDrawer
            title="Compose report"
            description="Move between report sections."
            variant="stack"
            side={side}
            width={drawerWidth}
            panels={legacy ? undefined : disableAllPanels ? panels.map(panel => ({ ...panel, disabled: true })) : panels}
            defaultValue="a"
            {...(controlled ? { value: "a" } : {})}
            stackStagger={stagger}
            trigger={<button disabled={disabledTrigger}>Custom launcher</button>}
            closeLabel="Close report composer"
            onValueChange={value => window.valueChanges.push(value)}
            onCloseAutoFocus={event => {
              window.closeAutoFocusCalls += 1;
              if (preventFocusReturn) event.preventDefault();
            }}
          ><p>Legacy stack content</p></MotionDrawer>
        </>;
      }

      window.renderHarness = config => root.render(<Harness key={JSON.stringify(config)} {...config} />);
      window.renderHarness({ stagger: .16 });
    `,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});

const css = await readFile("registry/cojeev/styles/motion-drawer.css", "utf8");
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 620 }, reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent(`<style>
    *{box-sizing:border-box}body{margin:0}:root{--v-canvas:#fff;--v-text:#171717;--v-text-2:#555;--v-text-3:#888;--v-border:#bbb;--v-brand:#2463eb;--v-beige:#eee7dc;--v-blue:#dceafa;--ink-fixed:#171717;--font-body:Arial;--font-display:Arial;--shadow-float:0 12px 30px rgb(0 0 0/.16)}
    .v-icon{width:20px;height:20px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  </style><div id="root"></div>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });

  const trigger = page.getByRole("button", { name: "Custom launcher" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "attached" });
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-slot") === "motion-drawer-content");

  const timing = await dialog.evaluate(async panel => {
    const cards = [...panel.querySelectorAll("[data-stack-card]")];
    const frames = [];
    for (let frame = 0; frame < 55; frame += 1) {
      await new Promise(requestAnimationFrame);
      const panelX = panel.getBoundingClientRect().x;
      frames.push(cards.map(card => ({ x: card.getBoundingClientRect().x - panelX, opacity: Number(getComputedStyle(card).opacity) })));
    }
    const starts = cards.map((_, cardIndex) => {
      const baseline = frames[0][cardIndex];
      return frames.findIndex(frame => Math.abs(frame[cardIndex].x - baseline.x) > .6 || frame[cardIndex].opacity - baseline.opacity > .04);
    });
    return { starts, finalOpacity: frames.at(-1).map(frame => frame.opacity) };
  });
  assert.ok(timing.starts.every(start => start >= 0), "every card visibly enters");
  assert.ok(timing.starts[0] < timing.starts[1] && timing.starts[1] < timing.starts[2], `cards enter A then B then C: ${timing.starts}`);
  assert.ok(timing.finalOpacity.every(opacity => opacity > .99), "all card labels finish visible");

  const tabs = dialog.getByRole("tab");
  assert.deepEqual(await tabs.allTextContents(), ["Overview", "Disabled details", "Review", "Archive"], "all stack labels stay readable");
  assert.equal(await tabs.nth(1).isDisabled(), true, "disabled panels cannot be selected");
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
  assert.equal(await dialog.locator(".v-motion-drawer__top,.v-motion-drawer__stack-tabs").count(), 0, "panel stacks have no detached title or selector boxes");
  assert.equal(await tabs.evaluateAll(nodes => nodes.every(node => node.closest("[data-stack-card]"))), true, "every selector is physically owned by its card");
  const activeCard = dialog.locator("[data-stack-card][data-active=true]");
  assert.equal(await activeCard.getByRole("heading", { name: "Overview" }).count(), 1, "the active card owns its visible task heading");
  const genericTitleBounds = await dialog.getByRole("heading", { name: "Compose report" }).boundingBox();
  assert.ok(genericTitleBounds.width <= 1 && genericTitleBounds.height <= 1, "the accessible dialog title remains visually hidden instead of becoming another block");
  assert.equal(await activeCard.getByRole("button", { name: "Close report composer" }).count(), 1, "the active card owns the close control");
  const cardRects = await dialog.locator("[data-stack-card]").evaluateAll(cards => cards.map(card => card.getBoundingClientRect().toJSON()));
  const tabRects = await tabs.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  assert.equal(tabRects.every((rect, index) => rect.top < cardRects[index].top && rect.bottom >= cardRects[index].top - 2), true, `file handles stay visibly attached to their card edges: ${JSON.stringify({ tabRects, cardRects })}`);
  const handleHits = await tabs.evaluateAll(nodes => nodes.map((node, index) => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { index, hit: hit?.closest('[role="tab"]')?.textContent ?? hit?.className ?? hit?.tagName, rect: rect.toJSON() };
  }));
  assert.equal(handleHits.every(({ hit }, index) => hit === ["Overview", "Disabled details", "Review", "Archive"][index]), true, `every file-handle center remains directly interactive: ${JSON.stringify(handleHits)}`);
  const reviewHandle = tabs.nth(2);
  const handleBefore = await reviewHandle.boundingBox();
  await reviewHandle.hover();
  await page.waitForTimeout(220);
  const handleAfter = await reviewHandle.boundingBox();
  assert.deepEqual(handleAfter, handleBefore, 'Hover preserves the joined contour and stable handle target');
  assert.equal(await reviewHandle.locator('span').evaluate(el => getComputedStyle(el).textDecorationLine), 'underline', 'Hover signals action without detaching the handle');
  const bodyGeometry = await dialog.locator(".v-motion-drawer__body").evaluate(node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, rect: node.getBoundingClientRect().toJSON() }));
  assert.ok(bodyGeometry.scrollWidth <= bodyGeometry.clientWidth + 1, `stack body has no horizontal scroll: ${JSON.stringify(bodyGeometry)}`);
  for (const rect of cardRects) {
    assert.ok(rect.left >= bodyGeometry.rect.left - .5 && rect.right <= bodyGeometry.rect.right + .5, "peeking cards stay inside the drawer body");
  }
  const overlapWidth = Math.max(0, Math.min(...cardRects.map(rect => rect.right)) - Math.max(...cardRects.map(rect => rect.left)));
  const overlapHeight = Math.max(0, Math.min(...cardRects.map(rect => rect.bottom)) - Math.max(...cardRects.map(rect => rect.top)));
  const smallestArea = Math.min(...cardRects.map(rect => rect.width * rect.height));
  assert.ok(overlapWidth * overlapHeight > smallestArea * .75, "full-height cards overlap as a deck instead of forming an accordion");
  const cardPaints = await dialog.locator("[data-stack-card] .v-motion-drawer__stack-outline path").evaluateAll(cards => cards.map(card => getComputedStyle(card).fill));
  assert.notEqual(cardPaints[0], cardPaints[1], "inactive cards retain a visibly tinted edge behind the active canvas");
  await dialog.getByLabel("A note").fill("preserve this draft");
  await dialog.getByRole("button", { name: "Count 0" }).click();

  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await tabs.nth(2).getAttribute("aria-selected"), "true", "ArrowRight skips disabled tabs");
  assert.equal(await dialog.getByRole("tabpanel", { name: "Overview", includeHidden: true }).getAttribute("aria-hidden"), "true");
  assert.equal(await dialog.getByRole("tabpanel", { name: "Overview", includeHidden: true }).getAttribute("inert"), "");
  assert.equal(await dialog.getByText("Disabled pane remains mounted", { exact: true }).count(), 1, "inactive children remain mounted");

  const reviewPane = dialog.getByRole("tabpanel", { name: "Review" });
  assert.equal(await reviewPane.getAttribute("data-slot"), "scroll-area", "stack panes use the shared scroll primitive");
  const reviewViewport = reviewPane.locator('[data-slot="scroll-area-viewport"]');
  assert.ok(await reviewViewport.evaluate(node => node.scrollHeight > node.clientHeight), "active long pane scrolls inside the viewport");
  await reviewViewport.evaluate(node => { node.scrollTop = 300; });
  assert.ok(await reviewViewport.evaluate(node => node.scrollTop > 0), "active pane can scroll without moving labels");
  await page.waitForTimeout(500);
  const titleBefore = await dialog.getByRole("heading", { name: "Review" }).boundingBox();
  const labelsBefore = await tabs.nth(0).boundingBox();
  await reviewViewport.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const titleAfter = await dialog.getByRole("heading", { name: "Review" }).boundingBox();
  const labelsAfter = await tabs.nth(0).boundingBox();
  assert.ok(Math.abs(titleAfter.y - titleBefore.y) < .1, "drawer heading stays fixed while pane scrolls");
  assert.ok(Math.abs(labelsAfter.y - labelsBefore.y) < .1, "panel labels stay fixed while pane scrolls");

  await tabs.nth(2).focus();
  await page.keyboard.press("Home");
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true", "Home selects first enabled panel");
  assert.equal(await dialog.getByLabel("A note").inputValue(), "preserve this draft", "switching preserves form state");
  assert.match(await dialog.getByRole("button", { name: "Count 1" }).innerText(), /Count 1/, "switching preserves React state");
  await page.keyboard.press("End");
  assert.equal(await tabs.nth(2).getAttribute("aria-selected"), "true", "End selects last enabled panel");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true", "ArrowLeft skips disabled tabs");
  assert.deepEqual(await page.evaluate(() => window.valueChanges), ["c", "a", "c", "a"]);

  await dialog.getByRole("button", { name: "Close report composer" }).click();
  await dialog.waitFor({ state: "detached" });
  assert.ok(await trigger.evaluate(node => document.activeElement === node), "focus returns to the reusable custom launcher by default");

  await page.evaluate(() => window.renderHarness({ controlled: true }));
  await page.getByRole("button", { name: "Custom launcher" }).click();
  const controlledDialog = page.getByRole("dialog");
  await controlledDialog.getByRole("tab", { name: "Review" }).click();
  assert.equal(await controlledDialog.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"), "true", "controlled value refuses selection until its owner updates");
  assert.deepEqual(await page.evaluate(() => window.valueChanges.at(-1)), "c");

  await controlledDialog.getByRole("button", { name: "Close report composer" }).click();
  await controlledDialog.waitFor({ state: "detached" });
  await page.evaluate(() => window.renderHarness({ preventFocusReturn: true }));
  const noReturnTrigger = page.getByRole("button", { name: "Custom launcher" });
  await noReturnTrigger.click();
  const noReturnDialog = page.getByRole("dialog");
  await noReturnDialog.getByRole("button", { name: "Close report composer" }).click();
  await noReturnDialog.waitFor({ state: "detached" });
  assert.equal(await noReturnTrigger.evaluate(node => document.activeElement === node), false, "preventing close autofocus avoids a trigger focus jump");

  await noReturnTrigger.click();
  const reopeningDialog = page.getByRole("dialog");
  await reopeningDialog.getByRole("button", { name: "Close report composer" }).click();
  await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent === "Custom launcher")?.click());
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAttribute("data-state") === "open");
  await page.waitForTimeout(700);
  assert.equal(await page.locator('[role="dialog"] [data-stack-card]').count(), 4, "rapid close/reopen leaves one complete stack");

  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.evaluate(() => window.renderHarness({ controlled: true, disableAllPanels: true }));
  await page.getByRole("button", { name: "Custom launcher" }).click();
  const busyDialog = page.getByRole("dialog");
  assert.equal(await busyDialog.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"), "true", "disabling the controlled panel keeps it active");
  assert.equal(await busyDialog.getByLabel("A note").isVisible(), true, "busy disabled panels do not hide the current form");
  assert.equal(await busyDialog.getByRole("tab").evaluateAll(tabs => tabs.every(tab => tab.disabled)), true, "disabled still blocks switching while busy");
  await page.keyboard.press("Escape");
  await busyDialog.waitFor({ state: "detached" });
  for (const { viewportWidth, viewportHeight, drawerWidth } of [
    { viewportWidth: 320, viewportHeight: 620 },
    { viewportWidth: 390, viewportHeight: 620 },
    { viewportWidth: 1440, viewportHeight: 620 },
    { viewportWidth: 1440, viewportHeight: 1905 },
    { viewportWidth: 1440, viewportHeight: 900, drawerWidth: 900 },
  ]) {
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
    await page.evaluate(config => window.renderHarness(config), { side: "end", drawerWidth });
    await page.getByRole("button", { name: "Custom launcher" }).click();
    const rightDialog = page.getByRole("dialog");
    await page.waitForTimeout(900);
    const geometry = await rightDialog.evaluate(node => {
      const body = node.querySelector(".v-motion-drawer__body");
      return {
        panel: node.getBoundingClientRect().toJSON(),
        body: body.getBoundingClientRect().toJSON(),
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        cards: [...node.querySelectorAll("[data-stack-card]")].map(card => card.getBoundingClientRect().toJSON()),
      };
    });
    assert.ok(geometry.panel.left >= 0 && geometry.panel.right <= viewportWidth, `right-edge stack stays in the ${viewportWidth}x${viewportHeight}px viewport`);
    assert.ok(geometry.bodyScrollWidth <= geometry.bodyClientWidth + 1, `right-edge stack body has no horizontal scroll at ${viewportWidth}x${viewportHeight}px`);
    assert.ok(geometry.cards.every(rect => rect.left >= geometry.body.left - .5 && rect.right <= geometry.body.right + .5 && rect.top >= geometry.body.top - .5 && rect.bottom <= geometry.body.bottom + .5), `right-edge peeks stay inside the body at ${viewportWidth}x${viewportHeight}px`);
    await page.keyboard.press("Escape");
    await rightDialog.waitFor({ state: "detached" });
  }
  await page.setViewportSize({ width: 390, height: 620 });
  await page.evaluate(() => window.renderHarness({ legacy: true, stagger: .2 }));
  await page.getByRole("button", { name: "Custom launcher" }).click();
  const legacyDialog = page.getByRole("dialog");
  assert.equal(await legacyDialog.locator(".v-motion-drawer__stack-sheet").count(), 2, "legacy stack uses two real decorative sheets");
  const legacyStarts = await legacyDialog.evaluate(async panel => {
    const sheets = [...panel.querySelectorAll(".v-motion-drawer__stack-sheet")];
    const frames = [];
    for (let frame = 0; frame < 35; frame += 1) {
      await new Promise(requestAnimationFrame);
      frames.push(sheets.map(sheet => {
        const style = getComputedStyle(sheet);
        return { x: new DOMMatrixReadOnly(style.transform).m41, opacity: Number(style.opacity) };
      }));
    }
    return sheets.map((_, sheetIndex) => {
      const baseline = frames[0][sheetIndex];
      return frames.findIndex(frame => Math.abs(frame[sheetIndex].x - baseline.x) > .6 || frame[sheetIndex].opacity - baseline.opacity > .04);
    });
  });
  assert.ok(legacyStarts[0] >= 0 && legacyStarts[0] < legacyStarts[1], `legacy sheets enter separately: ${legacyStarts}`);
  await page.keyboard.press("Escape");
  await legacyDialog.waitFor({ state: "detached" });
  await page.evaluate(() => window.renderHarness({ disabledTrigger: true }));
  const disabled = page.getByRole("button", { name: "Custom launcher" });
  await page.waitForFunction(() => document.querySelector('button[disabled]')?.textContent === "Custom launcher");
  assert.equal(await disabled.isDisabled(), true);
  await disabled.click({ force: true });
  assert.equal(await page.getByRole("dialog").count(), 0, "a disabled custom trigger cannot open the drawer");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.renderHarness({}));
  await page.getByRole("button", { name: "Custom launcher" }).click();
  const stillDialog = page.getByRole("dialog");
  assert.equal(await stillDialog.getAttribute("data-motion"), "off");
  assert.equal(await stillDialog.locator("[data-stack-card]").evaluateAll(cards => cards.every(card => Number(getComputedStyle(card).opacity) === 1)), true, "reduced motion reveals the complete stack without stagger delay");
  await page.keyboard.press("Escape");
  await stillDialog.waitFor({ state: "detached" });

  assert.deepEqual(errors, [], "stack interactions do not throw in the browser");
  console.log("PASS: independently staggered stack cards, visible labels, mounted inactive state, keyboard/controlled selection, bounded pane scrolling, custom trigger focus, rapid reversal, and disabled trigger.");
} finally {
  await browser.close();
}
