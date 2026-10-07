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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{ActivityFeed}from'./registry/cojeev/ui/activity-feed';import{MilestonePath}from'./registry/cojeev/ui/milestone-path';import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';import{motionClock}from'./registry/cojeev/motion/clock';window.clock=motionClock;const st=(p,i,d)=>p.at==null?d:i<p.at?'complete':i===p.at?'current':'upcoming';const order=(p,xs)=>p.order?p.order.map(id=>xs.find(x=>x.id===id)):xs;window.mode=setMotionMode;window.flow=setFlowSettings;const root=createRoot(document.getElementById('root'));window.selections=[];window.render=p=>flushSync(()=>root.render(<><ActivityFeed ref={n=>window.feedNode=n} aria-label="History" entries={(p.ids??['a','b','c','d']).map(id=>({id,title:'Update '+id,group:id==='d'?'Earlier':'Recent',timestamp:'10:30',dateTime:'2026-09-08T10:30:00+05:30',content:<input aria-label={'Edit '+id} defaultValue={id}/>}))} initialVisible={p.all?undefined:2} pageSize={2}/><MilestonePath ref={n=>window.pathNode=n} aria-label="Project path" presentation={p.presentation} travel={p.travel} items={p.empty?[]:order(p,[{id:'a',title:'A complete checkpoint',state:st(p,0,p.mixed?'upcoming':'complete')},{id:'b',title:'A current checkpoint with a long label that wraps',description:'Keep meaningful descriptions visible in every layout.',state:st(p,1,p.done||p.next?'complete':'current'),disabled:p.disabled},{id:'c',title:'A future checkpoint',state:st(p,2,p.mixed?'complete':p.next?'current':'upcoming')}])} onMilestoneSelect={p.readonly?undefined:id=>window.selections.push(id)}/></>));window.render({});`,
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
  await path.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const future = path.getByText("A future checkpoint", { exact: true });
  const still = await future.boundingBox();
  await page.evaluate(() =>
    window.render({ presentation: "journey", next: true }),
  );
  await path.locator("[data-travel-owned]").first().waitFor({ state: "attached" });
  const travelling = await page.evaluate(async () => {
    const layer = window.pathNode.querySelector(".v-milestone-path__organism");
    const frames = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      frames.push(layer.innerHTML);
    }
    return new Set(frames).size;
  });
  assert.ok(travelling > 2, "The working mark travels on its decorative layer");
  const moved = await future.boundingBox();
  // The current title may change weight; its position must not.
  assert.deepEqual([moved.x, moved.y], [still.x, still.y], "Text never moves while a mark travels");
  await page.waitForFunction(
    () => !document.querySelector("[data-travel-owned]"),
    null,
    { timeout: 4000 },
  );
  // Drive the shared motion clock frame by frame and read where the traveller is drawn.
  const centre = (id) =>
    path
      .locator(`[data-root] > ol > [data-milestone-id="${id}"] > .v-milestone-path__marker`)
      .evaluate((el) => {
        const host = el.closest("[data-root]").getBoundingClientRect(),
          box = el.getBoundingClientRect();
        return box.top + box.height / 2 - host.top;
      });
  const step = (frames, until) =>
    page.evaluate(
      async ({ frames, until }) => {
        const body = window.pathNode.querySelector("[data-root] > .v-milestone-path__organism [data-traveler]");
        const ys = [];
        for (let i = 0; i < frames; i++) {
          window.clock((window.clockAt += 1000 / 60));
          await new Promise((resolve) => setTimeout(resolve)); // let phase continuations run
          const at = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(body.getAttribute("transform") ?? "");
          const y = body.getAttribute("display") === "none" || !at ? null : Number(at[2]);
          ys.push(y);
          if (until === "owned-cleared" && !document.querySelector("[data-travel-owned]")) break;
          if (typeof until === "number" && y !== null && y > until) break;
        }
        return ys;
      },
      { frames, until },
    );
  const reset = async (travel) => {
    await page.evaluate((travel) => {
      window.clock(null);
      window.render({ presentation: "journey", travel, at: 0 });
    }, travel);
    await page.waitForFunction(() => !document.querySelector("[data-travel-owned]"), null, { timeout: 4000 });
    await page.evaluate(() => window.clock((window.clockAt = performance.now())));
  };
  for (const travel of ["seed", "droplet", "division"]) {
    await reset(travel);
    const [a, b, c] = [await centre("a"), await centre("b"), await centre("c")];
    await page.evaluate((travel) => window.render({ presentation: "journey", travel, at: 1 }), travel);
    const toB = await step(240, a + (b - a) * 0.4);
    // Retarget mid-travel: the same traveller continues from where it is.
    await page.evaluate((travel) => window.render({ presentation: "journey", travel, at: 2 }), travel);
    const toC = await step(400, "owned-cleared");
    const seen = [...toB, ...toC].filter((y) => y !== null);
    assert.ok(Math.abs(seen[0] - a) < 14, `${travel}: the traveller leaves from the finished mark (${seen[0]} vs ${a})`);
    assert.ok(Math.abs(seen.at(-1) - c) < 1.5, `${travel}: the traveller lands on the retargeted mark (${seen.at(-1)} vs ${c})`);
    for (const [from, to] of [[a, b], [b, c]])
      assert.ok(
        new Set(seen.filter((y) => y > from + 4 && y < to - 4).map(Math.round)).size >= 3,
        `${travel}: drawn at several points between ${Math.round(from)} and ${Math.round(to)}`,
      );
    const jump = Math.max(...seen.slice(1).map((y, i) => Math.abs(y - seen[i])));
    assert.ok(jump < (c - a) / 4, `${travel}: no teleport, largest step ${jump.toFixed(1)}px`);
    assert.equal(await path.locator("[data-travel-owned]").count(), 0, `${travel}: every mark is handed back`);
    // Interrupt with a reorder mid-travel: every hidden mark comes back, whichever row it moved to.
    await reset(travel);
    await page.evaluate((travel) => window.render({ presentation: "journey", travel, at: 1 }), travel);
    await step(240, a + (b - a) * 0.4);
    assert.ok((await path.locator("[data-travel-owned]").count()) > 0);
    await page.evaluate((travel) => window.render({ presentation: "journey", travel, at: 1, order: ["c", "a", "b"] }), travel);
    assert.equal(await path.locator("[data-travel-owned]").count(), 0, `${travel}: a reorder releases the marks it hid`);
    for (const id of ["a", "b", "c"])
      assert.equal(
        await path.locator(`[data-milestone-id="${id}"] > .v-milestone-path__marker`).evaluate((el) => getComputedStyle(el).visibility),
        "visible",
      );
    await page.evaluate(() => window.clock(null));
  }
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
    "PASS activity/milestone native: retained nodes/edits, pagination/focus/time/empty, state authority,44px stationary targets, disabled/readonly/ref, owned sequence scrolling, travel without layout shift, continuous seed/droplet/division travel with retarget and reorder release, and quiet",
  );
} finally {
  await browser.close();
}
