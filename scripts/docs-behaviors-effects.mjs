// Behavior checks for the actual public examples. Shared gate helpers are injected
// so these cases also run alone without importing or starting the full docs gate.
export function createEffectTests({ assert, eventually, text, attribute, key }) {
  const slot = (root, name) => root.locator(`[data-slot="${name}"]`).first();
  async function reduced(page, check) {
    const previous = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    await page.emulateMedia({ reducedMotion: "reduce" });
    try { await check(); }
    finally { await page.emulateMedia({ reducedMotion: previous ? "reduce" : "no-preference" }); }
  }
  async function paint(surface) {
    await surface.scrollIntoViewIfNeeded();
    const canvas = surface.locator("canvas").first();
    if (await canvas.isVisible()) return (await canvas.screenshot()).toString("base64");
    return surface.evaluate(node => node.querySelector("svg path")?.getAttribute("d") ?? node.querySelector("pre")?.textContent ?? "");
  }
  async function renderer(surface, allowed) {
    await surface.scrollIntoViewIfNeeded();
    await eventually(async () => allowed.includes(await surface.getAttribute("data-renderer")), "A usable renderer or documented static fallback becomes ready", 12000);
    const state = await surface.getAttribute("data-renderer");
    if (state === "fallback") assert(await surface.locator("svg, pre, [data-slot=field-fallback]").first().isVisible(), "Fallback must remain visible");
    return state;
  }
  async function slider(root, name) {
    const control = root.getByRole("slider", { name, exact: true });
    const before = Number(await control.getAttribute("aria-valuenow"));
    await key(control, "ArrowRight");
    await eventually(async () => Number(await control.getAttribute("aria-valuenow")) > before, `${name} responds to native keyboard input`);
  }
  async function quietSurface(page, surface) {
    await surface.scrollIntoViewIfNeeded();
    await reduced(page, async () => {
      await attribute(surface, "data-moving", "false");
      const first = await paint(surface);
      await page.waitForTimeout(130);
      assert.equal(await paint(surface), first, "Reduced motion holds the rendered surface still");
    });
  }
  async function field({ page, root, entry }) {
    const surface = slot(root, entry.name);
    await renderer(surface, ["webgl", "fallback"]);
    await root.getByRole("button", { name: "Keep this thought", exact: true }).click();
    await text(root.locator('[data-slot="typography-meta"][role="status"]'), "Your thought is saved in this demo.");
    await key(root.getByRole("button", { name: "Pause field", exact: true }), "Enter");
    await attribute(surface, "data-moving", "false");
    await root.getByRole("radio", { name: "Warm", exact: true }).click();
    await attribute(surface, "data-tone", "warm");
    await slider(root, "Pace");
    await quietSurface(page, surface);
    await root.getByRole("button", { name: "Resume field", exact: true }).click();
    return "Save result, keyboard pause, tone and pace controls, and a still reduced-motion surface";
  }
  async function print({ page, root, entry }, kind = entry.name.split("-")[0]) {
    const surface = slot(root, `${kind}-sculpture`);
    await renderer(surface, ["canvas2d", "fallback"]);
    await root.getByRole("button", { name: "Pause sculpture", exact: true }).click();
    await attribute(surface, "data-moving", "false");
    const before = await paint(surface);
    await root.getByLabel("Form", { exact: true }).selectOption("seed");
    await attribute(surface, "data-form", "seed");
    assert.notEqual(await paint(surface), before, "Changing the form changes the actual print");
    await root.getByLabel("Ink color", { exact: true }).selectOption("rose");
    await attribute(surface, "data-tone", "rose");
    if (kind === "glyph") {
      await root.getByLabel("Characters", { exact: true }).selectOption("digits");
      assert(await root.getByRole("switch", { name: "Contour marks", exact: true }).isDisabled(), "Contour marks only apply to the density glyph set");
      await slider(root, "Character size");
    } else if (kind === "dither") {
      const dots = await paint(surface);
      await root.getByLabel("Print pattern", { exact: true }).selectOption("halftone");
      assert.notEqual(await paint(surface), dots, "Halftone changes the printed marks");
      await slider(root, "Grain size");
    } else {
      await root.getByLabel("Linework", { exact: true }).selectOption("contour");
      assert(await root.getByRole("slider", { name: "Line angle", exact: true }).isDisabled(), "Contour linework disables the inapplicable angle control");
      assert(await root.getByRole("switch", { name: "Follow the surface", exact: true }).isDisabled());
      await slider(root, "Line spacing");
    }
    await quietSurface(page, surface);
    return "Form changes actual paint; color, print-specific controls and disabled dependencies work; reduced motion stays still";
  }
  async function material({ page, root, entry }) {
    const surface = slot(root, entry.name);
    const state = await renderer(surface, ["webgl", "fallback"]);
    await root.getByRole("button", { name: "Pause material", exact: true }).click();
    await attribute(surface, "data-moving", "false");
    const before = await paint(surface);
    await root.getByLabel("Form", { exact: true }).selectOption("seed");
    assert.notEqual(await paint(surface), before, "Changing form changes the material sculpture");
    await root.getByLabel("Color", { exact: true }).selectOption("rose");
    await attribute(surface, "data-tone", "rose");
    const kind = entry.name.split("-")[0];
    if (kind === "glass") {
      await root.getByLabel("Studio backdrop", { exact: true }).selectOption("tiles");
      await slider(root, "Refraction");
    } else {
      assert(await root.getByRole("button", { name: kind === "flow" ? "Stir the surface" : "Scatter and return", exact: true }).isDisabled(), "A paused surface disables its active-motion action");
      await slider(root, kind === "flow" ? "Distortion" : "Point count");
    }
    await quietSurface(page, surface);
    await root.getByRole("button", { name: "Resume material", exact: true }).click();
    if (state === "webgl" && kind !== "glass") {
      await surface.scrollIntoViewIfNeeded();
      const action = root.getByRole("button", { name: kind === "flow" ? "Stir the surface" : "Scatter and return", exact: true });
      await eventually(() => action.isEnabled(), "An active visible renderer enables its motion action");
      await key(action, "Enter");
    }
    return "Material form changes actual paint; color and material controls, paused-action semantics and reduced-motion stability";
  }
  async function scrollCheck({ page, root, entry }) {
    const name = entry.name, surface = slot(root, name);
    // Idle drift is intentionally never geometrically stable; native scrolling
    // brings this decorative target into view without an actionability wait.
    await surface.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    if (name === "float-layer") await attribute(surface, "data-reveal", "shown");
    const moving = name === "depth-background" ? surface.locator("[data-depth-layer]").first() : name === "scroll-organism" ? surface.locator(":scope > div").first() : surface;
    const value = () => moving.evaluate(node => { const style = getComputedStyle(node); return [style.transform, style.translate, style.getPropertyValue("--float-y")].join("|"); });
    const before = await value();
    const original = await page.evaluate(() => scrollY);
    try {
      await page.evaluate(() => scrollBy(0, 100));
      await eventually(async () => (await value()) !== before, "Native scroll changes the depth plane");
      await reduced(page, async () => {
        await attribute(surface, "data-quiet", "true");
        if (name !== "scroll-organism") await attribute(surface, "data-active", "false");
        await page.waitForTimeout(120);
        const still = await value();
        await page.evaluate(() => scrollBy(0, -70));
        await page.waitForTimeout(130);
        assert.equal(await value(), still, "Reduced motion removes scroll-driven decoration");
        if (name === "float-layer") assert.equal(await surface.evaluate(node => getComputedStyle(node).opacity), "1", "Quiet entrance remains readable");
      });
    } finally { await page.evaluate(y => scrollTo(0, y), original); }
    return "Native scroll moves the decorative plane; reduced motion holds it still and preserves content";
  }
  return {
    "animated-number": async ({ page, root }) => {
      const number = slot(root, "animated-number"), visual = number.locator(".v-animated-number__visual"), accessible = number.locator(".v-animated-number__accessible");
      await number.scrollIntoViewIfNeeded();
      await root.getByRole("button", { name: "Add 125.25", exact: true }).click();
      await text(accessible, "$1,366.00");
      await eventually(async () => (await visual.textContent()) === "$1,366.00", "Count reaches the exact formatted target");
      await key(root.getByRole("button", { name: "Subtract 375.50", exact: true }), "Enter");
      await root.getByRole("button", { name: "Add 125.25", exact: true }).click();
      await eventually(async () => (await visual.textContent()) === "$1,115.75", "Reversal reaches the latest decimal target");
      await root.getByRole("button", { name: "Rolling digits", exact: true }).click();
      await attribute(number, "data-treatment", "roll");
      await root.getByRole("combobox", { name: /Number format/ }).selectOption("de-DE");
      await text(accessible, new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(1115.75));
      await reduced(page, async () => {
        await attribute(number, "data-quiet", "true");
        await root.getByRole("button", { name: "Drawn steps", exact: true }).click();
        await root.getByRole("button", { name: "Add 125.25", exact: true }).click();
        await text(visual, new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(1241));
      });
      return "Decimal add/subtract and reversal, rolling/stepped treatments, locale formatting and exact quiet updates";
    },
    "number-input": async ({ page, root }) => {
      const input = root.getByRole("spinbutton", { name: "Weekly contribution", exact: true });
      await attribute(input, "aria-valuenow", "24.5");
      await root.getByRole("button", { name: "Increase value", exact: true }).click();
      await attribute(input, "aria-valuenow", "25");
      await key(input, "ArrowDown");
      await attribute(input, "aria-valuenow", "24.5");
      await input.fill("123.75"); await input.press("Enter");
      await attribute(input, "aria-valuenow", "123.75");
      await text(root, "Contribution set to $123.75.");
      await input.fill("700"); await input.press("Enter");
      await attribute(input, "aria-valuenow", "500");
      assert(await root.getByRole("button", { name: "Increase value", exact: true }).isDisabled(), "Maximum disables increment");
      await key(root.getByRole("button", { name: "Clear amount", exact: true }), "Enter");
      await text(root, "No contribution entered.");
      await reduced(page, async () => { await root.getByRole("button", { name: "Reset amount", exact: true }).click(); await attribute(input, "aria-valuenow", "24.5"); await text(root, "Contribution set to $24.50."); });
      return "Native step buttons and keyboard, controlled decimal edits, maximum clamping/disabled increment, clear/reset and quiet updates";
    },
    "pigment-field": field,
    "contour-field": field,
    "glyph-sculpture": print,
    "dither-sculpture": print,
    "ink-sculpture": print,
    "glass-sculpture": material,
    "flow-sculpture": material,
    "particle-sculpture": material,
    "sculpture-orbit": async context => {
      const { page, root } = context, surface = slot(root, "ink-sculpture"), viewport = slot(root, "sculpture-orbit-viewport");
      await renderer(surface, ["canvas2d", "fallback"]);
      await root.getByRole("button", { name: "Pause sculpture", exact: true }).click();
      const initial = await paint(surface);
      await root.getByRole("button", { name: "Turn right", exact: true }).click();
      assert.notEqual(await paint(surface), initial, "Turn button repaints the viewed geometry");
      await key(viewport, "+");
      await attribute(root.getByRole("slider", { name: "Zoom", exact: true }), "aria-valuenow", "1.05");
      await key(viewport, "Home");
      await attribute(root.getByRole("slider", { name: "Zoom", exact: true }), "aria-valuenow", "1");
      await reduced(page, async () => { const before = await paint(surface); await key(viewport, "ArrowRight"); assert.notEqual(await paint(surface), before, "Explicit keyboard orbit remains available in reduced motion"); });
      await root.getByRole("button", { name: "Reset view", exact: true }).click();
      return "Turn button changes geometry; keyboard zoom/Home and explicit reduced-motion orbit preserve real view controls";
    },
    "depth-background": scrollCheck,
    "float-layer": scrollCheck,
    "scroll-organism": scrollCheck,
  };
}
