import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  html = await (await fetch(`${base}/docs/milestone-path/`)).text(),
  css = (
    await Promise.all(
      [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
        (await fetch(new URL(m[1], base))).text(),
      ),
    )
  ).join("\n");
const bundle = await build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{ActivityFeed}from'./registry/cojeev/ui/activity-feed';import{MilestonePath}from'./registry/cojeev/ui/milestone-path';import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';window.mode=setMotionMode;window.flow=setFlowSettings;const root=createRoot(document.getElementById('root'));window.selections=[];window.render=p=>flushSync(()=>root.render(<><ActivityFeed ref={n=>window.feedNode=n} aria-label="History" entries={(p.ids??['a','b','c','d']).map(id=>({id,title:'Update '+id,group:id==='d'?'Earlier':'Recent',timestamp:'10:30',dateTime:'2026-09-08T10:30:00+05:30',content:<input aria-label={'Edit '+id} defaultValue={id}/>}))} initialVisible={p.all?undefined:2} pageSize={2}/><MilestonePath ref={n=>window.pathNode=n} aria-label="Project path" presentation={p.presentation} items={p.empty?[]:[{id:'a',title:'A complete checkpoint',state:p.mixed?'upcoming':'complete'},{id:'b',title:'A current checkpoint with a long label that wraps',description:'Keep meaningful descriptions visible in every layout.',state:p.done?'complete':'current',disabled:p.disabled},{id:'c',title:'A future checkpoint',state:p.mixed?'complete':'upcoming'}]} onMilestoneSelect={p.readonly?undefined:id=>window.selections.push(id)}/></>));window.render({});`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.setContent(
    '<div id="root" style="padding:24px;width:400px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const feed = page.getByRole("region", { name: "History" }),
    path = page.getByRole("region", { name: "Project path" });
  assert.equal(await feed.evaluate((el) => el === window.feedNode), true);
  assert.equal(await path.evaluate((el) => el === window.pathNode), true);
  await feed.getByRole("textbox", { name: "Edit b" }).fill("Do not lose me");
  await page.evaluate(() => window.render({ ids: ["x", "a", "b", "c", "d"] }));
  assert.equal(await feed.locator("[data-activity-entry]").count(), 3);
  assert.equal(
    await feed.getByRole("textbox", { name: "Edit b" }).inputValue(),
    "Do not lose me",
  );
  await feed.getByRole("button", { name: "Show 2 more" }).press("Enter");
  assert.equal(await feed.locator("[data-activity-entry]").count(), 5);
  assert.equal(
    await page.evaluate(() => document.activeElement?.dataset.activityEntry),
    "c",
  );
  assert.equal(
    await feed.locator("time").first().getAttribute("datetime"),
    "2026-09-08T10:30:00+05:30",
  );
  await page.evaluate(() =>
    window.render({ ids: ["x", "a", "b", "c", "d", "e"] }),
  );
  assert.equal(
    await feed.locator("[data-activity-entry]").count(),
    5,
    "Appending does not open undisclosed history",
  );
  await page.evaluate(() => window.render({ ids: [] }));
  await feed.getByText("No activity yet", { exact: true }).waitFor();
  for (const presentation of [undefined, "journey", "sequence", "review"]) {
    await page.evaluate(
      (presentation) => window.render({ presentation }),
      presentation,
    );
    const button = path.getByRole("button", {
      name: "A current checkpoint with a long label that wraps",
    });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    assert.ok(box.height >= 44);
    await button.hover();
    await page.waitForTimeout(80);
    assert.deepEqual(await button.boundingBox(), box);
    await button.press("Space");
    assert.equal(await page.evaluate(() => window.selections.at(-1)), "b");
    assert.equal(
      await path
        .locator('[aria-current="step"]')
        .getAttribute("data-milestone-id"),
      "b",
    );
    await path
      .getByText("Keep meaningful descriptions visible in every layout.")
      .waitFor();
    if(presentation!=="review") {
      const edge=path.locator('[data-state="complete"] .v-milestone-path__progress').first();
      assert.equal(await edge.evaluate(el=>getComputedStyle(el).strokeDasharray),'none','Completed connections are not half-painted by normalized dashes with non-scaling strokes');
      assert.equal(await edge.evaluate(el=>getComputedStyle(el).opacity),'1');
    }
    if (presentation === "sequence") {
      const port = path.locator("[data-radix-scroll-area-viewport]");
      assert.equal(
        await port.evaluate((el) => el.scrollWidth > el.clientWidth),
        true,
      );
      await port.focus();
      await port.press("End");
      await page.waitForTimeout(100);
      assert.ok((await port.evaluate((el) => el.scrollLeft)) > 0);
      assert.equal(
        await path
          .locator('[data-orientation="horizontal"] .v-scroll__contour')
          .count(),
        1,
      );
    }
    await page.evaluate(
      (presentation) => window.render({ presentation, disabled: true }),
      presentation,
    );
    const count = await page.evaluate(() => window.selections.length);
    await button.dispatchEvent("click");
    assert.equal(await page.evaluate(() => window.selections.length), count);
    await page.evaluate(
      (presentation) =>
        window.render({ presentation, mixed: true, readonly: true }),
      presentation,
    );
    assert.equal(await path.getByRole("button").count(), 0);
    assert.equal(
      await path.locator('[data-milestone-id="c"]').getAttribute("data-state"),
      "complete",
    );
    assert.equal(
      await path.locator('[data-milestone-id="a"]').getAttribute("data-state"),
      "upcoming",
    );
  }
  await page.evaluate(() => window.render({ empty: true }));
  await path.getByText("No milestones yet", { exact: true }).waitFor();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.render({ presentation: "journey" }));
  const marker = path.locator(
    '[data-state="current"] .v-milestone-path__marker',
  );
  await marker.scrollIntoViewIfNeeded();
  await marker.locator("[data-morph-body]").waitFor({ state: "attached" });
  const moving = await marker.evaluate(async (el) => {
    const box = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent("pointerenter", {
        bubbles: true,
        clientX: box.x + box.width - 1,
        clientY: box.y + box.height / 2,
        pointerType: "mouse",
      }),
    );
    document.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: box.x + box.width - 1,
        clientY: box.y + box.height / 2,
        pointerType: "mouse",
      }),
    );
    const paths = [];
    for (let i = 0; i < 20; i++) {
      await new Promise(requestAnimationFrame);
      paths.push(el.querySelector("[data-morph-body]").getAttribute("d"));
    }
    return new Set(paths).size;
  });
  assert.ok(
    moving > 2,
    "The current marker has an actual shared contour response",
  );
  for (const kind of ["motion", "flow"]) {
    await page.evaluate(
      (kind) =>
        kind === "motion"
          ? window.mode("off")
          : window.flow({ variant: "off" }),
      kind,
    );
    await page.waitForTimeout(80);
    assert.equal(await path.getAttribute("data-motion-quiet"), "true");
    await page.evaluate(
      (kind) =>
        kind === "motion"
          ? window.mode("subtle")
          : window.flow({ variant: "glide" }),
      kind,
    );
  }
  console.log(
    "PASS activity/milestone native: retained nodes/edits, pagination/focus/time/empty, state authority,44px stationary targets, disabled/readonly/ref, owned sequence scrolling and contour/quiet",
  );
} finally {
  await browser.close();
}
