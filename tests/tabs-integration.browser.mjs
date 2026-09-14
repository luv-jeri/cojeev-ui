import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = "output/playwright/library-integration/tabs";
await mkdir(output, { recursive: true });

const css = (
  await Promise.all(
    ["tokens", "theme", "base", "icon", "tabs", "flow-press"].map((name) =>
      readFile(`registry/cojeev/styles/${name}.css`, "utf8"),
    ),
  )
).join("\n");

const fixtureCss = `
  html { color-scheme: light; }
  html[data-mode="dark"] { color-scheme: dark; }
  body { margin: 0; background: var(--v-canvas); color: var(--v-text); font-family: var(--font-text); }
  #root { display: grid; gap: 28px; width: min(760px, calc(100vw - 48px)); margin: 24px auto; }
  .fixture-card { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--v-edge); border-radius: var(--r-card); }
  .fixture-card h2 { margin: 0; font: 500 20px/1.2 var(--font-display); }
  [data-slot="tabs-list"] { display: flex; }
  [data-slot="tabs-content"] { padding-top: 12px; color: var(--v-text-2); }
  .v-icon { flex: none; fill: none; stroke: currentColor; stroke-width: var(--icon-stroke); stroke-linecap: round; stroke-linejoin: round; }
`;

const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Tabs, TabsContent, TabsList, TabsTrigger } from "./registry/cojeev/ui/tabs";
      import { Icon } from "./registry/cojeev/ui/icon";
      import { setFlowSettings } from "./registry/cojeev/motion/settings";

      const root = createRoot(document.getElementById("root"));
      const variants = ["pills", "lenses"];

      function Specimen({ variant }) {
        return <section className="fixture-card" data-fixture={variant}>
          <h2>{variant === "pills" ? "Pills" : "Lenses"}</h2>
          <Tabs defaultValue="files" variant={variant}>
            <TabsList aria-label={variant + " workspace views"}>
              <TabsTrigger value="files" data-testid={variant + "-icon"}>
                <Icon name="folder" aria-hidden="true" />
                <span>Files</span>
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid={variant + "-long"}>
                <span>Activity with a deliberately long label</span>
              </TabsTrigger>
              <TabsTrigger value="disabled" disabled data-testid={variant + "-disabled"}>
                <span>Unavailable</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="files">Files are ready.</TabsContent>
            <TabsContent value="activity">Recent activity is ready.</TabsContent>
            <TabsContent value="disabled">Unavailable content.</TabsContent>
          </Tabs>
        </section>;
      }

      // Notebook and rail: connected sheet and index line, each with a panel.
      function Composed({ variant }) {
        return <section className="fixture-card" data-fixture={variant}>
          <h2>{variant === "notebook" ? "Notebook" : "Rail"}</h2>
          <Tabs defaultValue="notes" variant={variant} orientation={variant === "rail" ? "vertical" : "horizontal"}>
            <TabsList aria-label={variant + " sections"}>
              <TabsTrigger value="notes"><Icon name="notebook" size="sm" aria-hidden="true" /><span>Notes</span><span className="v-tabs__count" aria-hidden="true">12</span></TabsTrigger>
              <TabsTrigger value="ideas"><Icon name="sparkles" size="sm" aria-hidden="true" /><span>Ideas</span><span className="v-tabs__count" aria-hidden="true">08</span></TabsTrigger>
            </TabsList>
            <TabsContent value="notes"><div className="v-tabs__story"><h3>Notes</h3></div></TabsContent>
            <TabsContent value="ideas"><div className="v-tabs__story"><h3>Ideas</h3></div></TabsContent>
          </Tabs>
        </section>;
      }

      root.render(<>{variants.map(variant => <Specimen key={variant} variant={variant} />)}{["notebook", "rail"].map(variant => <Composed key={variant} variant={variant} />)}</>);
      window.setTabsFlow = variant => setFlowSettings({ variant });
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

async function mount(page, mode) {
  await page.setContent(`<html data-mode="${mode}"><body><main id="root"></main></body></html>`);
  await page.addStyleTag({ content: `${css}\n${fixtureCss}` });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slot="tabs-list"].v-glide').length === 4,
  );
  await page.waitForTimeout(80);
}

async function resolvedColor(page, property, scope = "html") {
  return page.locator(scope).evaluate((node, name) => {
    const value = getComputedStyle(node).getPropertyValue(name).trim();
    const probe = document.createElement("span");
    probe.style.color = value;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, property);
}

async function assertSettledSelection(list, trigger) {
  const layer = list.locator(":scope > .v-glide__pill");
  await layer.waitFor();
  const [paint, target] = await Promise.all([layer.boundingBox(), trigger.boundingBox()]);
  assert.ok(paint && target, "selection paint and active trigger must be visible");
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(paint[key] - target[key]) < 1, `settled selection ${key} must match its trigger`);
  }
  assert.equal(await layer.evaluate((node) => getComputedStyle(node).opacity), "1");
}

test("tabs pair dark travelling paint with icon labels and preserve quiet fallbacks", async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await mount(page, mode);

      for (const variant of ["pills", "lenses"]) {
        const root = page.locator(`[data-fixture="${variant}"]`);
        const list = root.getByRole("tablist");
        const iconTab = root.getByRole("tab", { name: "Files", exact: true });
        const longTab = root.getByRole("tab", {
          name: "Activity with a deliberately long label",
          exact: true,
        });
        const disabledTab = root.getByRole("tab", { name: "Unavailable", exact: true });

        const composition = await iconTab.evaluate((node) => {
          const style = getComputedStyle(node);
          const icon = node.querySelector("svg");
          const iconBox = icon?.getBoundingClientRect();
          return {
            display: style.display,
            alignItems: style.alignItems,
            gap: style.columnGap,
            iconHidden: icon?.getAttribute("aria-hidden"),
            iconSize: iconBox ? [iconBox.width, iconBox.height] : null,
          };
        });
        assert.deepEqual(composition, {
          // A flex item blockifies inline-flex to flex in computed style.
          display: "flex",
          alignItems: "center",
          gap: "8px",
          iconHidden: "true",
          iconSize: [20, 20],
        });

        const longGeometry = await longTab.evaluate((node) => {
          const label = node.querySelector("span");
          const box = node.getBoundingClientRect();
          const labelBox = label.getBoundingClientRect();
          return {
            height: box.height,
            labelWidth: labelBox.width,
            overhead: box.width - labelBox.width,
            iconCount: node.querySelectorAll("svg").length,
          };
        });
        assert.ok(longGeometry.height >= 44, "long text-only triggers retain the touch target");
        assert.ok(longGeometry.labelWidth > 180, "long text remains visible");
        assert.ok(longGeometry.overhead < 40, "text-only triggers do not gain an empty icon gap");
        assert.equal(longGeometry.iconCount, 0);
        assert.ok(await disabledTab.isDisabled());
        assert.equal(await disabledTab.evaluate((node) => getComputedStyle(node).cursor), "not-allowed");

        if (variant === "pills") {
          await iconTab.focus();
          assert.ok(await iconTab.evaluate((node) => node.matches(":focus-visible")));
          assert.equal(await iconTab.evaluate((node) => getComputedStyle(node).outlineStyle), "solid");
        }

        await assertSettledSelection(list, iconTab);
        if (mode === "dark") {
          const tokens = await list.evaluate((node) => {
            const style = getComputedStyle(node);
            return {
              background: style.getPropertyValue("--glide-bg").trim(),
              foreground: style.getPropertyValue("--glide-fg").trim(),
              accent: style.getPropertyValue("--v-pink").trim(),
              ink: style.getPropertyValue("--v-on-accent").trim(),
            };
          });
          assert.equal(tokens.background, tokens.accent, `${variant} travelling paint uses the dark accent`);
          assert.equal(tokens.foreground, tokens.ink, `${variant} travelling label uses fixed accent ink`);
          assert.equal(
            await iconTab.evaluate((node) => getComputedStyle(node).backgroundColor),
            "rgba(0, 0, 0, 0)",
            "the active trigger stays unpainted while the travelling layer owns selection",
          );
          assert.equal(
            await iconTab.evaluate((node) => getComputedStyle(node).color),
            await resolvedColor(page, "--v-on-accent"),
          );
        }

        await longTab.click();
        const movement = await list.evaluate(async (node) => {
          const values = [];
          for (let index = 0; index < 20; index += 1) {
            await new Promise(requestAnimationFrame);
            values.push(parseFloat(getComputedStyle(node).getPropertyValue("--glide-x")));
          }
          return values.filter(Number.isFinite);
        });
        assert.ok(
          new Set(movement.map((value) => value.toFixed(2))).size > 2,
          `selection paint visibly travels: ${movement.join(", ")}`,
        );
        await page.waitForTimeout(420);
        await assertSettledSelection(list, longTab);
        assert.equal(await root.getByRole("tabpanel").innerText(), "Recent activity is ready.");

        await iconTab.click();
        await page.waitForTimeout(420);
        await assertSettledSelection(list, iconTab);
        await root.screenshot({ path: `${output}/${variant}-${mode}.png` });
      }

      await page.evaluate(() => window.setTabsFlow("off"));
      await page.waitForFunction(() => !document.querySelector('[data-slot="tabs-list"].v-glide'));
      const quietRoot = page.locator('[data-fixture="pills"]');
      const quietSelected = quietRoot.getByRole("tab", {
        name: "Files",
        exact: true,
      });
      assert.equal(
        await quietSelected.evaluate((node) => getComputedStyle(node).backgroundColor),
        mode === "dark" ? await resolvedColor(page, "--v-pink") : await resolvedColor(page, "--v-ink"),
      );
      await quietRoot
        .getByRole("tab", { name: "Activity with a deliberately long label", exact: true })
        .click();
      assert.equal(await quietRoot.getByRole("tabpanel").innerText(), "Recent activity is ready.");
      assert.deepEqual(errors, []);
      await page.close();
    }

    const reduced = await browser.newPage({
      viewport: { width: 900, height: 520 },
      reducedMotion: "reduce",
    });
    await mount(reduced, "dark");
    const reducedRoot = reduced.locator('[data-fixture="lenses"]');
    const reducedList = reducedRoot.getByRole("tablist");
    const reducedLong = reducedRoot.getByRole("tab", {
      name: "Activity with a deliberately long label",
      exact: true,
    });
    await reducedLong.click();
    await reduced.waitForTimeout(40);
    await assertSettledSelection(reducedList, reducedLong);
    assert.equal(
      await reducedLong.evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    await reduced.close();
    console.log("PASS Tabs dark/light travel paint, icon/text composition, long/disabled/focus states, Flow Off and reduced motion");
  } finally {
    await browser.close();
  }
});

test("notebook sheets and rail lines travel as whole surfaces and stay connected", async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await mount(page, mode);

      const notebook = page.locator('[data-fixture="notebook"]');
      const notebookList = notebook.getByRole("tablist");
      const notes = notebook.getByRole("tab", { name: "Notes", exact: true });
      const ideas = notebook.getByRole("tab", { name: "Ideas", exact: true });
      await assertSettledSelection(notebookList, notes);
      const sheet = await notebookList.evaluate((node) => {
        const layer = node.querySelector(":scope > .v-glide__pill > i");
        const style = getComputedStyle(layer);
        const paper = getComputedStyle(node).getPropertyValue("--v-paper").trim();
        const probe = document.createElement("span");
        probe.style.color = paper;
        document.body.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return { background: style.backgroundColor, paper: resolved, ring: style.boxShadow, radius: style.borderRadius, kind: node.dataset.flowKind };
      });
      assert.equal(sheet.kind, "pill", "the notebook travels its whole sheet, not a bar");
      assert.equal(sheet.background, sheet.paper, "the travelling sheet is paper, continuous with its page");
      assert.match(sheet.ring, /inset/, "the sheet carries an edge on its open sides");
      assert.match(sheet.radius, /^14px 14px 0px 0px$/, "the sheet keeps the tab's top corners and an open bottom");
      const join = await notebook.evaluate((node) => {
        const list = node.querySelector('[data-slot="tabs-list"]');
        const panel = node.querySelector('[data-slot="tabs-content"]');
        return { listBottom: list.getBoundingClientRect().bottom, panelTop: panel.getBoundingClientRect().top, panelTopBorder: getComputedStyle(panel).borderTopWidth };
      });
      assert.ok(Math.abs(join.listBottom - join.panelTop) < 0.5, "the sheet baseline meets the page with no gap");
      assert.equal(join.panelTopBorder, "0px", "the page does not draw a second line under the sheets");

      await ideas.click();
      await page.waitForTimeout(450);
      await assertSettledSelection(notebookList, ideas);
      assert.equal(await notebook.getByRole("tabpanel").innerText(), "Ideas");

      const rail = page.locator('[data-fixture="rail"]');
      const railList = rail.getByRole("tablist");
      const railNotes = rail.getByRole("tab", { name: "Notes", exact: true });
      const railIdeas = rail.getByRole("tab", { name: "Ideas", exact: true });
      await assertSettledSelection(railList, railNotes);
      assert.equal(await railList.evaluate((node) => node.dataset.flowKind), "pill", "the rail moves its whole selected line");
      assert.equal(
        await railList.evaluate((node) => getComputedStyle(node.querySelector(":scope > .v-glide__pill > i")).backgroundColor),
        await resolvedColor(page, "--v-pink-soft"),
        "the rail's selected line is the soft pink slip",
      );
      await railNotes.focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(450);
      assert.equal(await railIdeas.getAttribute("aria-selected"), "true", "vertical arrows move the rail selection");
      await assertSettledSelection(railList, railIdeas);
      await notebook.screenshot({ path: `${output}/notebook-${mode}.png` });
      await rail.screenshot({ path: `${output}/rail-${mode}.png` });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log("PASS Notebook sheet and rail line travel, connection and keyboard checks");
  } finally {
    await browser.close();
  }
});
