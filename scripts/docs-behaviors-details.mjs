/** Existing detail examples: real controls, visible outcomes and quiet fallbacks. */
export function createDetailTests({ assert, eventually, text, attribute, key }) {
  const reduced = async (page, run) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    try { await run(); } finally { await page.emulateMedia({ reducedMotion: "no-preference" }); }
  };
  const selectedPhrase = root => root.locator('[data-slot="word-relay"] .v-word-relay__accessible');
  return {
    "activity-feed": async ({ page, root }) => {
      const feed = root.locator('[data-slot="activity-feed"]');
      const entries = feed.locator('[data-activity-entry]');
      assert.equal(await entries.count(), 2);
      await key(feed.getByRole("button", { name: "Show 2 more", exact: true }), "Enter");
      await eventually(async () => await entries.count() === 4, "Activity page reveals the remaining entries");
      await text(feed, "4 of 4 activities shown.");
      assert(await feed.locator('[data-activity-entry="draft"]').evaluate(el => el === document.activeElement));
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Add an example update", exact: true }).click();
        const added = entries.first();
        await attribute(added, "data-activity-entry", "local-note");
        await text(added, "This entry was added by the button in this preview.");
        await eventually(() => added.evaluate(el => getComputedStyle(el).opacity === "1"), "Quiet appended activity remains visible");
        assert(await root.getByRole("button", { name: "Example added", exact: true }).isDisabled());
        await feed.getByRole("button", { name: "Show 1 more", exact: true }).click();
        await eventually(async () => await entries.count() === 5, "Final activity remains reachable after prepend");
      });
      const ids = await entries.evaluateAll(nodes => nodes.map(node => node.dataset.activityEntry));
      assert.equal(new Set(ids).size, 5);
      return "Progressive reveal moves focus, local prepend preserves all five entries, and quiet content remains readable";
    },
    appearance: async ({ page, root }) => {
      const reset = root.getByRole("button", { name: "Reset appearance", exact: true });
      await reset.click();
      const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--v-canvas"));
      try {
        await root.getByRole("combobox", { name: "Colour palette", exact: true }).click();
        await page.getByRole("option", { name: "Tide", exact: true }).click();
        await text(root, "Clear blue, sea glass");
        await eventually(() => page.evaluate(() => document.documentElement.dataset.palette === "tide"), "Palette reaches the provider");
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--v-canvas")), before);
        const contrast = root.getByRole("slider", { name: "Contrast", exact: true });
        await key(contrast, "End");
        await attribute(contrast, "aria-valuenow", "100");
        await text(root, "100%");
        await eventually(() => page.evaluate(() => document.documentElement.dataset.contrast === "100"), "Contrast reaches the provider");
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("cojeev-appearance")).palette), "tide");
      } finally { await reset.click(); }
      await text(root, "Warm paper, crisp ink");
      await attribute(root.getByRole("slider", { name: "Contrast", exact: true }), "aria-valuenow", "60");
      return "Palette updates actual theme tokens, keyboard contrast persists, and reset restores Paper at 60%";
    },
    "guided-pointer": async ({ page, root }) => {
      await root.scrollIntoViewIfNeeded();
      const pointer = root.locator('[data-slot="guided-pointer"]');
      const position = pointer.locator('[data-slot="guided-pointer-position"]');
      const ring = pointer.locator('[data-slot="guided-pointer-ring"]');
      assert(await pointer.evaluate(el => el.inert && el.getAttribute("aria-hidden") === "true"));
      assert(await root.getByRole("button", { name: "Previous", exact: true }).isDisabled());
      await root.getByRole("button", { name: "Next moment", exact: true }).click();
      await text(root.getByRole("status"), "Choose a direction · moment 2 of 3");
      await eventually(() => position.evaluate(el => Number(el.dataset.x) === .79 && Number(el.dataset.y) === .5), "Pointer reaches the chosen waypoint");
      await eventually(() => ring.evaluate(el => Number(getComputedStyle(el).opacity) > 0), "Arrival produces a finite visible ring");
      await eventually(() => ring.evaluate(el => getComputedStyle(el).opacity === "0"), "Arrival ring settles");
      await key(root.getByRole("button", { name: "Hand", exact: true }), "Enter");
      await attribute(pointer, "data-glyph", "hand");
      assert.equal(await pointer.locator('svg path').count(), 5);
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Next moment", exact: true }).click();
        await text(root.getByRole("status"), "Stay with it · moment 3 of 3");
        await eventually(() => position.evaluate(el => Number(el.dataset.x) === .45 && Number(el.dataset.y) === .82), "Quiet pointer settles at the selected waypoint");
        assert(await root.getByRole("button", { name: "Next moment", exact: true }).isDisabled());
        await key(root.getByRole("button", { name: "Previous", exact: true }), "Enter");
        await text(root.getByRole("status"), "moment 2 of 3");
        assert.equal(await ring.evaluate(el => getComputedStyle(el).opacity), "0");
      });
      return "Waypoint controls move the decorative pointer, finite ring settles, hand geometry renders, and quiet navigation retains endpoint bounds";
    },
    "semantic-bloom": async ({ page, root }) => {
      const bloom = root.locator('[data-slot="semantic-bloom"]');
      const canvas = bloom.locator('[data-slot="bloom-canvas"]');
      const frame = () => canvas.evaluate(element => element.toDataURL());
      await attribute(bloom, "data-renderer", "canvas");

      await root.getByRole("button", { name: "Pause", exact: true }).click();
      await attribute(bloom, "data-moving", "false");
      const paused = await frame();
      await page.waitForTimeout(120);
      assert.equal(await frame(), paused);

      await root.getByRole("button", { name: "Scatter", exact: true }).click();
      await text(root.getByRole("status"), "Particles scattered. Use Gather to bring them back.");
      await eventually(async () => (await frame()) !== paused, "Scatter changes the paused organism");
      const scattered = await frame();

      await key(root.getByRole("button", { name: "Gather", exact: true }), "Enter");
      await text(root.getByRole("status"), "Gathering around the wordmark.");
      await eventually(async () => (await frame()) !== scattered, "Gather joins the paused organism around the wordmark");
      const gathered = await frame();
      await page.waitForTimeout(120);
      assert.equal(await frame(), gathered);

      await root.getByRole("combobox", { name: "Palette", exact: true }).selectOption("memory");
      await attribute(bloom, "data-tone", "memory");
      await root.getByRole("textbox", { name: "Wordmark", exact: true }).fill("Ideas find each other");
      await eventually(async () => (await bloom.locator('[data-slot="bloom-wordmark"]').textContent()) === "Ideas find each other", "Editable wordmark reaches the readable DOM text");

      const follow = root.getByRole("switch", { name: "Follow cursor", exact: true });
      await key(follow, "Space");
      await attribute(follow, "aria-checked", "false");
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Resume", exact: true }).click();
        await attribute(bloom, "data-moving", "false");
      });
      return "Pause holds the canvas; pointer scatter and keyboard gather change it; palette, wordmark and cursor controls update real component state; reduced motion stays still";
    },
    "hero-button": async ({ page, root }) => {
      const button = root.getByRole("button", { name: "Make something yours", exact: true });
      await button.click(); await text(root, "1 little beginnings.");
      await key(button, "Enter"); await text(root, "2 little beginnings.");
      await reduced(page, async () => { await key(button, "Space"); await text(root, "3 little beginnings."); });
      assert.equal(await button.locator('[data-slot="hero-button-arrow"]').count(), 1);
      return "Native pointer, Enter and Space activation each produce one visible result, including reduced motion";
    },
    "living-link": async ({ page, root }) => {
      const link = root.getByRole("link", { name: "Follow this thought", exact: true });
      const disabled = root.getByRole("link", { name: "Next chapter, coming soon", exact: true });
      const href = await link.getAttribute("href");
      const destinationId = decodeURIComponent(href.slice(1));
      await link.click();
      assert.equal(await page.evaluate(() => decodeURIComponent(location.hash.slice(1))), destinationId);
      await root.getByText("You arrived at the thought: a link should always lead somewhere real.", { exact: true }).waitFor();
      const reached = page.url();
      await attribute(disabled, "aria-disabled", "true");
      assert.equal(await disabled.getAttribute("href"), null);
      assert.equal(await disabled.getAttribute("tabindex"), "-1");
      await disabled.click({ force: true }); assert.equal(page.url(), reached);
      const external = root.getByRole("link", { name: "Read about native links", exact: true });
      assert.equal(await external.getAttribute("target"), "_blank");
      assert((await external.getAttribute("rel")).includes("noopener"));
      await reduced(page, async () => { await key(link, "Enter"); await attribute(link, "data-quiet", "true"); });
      return "Native fragment navigation reaches real content, disabled link cannot navigate, and quiet keyboard activation stays native";
    },
    "milestone-path": async ({ page, root }) => {
      const path = root.locator('[data-slot="milestone-path"]');
      await attribute(path.locator('[aria-current="step"]'), "data-milestone-id", "milestone-1");
      await root.getByRole("button", { name: "Complete this milestone", exact: true }).click();
      await text(root.getByRole("status"), "2 of 4 completed");
      await attribute(path.locator('[aria-current="step"]'), "data-milestone-id", "milestone-2");
      await key(path.getByRole("button", { name: "Bring it into the day", exact: true }), "Enter");
      await text(root.getByRole("status"), "Selected: Bring it into the day");
      assert.equal(await path.locator('[data-state="complete"][data-milestone-id]').count(), 2);
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Complete this milestone", exact: true }).click();
        await root.getByRole("button", { name: "Complete this milestone", exact: true }).click();
        await text(root.getByRole("status"), "4 of 4 completed");
        assert.equal(await path.locator('[aria-current="step"]').count(), 0);
        assert.equal(await path.locator('[data-state="complete"][data-milestone-id]').count(), 4);
        await key(root.getByRole("button", { name: "Start again", exact: true }), "Enter");
        await attribute(path.locator('[aria-current="step"]'), "data-milestone-id", "milestone-0");
        await text(root.getByRole("status"), "0 of 4 completed");
      });
      return "Caller-owned progress completes and restarts without a false current step; keyboard title selection preserves progress";
    },
    "reading-trail": async ({ page, root }) => {
      const trail = root.getByRole("navigation", { name: "A note worth keeping", exact: true });
      const article = root.getByRole("region", { name: "Example article", exact: true });
      const last = trail.getByRole("link", { name: /Leave a way back/ });
      const destination = decodeURIComponent((await last.getAttribute("href")).slice(1));
      await last.click();
      await attribute(last, "aria-current", "location");
      assert(await article.evaluate(el => el.scrollTop > 0));
      assert.equal(await page.evaluate(() => document.activeElement.id), destination);
      const progress = await trail.getByRole("progressbar").evaluate(el => el.value);
      assert(progress > 0);
      await reduced(page, async () => {
        const first = trail.getByRole("link", { name: /Notice what matters/ });
        await key(first, "Enter");
        await attribute(first, "aria-current", "location");
        await eventually(() => article.evaluate(el => el.scrollTop < 2), "Keyboard return scrolls the article to its beginning");
        assert.equal(await page.evaluate(() => decodeURIComponent(location.hash.slice(1))), decodeURIComponent((await first.getAttribute("href")).slice(1)));
      });
      return "Trail links scroll the actual article, transfer focus and update progress/current location; quiet keyboard return works";
    },
    "shape-artwork": async ({ page, root }) => {
      const artwork = root.getByRole("img", { name: "An original organic shape", exact: true });
      const firstPath = await artwork.locator('[data-artwork-layer="fill"] path').getAttribute("d");
      await root.getByRole("radio", { name: "Clover", exact: true }).click();
      await attribute(artwork, "data-shape", "clover-soft");
      await eventually(async () => (await artwork.locator('[data-artwork-layer="fill"] path').getAttribute("d")) !== firstPath, "Shape selection changes the contour");
      const slider = root.getByRole("slider", { name: "Artwork rotation", exact: true });
      await key(slider, "ArrowRight");
      await attribute(slider, "aria-valuenow", "1");
      assert.equal(await artwork.locator('[data-artwork-layer="fill"]').getAttribute("transform"), "rotate(1 50 50)");
      await root.getByRole("switch", { name: "Cast shadow", exact: true }).click();
      assert.equal(await artwork.locator('[data-artwork-layer="shadow"]').count(), 0);
      await key(root.getByRole("switch", { name: "Rear outline", exact: true }), "Space");
      assert.equal(await artwork.locator('[data-artwork-layer="echo"]').count(), 0);
      await text(root.locator('pre'), "rotation={1}");
      await text(root.locator('pre'), "shadow={false}");
      await text(root.locator('pre'), "echo={false}");
      await reduced(page, async () => {
        await root.getByRole("radio", { name: "Seed", exact: true }).click();
        await attribute(artwork, "data-shape", "seed-wing");
        await attribute(artwork, "data-quiet", "true");
        assert((await artwork.locator('path').getAttribute("d")).length > 20);
      });
      return "Shape, keyboard rotation and layer controls alter actual SVG artwork and its copyable usage code, including quiet selection";
    },
    "text-ribbon": async ({ page, root }) => {
      const ribbon = root.locator('[data-slot="text-ribbon"]');
      const offset = () => ribbon.locator('textPath').getAttribute("startOffset").then(Number);
      await root.getByRole("button", { name: "Pause ribbon", exact: true }).click();
      await attribute(ribbon, "data-running", "false");
      const paused = await offset(); await page.waitForTimeout(100); assert.equal(await offset(), paused);
      await root.getByRole("textbox", { name: "Your phrase", exact: true }).fill("A quieter orbit");
      assert.equal(await ribbon.locator('.v-text-ribbon__accessible').textContent(), "A quieter orbit");
      assert((await ribbon.locator('textPath').textContent()).includes("A quieter orbit"));
      await key(ribbon, "Home"); assert.equal(await offset(), 0);
      await key(ribbon, "ArrowLeft"); assert.notEqual(await offset(), 0);
      await root.getByRole("button", { name: "Reverse direction", exact: true }).click();
      await attribute(ribbon, "data-direction", "backward");
      await root.getByRole("switch", { name: "Show the path", exact: true }).click();
      assert.equal(await ribbon.locator('.v-text-ribbon__guide').count(), 0);
      await root.getByRole("combobox", { name: "On hover", exact: true }).selectOption("none");
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Resume ribbon", exact: true }).click();
        await attribute(ribbon, "data-running", "false");
        const still = await offset(); await page.waitForTimeout(100); assert.equal(await offset(), still);
      });
      return "Editable phrase reaches the path; pause, keyboard positioning, reverse and guide controls work, with quiet motion held";
    },
    "word-relay": async ({ page, root }) => {
      const relay = root.locator('[data-slot="word-relay"]');
      await root.getByRole("button", { name: "Next thought", exact: true }).click();
      assert.equal(await selectedPhrase(root).textContent(), "a little wonder");
      await key(root.getByRole("button", { name: "Previous", exact: true }), "Enter");
      assert.equal(await selectedPhrase(root).textContent(), "room to think");
      await root.getByRole("combobox", { name: "Move by", exact: true }).selectOption("word");
      await attribute(relay, "data-relay-split", "word");
      assert.equal(await relay.locator('[data-selected="true"] [data-relay-unit]').count(), 3);
      await root.getByRole("switch", { name: "Cycle automatically", exact: true }).click();
      await attribute(relay, "data-running", "true");
      await eventually(async () => (await selectedPhrase(root).textContent()) === "a little wonder", "Automatic cycle produces the next phrase", 4500);
      await reduced(page, async () => {
        await attribute(relay, "data-running", "false");
        await root.getByRole("button", { name: "Reset", exact: true }).click();
        assert.equal(await selectedPhrase(root).textContent(), "room to think");
        await key(root.getByRole("button", { name: "Next thought", exact: true }), "Enter");
        assert.equal(await selectedPhrase(root).textContent(), "a little wonder");
        assert(await relay.locator('[data-selected="true"] [data-relay-unit]').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).opacity === "1")));
      });
      await root.getByRole("switch", { name: "Cycle automatically", exact: true }).click();
      return "Navigation handle updates real phrases; word split, timed cycle and quiet manual/reset behavior remain readable";
    },
    "writing-caret": async ({ page, root }) => {
      const caret = root.locator('[data-slot="writing-caret"]');
      await attribute(caret, "aria-hidden", "true");
      assert.equal(await caret.evaluate(el => getComputedStyle(el).opacity), "1");
      await key(root.getByRole("button", { name: "Replay caret", exact: true }), "Enter");
      await text(root.getByRole("status"), "replay 1");
      await eventually(() => caret.evaluate(el => getComputedStyle(el).opacity === "0"), "Replay produces a visible blink");
      await root.getByRole("button", { name: "Keep it still", exact: true }).click();
      await attribute(caret, "data-animating", "false");
      assert.equal(await caret.evaluate(el => getComputedStyle(el).opacity), "1");
      await reduced(page, async () => {
        await root.getByRole("button", { name: "Replay caret", exact: true }).click();
        await text(root.getByRole("status"), "replay 2");
        await attribute(caret, "data-animating", "false");
        assert.equal(await caret.evaluate(el => getComputedStyle(el).opacity), "1");
      });
      return "Keyboard replay blinks, the still control settles visibly, and reduced motion preserves the decorative mark";
    },
  };
}
