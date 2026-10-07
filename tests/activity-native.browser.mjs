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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{ActivityFeed}from'./registry/cojeev/ui/activity-feed';import{MilestonePath}from'./registry/cojeev/ui/milestone-path';import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';import{motionClock}from'./registry/cojeev/motion/clock';window.clock=motionClock;const st=(p,i,d)=>p.at==null?d:i<p.at?'complete':i===p.at?'current':'upcoming';const order=(p,xs)=>p.order?p.order.map(id=>xs.find(x=>x.id===id)):xs;window.mode=setMotionMode;window.flow=setFlowSettings;const root=createRoot(document.getElementById('root'));window.selections=[];window.render=p=>flushSync(()=>root.render(<><ActivityFeed ref={n=>window.feedNode=n} aria-label="History" entries={(p.ids??['a','b','c','d']).map(id=>({id,title:'Update '+id,group:id==='d'?'Earlier':'Recent',timestamp:'10:30',dateTime:'2026-09-08T10:30:00+05:30',content:<input aria-label={'Edit '+id} defaultValue={id}/>}))} initialVisible={p.all?undefined:2} pageSize={2}/><MilestonePath ref={n=>window.pathNode=n} aria-label="Project path" presentation={p.presentation} travel={p.travel} items={p.empty?[]:order(p,[{id:'a',title:'A complete checkpoint',state:st(p,0,p.mixed?'upcoming':'complete')},{id:'b',title:'A current checkpoint with a long label that wraps',description:'Keep meaningful descriptions visible in every layout.',state:st(p,1,p.done||p.next?'complete':'current'),disabled:p.disabled},{id:'c',title:'A future checkpoint',state:st(p,2,p.mixed?'complete':p.next?'current':'upcoming')}])} onMilestoneSelect={p.readonly?undefined:id=>window.selections.push(id)}/></>));window.render({});const root2=createRoot(document.getElementById('root2'));window.renderFeed=p=>flushSync(()=>root2.render(<ActivityFeed key={p.key} ref={n=>window.feed2=n} aria-label="Variants" variant={p.variant} initialVisible={p.initialVisible} pageSize={p.pageSize} entries={p.entries.map(([id,who,time,group])=>({id,title:'Entry '+id,actor:who?{name:who}:undefined,group,timestamp:time?time.slice(11,16):undefined,dateTime:time??undefined,content:p.inputs?<input aria-label={'Edit '+id} id={'input-'+id} defaultValue={id}/>:undefined}))}/>));`,
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
    '<div id="root" style="padding:24px;width:400px"></div><div id="root2" style="padding:24px;width:400px"></div>',
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
  // ---------- feed variants: grouping, bursts, legacy default, quiet, removal and motion ----------
  await page.evaluate(() => {
    window.clock(null);
    document.getElementById("root").style.display = "none";
  });
  const v = page.getByRole("region", { name: "Variants" });
  const at = (h, m, d = "07") => `2026-10-${d}T${h}:${m}:00+05:30`;
  const fixture = [
    ["e1", "Mira Shah", at("10", "42"), "Today"],
    ["e2", " Mira Shah ", at("10", "31"), "Today"],
    ["e3", "Mira Shah", at("09", "40"), "Today"],
    ["e4", "Arun Rao", at("09", "35"), "Today"],
    ["e5", null, at("09", "30"), "Today"],
    ["e6", "Mira Shah", at("16", "00", "06"), "Yesterday"],
    ["e7", "Mira Shah", null, "Yesterday"],
  ];
  const fresh = ["e0", "Mira Shah", at("10", "50"), "Today"];
  const feedRender = (p) => page.evaluate((p) => window.renderFeed(p), p);
  // Runs and cards are read from the flat list: each starts at a row marked first.
  const sizes = () =>
    v.evaluate((el) => {
      const out = [];
      for (const row of el.querySelectorAll(".v-activity-feed__list > [data-activity-entry]:not([data-leaving])")) {
        if (row.hasAttribute("data-first") || !out.length) out.push(0);
        out[out.length - 1]++;
      }
      return out;
    });
  const folds = () =>
    v.evaluate((el) =>
      [...el.querySelectorAll("[data-burst] > .v-activity-feed__card > details")].map((d) => d.open && !d.hasAttribute("data-closing")),
    );
  const stash = (sel, name) =>
    v.evaluate((el, [sel, name]) => (window[name] = el.querySelector(sel)), [sel, name]);
  const same = (sel, name) =>
    v.evaluate((el, [sel, name]) => el.querySelector(sel) === window[name], [sel, name]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Legacy callers: no variant is the one-row-per-entry thread, unchanged.
  await feedRender({ entries: fixture });
  assert.equal(await v.getAttribute("data-variant"), "thread");
  assert.equal(await v.locator(".v-activity-feed__list > [data-activity-entry]").count(), 7);
  assert.equal(await v.locator("[data-first], details").count(), 0, "The thread has no runs or disclosures");
  assert.equal(await v.locator(".v-activity-feed__group").count(), 2);
  assert.equal(await v.locator("[data-brand]").count(), 1);
  assert.equal(await v.locator('[data-activity-entry="e5"] [data-brand] path').count(), 1, "An entry without an actor carries the brand star");
  // Ledger: one run per actor within a day, no time limit; the label pins.
  await feedRender({ entries: fixture, variant: "ledger" });
  assert.equal(await v.getAttribute("data-variant"), "ledger");
  assert.equal(await v.locator(".v-activity-feed__list > .v-activity-feed__group").count(), 2, "Day labels are list items beside the rows");
  assert.equal(await v.locator(".v-activity-feed__list > [data-activity-entry]").count(), 7, "Every row is a direct list item, whatever its run");
  assert.deepEqual(await sizes(), [3, 1, 1, 2], "Ledger joins same-actor runs inside a day, across an hour");
  assert.equal(await v.locator(".v-activity-feed__run-name").first().textContent(), "Mira Shah");
  assert.match(await v.locator('[data-activity-entry="e2"]').textContent(), /Mira Shah/, "Each row keeps its actor in text");
  assert.equal(await v.locator(".v-activity-feed__group").first().evaluate((el) => getComputedStyle(el).position), "sticky");
  assert.equal(await v.locator('[data-activity-entry="e5"] [data-brand]').count(), 1);
  // The breathing dot's place is always kept, so it coming and going never rewraps a line.
  {
    const meta = () => v.locator('[data-activity-entry="e1"] .v-activity-feed__meta').evaluate((el) => el.getBoundingClientRect().width);
    const still = await meta();
    await v.locator('[data-activity-entry="e1"]').evaluate((el) => el.setAttribute("data-breath", ""));
    assert.equal(await meta(), still, "The breathing dot takes no new space");
    await v.locator('[data-activity-entry="e1"]').evaluate((el) => el.removeAttribute("data-breath"));
  }
  // Bursts: same actor within 30 minutes by dateTime; an entry without one stands alone.
  await feedRender({ entries: fixture, variant: "bursts" });
  assert.deepEqual(await sizes(), [2, 1, 1, 1, 1, 1]);
  const summary = v.locator("summary.v-activity-feed__card-head");
  assert.equal(await summary.count(), 1, "Only a burst of two or more has a disclosure head");
  const burst = summary.locator("xpath=..");
  assert.match(await summary.textContent(), /Mira Shah\s*2 updates/);
  assert.equal(await burst.evaluate((d) => d.open), true);
  assert.deepEqual(await folds(), [true, true]);
  // Each entry sits inside a native disclosure, so find in page and links can reveal it.
  assert.equal(
    await v.evaluate((el) => [...el.querySelectorAll("[data-activity-entry] .v-activity-feed__content")].every((c) => c.closest("details"))),
    true,
  );
  await summary.click();
  assert.deepEqual(await folds(), [false, false], "Quiet toggles are instant");
  assert.equal(await v.locator('[data-activity-entry="e1"] .v-activity-feed__content').isVisible(), false);
  assert.equal(await v.locator('[data-activity-entry="e2"] .v-activity-feed__content').isVisible(), false);
  await summary.press("Enter");
  assert.deepEqual(await folds(), [true, true]);
  // Prepends keep rows and cards mounted; the new entry joins the burst.
  await stash('[data-activity-entry="e2"]', "keptRow");
  await stash('[data-activity-entry="e1"] details', "keptFold");
  await feedRender({ entries: [fresh, ...fixture], variant: "bursts" });
  assert.deepEqual(await sizes(), [3, 1, 1, 1, 1, 1]);
  assert.equal(await same('[data-activity-entry="e2"]', "keptRow"), true);
  assert.equal(await same('[data-activity-entry="e1"] details', "keptFold"), true, "A growing burst keeps each row's disclosure");
  assert.match(await summary.textContent(), /3 updates/);
  // Show more into a closed burst opens it and focuses the first new entry.
  const run = [
    ["b1", "Mira Shah", at("10", "42"), "Today"],
    ["b2", "Mira Shah", at("10", "31"), "Today"],
    ["b3", "Mira Shah", at("10", "20"), "Today"],
    ["b4", "Arun Rao", at("10", "00"), "Today"],
  ];
  // initialVisible applies on mount, so this feed mounts afresh.
  await feedRender({ key: "paged", entries: run, variant: "bursts", initialVisible: 2, pageSize: 2 });
  await summary.click();
  assert.deepEqual(await folds(), [false, false]);
  await v.getByRole("button", { name: "Show 2 more" }).press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.activityEntry), "b3");
  assert.deepEqual(await folds(), [true, true, true]);
  assert.deepEqual(await sizes(), [3, 1]);
  // A link into a closed burst opens the whole card natively.
  await feedRender({ key: "linked", entries: fixture, variant: "bursts", inputs: true });
  await summary.click();
  assert.deepEqual(await folds(), [false, false]);
  await page.evaluate(() => (location.hash = "#input-e2"));
  await page.waitForTimeout(80);
  assert.deepEqual(await folds(), [true, true], "Fragment navigation reveals the burst");
  assert.equal(await v.locator("#input-e2").isVisible(), true);
  // Reduced motion: arrivals and removals are instant, nothing is left mid-way.
  await feedRender({ entries: fixture });
  await feedRender({ entries: [fresh, ...fixture.filter(([id]) => id !== "e3")] });
  assert.equal(await v.locator("[data-activity-entry]").count(), 7, "A quiet removal leaves at once");
  assert.equal(await v.locator("[data-arriving],[data-slide],[data-moving],[data-mark],[data-leaving]").count(), 0);
  assert.equal(await v.locator('[data-activity-entry="e0"] .v-activity-feed__content').evaluate((el) => getComputedStyle(el).opacity), "1");

  // With motion: drive the shared clock and read every frame; a teleport fails.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await v.scrollIntoViewIfNeeded();
  const frames = (n, read, arg) =>
    page.evaluate(
      async ({ n, read, arg }) => {
        const f = new Function("feed", "arg", `return (${read})(feed, arg)`);
        const out = [];
        for (let i = 0; i < n; i++) {
          window.clock((window.clockAt += 1000 / 60));
          await new Promise((resolve) => setTimeout(resolve));
          out.push(f(window.feed2, arg));
        }
        return out;
      },
      { n, read: read.toString(), arg },
    );
  const freeze = () => page.evaluate(() => window.clock((window.clockAt = performance.now())));
  const glides = (hs, from, to, label) => {
    const between = hs.filter((h) => h !== null && h > Math.min(from, to) + 1 && h < Math.max(from, to) - 1);
    assert.ok(new Set(between.map(Math.round)).size >= 3, `${label}: several intermediate frames (${hs.map((h) => h === null ? "x" : h.toFixed(0)).join(",")})`);
    const steps = hs.slice(1).map((h, i) => Math.abs((h ?? 0) - (hs[i] ?? 0)));
    assert.ok(Math.max(...steps) < Math.abs(to - from) / 2, `${label}: no teleport, largest step ${Math.max(...steps).toFixed(1)}px`);
  };
  for (const variant of ["thread", "ledger", "bursts"]) {
    await page.evaluate(() => window.clock(null));
    // A fresh mount per look starts at rest.
    await feedRender({ key: variant, entries: fixture, variant });
    await page.waitForTimeout(120);
    await freeze();
    // Arrival, read from before the change to rest: the new line, the run or card that takes it,
    // and the text below it. Settled text never jumps; everything glides on the shared spring.
    const look = (feed, variant) => {
      const top = feed.getBoundingClientRect().top;
      const rows = [...feed.querySelectorAll(".v-activity-feed__list > [data-activity-entry]:not([data-leaving])")];
      const i1 = rows.findIndex((r) => r.dataset.activityEntry === "e1");
      let end = i1;
      if (variant !== "thread") while (end < rows.length - 1 && !rows[end].hasAttribute("data-last")) end++;
      const e0 = feed.querySelector('[data-activity-entry="e0"]');
      return {
        e0: e0 ? e0.getBoundingClientRect().height : 0,
        card: rows[end].getBoundingClientRect().bottom - rows[0].getBoundingClientRect().top,
        title: rows[i1].querySelector(".v-activity-feed__title").getBoundingClientRect().top - top,
        label: feed.querySelector(".v-activity-feed__group").getBoundingClientRect().top - top,
      };
    };
    const still = await v.evaluate(look, variant);
    await feedRender({ key: variant, entries: [fresh, ...fixture], variant });
    const box = '[data-activity-entry="e0"]';
    const first = await v.evaluate(look, variant);
    const arriving = [first, ...(await frames(150, look, variant))];
    const rest = arriving.at(-1).e0;
    assert.ok(rest > 20, `${variant}: the arrival lands at its natural height`);
    assert.ok(Math.abs(first.title - still.title) < 0.5, `${variant}: settled text does not move when the arrival starts (${still.title} -> ${first.title})`);
    assert.ok(arriving.every((f) => Math.abs(f.label - still.label) < 0.5), `${variant}: the group heading never moves`);
    assert.ok(arriving.every((f) => f.title > still.title - 0.5), `${variant}: settled text never jumps up`);
    glides(arriving.map((f) => f.e0), first.e0, rest, `${variant} arrival`);
    glides([still.card, ...arriving.map((f) => f.card)], still.card, arriving.at(-1).card, `${variant} run or card`);
    glides([still.title, ...arriving.map((f) => f.title)], still.title, arriving.at(-1).title, `${variant} text below`);
    assert.equal(await v.locator(`${box}[data-moving]`).count(), 0, `${variant}: the arrival hands its height back`);
    if (variant === "ledger") {
      const wash = v.locator('[data-activity-entry="e0"] .v-activity-feed__wash');
      await frames(60, () => 0);
      assert.equal(await wash.evaluate((el) => getComputedStyle(el).opacity), "0", "The wash fades within one draw");
    }
    if (variant !== "thread")
      assert.ok(arriving.at(-1).card > rest, `${variant}: the run holds the new line`);
    // Removal: the row closes through its height, inert, then leaves the tree.
    // e4 is alone in its run or card, so in ledger and bursts its row is the whole box.
    const leaver = (feed) => {
      const el = feed.querySelector('[data-activity-entry="e4"]');
      return el ? el.getBoundingClientRect().height : null;
    };
    const before = await v.evaluate(leaver);
    await feedRender({ key: variant, entries: [fresh, ...fixture.filter(([id]) => id !== "e4")], variant });
    assert.equal(await v.locator('[data-activity-entry="e4"][data-leaving]').evaluate((el) => el.inert), true);
    const spines = (feed) => feed.querySelectorAll('.v-activity-feed__spine:not([display="none"])').length;
    const midway = variant === "thread" ? await frames(3, spines) : [];
    const leaving = await frames(150, leaver);
    assert.equal(leaving.at(-1), null, `${variant}: the removed entry unmounts after closing`);
    glides(leaving.map((h) => h ?? 0), before, 0, `${variant} removal`);
    if (variant === "thread") {
      // No thread stub runs into a leaving row: mid-removal the spine already joins its neighbours.
      const settled = await v.evaluate(spines);
      assert.equal(settled, 6, "Seven rows, six joins");
      assert.deepEqual(midway, [settled, settled, settled], "The spine skips the leaving row");
    }
    assert.equal(await v.locator("[data-moving],[data-leaving]").count(), 0);
  }
  // A burst closes on the spring through intermediate heights, then becomes natively closed.
  await page.evaluate(() => window.clock(null));
  await feedRender({ entries: fixture, variant: "bursts" });
  await page.waitForTimeout(120);
  await freeze();
  const card = (feed) =>
    feed.querySelector('[data-activity-entry="e2"]').getBoundingClientRect().bottom -
    feed.querySelector('[data-activity-entry="e1"]').getBoundingClientRect().top;
  const open = await v.evaluate(card);
  await summary.click();
  const closing = await frames(150, card);
  assert.deepEqual(await v.evaluate((el) => [...el.querySelectorAll("[data-burst] details")].map((d) => d.open || d.hasAttribute("data-closing"))), [false, false]);
  glides([open, ...closing], open, closing.at(-1), "burst close");
  assert.equal(await v.locator('[data-activity-entry="e1"] .v-activity-feed__content').isVisible(), false);
  await summary.click();
  const opening = await frames(150, card);
  glides([closing.at(-1), ...opening], closing.at(-1), open, "burst open");
  assert.ok(Math.abs(opening.at(-1) - open) < 1);
  // Removing the entry between two runs of one actor merges them without remounting a row:
  // the caller's edited, focused input in the last row keeps its node, value and focus.
  for (const variant of ["ledger", "bursts"]) {
    const xyx = [
      ["x1", "Mira Shah", at("10", "42"), "Today"],
      ["y1", "Arun Rao", at("10", "40"), "Today"],
      ["x2", "Mira Shah", at("10", "38"), "Today"],
    ];
    await page.evaluate(() => window.clock(null));
    await feedRender({ key: `regroup-${variant}`, entries: xyx, variant, inputs: true });
    await page.waitForTimeout(80);
    await freeze();
    assert.deepEqual(await sizes(), [1, 1, 1]);
    const input = v.locator("#input-x2");
    await input.fill("edited");
    await input.focus();
    await stash('[data-activity-entry="x2"]', "keptX2");
    await stash("#input-x2", "keptInput");
    await feedRender({ key: `regroup-${variant}`, entries: [xyx[0], xyx[2]], variant, inputs: true });
    const kept = async (when) => {
      assert.equal(await v.locator('[data-activity-entry="x2"]').count(), 1, `${variant} ${when}: one row for x2`);
      assert.equal(await same('[data-activity-entry="x2"]', "keptX2"), true, `${variant} ${when}: the row keeps its node`);
      assert.equal(await same("#input-x2", "keptInput"), true, `${variant} ${when}: the input keeps its node`);
      assert.equal(await input.inputValue(), "edited", `${variant} ${when}: the edit survives`);
      assert.equal(await page.evaluate(() => document.activeElement?.id), "input-x2", `${variant} ${when}: focus stays`);
    };
    await kept("mid-removal");
    assert.deepEqual(await sizes(), [2], `${variant}: the runs merge`);
    await frames(150, () => 0);
    await kept("after removal");
    assert.equal(await v.locator("[data-leaving],[data-moving]").count(), 0);
  }
  // Only the newest fresh entry breathes, and quiet stops it.
  await page.evaluate(() => window.clock(null));
  await feedRender({ entries: fixture, variant: "thread" });
  await page.waitForTimeout(120);
  await feedRender({ entries: [fresh, ...fixture], variant: "thread" });
  await page.waitForTimeout(50);
  assert.deepEqual(await v.evaluate((el) => [...el.querySelectorAll("[data-breath]")].map((n) => n.dataset.activityEntry)), ["e0"]);
  await page.evaluate(() => window.mode("off"));
  await page.waitForTimeout(80);
  assert.equal(await v.getAttribute("data-motion-quiet"), "true");
  assert.equal(await v.locator("[data-breath]").count(), 0, "Quiet feeds do not breathe");
  await page.evaluate(() => window.mode("subtle"));
  await page.evaluate(() => (document.getElementById("root").style.display = ""));
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
    "PASS activity/milestone native: retained nodes/edits, pagination/focus/time/empty, state authority,44px stationary targets, disabled/readonly/ref, owned sequence scrolling, travel without layout shift, continuous seed/droplet/division travel with retarget and reorder release, and quiet; feed variants: thread/ledger/bursts grouping, burst disclosure and reveal, legacy default, quiet instant changes, rows kept through regrouping with caller focus and edits, link reveal of a closed burst, reserved breathing dot, spring arrival per look with settled text and headings still, removal and burst toggle without teleport, one breath",
  );
} finally {
  await browser.close();
}
