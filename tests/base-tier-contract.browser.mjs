import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

/**
 * Base-tier contract gate for the 24 components that shipped a contract and
 * isolation fixtures but no browser gate of their own (W02B, Q04.08–Q04.10).
 *
 * Method matches the sibling suites: bundle the real registry sources with
 * esbuild, render them into a clean page carrying the documentation CSS, and
 * assert only contracts the component itself declares — roles, state, keyboard
 * paths, focus return, and the data-slot boundary consumers install against.
 *
 * Overlays are exercised ONE PER PAGE. Mounting three modal dialogs at once makes
 * Radix's focus scopes contend, which produces a focus-return failure that says
 * nothing about any single component; a gate must not report that as a defect.
 */
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogAction,AlertDialogCancel} from './registry/cojeev/ui/alert-dialog';
import {Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription,SheetClose} from './registry/cojeev/ui/sheet';
import {Drawer,DrawerTrigger,DrawerContent,DrawerTitle,DrawerClose} from './registry/cojeev/ui/drawer';
import {Popover,PopoverTrigger,PopoverContent,PopoverClose} from './registry/cojeev/ui/popover';
import {Collapsible,CollapsibleTrigger,CollapsibleContent,CollapsibleIndicator} from './registry/cojeev/ui/collapsible';
import {ToggleGroup,ToggleGroupItem} from './registry/cojeev/ui/toggle-group';
import {Separator} from './registry/cojeev/ui/separator';
import {Label,Stats,Stat} from './registry/cojeev/ui/label';
import {Bubble,BubbleRow,BubbleContent,BubbleTime} from './registry/cojeev/ui/bubble';
import {Typography,Hero,SectionTitle,Body,BodySecondary,Meta} from './registry/cojeev/ui/typography';
import {Card,CardHeader,CardTitle,CardContent,CardFooter} from './registry/cojeev/ui/card';
import {ButtonGroup,ButtonGroupItem} from './registry/cojeev/ui/button-group';
import {Empty,EmptyTitle,EmptyDescription} from './registry/cojeev/ui/empty';
import {Kbd} from './registry/cojeev/ui/kbd';
import {Marker} from './registry/cojeev/ui/marker';
import {InputGroup} from './registry/cojeev/ui/input-group';
import {InputOTP,InputOTPGroup,InputOTPSlot} from './registry/cojeev/ui/input-otp';
import {Attachment,AttachmentName,AttachmentMeta} from './registry/cojeev/ui/attachment';
import {MessageScroller,MessageScrollerJump} from './registry/cojeev/ui/message-scroller';
import {Direction} from './registry/cojeev/ui/direction';
import {ResizablePanelGroup,ResizablePanel,ResizableHandle} from './registry/cojeev/ui/resizable';
import {Dropzone} from './registry/cojeev/ui/dropzone';
import {Combobox} from './registry/cojeev/ui/combobox';
import {Menubar,MenubarMenu,MenubarTrigger,MenubarContent,MenubarItem} from './registry/cojeev/ui/menubar';

const root = createRoot(document.getElementById('root'));

/* Each overlay gets a page of its own so focus scopes cannot contend. */
const overlays = {
  'alert-dialog': <AlertDialog><AlertDialogTrigger>Open alert</AlertDialogTrigger>
    <AlertDialogContent><AlertDialogTitle>Delete run</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
      <AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogContent></AlertDialog>,
  sheet: <Sheet><SheetTrigger>Open sheet</SheetTrigger>
    <SheetContent><SheetTitle>Filters</SheetTitle><SheetDescription>Narrow the list.</SheetDescription>
      <SheetClose>Close sheet</SheetClose></SheetContent></Sheet>,
  drawer: <Drawer><DrawerTrigger>Open drawer</DrawerTrigger>
    <DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerClose>Close drawer</DrawerClose></DrawerContent></Drawer>,
  popover: <Popover><PopoverTrigger>Toggle popover</PopoverTrigger>
    <PopoverContent><p>Popover body</p><PopoverClose>Close popover</PopoverClose></PopoverContent></Popover>,
  collapsible: <Collapsible><CollapsibleTrigger>Toggle section</CollapsibleTrigger>
    <CollapsibleIndicator/>
    <CollapsibleContent><p>Collapsed payload</p></CollapsibleContent></Collapsible>,
};

/* Everything non-modal shares one page; nothing here opens a focus trap. */
const rest = <>
  <ToggleGroup type="single" defaultValue="a" aria-label="Density">
    <ToggleGroupItem value="a">Comfortable</ToggleGroupItem>
    <ToggleGroupItem value="b">Compact</ToggleGroupItem></ToggleGroup>

  <Separator orientation="horizontal" decorative />
  <Separator orientation="vertical" />

  <Label htmlFor="tier-field">Field label</Label>
  <input id="tier-field" />
  <Stats><Stat>14 runs</Stat></Stats>

  <div data-bubble-stage="" style={{display:'block',width:'420px'}}>
    <Bubble><BubbleRow><BubbleContent>Ship it</BubbleContent></BubbleRow><BubbleTime>09:41</BubbleTime></Bubble></div>

  <Typography variant="prose"><Hero>8.8</Hero><SectionTitle>Section</SectionTitle>
    <Body>Body copy</Body><BodySecondary>Secondary</BodySecondary><Meta>Meta</Meta></Typography>

  <Card><CardHeader><CardTitle>Title</CardTitle></CardHeader>
    <CardContent>Content</CardContent><CardFooter>Footer</CardFooter></Card>

  <ButtonGroup defaultValue="one" aria-label="Actions">
    <ButtonGroupItem value="one">One</ButtonGroupItem>
    <ButtonGroupItem value="two">Two</ButtonGroupItem></ButtonGroup>
  <Empty><EmptyTitle>Nothing yet</EmptyTitle><EmptyDescription>Create the first run.</EmptyDescription></Empty>
  <Kbd>K</Kbd><Marker>New</Marker>
  <InputGroup><input aria-label="Grouped" /></InputGroup>
  <InputOTP maxLength={4} aria-label="Code"><InputOTPGroup>
    <InputOTPSlot index={0}/><InputOTPSlot index={1}/><InputOTPSlot index={2}/><InputOTPSlot index={3}/>
  </InputOTPGroup></InputOTP>
  <Attachment><AttachmentName>brief.pdf</AttachmentName><AttachmentMeta>240 KB</AttachmentMeta></Attachment>
  <MessageScroller aria-label="Transcript"><p>Scrolled</p><MessageScrollerJump /></MessageScroller>
  <Direction dir="rtl"><span>rtl island</span></Direction>
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel defaultSize={50}>Left</ResizablePanel><ResizableHandle withHandle />
    <ResizablePanel defaultSize={50}>Right</ResizablePanel></ResizablePanelGroup>
  <Dropzone aria-label="Upload" />
  <Combobox aria-label="Pick one" options={[{value:'a',label:'Alpha'},{value:'b',label:'Beta'}]} />
  <Menubar><MenubarMenu><MenubarTrigger>File</MenubarTrigger>
    <MenubarContent><MenubarItem>New</MenubarItem></MenubarContent></MenubarMenu></Menubar>
</>;

window.renderOverlay = (name) => flushSync(() => root.render(overlays[name]));
window.renderRest = () => flushSync(() => root.render(rest));
`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  define: {'process.env.NODE_ENV': '"production"'},
  logLevel: 'silent',
});

const browser = await chromium.launch();
const origin = process.env.DOCS_ORIGIN ?? process.env.DOCS_BASE_URL ?? 'http://127.0.0.1:4320';
const html = await (await fetch(`${origin}/cojeev-ui/docs/button/`)).text();
const links = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1]);
const css = (await Promise.all(links.map(async (href) => (await fetch(new URL(href, origin))).text()))).join('\n');

const consoleErrors = [];
let page;
const freshPage = async () => {
  if (page) await page.close();
  page = await browser.newPage({reducedMotion: 'reduce'});
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  /* The handoff fixtures render under data-mode="light"; the tokens are mode-scoped
     (--v-ink is #111111 light and #FBF4E6 dark), so the gate must state the mode. */
  await page.setContent('<div id="root" style="width:1024px;padding:20px"></div>');
  await page.evaluate(() => { document.documentElement.setAttribute('data-mode', 'light'); });
  await page.addStyleTag({content: css});
  await page.addScriptTag({content: bundle.outputFiles[0].text});
  return page;
};

try {
  /* ---- overlays: closed at rest, open on the trigger, labelled, focus returns ---- */
  for (const [name, trigger, rootSlot, titleSlot, closeName] of [
    ['alert-dialog', 'Open alert', '[data-slot="alert-dialog-content"]', '[data-slot="alert-dialog-title"]', null],
    ['sheet', 'Open sheet', '[data-slot="sheet-content"]', '[data-slot="sheet-title"]', 'Close sheet'],
    ['drawer', 'Open drawer', '[data-slot="drawer-content"]', '[data-slot="drawer-title"]', 'Close drawer'],
    ['popover', 'Toggle popover', '[data-slot="popover-content"]', null, 'Close popover'],
  ]) {
    const p = await freshPage();
    await p.evaluate((which) => window.renderOverlay(which), name);

    assert.equal(await p.locator(rootSlot).count(), 0, `${name} content stays unmounted until opened`);
    const opener = p.getByRole('button', {name: trigger});
    await opener.click();
    await p.waitForSelector(rootSlot, {state: 'visible'});
    if (titleSlot) assert.equal(await p.locator(titleSlot).count(), 1, `${name} exposes a labelled title`);

    const content = p.locator(rootSlot);
    if (name !== 'popover') {
      assert.equal(await content.getAttribute('role'), name === 'alert-dialog' ? 'alertdialog' : 'dialog', `${name} carries its dialog role`);
      assert.ok((await content.getAttribute('aria-labelledby')) || (await content.getAttribute('aria-label')), `${name} is labelled for assistive tech`);
    }
    const box = await content.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, `${name} opens with real geometry`);

    if (closeName && name !== 'alert-dialog') {
      await p.getByRole('button', {name: closeName}).click();
    } else {
      await p.keyboard.press('Escape');
    }
    await p.waitForSelector(rootSlot, {state: 'detached'});
    await p.waitForTimeout(400);
    assert.ok(
      await opener.evaluate((node) => node === document.activeElement),
      `${name} returns focus to its trigger element after closing (active: ${await p.evaluate(() => document.activeElement?.tagName + '/' + (document.activeElement?.textContent ?? '').slice(0, 24))})`,
    );
    assert.equal(consoleErrors.length, 0, `${name} produced console errors: ${consoleErrors.join(' | ')}`);
  }

  /* ---- collapsible: aria-expanded tracks the panel in both directions ---- */
  {
    const p = await freshPage();
    await p.evaluate(() => window.renderOverlay('collapsible'));
    const trigger = p.getByRole('button', {name: 'Toggle section'});
    /* Radix's Collapsible publishes data-state and unmounts the panel; it does not
       emit aria-controls, so the gate asserts the contract the component declares. */
    assert.equal(await trigger.getAttribute('data-state'), 'closed', 'collapsible starts closed');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'collapsible reports collapsed');
    assert.equal(await p.locator('[data-slot="collapsible-content"]').isVisible(), false, 'collapsed payload is not visible');
    await trigger.click();
    assert.equal(await trigger.getAttribute('data-state'), 'open', 'collapsible opens on activation');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true', 'collapsible reports expanded');
    await p.waitForSelector('[data-slot="collapsible-content"]', {state: 'visible'});
    await trigger.press('Space');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'Space collapses it again');
  }

  /* ---- the non-modal tier mounts clean and publishes its boundaries ---- */
  {
    const p = await freshPage();
    await p.evaluate(() => window.renderRest());
    assert.equal(consoleErrors.length, 0, `non-modal tier produced console errors: ${consoleErrors.join(' | ')}`);

    /* toggle group: single-select keeps exactly one active item */
    const toggles = p.locator('[data-slot="toggle-group-item"]');
    assert.equal(await toggles.count(), 2, 'toggle group renders both items');
    const active = async () => toggles.evaluateAll((nodes) => nodes.filter((n) => n.getAttribute('data-state') === 'on' || n.getAttribute('aria-pressed') === 'true' || n.getAttribute('aria-checked') === 'true').length);
    assert.equal(await active(), 1, 'single toggle group starts with one active item');
    await toggles.nth(1).click();
    assert.equal(await active(), 1, 'single toggle group never holds two active items');

    /* typography: display sizes resolve from tokens/clamp, never a rem step-down.
       The handoff has no 3rem (48px) hero, which is what the candidate used to
       swap in at <=640px; assert the token-derived set instead of one number,
       because the hero is contextual (.v-prose .v-hero is 72px, bare is 44px). */
    const heroSize = await p.locator('.v-hero').first().evaluate((node) => getComputedStyle(node).fontSize);
    assert.ok(['44px', '64px', '68px', '72px', '96px'].includes(heroSize), `hero resolves to a handoff token/clamp size (saw ${heroSize})`);
    const bodyLine = await p.locator('.v-body-2').first().evaluate((node) => getComputedStyle(node).lineHeight);
    assert.equal(bodyLine, '21.75px', `secondary body uses --lh-body (saw ${bodyLine})`);

    /* bubble: ink surface, and the bubble keeps its own width cap. Measured inside a
       .v-chat root because the cap is a percentage, so it needs a resolvable column. */
    const chat = await p.locator('.v-chat').first().evaluate((node) => getComputedStyle(node).backgroundColor);
    assert.equal(chat, 'rgb(17, 17, 17)', `bubble root paints the ink surface (saw ${chat})`);
    /* Inside a .v-chat root the bubble deliberately releases its own cap: the row
       (.v-chat__row) carries max-width:82% and the bubble fills it. The bubble's own
       min(80%,52ch) applies only outside a chat root. Both are the reference's rules. */
    const bubbleMax = await p.locator('.v-bubble').first().evaluate((node) => getComputedStyle(node).maxWidth);
    assert.equal(bubbleMax, 'none', `bubble releases its cap inside .v-chat as the reference does (saw ${bubbleMax})`);
    const rowMax = await p.locator('.v-chat__row').first().evaluate((node) => getComputedStyle(node).maxWidth);
    assert.ok(rowMax.endsWith('%'), `the chat row, not the bubble, carries the width cap (saw ${rowMax})`);

    /* separator / label: the accessible boundary contracts */
    const separators = p.locator('[data-slot="separator"]');
    assert.equal(await separators.count(), 2, 'both separators render');
    const decorativeRole = await separators.first().getAttribute('role');
    assert.ok(decorativeRole === 'none' || decorativeRole === 'presentation', 'decorative separator is hidden from the a11y tree');
    assert.equal(await p.getByText('Field label').getAttribute('for'), 'tier-field', 'label targets its control');

    /* owned data-slot boundaries that consumers install against */
    for (const slot of ['card', 'card-header', 'card-title', 'card-content', 'card-footer', 'empty', 'empty-title', 'empty-description', 'kbd', 'marker', 'button-group', 'input-group', 'attachment', 'message-scroller', 'direction', 'dropzone', 'combobox', 'menubar', 'resizable', 'resizable-panel', 'resizable-handle', 'label', 'label-stats', 'label-stat', 'toggle-group-item', 'separator', 'typography', 'bubble', 'bubble-item', 'bubble-content', 'bubble-time']) {
      assert.ok(await p.locator(`[data-slot="${slot}"]`).count() >= 1, `${slot} publishes its data-slot boundary`);
    }

    /* no cosmetic prop leaks into the DOM (registry consumer contract) */
    assert.equal(await p.locator('[appearance],[radius]').count(), 0, 'cosmetic props never reach the DOM');
  }

  assert.equal(consoleErrors.length, 0, `interaction produced console errors: ${consoleErrors.join(' | ')}`);
  console.log('PASS 24 base components mount, expose data-slot boundaries, and honour overlay, collapsible, toggle, typography and bubble contracts');
} finally {
  await browser.close();
}
