import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const html = await (await fetch(`${base}/docs/sidebar/`)).text();
const css = (
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
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Sidebar,SidebarProvider,SidebarHeader,SidebarTrigger,SidebarContent,SidebarMenuButton,SidebarMenuLabel}from'./registry/cojeev/ui/sidebar';import{MotionDrawer}from'./registry/cojeev/ui/motion-drawer';const root=createRoot(document.getElementById('root'));window.changes=[];window.render=p=>flushSync(()=>root.render(<><SidebarProvider open={p.controlled?true:undefined} onOpenChange={v=>window.changes.push(v)}><Sidebar ref={n=>window.sidebarNode=n} appearance={p.appearance}><SidebarHeader><span>Notebook</span><SidebarTrigger ref={n=>window.triggerNode=n} disabled={p.disabled} onClick={e=>{if(p.cancel)e.preventDefault()}}/></SidebarHeader><SidebarContent><SidebarMenuButton href="#notes" ref={n=>window.linkNode=n} label="Notes" isActive><SidebarMenuLabel>Notes</SidebarMenuLabel></SidebarMenuButton><SidebarMenuButton asChild label="Local action"><button type="button" onClick={()=>window.localClicks=(window.localClicks??0)+1}>Local action</button></SidebarMenuButton></SidebarContent></Sidebar></SidebarProvider><MotionDrawer title="Notebook navigation" triggerLabel="Open notebook drawer"><div style={{height:1800}}>Long notebook index</div></MotionDrawer></>));window.render({appearance:'folio'});`,
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
    viewport: { width: 900, height: 850 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(
    '<div id="root" style="padding:40px;display:flex;align-items:start;gap:40px;height:660px"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const rail = page.locator("[data-slot=sidebar]"),
    trigger = page.getByRole("button", {
      name: "Collapse the rail",
      exact: true,
    });
  const b = await trigger.boundingBox();
  assert.ok(b.width >= 44 && b.height >= 44, "Collapse target is at least44px");
  assert.equal(await rail.evaluate((e) => e === window.sidebarNode), true);
  assert.equal(await trigger.evaluate((e) => e === window.triggerNode), true);
  await trigger.press("Space");
  assert.equal(await rail.getAttribute("data-state"), "collapsed");
  await page
    .getByRole("button", { name: "Expand the rail", exact: true })
    .press("Enter");
  assert.equal(await rail.getAttribute("data-state"), "expanded");
  await page.evaluate(() =>
    window.render({ appearance: "index", cancel: true }),
  );
  await trigger.click();
  assert.equal(await rail.getAttribute("data-state"), "expanded");
  await page.evaluate(() =>
    window.render({ appearance: "folio", disabled: true }),
  );
  await trigger.dispatchEvent("click");
  assert.equal(await rail.getAttribute("data-state"), "expanded");
  await page.evaluate(() =>
    window.render({ appearance: "folio", controlled: true }),
  );
  await trigger.click();
  assert.equal(await rail.getAttribute("data-state"), "expanded");
  assert.equal(await page.evaluate(() => window.changes.at(-1)), false);
  const link = page.getByRole("link", { name: "Notes", exact: true });
  assert.equal(await link.getAttribute("href"), "#notes");
  assert.equal(await link.getAttribute("aria-current"), "page");
  assert.equal(await link.evaluate((e) => e === window.linkNode), true);
  await page.getByRole("button", { name: "Local action", exact: true }).click();
  assert.equal(await page.evaluate(() => window.localClicks), 1);
  const opener = page.getByRole("button", {
    name: "Open notebook drawer",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Notebook navigation" });
  await dialog.waitFor();
  const scrollbar = dialog.getByRole("scrollbar");
  await scrollbar.waitFor();
  assert.equal(await scrollbar.getAttribute("aria-hidden"), null);
  const body = dialog.locator(".v-motion-drawer__body");
  await body.hover();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(180);
  assert.ok((await body.evaluate((e) => e.scrollTop)) > 0);
  assert.equal(
    await body.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    "none",
  );
  await dialog.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await opener.evaluate((e) => document.activeElement === e),
    true,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const beforeLink = await link.boundingBox();
  for (const offset of [2, beforeLink.width / 2, beforeLink.width - 2]) {
    await page.mouse.move(
      beforeLink.x + offset,
      beforeLink.y + beforeLink.height / 2,
    );
    assert.equal(
      await link.evaluate(
        (e, point) =>
          document
            .elementFromPoint(...point)
            ?.closest('[data-slot="sidebar-menu-button"]') === e,
        [beforeLink.x + offset, beforeLink.y + beforeLink.height / 2],
      ),
      true,
    );
  }
  assert.deepEqual(await link.boundingBox(), beforeLink);
  await rail
    .locator(":scope>[data-morph-body],:scope>svg [data-morph-body]")
    .waitFor({ state: "attached" });
  await rail.hover({ position: { x: 8, y: 8 } });
  const moving = new Set();
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(30);
    moving.add(
      await rail.locator(":scope>svg [data-morph-body]").getAttribute("d"),
    );
  }
  assert.ok(moving.size > 2, "Folio contour genuinely responds");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(250);
  assert.equal(
    await rail.evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  const quiet = await rail
    .locator(":scope>svg [data-morph-body]")
    .getAttribute("d");
  await page.waitForTimeout(150);
  assert.equal(
    await rail.locator(":scope>svg [data-morph-body]").getAttribute("d"),
    quiet,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Sidebar native44px/ref/Slot/controlled/cancel/disabled plus owned Drawer wheel/focus return",
  );
} finally {
  await browser.close();
}
