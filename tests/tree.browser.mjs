import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = "output/playwright/library-integration/tree";
await mkdir(output, { recursive: true });

const css = (
  await Promise.all(
    ["tokens", "theme", "base", "icon", "tree"].map((name) =>
      readFile(`registry/cojeev/styles/${name}.css`, "utf8"),
    ),
  )
).join("\n");

const fixtureCss = `
  html { color-scheme: light; }
  html[data-mode="dark"] { color-scheme: dark; }
  body { margin: 0; background: var(--v-canvas); color: var(--v-text); font-family: var(--font-text); }
  #root { width: min(760px, calc(100vw - 32px)); margin: 16px auto; }
  .fixture-shell { display: grid; gap: 14px; min-width: 0; padding: 20px; border: 1px solid var(--v-edge); border-radius: var(--r-card); background: var(--v-paper); }
  .fixture-heading { display: grid; gap: 4px; }
  .fixture-heading span { color: var(--v-text-2); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
  .fixture-heading h2 { margin: 0; font: 500 22px/1.2 var(--font-display); }
  .fixture-heading p { margin: 0; color: var(--v-text-2); font-size: 13px; line-height: 1.55; }
  .fixture-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .fixture-actions button { min-height: 36px; padding: 0 12px; border: 1px solid var(--v-edge); border-radius: var(--r-pill); }
  .fixture-scroll { max-height: 500px; overflow: auto; border-block: 1px solid var(--v-border); padding-block: 8px; }
  .v-icon { flex: none; fill: none; stroke: currentColor; stroke-width: var(--icon-stroke); stroke-linecap: round; stroke-linejoin: round; }
`;

const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { Tree } from "./registry/cojeev/ui/tree";
      import { setMotionMode } from "./registry/cojeev/motion/settings";

      const filler = Array.from({ length: 22 }, (_, index) => ({
        id: "note-" + index,
        label: "Research note " + String(index + 1).padStart(2, "0") + ".md",
        kind: "file",
      }));

      function Fixture() {
        const [expanded, setExpanded] = React.useState([
          "workspace", "src", "deep", "empty", "failed", "loading"
        ]);
        const [selected, setSelected] = React.useState("deep-file");
        const nodes = React.useMemo(() => [
          {
            id: "workspace", label: "Workspace", kind: "folder", children: [
              {
                id: "src", label: "src", kind: "folder", children: [
                  {
                    id: "deep", label: "features/a-deliberately-long-path-that-needs-to-stay-readable", kind: "folder", truncated: true,
                    children: [{ id: "deep-file", label: "controlled-branch-ledger-with-a-long-file-name.tsx", kind: "file", trailing: <button type="button" aria-label="More actions for controlled branch ledger">•••</button> }]
                  },
                  { id: "index", label: "index.ts", kind: "file" }
                ]
              },
              { id: "readme", label: "README.md", kind: "file" }
            ]
          },
          { id: "empty", label: "Empty archive", kind: "folder", children: [] },
          { id: "loading", label: "Incoming notes", kind: "folder", status: "loading", message: "Loading supplied notes…" },
          { id: "failed", label: "Remote references", kind: "folder", status: "error", message: "References were not supplied." },
          { id: "disabled", label: "Locked record", kind: "folder", children: [], disabled: true },
          ...filler,
        ], []);

        React.useEffect(() => {
          window.selectTree = setSelected;
          window.collapseWorkspace = () => setExpanded(ids => ids.filter(id => id !== "workspace"));
          window.setTreeMotion = setMotionMode;
        }, []);

        return <section className="fixture-shell">
          <header className="fixture-heading">
            <span>Controlled disclosure list</span>
            <h2>Project branch ledger</h2>
            <p>Supplied files stay still while each branch reports its own state.</p>
          </header>
          <div className="fixture-actions">
            <button type="button" onClick={() => setExpanded(ids => ids.filter(id => id !== "workspace"))}>Collapse workspace externally</button>
          </div>
          <div className="fixture-scroll" data-testid="scroll">
            <Tree
              aria-label="Project files"
              nodes={nodes}
              expandedIds={expanded}
              selectedId={selected}
              onExpandedChange={(id, open) => {
                window.treeEvents.push(["expand", id, open]);
                setExpanded(ids => open ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
              }}
              onSelectionChange={(id) => {
                window.treeEvents.push(["select", id]);
                setSelected(id);
              }}
              onRetry={(id) => window.treeEvents.push(["retry", id])}
            />
          </div>
        </section>;
      }

      window.treeEvents = [];
      createRoot(document.getElementById("root")).render(<Fixture />);
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

async function mount(page, mode = "light", direction = "ltr") {
  await page.setContent(
    `<html data-mode="${mode}" dir="${direction}"><body><main id="root"></main></body></html>`,
  );
  await page.addStyleTag({ content: `${css}\n${fixtureCss}` });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole("list", { name: "Project files" }).waitFor();
}

async function resolvedColor(page, property) {
  return page.locator("html").evaluate((node, name) => {
    const value = getComputedStyle(node).getPropertyValue(name).trim();
    const probe = document.createElement("span");
    probe.style.color = value;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, property);
}

test("Tree keeps controlled disclosure, selection, focus and quiet behavior independent", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 760 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mount(page);
    const tree = page.getByRole("list", { name: "Project files" });
    assert.equal(
      await tree
        .locator('[role="tree"], [role="treeitem"], [role="treegrid"]')
        .count(),
      0,
    );
    assert.equal(await tree.locator(":scope > li").count(), 27);

    const emptyExpand = page.getByRole("button", {
      name: "Collapse Empty archive",
    });
    const emptyBranchId = await emptyExpand.getAttribute("aria-controls");
    await emptyExpand.click();
    assert.deepEqual(await page.evaluate(() => window.treeEvents), [
      ["expand", "empty", false],
    ]);
    assert.ok(
      (await page.locator("#" + emptyBranchId).getAttribute("hidden")) !== null,
    );
    await page.getByRole("button", { name: "Expand Empty archive" }).click();
    assert.deepEqual(
      await page.evaluate(() => window.treeEvents.slice(-1)[0]),
      ["expand", "empty", true],
    );

    const readme = page.getByRole("button", { name: "README.md", exact: true });
    await readme.click();
    assert.equal(await readme.getAttribute("aria-current"), "true");
    assert.deepEqual(
      await page.evaluate(() => window.treeEvents.slice(-1)[0]),
      ["select", "readme"],
    );

    const disabledExpand = page.getByRole("button", {
      name: "Expand Locked record",
    });
    const disabledSelect = page.getByRole("button", {
      name: "Locked record",
      exact: true,
    });
    assert.equal(await disabledExpand.isDisabled(), true);
    assert.equal(await disabledSelect.isDisabled(), true);
    const disabledInk = await resolvedColor(page, "--v-disabled-ink");
    const disabledFace = await resolvedColor(page, "--v-disabled-face");
    const disabledRow = tree.locator(
      '[data-tree-node-id="disabled"] > [data-slot="tree-row"]',
    );
    assert.equal(
      await disabledRow.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      ),
      disabledFace,
    );
    assert.equal(
      await disabledExpand.evaluate((node) => getComputedStyle(node).color),
      disabledInk,
    );
    assert.equal(
      await disabledExpand.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      ),
      "rgba(0, 0, 0, 0)",
    );
    assert.equal(
      await disabledSelect.evaluate((node) => getComputedStyle(node).color),
      disabledInk,
    );
    await disabledExpand.hover();
    assert.equal(
      await disabledExpand.evaluate((node) => getComputedStyle(node).color),
      disabledInk,
      "hover does not repaint a disabled disclosure",
    );
    assert.equal(
      await disabledExpand.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      ),
      "rgba(0, 0, 0, 0)",
      "hover does not add an active surface to a disabled disclosure",
    );
    await disabledExpand.evaluate((node) => node.focus());
    assert.equal(
      await disabledExpand.evaluate((node) => document.activeElement === node),
      false,
      "native disabled disclosure cannot receive focus",
    );

    const deepFile = page.getByRole("button", {
      name: "controlled-branch-ledger-with-a-long-file-name.tsx",
      exact: true,
    });
    await deepFile.click();
    await deepFile.focus();
    const externalCollapse = page.getByRole("button", {
      name: "Collapse workspace externally",
    });
    await externalCollapse.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[data-tree-node-id="workspace"] > [data-slot="tree-row"] [data-slot="tree-expand"]',
          )
          ?.getAttribute("aria-expanded") === "false",
    );
    assert.equal(
      await externalCollapse.evaluate(
        (node) => document.activeElement === node,
      ),
      true,
      "focus that left Tree stays on the external control",
    );

    const workspaceExpand = tree.locator(
      '[data-tree-node-id="workspace"] > [data-slot="tree-row"] [data-slot="tree-expand"]',
    );
    await workspaceExpand.press("Enter");
    await deepFile.focus();
    await page.evaluate(() => window.collapseWorkspace());
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[data-tree-node-id="workspace"] > [data-slot="tree-row"] [data-slot="tree-expand"]',
          )
          ?.getAttribute("aria-expanded") === "false",
    );
    assert.equal(
      await workspaceExpand.getAttribute("aria-label"),
      "Expand Workspace",
    );
    assert.equal(
      await workspaceExpand.evaluate((node) => document.activeElement === node),
      true,
    );
    await workspaceExpand.press("Enter");
    assert.equal(await deepFile.getAttribute("aria-current"), "true");

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    assert.deepEqual(
      await page.evaluate(() => window.treeEvents.slice(-1)[0]),
      ["retry", "failed"],
    );

    const reopenedEmpty = page.getByRole("button", {
      name: "Collapse Empty archive",
    });
    await reopenedEmpty.focus();
    await reopenedEmpty.press("Space");
    assert.deepEqual(
      await page.evaluate(() => window.treeEvents.slice(-1)[0]),
      ["expand", "empty", false],
    );
    await readme.focus();
    await readme.press("Enter");
    assert.equal(await readme.getAttribute("aria-current"), "true");

    const scroll = page.getByTestId("scroll");
    await scroll.evaluate((node) => {
      node.scrollTop = 220;
    });
    const before = await scroll.evaluate((node) => node.scrollTop);
    await page.evaluate(() => window.selectTree("note-18"));
    await page
      .getByRole("button", { name: "Research note 19.md", exact: true })
      .getAttribute("aria-current");
    assert.equal(await scroll.evaluate((node) => node.scrollTop), before);

    const firstRow = tree.locator('[data-slot="tree-row"]').first();
    assert.ok(
      (await firstRow.boundingBox()).height >= 36,
      "compact rows retain a usable target height",
    );
    assert.equal(
      await firstRow.evaluate((node) => getComputedStyle(node).display),
      "grid",
    );
    const branch = tree.locator('[data-slot="tree-branch"]').first();
    assert.ok(
      parseFloat(
        await branch.evaluate(
          (node) => getComputedStyle(node).paddingInlineStart,
        ),
      ) >= 20,
    );

    await page.evaluate(() => window.setTreeMotion("off"));
    await page.waitForFunction(
      () =>
        document.querySelector('[data-slot="tree"]')?.dataset.motionQuiet ===
        "true",
    );
    assert.equal(
      await workspaceExpand
        .locator("svg")
        .evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    await workspaceExpand.press("Space");
    assert.deepEqual(
      await page.evaluate(() => window.treeEvents.slice(-1)[0]),
      ["expand", "workspace", false],
    );
    assert.deepEqual(errors, []);
    await page.close();

    const reduced = await browser.newPage({
      viewport: { width: 520, height: 720 },
      reducedMotion: "reduce",
    });
    await mount(reduced, "dark");
    const reducedTree = reduced.getByRole("list", { name: "Project files" });
    assert.equal(await reducedTree.getAttribute("data-motion-quiet"), "true");
    assert.equal(
      await reduced
        .getByRole("button", { name: "Collapse Workspace" })
        .locator("svg")
        .evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    await reduced.close();
  } finally {
    await browser.close();
  }
});

test("Tree visual evidence covers light, dark, narrow and RTL layouts", async () => {
  const browser = await chromium.launch();
  try {
    for (const specimen of [
      {
        name: "desktop-light",
        mode: "light",
        direction: "ltr",
        width: 900,
        height: 760,
      },
      {
        name: "desktop-dark",
        mode: "dark",
        direction: "ltr",
        width: 900,
        height: 760,
      },
      {
        name: "narrow-light",
        mode: "light",
        direction: "ltr",
        width: 390,
        height: 780,
      },
      {
        name: "narrow-dark-rtl",
        mode: "dark",
        direction: "rtl",
        width: 390,
        height: 780,
      },
    ]) {
      const page = await browser.newPage({
        viewport: { width: specimen.width, height: specimen.height },
      });
      await mount(page, specimen.mode, specimen.direction);
      if (specimen.direction === "rtl") {
        const label = page.locator(
          '[data-tree-node-id="deep-file"] [data-slot="tree-label"]',
        );
        assert.equal(
          await label.evaluate((node) => getComputedStyle(node).direction),
          "ltr",
          "English file names keep their natural reading and truncation direction in RTL layout",
        );
      }
      await page
        .locator(".fixture-shell")
        .screenshot({ path: `${output}/${specimen.name}.png` });
      if (specimen.name === "desktop-light") {
        await page
          .getByRole("button", { name: "Retry", exact: true })
          .scrollIntoViewIfNeeded();
        await page
          .locator(".fixture-shell")
          .screenshot({ path: `${output}/desktop-light-error.png` });
      }
      await page.close();
    }
    console.log(`PASS Tree visual evidence written to ${output}`);
  } finally {
    await browser.close();
  }
});
