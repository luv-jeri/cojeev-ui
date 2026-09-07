import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);
const base = args.url || "http://127.0.0.1:4320/sahajiv-ui";
const main = args.checkout ? path.resolve(args.checkout) : process.cwd();
const output = path.resolve(args.output || "output/playwright/docs");
fs.mkdirSync(output, { recursive: true });
const registry = JSON.parse(
  fs.readFileSync(path.join(main, "registry.json"), "utf8"),
);
const entries = registry.items.filter(
  (entry) =>
    entry.type === "registry:ui" &&
    (!args.ids || args.ids.split(",").includes(entry.name)),
);
assert(entries.length > 0, "No registry entries matched this request");
if (args.ids) {
  const found = new Set(entries.map((entry) => entry.name));
  for (const id of args.ids.split(","))
    assert(found.has(id), `Unknown entry: ${id}`);
}
const widths = args.widths
  ? args.widths.split(",").map(Number)
  : [360, 768, 1440];
const themes = args.themes ? args.themes.split(",") : ["light", "dark"];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function revision() {
  const head = execFileSync("rtk", ["git", "-C", main, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const diff = execFileSync(
    "rtk",
    [
      "proxy",
      "git",
      "-C",
      main,
      "diff",
      "--",
      "app",
      "components",
      "registry/sahajiv",
      "next.config.ts",
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return {
    head,
    dirtyDiffSha256: createHash("sha256").update(diff).digest("hex"),
    dirty: !!diff,
  };
}
async function eventually(fn, message, timeout = 3500) {
  const until = Date.now() + timeout;
  let error;
  while (Date.now() < until) {
    try {
      if (await fn()) return;
    } catch (cause) {
      error = cause;
    }
    await wait(60);
  }
  throw new Error(`${message}${error ? ` (${error.message})` : ""}`);
}
async function text(root, value) {
  await eventually(
    async () => (await root.innerText()).includes(value),
    `Expected text: ${value}`,
  );
}
async function attribute(locator, name, value) {
  await eventually(
    async () => (await locator.getAttribute(name)) === value,
    `Expected ${name}=${value}`,
  );
}
async function key(locator, value) {
  await locator.focus();
  await locator.press(value, { delay: 60 });
}
const passive = new Set([
  "aspect-ratio",
  "avatar",
  "badge",
  "bubble",
  "card",
  "kbd",
  "label",
  "marker",
  "message",
  "separator",
  "shape",
  "skeleton",
  "spinner",
  "table",
  "typography",
]);
const tests = {
  accordion: async ({ root }) => {
    const triggers = root.locator('[data-slot="accordion-trigger"]');
    await triggers.nth(1).click();
    await attribute(triggers.nth(1), "aria-expanded", "true");
    await key(triggers.nth(1), "ArrowDown");
    assert(
      await triggers.nth(2).evaluate((el) => el === document.activeElement),
    );
    await triggers.nth(2).press("Enter");
    await attribute(triggers.nth(2), "aria-expanded", "true");
    return "Pointer expansion; arrow focus navigation and Enter expansion";
  },
  adjuster: async ({ root }) => {
    await root
      .getByRole("button", { name: "Export JSON", exact: true })
      .click();
    const input = root.getByRole("textbox", {
      name: "Exported or imported profile",
    });
    assert(JSON.parse(await input.inputValue()));
    await input.fill("{invalid");
    await key(
      root.getByRole("button", { name: "Import JSON", exact: true }),
      "Enter",
    );
    await root.getByRole("alert").waitFor();
    await root.getByRole("button", { name: "Reset morph to runtime" }).click();
    return "Pointer export, keyboard invalid import/error, reset runtime";
  },
  alert: async ({ root }) => {
    await root.getByRole("button", { name: "Dismiss", exact: true }).click();
    const restore = root.getByRole("button", { name: "Show alert again" });
    await restore.waitFor();
    await key(restore, "Enter");
    await text(root, "Your workspace is ready");
    return "Pointer dismissal and keyboard restoration";
  },
  "alert-dialog": async ({ root, page }) => {
    const trigger = root.getByRole("button", { name: "Archive example note" });
    await trigger.click();
    const dialog = page.getByRole("alertdialog");
    await dialog.waitFor();
    assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
    await page.keyboard.press("Escape");
    await eventually(
      async () => !(await dialog.count()),
      "Alert dialog closed by Escape",
    );
    await key(trigger, "Enter");
    await page
      .getByRole("button", { name: "Archive note", exact: true })
      .click();
    await text(root, "Example note archived");
    await key(root.getByRole("button", { name: "Restore note" }), "Enter");
    await text(root, "Example note is in your notebook");
    return "Pointer/keyboard opening, focus inside, Escape, confirmation and restore";
  },
  attachment: async ({ root, page }) => {
    const download = page.waitForEvent("download");
    await root.getByRole("button", { name: "Download weekly notes" }).click();
    const file = await download;
    assert.equal(file.suggestedFilename(), "weekly-notes.txt");
    await key(root.getByRole("button", { name: "Remove attachment" }), "Enter");
    await root.getByRole("button", { name: "Restore attachment" }).click();
    await text(root, "weekly-notes.txt");
    return "Real text download by pointer, keyboard removal and restoration";
  },
  breadcrumb: async ({ root, page }) => {
    const link = root.getByRole("link", { name: "Navigation", exact: true });
    await key(link, "Enter");
    await page.waitForURL(/\/docs\/sidebar\/?$/);
    return "Keyboard activation reaches Sidebar documentation";
  },
  button: async ({ root }) => {
    const b = root.getByRole("button", { name: "Add a note", exact: true });
    await b.click();
    await text(root, "1 note added");
    await key(b, "Enter");
    await text(root, "2 notes added");
    assert(
      await root
        .getByRole("button", { name: "Disabled", exact: true })
        .isDisabled(),
    );
    return "Pointer/keyboard counters; disabled state";
  },
  "button-group": async ({ root }) => {
    await root.getByRole("button", { name: "Day", exact: true }).click();
    await text(root, "2 notes today");
    await key(
      root.getByRole("button", { name: "Month", exact: true }),
      "Enter",
    );
    await text(root, "38 notes this month");
    return "Pointer and keyboard selection update content";
  },
  calendar: async ({ root }) => {
    const cells = root.getByRole("gridcell");
    assert((await cells.count()) > 0);
    const button = cells.locator("button").filter({ visible: true }).nth(10);
    await button.click();
    await text(root, "Selected:");
    const before = await root.locator('[role="status"]').innerText();
    await key(button, "ArrowRight");
    await root.page().keyboard.press("Enter");
    await eventually(
      async () =>
        (await root.locator('[role="status"]').innerText()) !== before,
      "Keyboard changes selected calendar date",
    );
    return "Pointer date selection and arrow/Enter selection";
  },
  carousel: async ({ root }) => {
    await root.getByRole("button", { name: "Next slide" }).click();
    await text(root, "Idea 2 of 4");
    await key(root.getByRole("button", { name: "Previous slide" }), "Enter");
    await text(root, "Idea 1 of 4");
    return "Pointer next and keyboard previous update active idea";
  },
  chart: async ({ root }) => {
    const b = root.getByRole("button", { name: "Show data tables" });
    await b.click();
    assert((await root.locator("table:visible").count()) === 3);
    await key(root.getByRole("button", { name: "Hide data tables" }), "Enter");
    assert((await root.locator("table:visible").count()) === 0);
    return "Pointer reveals all three data tables; keyboard hides them; zero datum retained";
  },
  checkbox: async ({ root }) => {
    const b = root.getByRole("checkbox").first();
    await b.click();
    await attribute(b, "aria-checked", "true");
    await key(b, "Space");
    await attribute(b, "aria-checked", "false");
    assert(await root.getByRole("checkbox").nth(2).isDisabled());
    return "Pointer/Space checked changes, disabled option";
  },
  collapsible: async ({ root }) => {
    const b = root.getByRole("button").first();
    await b.click();
    await attribute(b, "aria-expanded", "true");
    await key(b, "Enter");
    await attribute(b, "aria-expanded", "false");
    return "Pointer expands and keyboard collapses content";
  },
  combobox: async ({ root, page }) => {
    const input = root.getByRole("combobox");
    await input.click();
    await input.fill("Reading");
    await page.getByRole("option", { name: "Reading list" }).click();
    await text(root, "Selected collection: reading");
    await input.fill("Project");
    await input.press("ArrowDown");
    await input.press("Enter");
    await text(root, "Selected collection: ideas");
    return "Pointer filtered option and keyboard filtered option selection";
  },
  command: async ({ root }) => {
    await root.getByRole("option", { name: "Reading list" }).click();
    await text(root, "Opened your reading list");
    const input = root.getByRole("combobox");
    await input.fill("Archive");
    await input.press("ArrowDown");
    await input.press("Enter");
    await text(root, "Showing archived notes");
    return "Pointer action and keyboard search/action";
  },
  "context-menu": async ({ root, page }) => {
    const target = root.getByLabel("Example note context menu");
    await target.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await text(root, "copy of the example note");
    await key(target, "Shift+F10");
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("Escape");
    return "Pointer context menu action and keyboard context menu/Escape";
  },
  "data-table": async ({ root }) => {
    assert.equal(
      await root.getByRole("button", { name: /^All / }).count(),
      1,
      "Exactly one All filter",
    );
    await root.getByRole("button", { name: /^Ready / }).click();
    assert.equal(await root.locator("tbody tr").count(), 3);
    await key(root.getByRole("button", { name: /^Draft / }), "Enter");
    assert.equal(await root.locator("tbody tr").count(), 2);
    await root.getByRole("button", { name: /^All / }).click();
    const words = root.getByRole("button", { name: /Words/ });
    await words.click();
    await attribute(
      root.locator("th").filter({ hasText: "Words" }),
      "aria-sort",
      "ascending",
    );
    assert(
      (await root.locator("tbody tr").first().innerText()).includes(
        "Weekend plan",
      ),
    );
    await key(root.getByRole("button", { name: "Next", exact: true }), "Enter");
    assert.equal(await root.locator("tbody tr").count(), 2);
    await root.locator("tbody tr").first().click();
    await text(root, "Selected note:");
    return "Pointer and keyboard filters, numeric ascending sort, next page and row selection";
  },
  "date-picker": async ({ root, page }) => {
    const trigger = root.getByRole("button", {
      name: "Choose a reflection date",
    });
    await trigger.click();
    await page.getByRole("grid").waitFor();
    const buttons = page.getByRole("gridcell").locator("button");
    await buttons.nth(12).click();
    await text(root, "Reflection date:");
    await key(trigger, "Enter");
    await page.getByRole("grid").waitFor();
    await page.keyboard.press("Escape");
    await eventually(
      () => trigger.evaluate((el) => el === document.activeElement),
      "Focus returns to trigger",
    );
    return "Pointer date selection; keyboard opening/Escape/focus return";
  },
  dialog: async ({ root, page }) => {
    const trigger = root.getByRole("button", { name: "Rename workspace" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
    await page
      .getByRole("textbox", { name: "Workspace name" })
      .fill("QA notebook");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await text(root, "Workspace: QA notebook");
    await eventually(
      () => trigger.evaluate((el) => el === document.activeElement),
      "Focus returns to trigger",
    );
    await key(trigger, "Enter");
    await page.keyboard.press("Escape");
    await eventually(
      async () => !(await dialog.count()),
      "Dialog closes on Escape",
    );
    await eventually(
      () => trigger.evaluate((el) => el === document.activeElement),
      "Focus returns to trigger",
    );
    return "Pointer rename/save; focus entry and restoration; keyboard opening/Escape";
  },
  direction: async ({ root }) => {
    const b = root.getByRole("button", { name: /Direction:/ });
    await b.click();
    await attribute(root.locator('[data-slot="direction"]'), "dir", "ltr");
    await key(b, "Enter");
    await attribute(root.locator('[data-slot="direction"]'), "dir", "rtl");
    return "Pointer/keyboard direction switching";
  },
  drawer: async ({ root, page }) => {
    const b = root.getByRole("button", { name: "Open daily reflection" });
    await b.click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Done for now" }).click();
    await key(b, "Enter");
    await page.keyboard.press("Escape");
    await eventually(
      async () => !(await page.getByRole("dialog").count()),
      "Drawer closes on Escape",
    );
    return "Pointer open/close and keyboard open/Escape";
  },
  "dropdown-menu": async ({ root, page }) => {
    const b = root.getByRole("button", { name: "Note actions" });
    await b.click();
    await page.getByRole("menuitemcheckbox", { name: "Pin note" }).click();
    await text(root, "Note pinned");
    await key(b, "ArrowDown");
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("Escape");
    return "Pointer checked item; keyboard menu opening/Escape";
  },
  dropzone: async ({ root, page }) => {
    const zone = root.locator('[data-slot="dropzone"]');
    const choose = page.waitForEvent("filechooser");
    await zone.click();
    const chooser = await choose;
    await chooser.setFiles({
      name: "docs-qa.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Local QA file"),
    });
    await text(root, "1 file selected");
    await text(root, "docs-qa.txt");
    const choose2 = page.waitForEvent("filechooser");
    await key(zone, "Enter");
    await (
      await choose2
    ).setFiles([
      { name: "a.md", mimeType: "text/markdown", buffer: Buffer.from("A") },
      { name: "b.pdf", mimeType: "application/pdf", buffer: Buffer.from("B") },
    ]);
    await text(root, "2 files selected");
    return "Pointer/keyboard file picker with one and two real callback files";
  },
  empty: async ({ root }) => {
    await root.getByRole("button", { name: "Create a note" }).click();
    await text(root, "Your first note");
    await key(root.getByRole("button", { name: "Reset example" }), "Enter");
    await text(root, "Room for your first idea");
    return "Pointer note creation; keyboard reset; partial/error/filtered states rendered";
  },
  field: async ({ page }) => {
    const root = page.locator('[data-example="field"][data-variant="invalid"]');
    const input = root.getByRole("textbox");
    await attribute(input, "aria-invalid", "true");
    await input.click();
    await input.fill("Valid name");
    await eventually(
      async () => (await input.getAttribute("aria-invalid")) !== "true",
      "Valid field clears invalid state",
    );
    await input.press("ControlOrMeta+A");
    await input.press("Backspace");
    await attribute(input, "aria-invalid", "true");
    assert(await input.getAttribute("aria-describedby"));
    return "Pointer edits clear invalid state; keyboard empty input restores linked error";
  },
  "hover-card": async ({ root, page }) => {
    const b = root.getByRole("button", { name: "About this notebook" });
    await b.hover();
    await page.locator('[data-slot="hover-card-content"]').waitFor();
    await page.mouse.move(0, 0);
    await key(b, "Tab");
    await b.focus();
    await page.locator('[data-slot="hover-card-content"]').waitFor();
    await page.keyboard.press("Escape");
    return "Pointer hover and keyboard focus show card; Escape dismisses";
  },
  icon: async ({ root }) => {
    const input = root.getByRole("textbox", { name: "Filter icons" });
    await input.click();
    await input.fill("settings");
    await text(root, "1 glyphs");
    await input.press("ControlOrMeta+A");
    await input.press("Backspace");
    assert((await root.locator('svg[data-slot="icon"]').count()) > 1);
    return "Pointer/keyboard icon-name filtering and reset";
  },
  input: async ({ root }) => {
    const input = root.getByRole("textbox", { name: "Find a note" });
    await input.click();
    await input.fill("QA note");
    await text(root, "Searching for “QA note”");
    await key(root.getByRole("button", { name: /Clear/ }), "Enter");
    assert.equal(await input.inputValue(), "");
    return "Pointer input change and keyboard clear action";
  },
  "input-group": async ({ root }) => {
    const input = root.getByRole("textbox", { name: "Workspace address" });
    await input.fill("qa-space");
    await root.getByRole("button", { name: "Save", exact: true }).click();
    await text(root, "notes / qa-space");
    await input.fill("second-space");
    await key(root.getByRole("button", { name: "Save", exact: true }), "Enter");
    await text(root, "notes / second-space");
    return "Pointer and keyboard saving update the displayed address";
  },
  "input-otp": async ({ root }) => {
    const input = root.getByRole("textbox", { name: "Six digit example code" });
    await input.click();
    await input.pressSequentially("123456");
    await text(root, "Complete: 123456");
    await input.press("Backspace");
    await text(root, "5 of 6 digits entered");
    return "Pointer focus, digit entry, completion and keyboard deletion";
  },
  item: async ({ root }) => {
    const items = root.getByRole("button");
    await items.nth(1).click();
    await text(root, "Selected: Reading list");
    await key(items.nth(2), "Enter");
    await text(root, "Selected: Weekend ideas");
    return "Pointer and keyboard selection callbacks";
  },
  menubar: async ({ root, page }) => {
    await root.getByRole("menuitem", { name: "Notebook", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await text(root, "Example notebook renamed");
    await key(
      root.getByRole("menuitem", { name: "View", exact: true }),
      "ArrowDown",
    );
    await page
      .getByRole("menuitemcheckbox", { name: "Compact view" })
      .press("Enter");
    await text(root, "Compact view on");
    return "Pointer menu action and keyboard checked menu item";
  },
  "message-scroller": async ({ root }) => {
    const viewport = root.locator('[data-slot="message-scroller"]');
    for (let i = 0; i < 5; i++)
      await root.getByRole("button", { name: "Add a message" }).click();
    const before = await root.locator('[data-slot="message"]').count();
    await key(root.getByRole("button", { name: "Add a message" }), "Enter");
    assert.equal(
      await root.locator('[data-slot="message"]').count(),
      before + 1,
    );
    await viewport.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll"));
    });
    await root.getByRole("button", { name: "Add a message" }).click();
    await root.getByRole("button", { name: /latest/i }).click();
    await eventually(
      () =>
        viewport.evaluate(
          (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 30,
        ),
      "Jump reaches latest",
    );
    return "Pointer/keyboard append, detached scrolling and jump to latest";
  },
  "native-select": async ({ root, page }) => {
    const select = root.getByRole("combobox");
    await select.selectOption("daily");
    await text(root, "daily reflection");
    await key(select, "ArrowDown");
    await select.press("Enter", { delay: 60 });
    if ((await select.inputValue()) === "weekly") {
      await text(root, "weekly reflection");
      return "Native selection and keyboard selection update receipt";
    }
    const control = await page.context().newPage();
    try {
      await control.setContent(
        '<select aria-label="Bare native control"><option value="daily">Daily</option><option value="weekly">Weekly</option></select>',
      );
      const bare = control.getByRole("combobox");
      await bare.selectOption("daily");
      await key(bare, "ArrowDown");
      await bare.press("Enter", { delay: 60 });
      assert.equal(
        await bare.inputValue(),
        "daily",
        "Bare native keyboard works; component keyboard requires investigation",
      );
    } finally {
      await control.close();
    }
    return {
      status: "limited",
      detail:
        "Native selectOption updates the callback receipt. Native picker keyboard selection is unverified on this headless macOS Chromium platform; ArrowDown/Enter also failed on a separate bare unstyled select.",
    };
  },
  "navigation-menu": async ({ root }) => {
    await root.getByRole("link", { name: /Ideas/ }).click();
    await text(root, "Collection: Ideas");
    await key(root.getByRole("link", { name: /Reading/ }), "Enter");
    await text(root, "Collection: Reading");
    return "Pointer and keyboard collection navigation";
  },
  pagination: async ({ root }) => {
    await root.getByRole("button", { name: "Next", exact: true }).click();
    await text(root, "Notebook page 2");
    await key(
      root.getByRole("button", { name: "Previous", exact: true }),
      "Enter",
    );
    await text(root, "Notebook page 1");
    return "Pointer next and keyboard previous update page content";
  },
  popover: async ({ root, page }) => {
    const b = root.getByRole("button", { name: /Label:/ });
    await b.click();
    await page.getByRole("textbox", { name: "Note label" }).fill("QA label");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await text(root, "Label: QA label");
    await key(b, "Enter");
    await page.keyboard.press("Escape");
    return "Pointer edit and keyboard opening/Escape";
  },
  preview: async ({ root }) => {
    const p = root.locator('[data-slot="preview"]').first();
    await p.getByRole("tab", { name: "Code", exact: true }).click();
    await p.locator("pre").waitFor();
    await key(p.getByRole("tab", { name: "Preview", exact: true }), "Enter");
    await p.getByRole("button", { name: "Add a note" }).waitFor();
    return "Nested preview pointer code tab and keyboard preview tab";
  },
  progress: async ({ root }) => {
    const meter = root.getByRole("progressbar");
    await root.getByRole("button", { name: "Increase", exact: true }).click();
    await attribute(meter, "aria-valuenow", "55");
    await key(
      root.getByRole("button", { name: "Decrease", exact: true }),
      "Enter",
    );
    await attribute(meter, "aria-valuenow", "45");
    return "Pointer and keyboard progress changes";
  },
  questionnaire: async ({ root }) => {
    await root.getByText("Learning", { exact: true }).click();
    await text(root, "1 of 2");
    const radio = root.getByRole("radio").nth(3);
    await key(radio, "Space");
    await text(root, "Learning · a little every day");
    assert(await radio.isChecked());
    return "Pointer and keyboard answers update completion and summary";
  },
  "radio-group": async ({ root }) => {
    const group = root.getByRole("radiogroup", {
      name: "Reflection frequency",
    });
    const daily = group.getByRole("radio", { name: "Every day" });
    const weekly = group.getByRole("radio", { name: "Every week" });
    await weekly.click();
    await text(root, "Selected schedule: weekly");
    await key(weekly, "ArrowUp");
    await text(root, "Selected schedule: daily");
    assert(await daily.isChecked());
    return "Pointer selection and arrow-key radio selection";
  },
  resizable: async ({ root, page }) => {
    const panel = root.locator('[data-slot="resizable-panel"]').first();
    const handle = root.getByRole("separator");
    const before = (await panel.boundingBox()).width;
    await key(handle, "ArrowRight");
    await eventually(
      async () => Math.abs((await panel.boundingBox()).width - before) > 2,
      "Keyboard resize changes panel width",
    );
    const box = await handle.boundingBox();
    const after = (await panel.boundingBox()).width;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await eventually(
      async () => Math.abs((await panel.boundingBox()).width - after) > 2,
      "Pointer drag resizes panel",
    );
    return "Keyboard handle resize and pointer drag";
  },
  "scroll-area": async ({ root, page }) => {
    const viewport = root.locator("[data-radix-scroll-area-viewport]");
    await viewport.hover();
    await page.mouse.wheel(0, 450);
    await eventually(
      () => viewport.evaluate((el) => el.scrollTop > 0),
      "Pointer wheel scrolls area",
    );
    await viewport.focus();
    const before = await viewport.evaluate((el) => el.scrollTop);
    await page.keyboard.press("PageDown");
    await eventually(
      () => viewport.evaluate((el) => el.scrollTop).then((y) => y > before),
      "Keyboard scrolls area",
    );
    return "Pointer wheel and keyboard PageDown scrolling";
  },
  select: async ({ root, page }) => {
    const b = root.getByRole("combobox");
    await b.click();
    await page.getByRole("option", { name: "Every day", exact: true }).click();
    await text(root, "Selected: daily");
    await key(b, "ArrowDown");
    await page
      .getByRole("option", { name: "Every day", exact: true })
      .waitFor();
    await page.keyboard.press("ArrowDown");
    await eventually(
      () =>
        page
          .getByRole("option", { name: "Every week", exact: true })
          .evaluate((el) => el === document.activeElement),
      "Focus moves to next option",
    );
    await page.keyboard.press("Enter");
    await text(root, "Selected: weekly");
    return "Pointer and keyboard option selection";
  },
  sheet: async ({ root, page }) => {
    const b = root.getByRole("button", { name: "Workspace preferences" });
    await b.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("switch").click();
    await text(dialog, "Daily reflections are off");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await key(b, "Enter");
    await page.keyboard.press("Escape");
    return "Pointer preference toggle and keyboard opening/Escape";
  },
  sidebar: async ({ root }) => {
    const rail = root.locator('[data-slot="sidebar"]');
    await root.getByRole("link", { name: "Ideas", exact: true }).click();
    await text(root, "Ideas");
    await key(root.getByRole("button", { name: "Collapse the rail" }), "Enter");
    await attribute(rail, "data-state", "collapsed");
    await root.getByRole("link", { name: "Archive", exact: true }).click();
    await root.getByRole("button", { name: "Expand the rail" }).click();
    await attribute(rail, "data-state", "expanded");
    return "Pointer navigation, keyboard collapse, collapsed accessible link and expansion";
  },
  slider: async ({ root }) => {
    const slider = root.getByRole("slider");
    await slider.click();
    const before = await slider.getAttribute("aria-valuenow");
    await key(slider, "ArrowRight");
    await eventually(
      async () => (await slider.getAttribute("aria-valuenow")) !== before,
      "Keyboard changes slider",
    );
    return "Pointer slider placement and arrow-key increment";
  },
  stepper: async ({ root }) => {
    const next = root.getByRole("button", { name: "Next", exact: true });
    await next.click();
    await text(root, "Preferences");
    await key(next, "Enter");
    await text(root, "Your example workspace is ready");
    assert(await next.isDisabled());
    await root.getByRole("button", { name: "Back", exact: true }).click();
    await text(root, "Keep a little room for curiosity");
    return "Pointer/keyboard forward steps, final disabled boundary and back";
  },
  switch: async ({ root }) => {
    const b = root.getByRole("switch").first();
    await b.click();
    await text(root, "Daily reflection is on");
    await key(b, "Space");
    await text(root, "Daily reflection is off");
    assert(await root.getByRole("switch").nth(1).isDisabled());
    return "Pointer/Space changes and disabled state";
  },
  tabs: async ({ root }) => {
    await root.getByRole("tab", { name: "Ideas", exact: true }).click();
    await text(root, "8 ideas taking shape");
    await key(
      root.getByRole("tab", { name: "Ideas", exact: true }),
      "ArrowRight",
    );
    await text(root, "4 things to read");
    return "Pointer tab and arrow-key tab activate matching content";
  },
  textarea: async ({ root }) => {
    const input = root.getByRole("textbox");
    await input.click();
    await input.fill("A useful QA thought");
    await key(root.getByRole("button", { name: "Keep note" }), "Enter");
    await text(root, "Saved in this example");
    await text(root, "A useful QA thought");
    assert.equal(await input.inputValue(), "");
    return "Pointer composition and keyboard save render local note and clear input";
  },
  toast: async ({ root, page }) => {
    const b = root.getByRole("button", { name: "Save example note" });
    await b.click();
    await page.getByText("Note kept", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await text(root, "No example note saved");
    await key(b, "Enter");
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    return "Pointer save/undo; keyboard save and explicit dismissal";
  },
  toggle: async ({ root }) => {
    const b = root.getByRole("button", { name: "Pin note", exact: true });
    await b.click();
    await attribute(b, "aria-pressed", "true");
    await key(b, "Space");
    await attribute(b, "aria-pressed", "false");
    return "Pointer and Space pressed-state changes";
  },
  "toggle-group": async ({ root }) => {
    const italic = root.getByRole("button", { name: "Italic", exact: true });
    await italic.click();
    await attribute(italic, "aria-pressed", "true");
    const underline = root.getByRole("button", {
      name: "Underline",
      exact: true,
    });
    await key(underline, "Space");
    await attribute(underline, "aria-pressed", "true");
    assert(
      await root
        .locator('[data-slot="typography-body"]')
        .evaluate((el) => getComputedStyle(el).fontStyle === "italic"),
    );
    return "Pointer and keyboard toggles change actual text formatting";
  },
  tooltip: async ({ root, page }) => {
    const b = root.getByRole("button", { name: "Keyboard shortcut hint" });
    await b.hover();
    await page.getByRole("tooltip").waitFor();
    await page.mouse.move(0, 0);
    await b.focus();
    await page.getByRole("tooltip").waitFor();
    await page.keyboard.press("Escape");
    return "Pointer hover and keyboard focus reveal tooltip; Escape dismisses";
  },
};

async function sharedPreview(page, id) {
  const p = page.locator('[data-slot="preview"]').first();
  await p
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  await text(p, "Copied to clipboard.");
  assert(
    (await page.evaluate(() => navigator.clipboard.readText())).includes(
      "export default function Demo",
    ),
  );
  const code = p.getByRole("tab", { name: "Code", exact: true }).first();
  await key(code, "Enter");
  await p.locator("pre").first().waitFor();
  await p.getByRole("tab", { name: "Preview", exact: true }).first().click();
  await p.locator(`[data-example="${id}"]`).first().waitFor();
  return "Pointer copy and preview tab; keyboard Code tab; actual clipboard verified";
}
async function chromeCheck(page, width) {
  const ready = page.locator('[data-slot="preview"]').first();
  await ready.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
  await ready.getByRole("tab", { name: "Code", exact: true }).first().click();
  await ready.locator("pre").first().waitFor();
  await ready
    .getByRole("tab", { name: "Preview", exact: true })
    .first()
    .click();
  if (width < 850)
    await page.getByRole("button", { name: "Browse components" }).click();
  const filter = page.getByRole("searchbox", { name: "Find a component" });
  await filter.fill("questionnaire");
  await eventually(
    async () =>
      (await page
        .locator('.docs-navigation [data-slot="sidebar-menu-button"]')
        .count()) === 1,
    "Component filter settles to one result",
  );
  await filter.fill("");
  const theme = page.getByRole("combobox", { name: "Appearance" });
  const current = await theme.inputValue();
  await theme.selectOption(current === "light" ? "dark" : "light");
  await eventually(
    () =>
      page
        .locator("html")
        .getAttribute("data-mode")
        .then((v) => v !== current),
    "Theme changes document",
  );
  await theme.selectOption(current);
  if (width < 850) {
    await key(page.getByRole("button", { name: "Close navigation" }), "Enter");
    assert(!(await filter.isVisible()));
  }
  return "Filter, appearance and mobile keyboard close (where applicable)";
}
const run = {
  started: new Date().toISOString(),
  url: base,
  revisionStart: revision(),
  entries: [],
  chrome: [],
  scope: {
    widths,
    themes,
    componentBehaviors: "1440/light (or first requested context)",
    screenshots:
      "first live example at each viewport/theme; full page at primary context",
  },
};
const browser = await chromium.launch({ headless: true });
const contexts = [];
try {
  for (const width of widths)
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
        permissions: ["clipboard-read", "clipboard-write"],
        acceptDownloads: true,
      });
      await context.addInitScript(
        ({ theme }) => {
          localStorage.setItem("sahajiv-docs-theme", theme);
        },
        { theme },
      );
      const page = await context.newPage();
      page.setDefaultTimeout(6000);
      const errors = [];
      page.on("pageerror", (error) =>
        errors.push({ type: "pageerror", message: error.message }),
      );
      page.on("console", (message) => {
        if (message.type() === "error")
          errors.push({ type: "console", message: message.text() });
      });
      contexts.push({ context, page, width, theme, errors });
    }
  for (const entry of args["chrome-only"] ? [] : entries) {
    const record = {
      id: entry.name,
      baseComponent: entry.meta.baseComponent,
      revision: revision(),
      layouts: [],
      behavior: null,
      preview: null,
    };
    run.entries.push(record);
    for (const surface of contexts) {
      const { page, width, theme, errors } = surface;
      errors.length = 0;
      const layout = { width, theme };
      record.layouts.push(layout);
      try {
        const response = await page.goto(`${base}/docs/${entry.name}/`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        assert.equal(response.status(), 200);
        await page
          .locator(`[data-example="${entry.name}"]`)
          .first()
          .waitFor({ timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const readiness = page.locator('[data-slot="preview"]').first();
        await readiness.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
        await readiness
          .getByRole("tab", { name: "Code", exact: true })
          .first()
          .click();
        await readiness.locator("pre").first().waitFor();
        await readiness
          .getByRole("tab", { name: "Preview", exact: true })
          .first()
          .click();
        await readiness.locator("[data-example]").first().waitFor();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await eventually(
          () =>
            page
              .locator("html")
              .getAttribute("data-mode")
              .then((v) => v === theme),
          "Expected theme",
        );
        await page.evaluate(async () => {
          const finite = document
            .getAnimations()
            .filter((animation) =>
              Number.isFinite(animation.effect?.getComputedTiming().endTime),
            );
          await Promise.race([
            Promise.all(
              finite.map((animation) => animation.finished.catch(() => {})),
            ),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        });
        layout.metrics = await page.evaluate(() => {
          const d = document.documentElement;
          const examples = [...document.querySelectorAll("[data-example]")].map(
            (el) => ({
              variant: el.getAttribute("data-variant"),
              size: el.getAttribute("data-size"),
              width: Math.round(el.getBoundingClientRect().width),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
            }),
          );
          const emptyNames = [
            ...document.querySelectorAll(
              "[data-example] button,[data-example] input,[data-example] select,[data-example] textarea",
            ),
          ]
            .filter(
              (el) =>
                !el.closest("[hidden]") &&
                el.getBoundingClientRect().width > 0 &&
                !el.getAttribute("aria-label") &&
                !el.getAttribute("aria-labelledby") &&
                !el.textContent.trim() &&
                !(
                  el.id &&
                  document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
                ) &&
                !el.closest("label"),
            )
            .map((el) => ({
              tag: el.tagName,
              slot: el.getAttribute("data-slot"),
              type: el.getAttribute("type"),
            }));
          return {
            viewport: innerWidth,
            documentWidth: d.scrollWidth,
            overflow: d.scrollWidth > innerWidth + 1,
            examples,
            emptyNames,
          };
        });
        layout.expectedCombinations =
          [...new Set(["default", ...entry.meta.source.variants])].length *
          [...new Set(["default", ...entry.meta.source.sizes])].length;
        assert.equal(
          layout.metrics.examples.length,
          layout.expectedCombinations,
        );
        await page
          .locator('[data-slot="preview"]')
          .first()
          .evaluate((el) =>
            window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 24),
          );
        layout.screenshot = `${entry.name}-${width}-${theme}.png`;
        await page.screenshot({
          caret: "initial",
          path: path.join(output, layout.screenshot),
        });
        if (width === 1440 && theme === "light") {
          layout.fullPageScreenshot = `${entry.name}-full.png`;
          await page.screenshot({
            caret: "initial",
            path: path.join(output, layout.fullPageScreenshot),
            fullPage: true,
          });
        }
        layout.errors = [...errors];
        layout.status =
          layout.metrics.overflow || layout.errors.length ? "issue" : "pass";
      } catch (error) {
        layout.status = "failed";
        layout.error = error.message;
        layout.errors = [...errors];
        await page
          .screenshot({
            caret: "initial",
            path: path.join(
              output,
              `${entry.name}-${width}-${theme}-failure.png`,
            ),
          })
          .catch(() => {});
      }
    }
    const primary =
      contexts.find((c) => c.width === 1440 && c.theme === "light") ||
      contexts[0];
    const { page } = primary;
    try {
      if (!page.url().includes(`/docs/${entry.name}/`))
        await page.goto(`${base}/docs/${entry.name}/`);
      record.preview = {
        status: "pass",
        detail: await sharedPreview(page, entry.name),
      };
    } catch (error) {
      record.preview = { status: "failed", detail: error.message };
    }
    try {
      const root = page.locator(
        `[data-example="${entry.name}"][data-variant="default"][data-size="default"]`,
      );
      await root.waitFor();
      if (tests[entry.name]) {
        const outcome = await tests[entry.name]({ page, root, entry });
        record.behavior =
          typeof outcome === "string"
            ? { status: "pass", detail: outcome }
            : outcome;
      } else if (passive.has(entry.name))
        record.behavior = {
          status: "passive",
          detail:
            "Static content; no component-owned interaction. Shared Preview controls tested independently.",
        };
      else throw new Error("No explicit component behavior case");
    } catch (error) {
      record.behavior = { status: "failed", detail: error.message };
      await page
        .screenshot({
          caret: "initial",
          path: path.join(output, `${entry.name}-behavior-failure.png`),
        })
        .catch(() => {});
    }
    record.runtimeErrors = [...primary.errors];
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(run, null, 2),
    );
    console.log(
      JSON.stringify({
        id: entry.name,
        layouts: record.layouts.map((l) => `${l.width}/${l.theme}:${l.status}`),
        preview: record.preview.status,
        behavior: record.behavior.status,
        detail: record.behavior.detail,
      }),
    );
  }
  for (const surface of contexts) {
    try {
      await surface.page.goto(`${base}/docs/button/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      run.chrome.push({
        width: surface.width,
        theme: surface.theme,
        status: "pass",
        detail: await chromeCheck(surface.page, surface.width),
      });
    } catch (error) {
      run.chrome.push({
        width: surface.width,
        theme: surface.theme,
        status: "failed",
        detail: error.message,
      });
    }
  }
} finally {
  run.ended = new Date().toISOString();
  run.revisionEnd = revision();
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(run, null, 2),
  );
  await browser.close();
}
const failures = run.entries.filter(
  (e) =>
    e.layouts.some((l) => l.status !== "pass") ||
    e.preview.status !== "pass" ||
    e.behavior.status === "failed" ||
    e.runtimeErrors.length,
);
console.log(
  JSON.stringify(
    {
      entries: run.entries.length,
      layoutCases: run.entries.reduce((n, e) => n + e.layouts.length, 0),
      failures: failures.map((e) => e.id),
      chrome: run.chrome,
      output,
    },
    null,
    2,
  ),
);
if (failures.length || run.chrome.some((c) => c.status !== "pass"))
  process.exitCode = 1;
