import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { preview as startPreview } from "vite";
import { createReferenceTests } from "./docs-behaviors-reference.mjs";
import { createEffectTests } from "./docs-behaviors-effects.mjs";
import { createDetailTests } from "./docs-behaviors-details.mjs";
import { createCompositeTests } from "./docs-behaviors-composites.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);
const staticServer = args.serve ? await startPreview({
  configFile: false,
  base: "/sahajiv-ui/",
  build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = args.url || `http://127.0.0.1:${staticServer ? staticServer.httpServer.address().port : 4320}/sahajiv-ui`;
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
  const head = execFileSync("git", ["-C", main, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const diff = execFileSync(
    "git",
    [
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
  "skeleton",
  "spinner",
  "table",
  "typography",
]);
const tests = {
  ...createReferenceTests(),
  shape: async ({root}) => {
    await root.getByRole("button",{name:"Morph to cloud-3",exact:true}).click();
    await root.getByRole("img",{name:"Selected shape: cloud-3",exact:true}).waitFor();
    await key(root.getByRole("button",{name:"Morph to pebble-tall",exact:true}),"Enter");
    await root.getByRole("img",{name:"Selected shape: pebble-tall",exact:true}).waitFor();
    await root.getByRole("button",{name:"Olive",exact:true}).click();
    await attribute(root.getByRole("button",{name:"Olive",exact:true}),"aria-pressed","true");
    await root.getByRole("button",{name:"Use outline",exact:true}).click();
    await root.getByRole("button",{name:"Use solid fill",exact:true}).waitFor();
    return "Pointer/keyboard silhouette selection, palette state and outline mode; interpolation covered by motion gate";
  },
  "chart-tooltip": async ({root}) => {
    await root.getByRole("button",{name:"Morning",exact:true}).hover();
    await text(root.getByRole("tooltip"),"Notes kept");
    await root.getByRole("button",{name:"Evening",exact:true}).focus();
    await text(root.getByRole("tooltip"),"Evening");
    await root.getByRole("button",{name:"Evening",exact:true}).press("Escape");
    await root.getByRole("tooltip").waitFor({state:"hidden"});
    return "Pointer and keyboard contextual values; Escape dismisses tooltip";
  },
  "theme-toggle": async ({root})=>{
    const toggle=root.getByRole("switch",{name:"Dark appearance"});
    await toggle.click();await attribute(toggle,"aria-checked","true");await text(root,"Selected appearance: dark");
    await key(toggle,"Space");await attribute(toggle,"aria-checked","false");await text(root,"Selected appearance: light");
    return "Pointer and keyboard theme callback; morphing switch exposes checked state";
  },
  "animated-icon": async ({root,page})=>{
    await root.getByRole("searchbox",{name:"Find an icon",exact:true}).fill("loader");
    const loader=root.locator('[data-icon-option="loader"]');
    const icon=loader.locator('[data-slot="animated-icon"]');
    await loader.click();await attribute(loader,"aria-pressed","true");
    await attribute(icon,"data-animated","true");
    await root.getByRole("button",{name:"Release selection",exact:true}).click();
    await attribute(loader,"aria-pressed","false");
    await key(loader,"Enter");await attribute(loader,"aria-pressed","true");
    await root.getByRole("button",{name:"Disable actions",exact:true}).click();
    assert(await loader.isDisabled());await text(root,"Actions disabled.");
    await eventually(()=>icon.getAttribute("data-animated").then(value=>value!=="true"),"Disabled action cancels icon motion");
    await root.getByRole("button",{name:"Enable actions",exact:true}).click();
    const wasReduced=await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
    try{await page.emulateMedia({reducedMotion:"reduce"});await eventually(()=>icon.getAttribute("data-animated").then(value=>value!=="true"),"Reduced motion settles an explicitly selected icon");}
    finally{await page.emulateMedia({reducedMotion:wasReduced?"reduce":"no-preference"});}
    return "Search, pointer/keyboard selection and release, disabled lifecycle and reduced-motion settling";
  },
  presence: async ({root})=>{
    await root.getByRole("button",{name:"Hide result",exact:true}).click();
    await text(root,"A little room for what is next");
    await eventually(()=>root.getByText("Your result is ready",{exact:true}).count().then(n=>n===0),"Old content removed after exit");
    await key(root.getByRole("button",{name:"Show result",exact:true}),"Enter");
    await text(root,"Your result is ready");
    return "Actual keyed removal and replacement complete with pointer and keyboard";
  },
  "agent-state": async ({root}) => {
    const state=root.locator('[data-slot="agent-state"]');
    await root.getByRole("button",{name:"Thinking",exact:true}).click();
    await attribute(state,"data-status","thinking");
    await key(root.getByRole("button",{name:"Error",exact:true}),"Enter");
    await attribute(state,"data-status","error");
    await text(root,"Something interrupted this step");
    await key(root.getByRole("button",{name:"Complete",exact:true}),"Space");
    await attribute(state,"data-status","complete");
    return "Pointer and keyboard state changes retain named status and recovery description";
  },
  "agent-chat": async ({root,page}) => {
    const reset=()=>root.getByRole("button",{name:"Reset demo",exact:true}).click();
    const draft=root.getByRole("textbox",{name:"Message SahaJiv"});
    const allow=async()=>{await root.getByRole("button",{name:"Allow once",exact:true}).click();await root.getByRole("button",{name:"Continue",exact:true}).click()};
    await draft.fill("A useful next step");
    await draft.press("ControlOrMeta+Enter");
    await root.getByRole("button",{name:"Allow once",exact:true}).waitFor();
    await root.getByRole("button",{name:"Deny",exact:true}).click();
    await text(root,"Permission denied. I did not use the selected context.");
    assert.equal(await root.getByRole("button",{name:"Allow once",exact:true}).count(),0);
    await reset();
    await draft.fill("Keep this conversation");
    await root.getByRole("button",{name:"Send message",exact:true}).click();
    await root.getByRole("button",{name:"Stop generation",exact:true}).click();
    await text(root,"Stopped. This demo did not read or change any files.");
    await page.waitForTimeout(1500);
    assert.equal(await root.getByRole("button",{name:"Allow once",exact:true}).count(),0,"Cancelled timer must not reopen permission");
    await reset();
    const chooser=page.waitForEvent("filechooser");
    await root.getByRole("button",{name:"Attach files",exact:true}).click();
    await (await chooser).setFiles({name:"outline.md",mimeType:"text/markdown",buffer:Buffer.from("Local example")});
    await text(root,"outline.md");
    await root.getByRole("button",{name:/Remove.*outline/}).click();
    await root.getByRole("button",{name:"Try an error",exact:true}).click();
    await allow();
    await text(root,"Demo interruption. Your request is saved");
    await key(root.getByRole("button",{name:"Retry",exact:true}),"Enter");
    await allow();
    await text(root,"Your sample brief is ready.");
    await text(root,"Ready to review");
    return "Keyboard send; explicit deny; Stop cancels timers; attach/remove; error and retry reach a sample result";
  },
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
    await text(root, "Running the local example…");
    assert(await root.getByRole("button", { name: "Adding…", exact: true }).isDisabled());
    await text(root, "1 note added in this example.");
    await root.getByLabel("Example outcome").selectOption("error");
    await key(b, "Enter");
    await text(root, "The example action failed.");
    await root.getByLabel("Example outcome").selectOption("success");
    await key(root.getByRole("button", { name: "Retry example" }), "Enter");
    await text(root, "2 notes added in this example.");
    assert(await root.getByRole("button", { name: "Disabled", exact: true }).isDisabled());
    return "Pointer loading, disabled pending state, keyboard failure and retry";
  },
  "animated-number": async ({ root, page }) => {
    const visual = root.locator('[data-slot="animated-number"] [aria-hidden]');
    await visual.evaluate(el => {
      window.__numberSamples = [];
      window.__numberObserver = new MutationObserver(() => window.__numberSamples.push({text:el.textContent,value:Number(el.textContent.replaceAll(",", "")),time:performance.now()}));
      window.__numberObserver.observe(el, {childList:true,subtree:true,characterData:true});
    });
    await root.getByRole("button", { name: "Add 125" }).click();
    await text(root, "Current value: 1,365");
    await eventually(() => root.locator('[data-slot="animated-number"] [aria-hidden]').innerText().then(value => value === "1,365"), "Number reaches exact target");
    await key(root.getByRole("button", { name: "Subtract 75" }), "Enter");
    await text(root, "Current value: 1,290");
    await root.getByRole("button", { name: "Reset count" }).click();
    await text(root, "Current value: 1,240");
    await eventually(() => visual.innerText().then(value => value === "1,240"), "Interrupted number reaches reset target");
    const samples = await page.evaluate(() => { window.__numberObserver.disconnect(); return window.__numberSamples; });
    assert(samples.length > 2, `Expected numeric updates: ${JSON.stringify(samples)}`);
    assert(samples.every(sample => sample.value >= 1240 && sample.value <= 1365), `Numeric transition remains within its endpoints: ${JSON.stringify(samples)}`);
    await page.emulateMedia({reducedMotion:"reduce"});
    await root.getByRole("button", { name: "Add 125" }).click();
    assert.equal(await visual.innerText(), "1,365");
    await page.emulateMedia({reducedMotion:"no-preference"});
    return {status:"pass",detail:"Pointer/keyboard updates, interruption without overshoot, reduced motion and exact reset",samples};
  },
  "ambient-background": async ({root}) => {
    const background=root.locator('[data-slot="ambient-background"]');
    await root.getByLabel("Composition").selectOption("contour");
    await attribute(background,"data-variant","contour");
    await root.getByRole("button",{name:"Pause background"}).click();
    await attribute(background,"data-motion","paused");
    await key(root.getByRole("button",{name:"Resume background"}),"Enter");
    await attribute(background,"data-motion","running");
    return "Composition control and pointer/keyboard pause-resume";
  },
  marquee: async ({root,page}) => {
    const marquee=root.locator('[data-slot="marquee"]');
    await root.getByRole("button",{name:"Pause motion",exact:true}).click();
    await attribute(marquee,"data-motion","paused");
    await root.getByLabel("Direction",{exact:true}).selectOption("right");
    await root.getByLabel("Pace",{exact:true}).selectOption("normal");
    await attribute(marquee,"data-direction","right");
    await attribute(marquee,"data-speed","normal");
    const copies=marquee.locator('[data-slot="marquee-copy"]');
    assert.equal(await copies.count(), 4, "Two copies on either side cover depth wraps");
    assert(await copies.evaluateAll(elements=>elements.every(el=>el.inert&&el.getAttribute("aria-hidden")==="true")));
    await key(root.getByRole("button",{name:"Resume motion",exact:true}),"Enter");
    await root.getByRole("button",{name:"Pause motion",exact:true}).waitFor();
    await page.emulateMedia({reducedMotion:"reduce"});
    await attribute(marquee,"data-motion","static");
    assert(await copies.evaluateAll(elements=>elements.every(el=>getComputedStyle(el).display==="none")));
    await page.emulateMedia({reducedMotion:"no-preference"});
    return "Explicit pause, direction/pace controls, four inert copies and static reduced-motion reading";
  },
  "multi-select": async ({root,page}) => {
    const trigger=root.getByRole("button",{name:"Shared workspaces",exact:true});
    await trigger.click();
    const search=page.getByRole("searchbox",{name:"Search Shared workspaces",exact:true});
    await search.fill("Workspace 05");
    assert(await page.getByRole("checkbox",{name:"Workspace 05",exact:true}).isDisabled());
    await search.fill("Workspace 23");
    await page.getByRole("checkbox",{name:"Workspace 23",exact:true}).click();
    await page.keyboard.press("Escape");
    await eventually(()=>trigger.evaluate(el=>el===document.activeElement),"Multi-select restores trigger focus");
    await text(root.getByRole("list",{name:"Selected Shared workspaces",exact:true}),"Workspace 23");
    await key(root.getByRole("button",{name:"Remove Workspace 23",exact:true}),"Enter");
    await eventually(()=>root.getByRole("button",{name:"Remove Workspace 23",exact:true}).count().then(n=>n===0),"Keyboard removal removes the selected token");
    await root.getByRole("button",{name:"Remove Workspace 01",exact:true}).waitFor();
    return "Real workspace search, disabled option, selection token, Escape/focus restoration and keyboard removal";
  },
  "shape-scene": async ({root,page}) => {
    const scene = root.locator('[data-slot="shape-scene"]');
    await eventually(() => scene.getAttribute("data-renderer").then(value => ["webgl","fallback"].includes(value)), "Scene renders or presents its supported fallback", 10000);
    const shapes=()=>scene.locator('[data-slot="shape"]').evaluateAll(nodes=>nodes.map(node=>node.style.getPropertyValue("--m")).join("|"));
    const initial=await shapes();
    const wasReduced=await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
    try{
      await page.emulateMedia({reducedMotion:"reduce"});
      await root.getByRole("button",{name:"Change the shapes",exact:true}).click();
      await eventually(async()=>await shapes()!==initial,"Pointer changes the rendered composition geometry");
      await eventually(()=>scene.getAttribute("data-renderer").then(value=>["webgl","fallback"].includes(value)),"Changed scene becomes ready",10000);
      await scene.scrollIntoViewIfNeeded();
      const still=await scene.screenshot();await wait(120);
      assert((await scene.screenshot()).equals(still),"Reduced motion leaves the sculpture still");
      await key(root.getByRole("button",{name:"Change the shapes",exact:true}),"Enter");
      await eventually(async()=>await shapes()===initial,"Keyboard restores the original composition");
    }finally{await page.emulateMedia({reducedMotion:wasReduced?"reduce":"no-preference"});}
    return "Usable renderer/fallback, pointer and keyboard composition changes, and still reduced-motion paint";
  },
  "text-reveal": async ({ root, page }) => {
    const heading = root.getByRole("heading", { name: "Good things take shape." });
    const before = await heading.boundingBox();
    await root.getByRole("button", { name: "Replay reveal" }).click();
    await eventually(() => heading.evaluate(el => Array.from(el.querySelectorAll('[data-reveal-word]')).some(word => {
      const opacity = Number(getComputedStyle(word).opacity);
      return opacity > 0 && opacity < .99;
    })), "Replay produces a visible intermediate word opacity");
    await eventually(() => heading.evaluate(el => Array.from(el.querySelectorAll('[data-reveal-word]')).every(word => Number(getComputedStyle(word).opacity) >= .999)), "Replay finishes with fully readable words");
    await text(root, "Replayed 1 time.");
    await key(root.getByRole("button", { name: "Replay reveal" }), "Enter");
    await text(root, "Replayed 2 times.");
    assert(await heading.isVisible());
    const after = await heading.boundingBox();
    assert(Math.abs(before.width-after.width)<1 && Math.abs(before.height-after.height)<1, "Reveal keeps layout geometry stable");
    await page.emulateMedia({reducedMotion:"reduce"});
    await root.getByRole("button", {name:"Replay reveal"}).click();
    assert(await heading.evaluate(async el => {
      for (let frame = 0; frame < 12; frame++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (Array.from(el.querySelectorAll('[data-reveal-word]')).some(word => {
          const style = getComputedStyle(word);
          return Number(style.opacity) !== 1 || style.transform !== 'none';
        })) return false;
      }
      return true;
    }), "Reduced-motion replay stays fully readable and still across actual frames");
    await page.emulateMedia({reducedMotion:"no-preference"});
    return "Real pointer/keyboard replay, stable layout and reduced-motion stillness";
  },
  "code-block": async ({ root, page }) => {
    await root.getByRole("button", { name: "Wrap long lines" }).click();
    await attribute(root.locator('[data-slot="code-block"]'), "data-wrap", "true");
    const expected = await root.locator("pre code").innerText();
    await key(root.getByRole("button", { name: "Copy", exact: true }), "Enter");
    await text(root, "Copied to clipboard.");
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
    await root.getByRole("button", { name: "Keep lines unwrapped" }).click();
    return "Wrap control and actual clipboard preserves exact code";
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
    const b = root.getByRole("checkbox", { name: "Keep this idea in my collection", exact: true });
    await b.click();
    await attribute(b, "aria-checked", "false");
    await text(root, "Idea excluded.");
    await key(b, "Space");
    await attribute(b, "aria-checked", "true");
    await text(root, "Idea included.");
    await root.getByRole("checkbox", { name: "Show selected mark", exact: true }).click();
    await attribute(b.locator('[data-slot="selector-glyph"]'), "data-selector-indicator", "none");
    await attribute(b, "aria-checked", "true");
    return "Pointer/Space selection changes the result; mark visibility preserves checked semantics";
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
    await eventually(async () => (await root.locator("tbody tr").count()) === 3, "Ready filter removes exiting rows after motion completes");
    await key(root.getByRole("button", { name: /^Draft / }), "Enter");
    await eventually(async () => (await root.locator("tbody tr").count()) === 2, "Draft filter removes exiting rows after motion completes");
    await root.getByRole("button", { name: /^All / }).click();
    await eventually(async () => (await root.locator('tbody tr[data-motion-exiting="true"]').count()) === 0, "All filter finishes retained exits");
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
    await eventually(async () => (await root.locator("tbody tr").count()) === 2, "Next page removes exiting rows after motion completes");
    await root.locator("tbody tr").first().click();
    await text(root, "Selected note:");
    return "Pointer and keyboard filters, numeric ascending sort, next page and row selection";
  },
  "date-picker": async ({ root, page }) => {
    const trigger = root.getByRole("button", {
      name: "Choose a reminder date",
    });
    await trigger.click();
    await page.getByRole("grid").waitFor();
    const buttons = page.getByRole("gridcell").locator("button");
    await buttons.nth(12).click();
    await text(root, "Reminder set for");
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
      { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("A") },
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
    await page.locator(".docs-playground-controls").getByRole("combobox", {name:"Variant",exact:true}).click();
    await page.getByRole("option", {name:"invalid",exact:true}).click();
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
    assert(await input.evaluate(el=>{const ids=(el.getAttribute('aria-describedby')||'').split(' ').filter(Boolean);return ids.length===2&&new Set(ids).size===2&&ids.every(id=>document.getElementById(id));}),"Help and error have distinct existing targets");
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
    const input = root.getByRole("searchbox", { name: "Find an icon", exact: true });
    await input.fill("camera");
    const camera = root.locator('[data-icon-option="camera"]');
    await key(camera, "Enter");
    await attribute(camera, "aria-pressed", "true");
    await text(root.locator("output"), "camera");
    await attribute(camera.locator('svg[data-slot="icon"]'), "data-icon-name", "camera");
    await input.fill("unlikely-icon-name");
    await text(root, "No matching icons.");
    await root.getByRole("button", { name: "Clear search", exact: true }).click();
    await root.getByRole("button", { name: "Next icons", exact: true }).click();
    await text(root, "Page 2 of");
    await key(root.getByRole("button", { name: "Previous icons", exact: true }), "Enter");
    await text(root, "Page 1 of");
    return "Keyboard icon selection, semantic search/empty results, clear and real result pagination";
  },
  "item-adornment": async ({ root }) => {
    const adornment=root.locator('[data-slot="item-adornment"]');
    const icon=root.getByRole("checkbox",{name:"Show icon",exact:true});
    const background=root.getByRole("checkbox",{name:"Show blob background",exact:true});
    await icon.click();
    await attribute(adornment,"data-background","true");
    assert.equal(await adornment.locator('[data-slot="icon"]').count(),0);
    await background.click();await adornment.waitFor({state:"hidden"});
    await text(root,"Project notes");
    await key(icon,"Space");
    await attribute(adornment,"data-icon","true");
    assert.notEqual(await adornment.getAttribute("data-background"),"true");
    return "Independent icon/background switches remove and restore decoration while preserving the item text";
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
    const note=root.getByRole("textbox",{name:"An instruction with room to grow"});
    await note.fill("Keep the result short.\nInclude the next step.");
    await key(root.getByRole("button",{name:"Add instruction",exact:true}),"Enter");
    await text(root,"Instruction added to this demo.");
    return "Pointer and keyboard saving; multiline instruction remains inside the input group";
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
    assert(await viewport.evaluate(el=>el.scrollTop<10),"Detached reader position survives appending");
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
    const meter = root.getByRole("progressbar", { name: "Example progress", exact: true });
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
    const experiment = root.getByRole("radio", { name: /Try something small/ });
    await root.getByText("Try something small", { exact: true }).click();
    await text(root, "A small experiment selected.");
    const plan = root.getByRole("radio", { name: /Make a little room/ });
    await key(plan, "Space");
    await text(root, "A clear plan selected.");
    assert(await plan.isChecked());
    assert(!(await experiment.isChecked()));
    return "Pointer and keyboard questionnaire choices update the controlled result";
  },
  "radio-group": async ({ root }) => {
    const group = root.getByRole("radiogroup", { name: "Working rhythm", exact: true });
    const quiet = group.getByRole("radio", { name: "Quiet focus", exact: true });
    const together = group.getByRole("radio", { name: "Think together", exact: true });
    await together.click();
    await text(root, "Thinking together selected.");
    await key(together, "ArrowUp");
    await text(root, "Quiet focus selected.");
    assert(await quiet.isChecked());
    assert(await group.getByRole("radio", {name: "Managed by your workspace",exact:true}).isDisabled());
    return "Pointer selection, arrow-key radio selection and disabled choice";
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
    const slider = root.getByRole("slider", { name: "Focus duration", exact: true });
    await slider.click();
    const before = await slider.getAttribute("aria-valuenow");
    await key(slider, "ArrowRight");
    await eventually(
      async () => (await slider.getAttribute("aria-valuenow")) !== before,
      "Keyboard changes slider",
    );
    const start=root.getByRole("slider",{name:"Range start",exact:true});
    const end=root.getByRole("slider",{name:"Range end",exact:true});
    await key(start,"End");
    assert(Number(await start.getAttribute("aria-valuenow"))<Number(await end.getAttribute("aria-valuenow")),"Range thumbs preserve minimum separation");
    return "Pointer slider placement, keyboard increment and separately named range thumbs preserve separation";
  },
  stepper: async ({ root }) => {
    const next = root.getByRole("button", { name: "Next", exact: true });
    await next.click();
    await text(root.getByRole("status"), "Stage 2 of 3 · Make it your own");
    await text(root.locator('[aria-current="step"]'), "Make it your own");
    await key(next, "Enter");
    await text(root.getByRole("status"), "Stage 3 of 3 · Ready to begin");
    assert(await next.isDisabled());
    await root.getByRole("button", { name: "Back", exact: true }).click();
    await text(root.getByRole("status"), "Stage 2 of 3 · Make it your own");
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

for (const id of ["area-chart", "bar-chart", "line-chart", "pie-chart", "radar-chart", "radial-chart"]) {
  tests[id] = async ({root}) => {
    const plot = root.locator('[data-slot="chart-svg"]');
    await plot.waitFor();
    await plot.focus();
    await root.getByRole("tooltip").waitFor();
    await plot.press("End");
    await plot.press("Escape");
    await root.getByRole("tooltip").waitFor({state:"hidden"});
    const legend = root.locator('.v-chart-legend button').first();
    await legend.click();await attribute(legend,"aria-pressed","false");
    await key(legend,"Space");await attribute(legend,"aria-pressed","true");
    await root.getByRole("button",{name:"Show data",exact:true}).click();
    await root.locator('[data-slot="chart-data-table"]').waitFor({state:"visible"});
    await root.getByLabel("Sample data",{exact:true}).selectOption("empty");
    await text(root,"No data loaded");
    await plot.waitFor({state:"hidden"});
    await root.getByLabel("Sample data",{exact:true}).selectOption("updated");
    await text(root,"Next week loaded");await plot.waitFor();
    return "Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate";
  };
}

Object.assign(tests, createEffectTests({ assert, eventually, text, attribute, key }), createDetailTests({ assert, eventually, text, attribute, key }), createCompositeTests({ assert, eventually, text, attribute, key }));

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
  for (const axis of ["Variant", "Size"]) {
    const select=page.locator(".docs-playground-controls").getByRole("combobox",{name:axis,exact:true});
    if(await select.count()) {
      const values=registry.items.find(entry=>entry.name===id).meta.source[axis === "Variant" ? "variants" : "sizes"];
      const choice=values.at(-1);
      await select.click();
      await page.getByRole("option").last().click();
      await attribute(p.locator(`[data-example="${id}"]`),`data-${axis.toLowerCase()}`,choice);
      await p.getByRole("button",{name:"Copy code",exact:true}).first().click();
      await text(p,"Copied to clipboard.");
      const copied=await page.evaluate(()=>navigator.clipboard.readText());
      assert(copied.slice(copied.lastIndexOf("export default function Demo")).includes(`${axis.toLowerCase()}="${choice}"`), "Copied code matches the selected axis");
      await select.click();
      await page.getByRole("option").first().click();
    }
  }
  return "Exact clipboard content, preview/code keyboard controls and matching selected variant/size source";
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
    await page.getByRole("button", { name: "Browse", exact: true }).click();
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
  const theme = page.getByRole("switch", { name: "Dark appearance" });
  const current = await page.locator("html").getAttribute("data-mode");
  await theme.click();
  await eventually(
    () =>
      page
        .locator("html")
        .getAttribute("data-mode")
        .then((v) => v !== current),
    "Theme changes document",
  );
  await key(theme,"Space");
  await eventually(()=>page.locator("html").getAttribute("data-mode").then(v=>v===current),"Keyboard restores theme");
  if (width < 850) {
    await key(page.getByRole("button", { name: "Close menu", exact: true }), "Enter");
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
          if (!/^https?:$/.test(location.protocol)) return;
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
        await readiness.locator("[data-example] [data-slot]").first().waitFor({state:"attached",timeout:30000});
        await readiness.getByText("Loading preview…",{exact:true}).waitFor({state:"hidden",timeout:30000});
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
                !el.closest('[hidden], [aria-hidden="true"], [inert]') &&
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
          1,
          "Only the selected variant and size should mount",
        );
        for (const [name, values] of [["Variant", entry.meta.source.variants], ["Size", entry.meta.source.sizes]]) {
          const choices = [...new Set(["default", ...values])];
          if (choices.length > 1) {
            const select = page.locator(".docs-playground-controls").getByRole("combobox", { name, exact: true });
            await select.click();
            const labels = choices.map(value => name === "Size" ? ({default:"Default",xs:"Extra small",sm:"Small",md:"Medium",lg:"Large",xl:"Extra large"})[value] ?? value : value.replaceAll("-", " "));
            assert.deepEqual((await page.getByRole("option").allTextContents()).map(value => value.trim()), labels);
            await page.getByRole("option").first().click();
            await attribute(page.locator(`[data-example="${entry.name}"]`).first(), `data-${name.toLowerCase()}`, "default");
          }
        }
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
          layout.metrics.overflow || layout.metrics.emptyNames.length || layout.errors.length ? "issue" : "pass";
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
      // Each layout gets a settled page on its own. Release its scene before
      // measuring the next viewport instead of retaining six active WebGL views.
      await page.goto("about:blank");
    }
    const primary =
      contexts.find((c) => c.width === 1440 && c.theme === "light") ||
      contexts[0];
    const { page } = primary;
    try {
      if (!page.url().includes(`/docs/${entry.name}/`))
        await page.goto(`${base}/docs/${entry.name}/`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('[data-slot="preview"] [data-slot="tabs-list"][data-flow-owned]').first().waitFor({state:"attached",timeout:30000});
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
            "No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately.",
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
  if (staticServer) await new Promise((resolve) => staticServer.httpServer.close(resolve));
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
