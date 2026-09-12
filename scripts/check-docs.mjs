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
import { armOpacityObservation } from "./docs-transient-paint.mjs";
import { docsHarnessFiles, docsHarnessFingerprint } from "./docs-harness-fingerprint.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);
const staticServer = args.serve ? await startPreview({
  configFile: false,
  base: "/cojeev-ui/",
  build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = args.url || `http://127.0.0.1:${staticServer ? staticServer.httpServer.address().port : 4320}/cojeev-ui`;
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
let snapshotRevision;
function revision(refresh = false) {
  // Explicitly identify a copied source tree when Git metadata is unavailable.
  // Never silently turn a failing Git check into a successful release check.
  if (args["source-snapshot"]) {
    if (snapshotRevision && !refresh) return snapshotRevision;
    const hash = createHash("sha256");
    let files = 0;
    function visit(relative) {
      const absolute = path.join(main, relative);
      if (!fs.existsSync(absolute)) return;
      if (fs.statSync(absolute).isDirectory()) {
        for (const child of fs.readdirSync(absolute).sort()) visit(path.join(relative, child));
      } else {
        const bytes = fs.readFileSync(absolute);
        hash.update(`${relative}\0${bytes.length}\0`).update(bytes);
        files++;
      }
    }
    for (const root of ["app", "components", "lib", "registry/cojeev", "data", "scripts", "tests", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json"]) visit(root);
    snapshotRevision = { mode: "source-snapshot", head: null, sourceSha256: hash.digest("hex"), files };
    return snapshotRevision;
  }
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
      "registry/cojeev",
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
    await text(root.locator('[data-icon-selected]'), "loader");
    const replay=root.getByRole("button",{name:"Replay loader animation",exact:true});
    await key(replay,"Enter");
    await attribute(replay.locator('[data-slot="animated-icon"]'),"data-animated","true");
    await root.getByRole("button",{name:"Disable actions",exact:true}).click();
    assert(await loader.isDisabled());assert(await replay.isDisabled());
    await eventually(()=>icon.getAttribute("data-animated").then(value=>value!=="true"),"Disabled action cancels icon motion");
    await root.getByRole("button",{name:"Enable actions",exact:true}).click();
    const wasReduced=await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
    try{await page.emulateMedia({reducedMotion:"reduce"});await eventually(()=>icon.getAttribute("data-animated").then(value=>value!=="true"),"Reduced motion settles an explicitly selected icon");}
    finally{await page.emulateMedia({reducedMotion:wasReduced?"reduce":"no-preference"});}
    return "Search, selection, keyboard inspector replay, disabled lifecycle and reduced-motion settling";
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
    const draft=root.getByRole("textbox",{name:"Message Cojeev"});
    const allow=async()=>{await root.getByRole("button",{name:"Allow once",exact:true}).click();await root.getByRole("button",{name:"Continue",exact:true}).click()};
    await draft.fill("A useful next step");
    await draft.press("ControlOrMeta+Enter");
    await root.getByRole("button",{name:"Allow once",exact:true}).waitFor();
    await root.getByRole("button",{name:"Deny",exact:true}).click();
    await text(root,"Permission denied. I did not use the selected context.");
    assert.equal(await root.getByRole("button",{name:"Allow once",exact:true}).count(),0);
    await reset();
    // Hold the demo's phase timer while real pointer actions and focus checks
    // cross the driver boundary. Advancing time still verifies cancellation.
    const clockInstant = new Date("2020-01-01T00:00:00Z");
    await page.clock.install({ time: clockInstant });
    try {
      // Fixed wall time cannot make pauseAt's target stale while the driver is
      // delayed. pauseAt then freezes the timers before this run is started.
      await page.clock.setFixedTime(clockInstant);
      await page.clock.pauseAt(clockInstant);
      await draft.fill("Keep this conversation");
      await root.getByRole("button",{name:"Send message",exact:true}).click();
      assert(await draft.evaluate(el=>el===document.activeElement),"Sending returns focus to the draft before Send is replaced");
      await root.getByRole("button",{name:"Stop generation",exact:true}).click();
      await text(root,"Stopped. This demo did not read or change any files.");
      await page.clock.runFor(1500);
      assert.equal(await root.getByRole("button",{name:"Allow once",exact:true}).count(),0,"Cancelled timer must not reopen permission");
    } finally {
      try { await page.clock.setSystemTime(new Date()); }
      finally { await page.clock.resume(); }
    }
    await reset();
    const chooser=page.waitForEvent("filechooser");
    await root.getByRole("button",{name:"Attach files",exact:true}).click();
    await (await chooser).setFiles({name:"outline.md",mimeType:"text/markdown",buffer:Buffer.from("Local example")});
    await text(root,"outline.md");
    await root.getByRole("button",{name:/Remove.*outline/}).click();
    await root.getByRole("button",{name:"Try an error",exact:true}).click();
    await allow();
    const resetControl=root.getByRole("button",{name:"Reset demo",exact:true});
    await resetControl.focus();
    await text(root,"Demo interruption. Your request is saved");
    assert(await resetControl.evaluate(el=>el===document.activeElement),"Completion must preserve focus when it is outside Stop");
    await key(root.getByRole("button",{name:"Retry",exact:true}),"Enter");
    await allow();
    await root.getByRole("button",{name:"Stop generation",exact:true}).focus();
    await text(root,"Your sample brief is ready.");
    await text(root,"Ready to review");
    await eventually(()=>draft.evaluate(el=>el===document.activeElement),"Completion returns focus from Stop to the draft");
    return "Keyboard send; explicit deny; Stop cancels timers; attach/remove; error and retry reach a sample result; completion restores focused Stop without stealing outside focus";
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
    await root.getByRole("button", { name: "Dismiss alert", exact: true }).click();
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
    const link = root.getByRole("link", { name: "Projects", exact: true });
    await key(link, "Enter");
    await text(root, "Opened Projects in this local folder preview.");
    assert.match(await page.evaluate(() => document.activeElement?.textContent), /Projects/);
    return "Keyboard ancestor navigation updates the local folder and transfers focus to its heading";
  },
  button: async ({ root }) => {
    const duration = root.getByRole("slider", { name: "Loading duration", exact: true });
    await attribute(duration, "aria-valuenow", "3");
    await duration.press("Home");
    await attribute(duration, "aria-valuenow", "0.5");
    const b = root.getByRole("button", { name: "Add a note", exact: true });
    await b.click();
    await text(root, "Running the local example…");
    assert(await root.getByRole("button", { name: "Adding…", exact: true }).isDisabled());
    assert.equal(await root.getByRole("button", { name: "Adding…", exact: true }).getAttribute("disabled"), null);
    await text(root, "1 note added in this example.");
    await root.getByRole("radio", { name: "Error and retry", exact: true }).click();
    await key(b, "Enter");
    await text(root, "The example action failed.");
    await root.getByRole("radio", { name: "Success", exact: true }).click();
    await key(root.getByRole("button", { name: "Retry example" }), "Enter");
    await text(root, "2 notes added in this example.");
    await duration.press("End");
    await attribute(duration, "aria-valuenow", "10");
    await b.click();
    await root.getByRole("button", { name: "Cancel", exact: true }).click();
    await text(root, "Cancelled. No note was added.");
    assert(await root.getByRole("button", { name: "Disabled", exact: true }).isDisabled());
    return "Pointer loading preserves busy styling, adjustable duration, cancel, keyboard failure and retry";
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
    const trigger=root.getByRole("button",{name:"Workspaces",exact:true});
    await trigger.click();
    const dialog=page.getByRole("dialog",{name:"Workspaces",exact:true});
    const search=dialog.getByRole("searchbox",{name:"Search Workspaces",exact:true});
    await search.fill("Archive");
    assert(await dialog.getByRole("checkbox",{name:"Archive",exact:true}).isDisabled());
    await search.fill("Project 20");
    await dialog.getByRole("checkbox",{name:"Project 20",exact:true}).click();
    await page.keyboard.press("Escape");
    await eventually(()=>trigger.evaluate(el=>el===document.activeElement),"Multi-select restores trigger focus");
    await text(root.getByRole("list",{name:"Selected Workspaces",exact:true}),"Project 20");
    await key(root.getByRole("button",{name:"Remove Project 20",exact:true}),"Enter");
    await eventually(()=>root.getByRole("button",{name:"Remove Project 20",exact:true}).count().then(n=>n===0),"Keyboard removal removes the selected token");
    await root.getByRole("button",{name:"Remove Writing",exact:true}).waitFor();
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
    await heading.scrollIntoViewIfNeeded();
    await attribute(heading, "data-motion-quiet", "false");
    await eventually(() => heading.evaluate(el => Array.from(el.querySelectorAll('[data-reveal-word]')).every(word => Number(getComputedStyle(word).opacity) >= .999)), "Initial entrance settles before replay observation");
    const before = await heading.boundingBox();
    const replay = root.getByRole("button", { name: "Replay reveal" });
    const paint = await armOpacityObservation(heading, replay, { units: '[data-reveal-word]', upperBound: .99 });
    try {
      await replay.click();
      await eventually(paint.seen, "Replay produces a visible intermediate word opacity");
    } finally { await paint.dispose(); }
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
    const initial = await root.getByRole("status").innerText();
    await button.click();
    await eventually(async () => await root.getByRole("status").innerText() !== initial, "Pointer updates the appointment summary");
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
    const b = root.getByRole("button", { name: "Show data", exact: true });
    await b.click();
    assert((await root.locator("table:visible").count()) === 1);
    await text(root, "Wed");
    await key(root.getByRole("button", { name: "Hide data", exact: true }), "Enter");
    await attribute(root.getByRole("button", { name: "Show data", exact: true }), "aria-expanded", "false");
    assert(await root.locator('[data-slot="chart-data-table"]').evaluate(el => el.classList.contains("v-sr")), "Closing the visual table preserves its screen-reader data");
    return "Pointer reveals the data table; keyboard hides it visually while retaining accessible values and the zero datum";
  },
  checkbox: async ({ root }) => {
    const b = root.getByRole("checkbox", { name: /^Working notes/ });
    await b.click();
    await attribute(b, "aria-checked", "false");
    await text(root, "Nothing packed yet. Choose any tool to begin.");
    await key(b, "Space");
    await attribute(b, "aria-checked", "true");
    await text(root, "1 packed · Working notes");
    await root.getByRole("checkbox", { name: /^Quick sketches/ }).click();
    await text(root, "2 packed · Working notes, Quick sketches");
    return "Pointer/Space toggles independent choices and the explicit packed summary";
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
    await eventually(async () => (await root.locator("tbody tr").count()) === 3, "Draft filter shows all three draft records");
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
        "A blank page",
      ),
    );
    const firstPage = await root.locator("tbody").innerText();
    await key(root.getByRole("button", { name: "Next", exact: true }), "Enter");
    await eventually(async () => (await root.locator("tbody").innerText()) !== firstPage, "Next page replaces the actual rows");
    await eventually(async () => (await root.locator("tbody tr").count()) === 3, "Next page contains the remaining three records");
    await root.locator("tbody tr").first().click();
    await text(root.getByRole("status", { name: "Table feedback", exact: true }), "Local demonstration · record opened");
    return "Pointer and keyboard filters, numeric ascending sort, next page and row selection";
  },
  "date-picker": async ({ root, page }) => {
    const trigger = root.getByRole("button", {
      name: "Appointment day",
      exact: true,
    });
    await trigger.click();
    await page.getByRole("grid").waitFor();
    const buttons = page.getByRole("gridcell").locator("button");
    await buttons.nth(12).click();
    await text(root, "Appointment ·");
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
    await page.getByRole("combobox", { name: "Example approach", exact: true }).click();
    await page.getByRole("option", { name: "Editor", exact: true }).click();
    const trigger = root.getByRole("button", { name: "Open note", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
    await page
      .getByRole("textbox", { name: "Note name" })
      .fill("QA notebook");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await text(root, "QA notebook");
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
  field: async ({ root }) => {
    const input = root.getByRole("textbox");
    await input.fill("ab");
    await root.getByRole("button", { name: "Check name", exact: true }).click();
    await attribute(input, "aria-invalid", "true");
    await input.click();
    await input.fill("Valid name");
    await eventually(
      async () => (await input.getAttribute("aria-invalid")) !== "true",
      "Valid field clears invalid state",
    );
    await input.press("ControlOrMeta+A");
    await input.press("Backspace");
    await key(root.getByRole("button", { name: "Check name", exact: true }), "Enter");
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
    await text(root.locator("[data-icon-selected]"), "camera");
    await attribute(camera.locator('svg[data-slot="icon"]'), "data-icon-name", "camera");
    await input.fill("unlikely-icon-name");
    await text(root, "No matching icons.");
    await root.getByRole("button", { name: "Clear icon search", exact: true }).click();
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
    assert.equal(await input.inputValue(), "QA note");
    await key(root.getByRole("button", { name: /Clear/ }), "Enter");
    assert.equal(await input.inputValue(), "");
    return "Pointer input change and keyboard clear action";
  },
  "input-group": async ({ root, page }) => {
    const input = root.getByRole("textbox", { name: "Workspace address" });
    await input.fill("qa-space");
    await root.getByRole("button", { name: "Save address", exact: true }).click();
    await text(root, "notes / qa-space");
    await input.fill("second-space");
    await key(root.getByRole("button", { name: "Save address", exact: true }), "Enter");
    await text(root, "notes / second-space");
    await page.getByRole("combobox", { name: "Example approach", exact: true }).click();
    await page.getByRole("option", { name: "Composer", exact: true }).click();
    const note=root.getByRole("textbox",{name:"Message",exact:true});
    await note.fill("Keep the result short.\nInclude the next step.");
    await key(root.getByRole("button",{name:"Send message",exact:true}),"Enter");
    await text(root,"Message kept locally: Keep the result short.");
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
    await root.getByRole("button", { name: "Select Small discoveries", exact: true }).click();
    await text(root, "Selected: Small discoveries");
    await key(root.getByRole("button", { name: "Select Weekend ideas", exact: true }), "Enter");
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
    await text(root, "Selected: Daily.");
    await key(select, "ArrowDown");
    await select.press("Enter", { delay: 60 });
    if ((await select.inputValue()) === "weekly") {
      await text(root, "Selected: Weekly.");
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
    const collections = root.getByRole("button", { name: "Collections", exact: true });
    const openCollections = async () => { if (await collections.count()) { await collections.focus(); if (await collections.getAttribute("aria-expanded") !== "true") await collections.press("Enter"); } };
    await openCollections();
    await root.getByRole("link", { name: /Ideas/ }).click();
    await text(root, "Collection: Ideas");
    await openCollections();
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
    await text(root, "1 question left.");
    const plan = root.getByRole("radio", { name: /Make a little room/ });
    await key(plan, "Space");
    assert(await plan.isChecked());
    assert(!(await experiment.isChecked()));
    await key(root.getByRole("radio", { name: /Every day/ }), "Space");
    await root.getByRole("button", { name: "Save my plan", exact: true }).click();
    await text(root, "A clear plan · Every day. Kept in this example only.");
    return "Pointer and keyboard answers complete both questions and save a local summary";
  },
  "radio-group": async ({ root }) => {
    const group = root.getByRole("radiogroup", { name: "Project starting point", exact: true });
    const quiet = group.getByRole("radio", { name: /^Working notes/ });
    const together = group.getByRole("radio", { name: /^Quick sketches/ });
    await together.click();
    await text(root, "Your project opens with quick sketches.");
    await key(together, "ArrowUp");
    await text(root, "Your project opens with working notes.");
    assert(await quiet.isChecked());
    assert(!(await together.isChecked()));
    return "Pointer and arrow-key selection choose exactly one project starting point";
  },
  resizable: async ({ root, page }) => {
    const panel = root.locator('[data-slot="resizable-panel"]').first();
    const handle = root.getByRole("separator");
    const vertical = await root.locator('[data-slot="resizable"]').getAttribute("data-panel-group-direction") === "vertical" || await root.getAttribute("data-variant") === "v";
    const dimension = vertical ? "height" : "width";
    const before = (await panel.boundingBox())[dimension];
    await key(handle, vertical ? "ArrowDown" : "ArrowRight");
    await eventually(
      async () => Math.abs((await panel.boundingBox())[dimension] - before) > 2,
      "Keyboard resize changes panel width",
    );
    const box = await handle.boundingBox();
    const after = (await panel.boundingBox())[dimension];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + (vertical ? 0 : 40), box.y + box.height / 2 + (vertical ? 40 : 0), { steps: 5 });
    await page.mouse.up();
    await eventually(
      async () => Math.abs((await panel.boundingBox())[dimension] - after) > 2,
      "Pointer drag resizes panel",
    );
    return "Keyboard handle resize and pointer drag";
  },
  "scroll-area": async ({ root, page }) => {
    const viewport = root.locator("[data-radix-scroll-area-viewport]").first();
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
    await page.getByRole("option", { name: "Daily", exact: true }).click();
    await text(root, "Selected: Daily.");
    await key(b, "ArrowDown");
    await page
      .getByRole("option", { name: "Daily", exact: true })
      .waitFor();
    await page.keyboard.press("ArrowDown");
    await eventually(
      () =>
        page
          .getByRole("option", { name: "Weekly", exact: true })
          .evaluate((el) => el === document.activeElement),
      "Focus moves to next option",
    );
    await page.keyboard.press("Enter");
    await text(root, "Selected: Weekly.");
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
    await root.getByRole("button", { name: "Ideas", exact: true }).click();
    await text(root, "Ideas");
    await key(root.getByRole("button", { name: "Collapse the rail" }), "Enter");
    await attribute(rail, "data-state", "collapsed");
    await root.getByRole("button", { name: "Archive", exact: true }).click();
    await root.getByRole("button", { name: "Expand the rail" }).click();
    await attribute(rail, "data-state", "expanded");
    return "Pointer navigation, keyboard collapse, collapsed accessible link and expansion";
  },
  slider: async ({ root, page }) => {
    const slider = root.getByRole("slider", { name: "Focus duration", exact: true });
    await slider.click();
    const before = await slider.getAttribute("aria-valuenow");
    await key(slider, "ArrowRight");
    await eventually(
      async () => (await slider.getAttribute("aria-valuenow")) !== before,
      "Keyboard changes slider",
    );
    const approach = page.getByRole("combobox", { name: "Example approach", exact: true });
    await approach.click();
    await page.getByRole("option", { name: "Range", exact: true }).click();
    const start=root.getByRole("slider",{name:"Interval start",exact:true});
    const end=root.getByRole("slider",{name:"Interval end",exact:true});
    await key(start,"End");
    assert(Number(await end.getAttribute("aria-valuenow"))-Number(await start.getAttribute("aria-valuenow"))>=5,"Range thumbs preserve minimum separation");
    await approach.click();
    await page.getByRole("option", { name: "Rubber", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const rubber = root.getByRole("slider", { name: "Elastic tension", exact: true });
    const path = root.locator('[data-slot="slider-range"] path');
    const thickness = () => path.evaluate(async node => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const box = node.getBBox(), x = box.x + box.width / 2;
      const height = node.ownerSVGElement.viewBox.baseVal.height;
      let filled = 0;
      for (let i = 0; i < 512; i++) if (node.isPointInFill(new DOMPoint(x, height * (i + 0.5) / 512))) filled++;
      return height * filled / 512;
    });
    await key(rubber, "End");
    await attribute(rubber, "aria-valuenow", "100");
    const long = await thickness();
    await key(rubber, "Home");
    for (let i = 0; i < 12; i++) await rubber.press("ArrowRight");
    const short = await thickness();
    assert(short > long * 3 && long < 4, `Rubber waist becomes thinner with extension: short=${short}, long=${long}`);
    return "Pointer/keyboard value changes, named range thumbs with minimum separation, and actual rubber waist thinning even with reduced motion";
  },
  stepper: async ({ root }) => {
    const next = root.getByRole("button", { name: "Next step", exact: true });
    assert(await next.isDisabled());
    await root.getByRole("textbox", { name: "Name your idea", exact: true }).fill("QA notebook");
    await next.click();
    await root.getByRole("heading", { name: "Find a rhythm that fits.", exact: true }).waitFor();
    await root.getByRole("radio", { name: "Daily", exact: true }).click();
    await key(next, "Enter");
    await root.getByRole("heading", { name: "A little plan, ready to keep.", exact: true }).waitFor();
    await root.getByRole("button", { name: "Save draft", exact: true }).click();
    await text(root, "Saved here: QA notebook · daily.");
    await root.getByRole("button", { name: "Back", exact: true }).click();
    assert(await root.getByRole("radio", { name: "Daily", exact: true }).isChecked());
    return "Validation gates advancement; pointer/keyboard steps preserve the draft and save a truthful local receipt";
  },
  switch: async ({ root }) => {
    const b = root.getByRole("switch").first();
    await b.click();
    await text(root, "Off · All alerts can come through.");
    await key(b, "Space");
    await text(root, "On · Non-essential alerts are paused.");
    return "Pointer/Space changes the named quiet-hours setting and visible result";
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
    await text(root.getByRole("status"), "Kept in this example.");
    assert.equal(await input.inputValue(), "A useful QA thought");
    await input.fill("A revised thought");
    assert.equal(await root.getByRole("status").innerText(), "");
    return "Pointer composition and keyboard save confirm the local note, preserve the draft and clear stale confirmation on edit";
  },
  toast: async ({ root, page }) => {
    await page.getByRole("combobox", { name: "Example approach", exact: true }).click();
    await page.getByRole("option", { name: "Actionable", exact: true }).click();
    const b = root.getByRole("button", { name: "Save example note" });
    await b.click();
    await page.getByText("Note saved", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await text(root, "Save undone. Your example note is not saved.");
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
    const b = root.getByRole("button", { name: "Save note", exact: true });
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
    await root.getByRole("combobox",{name:"Sample data",exact:true}).click();
    await root.page().getByRole("option",{name:"Empty dataset",exact:true}).click();
    await text(root,"No data loaded");
    await plot.waitFor({state:"hidden"});
    await root.getByRole("combobox",{name:"Sample data",exact:true}).click();
    await root.page().getByRole("option",{name:"Next week",exact:true}).click();
    await text(root,"Next week loaded");await plot.waitFor();
    return "Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate";
  };
}

Object.assign(tests, createEffectTests({ assert, eventually, text, attribute, key }), createDetailTests({ assert, eventually, text, attribute, key }), createCompositeTests({ assert, eventually, text, attribute, key }));
tests.shape = tests["shape-artwork"];
tests.table = tests["data-table"];
tests.dock = async ({ root }) => {
  const work = root.getByRole("button", { name: "Work", exact: true });
  await work.click();
  await attribute(work, "aria-pressed", "true");
  await text(root.locator('[role="status"]'), "Work is open.");
  assert(await root.getByRole("button", { name: "Automations", exact: true }).isDisabled());
  await key(root.getByRole("button", { name: "Memory", exact: true }), "Enter");
  await text(root.locator('[role="status"]'), "Memory is open.");
  await key(root.getByRole("slider", { name: "Item size", exact: true }), "End");
  await attribute(root.getByRole("slider", { name: "Item size", exact: true }), "aria-valuenow", "72");
  return "Native pointer/keyboard destinations, unavailable action, selection receipt and actual item-size control";
};
for (const id of ["dots", "grid", "contours", "weave", "pebbles", "sunwash", "folds", "sprouts"]) {
  tests[`${id}-background`] = async ({ root }) => {
    const paint = root.locator('[data-slot="pattern-background"]');
    await attribute(paint, "data-pattern", id);
    await key(root.getByRole("slider", { name: "Pattern spacing", exact: true }), "End");
    assert.equal(await paint.evaluate(el => el.style.getPropertyValue("--pattern-spacing")), "80px");
    await key(root.getByRole("slider", { name: "Pattern strength", exact: true }), "Home");
    assert.equal(await paint.evaluate(el => Number(el.style.opacity)), 0);
    await root.getByRole("button", { name: "Add a note", exact: true }).click();
    await text(root.locator('[role="status"]'), "1 note added.");
    assert.equal(await paint.getAttribute("aria-hidden"), "true");
    return "Spacing and strength change the actual decorative paint; foreground action remains usable";
  };
}
for (const id of ["bento-grid", "bento-builder"]) {
  tests[id] = async ({ root, page }) => {
    const editor = root.locator('[data-slot="bento-builder"]');
    const tiles = editor.locator('[data-bento-tile]');
    const before = await tiles.evaluateAll(nodes => nodes.map(node => [node.dataset.bentoTile, node.style.gridColumn, node.style.gridRow]));
    await editor.getByRole("button", { name: "Randomize", exact: true }).click();
    assert.notDeepEqual(await tiles.evaluateAll(nodes => nodes.map(node => [node.dataset.bentoTile, node.style.gridColumn, node.style.gridRow])), before);
    await key(editor.getByRole("button", { name: "Undo", exact: true }), "Enter");
    assert.deepEqual(await tiles.evaluateAll(nodes => nodes.map(node => [node.dataset.bentoTile, node.style.gridColumn, node.style.gridRow])), before);
    await editor.getByRole("button", { name: "Interlock", exact: true }).click();
    await editor.getByRole("button", { name: "Copy layout", exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /variant="interlock"/);
    assert.match(copied, /BentoGrid/);
    return "Randomization changes the real partition; keyboard Undo restores it; Interlock exports reusable layout code (seam gestures covered by the resize suite)";
  };
}
tests["pattern-background"] = tests["dots-background"];

async function sharedPreview(page, id) {
  for (const terminal of await page.locator('.docs-command').all()) {
    assert.equal(await terminal.getAttribute('data-variant'), 'terminal');
    assert.equal(await terminal.locator('[data-slot="terminal-prompt"]').getAttribute('aria-hidden'), 'true');
    const command = await terminal.locator('pre > code').innerText();
    const copy = terminal.getByRole('button', { name: 'Copy command', exact: true });
    assert.equal(await copy.locator('[data-icon-name="copy"]').count(), 1);
    await key(copy, 'Enter');
    await text(terminal, 'Copied to clipboard.');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), command, 'Copy command must omit the decorative terminal prompt');
    assert.equal(await copy.locator('[data-icon-name="check"]').count(), 1);
  }
  const p = page.locator('[data-slot="preview"]').first();
  await p
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  await text(p, "Copied to clipboard.");
  const copiedExample = await page.evaluate(() => navigator.clipboard.readText());
  assert(copiedExample.includes("export default function Demo"));
  const code = p.getByRole("tab", { name: "Code", exact: true }).first();
  await key(code, "Enter");
  await p.locator(':scope > .v-preview__frame > .v-preview__panel > [data-slot="code-block"] pre').waitFor();
  assert.equal(copiedExample, await p.locator(':scope > .v-preview__frame > .v-preview__panel > [data-slot="code-block"] pre > code').innerText(), 'Copy code must preserve the full displayed example');
  const embeddedCode = p.locator(':scope > .v-preview__frame > .v-preview__panel > [data-slot="code-block"][data-embedded]');
  const corners = await embeddedCode.evaluate(element => {
    const style = getComputedStyle(element);
    return [parseFloat(style.borderBottomLeftRadius), parseFloat(style.borderBottomRightRadius)];
  });
  assert(corners.every(radius => radius > 0), "Embedded Code panel must preserve both rounded bottom corners");
  assert.equal(await embeddedCode.locator('[data-slot="code-block-header"], [data-slot="copy-control"]').count(), 0, "Embedded Code panel must not duplicate its host toolbar");
  await p.getByRole("tab", { name: "Preview", exact: true }).first().click();
  await p.locator(`[data-example="${id}"]`).first().waitFor();
  const source = registry.items.find(entry=>entry.name===id).meta.source;
  const choices = [...new Set(source.variants)];
  if (choices.length > 1) {
    const gallery = p.getByRole("region", {name:"Variants",exact:true});
    assert.deepEqual(await gallery.locator('[data-example-role="gallery"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-variant'))), choices, "Each declared approach has a live comparison; no invented default variant");
    assert.equal(await p.getByRole('combobox',{name:'Example approach'}).count(),1);
  }
  assert.equal(await p.getByRole('region',{name:'Sizes',exact:true}).count(),0,'Sizes are configuration, not duplicate comparisons');
  if (new Set(source.sizes).size > 1) assert.equal(await p.getByRole('combobox',{name:'Example size'}).count(),1);
  return "Exact clipboard, preview/code keyboard controls, declared approach comparisons and size configuration";
}
async function chromeCheck(page, width) {
  const ready = page.locator('[data-slot="preview"]').first();
  await ready.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
  await ready.getByRole("tab", { name: "Code", exact: true }).first().click();
  await ready.locator(':scope > .v-preview__frame > .v-preview__panel > [data-slot="code-block"] pre').waitFor();
  await ready
    .getByRole("tab", { name: "Preview", exact: true })
    .first()
    .click();
  if (width <= 900)
    await page.getByRole("button", { name: "Browse", exact: true }).click();
  await page.locator('#docs-navigation').getByRole('button',{name:'Search components',exact:true}).click();
  const search = page.getByRole('dialog',{name:'Explore Cojeev UI',exact:true});
  const filter = search.getByRole('combobox',{name:'Search documentation',exact:true});
  await filter.fill("questionnaire");
  await search.getByRole('option').filter({hasText:'Questionnaire'}).first().waitFor();
  await filter.press('Escape');
  await search.waitFor({state:'hidden'});
  if (width <= 900) await page.getByRole('button',{name:'Browse',exact:true}).click();
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
  if (width <= 900) {
    await key(page.getByRole("button", { name: "Close navigation", exact: true }), "Enter");
    await page.getByRole('dialog',{name:'Browse components',exact:true}).waitFor({state:'hidden'});
  }
  return "Fumadocs Command search, appearance and mobile keyboard close (where applicable)";
}
const run = {
  started: new Date().toISOString(),
  harnessFiles: docsHarnessFiles,
  harnessSha256: docsHarnessFingerprint(),
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
async function measurementPage(context, errors) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message }));
  page.on("console", message => {
    if (message.type() === "error") errors.push({ type: "console", message: message.text() });
  });
  return page;
}
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
          localStorage.setItem("cojeev-docs-theme", theme);
        },
        { theme },
      );
      const errors = [];
      const page = await measurementPage(context, errors);
      contexts.push({ context, page, width, theme, errors });
    }
  for (const entry of args["chrome-only"] ? [] : entries) {
    // These public compatibility routes deliberately mount the canonical studio.
    // Keep the requested route in evidence, but verify its actual component.
    const specimenId = ({ "aspect-ratio": "bento-grid", "data-table": "table" })[entry.name] ?? entry.name;
    const specimenEntry = registry.items.find(item => item.name === specimenId);
    const record = {
      id: entry.name,
      specimenId,
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
          .locator(`[data-example="${specimenId}"]`)
          .first()
          .waitFor({ timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const readiness = page.locator('[data-slot="preview"]').first();
        await readiness.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
        await readiness
          .getByRole("tab", { name: "Code", exact: true })
          .first()
          .click();
        await readiness.locator(':scope > .v-preview__frame > .v-preview__panel > [data-slot="code-block"] pre').waitFor();
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
          const examples = [...document.querySelectorAll("[data-example-role]")].map(
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
        const variantChoices = [...new Set(specimenEntry.meta.source.variants)];
        layout.expectedExamples = 1 + (variantChoices.length > 1 ? variantChoices.length : 0);
        assert.equal(
          layout.metrics.examples.length,
          layout.expectedExamples,
          "Interactive example and each declared approach should mount",
        );
        for (const [name, values] of [["Variant", specimenEntry.meta.source.variants]]) {
          const choices = [...new Set(values)];
          if (choices.length > 1) {
            const gallery = page.getByRole("region", { name: name === "Size" ? "Sizes" : "Variants", exact: true });
            assert.deepEqual(await gallery.locator('[data-example-role="gallery"]').evaluateAll((nodes, attributeName) => nodes.map(node => node.getAttribute(attributeName)), `data-${name.toLowerCase()}`), choices);
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
          timeout: 30000,
          caret: "initial",
          path: path.join(output, layout.screenshot),
        });
        if (width === 1440 && theme === "light") {
          layout.fullPageScreenshot = `${entry.name}-full.png`;
          await page.screenshot({
            timeout: 30000,
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
      // Destroy the old rendering target. An about:blank navigation can itself
      // stall behind a busy graphics page and retain its GPU resources.
      await page.close();
      surface.page = await measurementPage(surface.context, errors);
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
        detail: await sharedPreview(page, specimenId),
      };
    } catch (error) {
      record.preview = { status: "failed", detail: error.message };
    }
    try {
      const root = page.locator(
        `[data-example="${specimenId}"][data-example-role="interactive"]`,
      );
      await root.waitFor();
      await root.scrollIntoViewIfNeeded();
      if (tests[specimenId]) {
        const outcome = await tests[specimenId]({ page, root, entry: specimenEntry });
        record.behavior =
          typeof outcome === "string"
            ? { status: "pass", detail: outcome }
            : outcome;
      } else if (passive.has(specimenId))
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
    // The primary behavior page can keep animated examples and modal state
    // alive while the next entry's other five layouts run. Retire it too.
    await page.close();
    primary.page = await measurementPage(primary.context, primary.errors);
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
    } finally {
      // A shell check has no later consumer; do not leave six animated docs
      // pages rendering concurrently in headless Chromium.
      await surface.page.close();
    }
  }
} finally {
  run.ended = new Date().toISOString();
  run.revisionEnd = revision(true);
  run.harnessEndSha256 = docsHarnessFingerprint();
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
if (JSON.stringify(run.revisionStart) !== JSON.stringify(run.revisionEnd) || run.harnessSha256 !== run.harnessEndSha256) {
  console.error("Source changed during the documentation gate; rerun on one stable snapshot.");
  process.exitCode = 1;
}
if (failures.length || run.chrome.some((c) => c.status !== "pass"))
  process.exitCode = 1;
