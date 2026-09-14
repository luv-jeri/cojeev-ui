import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{Pagination,PaginationContent,PaginationItem,PaginationLink}from'./registry/cojeev/ui/pagination';
import{Tabs,TabsList,TabsTrigger,TabsContent}from'./registry/cojeev/ui/tabs';
import{NavigationMenu,NavigationMenuList,NavigationMenuItem,NavigationMenuTrigger,NavigationMenuContent,NavigationMenuLink,NavigationMenuViewport}from'./registry/cojeev/ui/navigation-menu';
import{setMotionMode,setFlowSettings}from'./registry/cojeev/motion/settings';
const root=createRoot(document.getElementById('root'));window.calls=[];window.links=0;
window.show=(total=12)=>flushSync(()=>root.render(<div style={{display:'grid',gap:32}}>
<Pagination aria-label="Controlled" page={3} totalPages={total} onPageChange={n=>window.calls.push(n)} ref={node=>window.navRef=node}/>
<Pagination aria-label="Browse" defaultPage={2} totalPages={12} appearance="jump"/>
<Pagination aria-label="Custom"><PaginationContent><PaginationItem><PaginationLink asChild isActive ref={node=>window.linkRef=node}><a href="#destination" onClick={()=>window.links++}>Chapter link</a></PaginationLink></PaginationItem></PaginationContent></Pagination>
<Tabs defaultValue="a" variant="notebook"><TabsList aria-label="Sections"><TabsTrigger value="a" asChild><button>First</button></TabsTrigger><TabsTrigger value="b" disabled>Unavailable</TabsTrigger><TabsTrigger value="c" ref={node=>window.tabRef=node}>Last</TabsTrigger></TabsList><TabsContent value="a"><input aria-label="First draft"/></TabsContent><TabsContent value="b">Unavailable content</TabsContent><TabsContent value="c"><button>Last action</button></TabsContent></Tabs>
<NavigationMenu aria-label="Popup" orientation="horizontal" appearance="shelf"><NavigationMenuList><NavigationMenuItem value="places"><NavigationMenuTrigger asChild><button>Places</button></NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="#destination" onClick={()=>window.links++}>Visit the notebook</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem><NavigationMenuItem value="disabled"><NavigationMenuTrigger disabled>Unavailable places</NavigationMenuTrigger><NavigationMenuContent>Not available</NavigationMenuContent></NavigationMenuItem></NavigationMenuList><NavigationMenuViewport/></NavigationMenu>
</div>));window.quiet=kind=>{setMotionMode(kind==='motion'?'off':'subtle');setFlowSettings({variant:kind==='flow'?'off':'glide'});};window.show();`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const html = await fetch(`${base}/docs/tabs/`).then((r) => r.text());
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map((m) =>
      fetch(new URL(m[1], base)).then((r) => r.text()),
    ),
  )
).join("\n");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<div id="root" style="padding:32px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const controlled = page.getByRole("navigation", { name: "Controlled" });
  await controlled.getByRole("button", { name: "Page 4", exact: true }).click();
  assert.equal(await controlled.getAttribute("data-page"), "3");
  assert.deepEqual(await page.evaluate(() => window.calls), [4]);
  assert.ok(await controlled.evaluate((node) => node === window.navRef));
  const nextButton = controlled.getByRole("button", {
    name: "Next",
    exact: true,
  });
  await nextButton.hover();
  const fixed = await nextButton.boundingBox();
  await page.mouse.down();
  const pressBounds = await nextButton.evaluate(async (node) => {
    const boxes = [];
    for (let i = 0; i < 20; i++) {
      await new Promise(requestAnimationFrame);
      boxes.push(node.getBoundingClientRect().toJSON());
    }
    return boxes;
  });
  await page.mouse.up();
  assert.ok(
    pressBounds.every(
      (box) =>
        Math.abs(box.x - fixed.x) < 0.5 &&
        Math.abs(box.y - fixed.y) < 0.5 &&
        Math.abs(box.width - fixed.width) < 0.5 &&
        Math.abs(box.height - fixed.height) < 0.5,
    ),
    "holding a pagination control must not shrink or move its hit rectangle",
  );
  const browse = page.getByRole("navigation", { name: "Browse" });
  const input = browse.getByRole("spinbutton", { name: "Go to page" });
  await input.fill("13");
  await input.press("Enter");
  assert.equal(await browse.getAttribute("data-page"), "2");
  assert.match(await browse.innerText(), /Choose a whole page from 1 to 12/);
  assert.equal(await input.getAttribute("aria-invalid"), "true");
  await input.fill("12");
  await input.press("Enter");
  assert.equal(await browse.getAttribute("data-page"), "12");
  assert.ok(
    await browse
      .getByRole("button", { name: "Next", exact: true })
      .isDisabled(),
  );
  await input.fill("1");
  await input.press("Enter");
  assert.ok(
    await browse
      .getByRole("button", { name: "Previous", exact: true })
      .isDisabled(),
  );
  const link = page.getByRole("link", { name: "Chapter link" });
  assert.ok(
    await link.evaluate(
      (node) => node === window.linkRef && node.tagName === "A",
    ),
  );
  await link.focus();
  await link.press("Enter");
  assert.equal(await page.evaluate(() => window.links), 1);
  const first = page.getByRole("tab", { name: "First" }),
    last = page.getByRole("tab", { name: "Last" });
  assert.equal(await first.evaluate((node) => node.tagName), "BUTTON");
  assert.ok(await last.evaluate((node) => node === window.tabRef));
  for (const quiet of ["normal", "motion", "flow"]) {
    await page.evaluate((kind) => window.quiet(kind), quiet);
    await first.focus();
    await first.press("ArrowRight");
    await page.waitForFunction(
      () =>
        document.querySelector('[role="tab"][data-state="active"]')
          ?.textContent === "Last",
    );
    assert.equal(await last.getAttribute("aria-selected"), "true");
    assert.equal(await page.getByRole("tabpanel").count(), 1);
    const retained = page.locator('[data-motion-exiting="true"]');
    assert.ok(
      await retained.evaluateAll((nodes) =>
        nodes.every(
          (node) => node.inert && node.getAttribute("aria-hidden") === "true",
        ),
      ),
    );
    await last.press("Home");
    await page.waitForFunction(
      () =>
        document.querySelector('[role="tab"][data-state="active"]')
          ?.textContent === "First",
    );
    assert.equal(await first.getAttribute("aria-selected"), "true");
  }
  await page.evaluate(() => window.show(NaN));
  assert.equal(await controlled.getAttribute("data-page"), "1");
  assert.ok(
    await controlled
      .getByRole("button", { name: "Previous", exact: true })
      .isDisabled(),
  );
  assert.ok(
    await controlled
      .getByRole("button", { name: "Next", exact: true })
      .isDisabled(),
  );
  const menu = page.getByRole("navigation", { name: "Popup" });
  const places = menu.getByRole("button", { name: "Places", exact: true });
  assert.ok(
    await menu.getByRole("button", { name: "Unavailable places" }).isDisabled(),
  );
  for (const mode of ["normal", "motion", "flow"]) {
    await page.evaluate((kind) => window.quiet(kind), mode);
    await places.focus();
    await places.press("Enter");
    const destination = menu.getByRole("link", { name: "Visit the notebook" });
    await destination.waitFor();
    await destination.focus();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[aria-label="Popup"] [data-slot="navigation-menu-trigger"]',
          )
          ?.getAttribute("aria-expanded") === "false",
    );
    assert.ok(
      await places.evaluate(async (node) => {
        for (let i = 0; i < 20; i++) {
          await new Promise(requestAnimationFrame);
          if (node.getAttribute("aria-expanded") !== "false") return false;
        }
        return true;
      }),
    );
    assert.ok(await places.evaluate((node) => node === document.activeElement));
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS native pagination bounds/ref/controlled refusal/Jump validation/custom link, Tabs Slot/ref/disabled skip/single active panel and quiet modes",
  );
} finally {
  await browser.close();
}
