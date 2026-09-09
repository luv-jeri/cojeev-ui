/** Library-owned table membership proof using the existing docs CSS and a real React fixture. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const args = Object.fromEntries(
  process.argv.slice(2).map((x) => {
    const [k, ...v] = x.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const base = (args.url || "http://127.0.0.1:4320/cojeev-ui").replace(
  /\/$/,
  "",
);
const output = path.resolve(
  args.output || "output/playwright/data-table-lifecycle",
);
fs.mkdirSync(output, { recursive: true });
const bundle = await build({
  stdin: {
    sourcefile: "data-table-lifecycle.tsx",
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {DataTable} from './registry/cojeev/ui/data-table';import {Button} from './registry/cojeev/ui/button';
import {Pagination} from './registry/cojeev/ui/pagination';
import {Command,CommandInput,CommandList,CommandGroup,CommandItem,CommandEmpty} from './registry/cojeev/ui/command';
import {Combobox} from './registry/cojeev/ui/combobox';
import {setMotionMode} from './registry/cojeev/motion/settings';
const records=['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot'].map((name,index)=>({id:index+1,name,odd:index%2===0}));
const filters=[{id:'odd',label:'Odd',predicate:r=>r.odd},{id:'none',label:'No records',predicate:()=>false}];
function Fixture(){const [epoch,reset]=React.useReducer(n=>n+1,0);const [ids,setIds]=React.useState(true);const [events,setEvents]=React.useState([]);const [page,setPage]=React.useState(1);const [custom,setCustom]=React.useState(false);const [external,setExternal]=React.useState(false);const [label,setLabel]=React.useState('Alpha');const [selection,setSelection]=React.useState('');const [combo,setCombo]=React.useState('alpha');
const columns=[{id:'name',header:'Name',accessorKey:'name',sortValue:r=>r.name},{id:'action',header:'Action',cell:r=><Button size='sm' variant='ghost' onClick={()=>setEvents(old=>[...old,'inspect:'+r.id])}>Inspect {r.name}</Button>}];
return <main style={{maxWidth:1040,margin:'0 auto',padding:24,color:'var(--v-text)',background:'var(--v-canvas)'}}>
<h1 style={{fontFamily:'var(--font-display)',fontSize:28,marginBottom:16}}>Membership audit fixture</h1>
<div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:20}}><Button onClick={()=>{reset();setEvents([])}}>Reset fixture</Button><Button onClick={()=>setMotionMode('subtle')}>Motion on</Button><Button onClick={()=>setMotionMode('off')}>Motion off</Button><label><input aria-label='Use record ids' type='checkbox' checked={ids} onChange={e=>{setIds(e.target.checked);reset()}}/> Use record ids</label></div>
<DataTable key={epoch} data={records} columns={columns} filters={filters} pageSize={2} getRowId={ids?(r,index)=>r.id+':'+index:undefined} caption='Audit records' onRowClick={r=>setEvents(old=>[...old,'row:'+r.id])}/>
<output id='table-events' style={{display:'block',marginTop:16}}>{events.join(',')}</output>
<section id='pagination-fixture' style={{marginTop:32}}><h2>Range membership</h2><Pagination page={page} totalPages={12} onPageChange={setPage}/></section>
<section id='command-fixture' style={{marginTop:32}}><h2>Command membership</h2><div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}><label><input type='checkbox' aria-label='Custom command filter' checked={custom} onChange={e=>setCustom(e.target.checked)}/> Custom filter</label><label><input type='checkbox' aria-label='External command filter' checked={external} onChange={e=>setExternal(e.target.checked)}/> External filter</label><Button onClick={()=>setLabel('Alpha renamed')}>Rename command label</Button></div><Command label='Audit command' shouldFilter={!external} filter={custom?((value,search)=>search==='rank'?(value==='bravo'?1:.5):(value.startsWith(search)?1:0)):undefined}><CommandInput aria-label='Command query'/><CommandList><CommandEmpty>No commands found</CommandEmpty><CommandGroup heading='Actions'><CommandItem value='alpha' keywords={['first']} onSelect={setSelection}>{label}</CommandItem><CommandItem value='bravo' onSelect={setSelection}>Bravo</CommandItem><CommandItem value='gamma' disabled>Gamma disabled</CommandItem></CommandGroup><CommandItem value='pinned' forceMount onSelect={setSelection}>Pinned</CommandItem></CommandList></Command><output id='command-selection'>{selection}</output></section>
<section id='combobox-fixture' style={{marginTop:32}}><h2>Combobox membership</h2><Combobox aria-label='Collection query' value={combo} onValueChange={setCombo} options={[{value:'alpha',label:'Collection Alpha'},{value:'bravo',label:'Collection Bravo'},{value:'gamma',label:'Collection Gamma',disabled:true}]}/><output id='combobox-selection'>{combo}</output></section>
</main>}
for(const child of document.body.children)if(child instanceof HTMLElement)child.hidden=true;
const host=document.createElement('div');host.id='lifecycle-fixture';document.body.append(host);createRoot(host).render(<Fixture/>);
`,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const browser = await chromium.launch({ headless: true });
const result = { startedAt: new Date().toISOString(), checks: [], errors: [] };
const save = () =>
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
async function settled(root) {
  const until = Date.now() + 3000;
  while (await root.locator("[data-motion-exiting=true]").count()) {
    assert(Date.now() < until, "Exits settle");
    await root.page().waitForTimeout(25);
  }
  await root.page().waitForTimeout(380);
}
async function sample(root) {
  return root
    .locator("[data-slot=table-body] > tr")
    .evaluateAll((rows) =>
      rows.map((e) => ({
        id: e.dataset.rowId,
        tag: e.tagName,
        exiting: e.dataset.motionExiting === "true",
        inert: e.inert,
        hidden: e.getAttribute("aria-hidden"),
        opacity: getComputedStyle(e).opacity,
        children: [...e.children].map((x) => x.tagName),
      })),
    );
}
async function retained(root) {
  const rows = await sample(root),
    exits = rows.filter((x) => x.exiting);
  assert(exits.length, "A removed row is retained during exit");
  assert(exits.every((x) => x.inert && x.hidden === "true"));
  assert(
    rows.every((x) => x.tag === "TR" && x.children.every((c) => c === "TD")),
  );
  return rows;
}
try {
  for (const [width, theme] of [
    [390, "dark"],
    [1440, "light"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", (e) => result.errors.push(e.message));
    await page.addInitScript((theme) => {
      localStorage.setItem("cojeev-docs-theme", theme);
      localStorage.removeItem("v-motion");
      localStorage.removeItem("v-flow-v1");
    }, theme);
    await page.goto(base + "/docs/data-table/");
    await page
      .locator("[data-slot=tabs-list][data-flow-owned]")
      .first()
      .waitFor();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const fixture = page.locator("#lifecycle-fixture");
    const table = fixture.locator("[data-slot=data-table]");
    await table.locator('[data-row-id="1:0"]').waitFor();
    await settled(table);
    if (args.only === "followup") {
      const nav = fixture.locator("#pagination-fixture [data-slot=pagination]");
      await nav.getByRole("button", { name: "12", exact: true }).click();
      await settled(nav);
      await nav.getByRole("button", { name: "Previous", exact: true }).click();
      await settled(nav);
      await nav.getByRole("button", { name: "1", exact: true }).click();
      const exits = await nav
        .locator("[data-motion-exiting=true]")
        .evaluateAll((es) =>
          es.map((e) => ({
            text: e.textContent,
            inert: e.inert,
            current: e.getAttribute("aria-current"),
          })),
        );
      assert(exits.some((x) => x.text === "11"));
      assert(exits.every((x) => x.inert && x.current === null));
      await settled(nav);
      const command = fixture.locator("#command-fixture"),
        list = command.locator("[data-slot=command-list]"),
        query = command.getByRole("combobox");
      await fixture
        .getByRole("button", { name: "Rename command label" })
        .click();
      await query.fill("Alpha");
      await page.waitForTimeout(30);
      const visible = await list
        .locator("[cmdk-list-sizer]")
        .evaluate((e) => ({
          display: getComputedStyle(e).display,
          opacity: getComputedStyle(e).opacity,
          height: e.getBoundingClientRect().height,
        }));
      assert.equal(visible.display, "grid");
      assert(visible.height > 0 && Number(visible.opacity) < 1);
      await page.waitForTimeout(240);
      const row = list.locator("[cmdk-item][data-value=alpha]");
      await row.hover();
      await page.waitForTimeout(250);
      const labelLayout = await row.evaluate((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const text = range.getBoundingClientRect(),
          rect = e.getBoundingClientRect();
        return {
          labelRight: text.right,
          rowRight: rect.right,
          grid: getComputedStyle(e).gridTemplateColumns,
        };
      });
      assert(labelLayout.rowRight - labelLayout.labelRight >= 30);
      await command.screenshot({
        path: path.join(output, "command-" + width + "-" + theme + ".png"),
      });
      result.checks.push({
        width,
        theme,
        exitingCurrentCleared: exits,
        actualContainerPaint: visible,
        textOnlyLayout: labelLayout,
      });
      save();
      await context.close();
      continue;
    }

    const first = table.locator('[data-row-id="1:0"]');
    await first.locator("td").first().click();
    await first.focus();
    await page.keyboard.press("Enter");
    await first.getByRole("button", { name: "Inspect Alpha" }).click();
    await first.getByRole("button", { name: "Inspect Alpha" }).press("Enter");
    assert.equal(
      await fixture.locator("#table-events").innerText(),
      "row:1,row:1,inspect:1,inspect:1",
    );
    await table.getByRole("button", { name: /^Odd/ }).click();
    const filterExit = await retained(table);
    await table.getByRole("button", { name: /^All/ }).click();
    await settled(table);
    assert.deepEqual(
      (await sample(table)).map((x) => x.id),
      ["1:0", "2:1"],
    );
    await table.getByRole("button", { name: "Next", exact: true }).click();
    const pageExit = await retained(table);
    await table.getByRole("button", { name: "Previous", exact: true }).click();
    await settled(table);
    assert.deepEqual(
      (await sample(table)).map((x) => x.id),
      ["1:0", "2:1"],
    );
    await table.getByRole("button", { name: /^No records/ }).click();
    const emptyEnter = table.locator("[data-slot=data-table-empty]");
    await emptyEnter.waitFor();
    assert.equal(await emptyEnter.getAttribute("data-motion-surface"), "rise");
    await settled(table);
    await emptyEnter.getByRole("button", { name: "Clear filters" }).click();
    const emptyExit = await emptyEnter.evaluate((e) => ({
      exiting: e.dataset.motionExiting,
      inert: e.inert,
      hidden: e.getAttribute("aria-hidden"),
    }));
    assert.deepEqual(emptyExit, {
      exiting: "true",
      inert: true,
      hidden: "true",
    });
    await settled(table);
    await table.getByRole("button", { name: "Name", exact: true }).click();
    await settled(table);
    await table.getByRole("button", { name: "Name ↑", exact: true }).click();
    await settled(table);
    assert.deepEqual(
      (await sample(table)).map((x) => x.id),
      ["6:5", "5:4"],
    );
    await fixture.getByRole("checkbox", { name: "Use record ids" }).uncheck();
    await settled(table);
    await table.getByRole("button", { name: "Next", exact: true }).click();
    await settled(table);
    assert.deepEqual(
      (await sample(table)).map((x) => x.id),
      ["2", "3"],
    );
    await table.getByRole("button", { name: /^Odd/ }).click();
    await settled(table);
    assert.deepEqual(
      (await sample(table)).map((x) => x.id),
      ["0", "2"],
    );
    const quiet = [];
    for (const mode of ["off", "reduced"]) {
      await fixture.getByRole("button", { name: "Reset fixture" }).click();
      await page.emulateMedia({
        reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
      });
      await fixture
        .getByRole("button", {
          name: mode === "off" ? "Motion off" : "Motion on",
          exact: true,
        })
        .click();
      await page.waitForTimeout(50);
      await table.getByRole("button", { name: "Next", exact: true }).click();
      await page.waitForTimeout(35);
      const state = await sample(table);
      assert.equal(state.length, 2);
      assert(state.every((x) => !x.exiting && x.opacity === "1"));
      await table.getByRole("button", { name: /^No records/ }).click();
      await page.waitForTimeout(35);
      assert.equal((await sample(table)).length, 0);
      await table.getByRole("button", { name: "Clear filters" }).click();
      await page.waitForTimeout(35);
      assert.equal(
        await table.locator("[data-slot=data-table-empty]").count(),
        0,
      );
      quiet.push({ mode, rowsImmediate: true, emptyImmediate: true });
    }
    await fixture.getByRole("button", { name: "Reset fixture" }).click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixture
      .getByRole("button", { name: "Motion on", exact: true })
      .click();
    await settled(table);
    const pagination = fixture.locator(
      "#pagination-fixture [data-slot=pagination]",
    );
    await pagination.getByRole("button", { name: "12", exact: true }).click();
    const rangeExit = await pagination
      .locator("[data-motion-exiting=true]")
      .evaluateAll((es) =>
        es.map((e) => ({
          tag: e.tagName,
          text: e.textContent,
          inert: e.inert,
          hidden: e.getAttribute("aria-hidden"),
        })),
      );
    assert(rangeExit.some((e) => e.tag === "BUTTON"));
    assert(rangeExit.some((e) => e.tag === "SPAN"));
    assert(rangeExit.every((e) => e.inert && e.hidden === "true"));
    await pagination.getByRole("button", { name: "1", exact: true }).click();
    await settled(pagination);
    assert.equal(await pagination.getAttribute("data-page"), "1");
    assert.equal(
      await pagination.locator("[data-slot=pagination-ellipsis]").count(),
      1,
    );
    const command = fixture.locator("#command-fixture"),
      query = command.getByRole("combobox"),
      list = command.locator("[data-slot=command-list]");
    await query.fill("br");
    await page.waitForTimeout(30);
    assert.equal(
      await list.locator('[cmdk-item][data-value="alpha"]').count(),
      0,
    );
    assert.equal(
      await list.locator('[cmdk-item][data-value="bravo"]').count(),
      1,
    );
    assert.equal(
      await list.locator('[cmdk-item][data-value="pinned"]').count(),
      1,
    );
    const commandPaint = await list
      .locator("[cmdk-list-sizer]")
      .evaluate((e) => getComputedStyle(e).opacity);
    assert(Number(commandPaint) < 1);
    await query.press("ArrowDown");
    await page.waitForTimeout(50);
    const active = await query.getAttribute("aria-activedescendant");
    const selected = await page
      .locator('[id="' + active + '"]')
      .getAttribute("data-value");
    await query.press("Enter");
    assert.equal(
      await fixture.locator("#command-selection").innerText(),
      selected,
    );
    await query.fill("first");
    await page.waitForTimeout(220);
    assert.equal(
      await list.locator('[cmdk-item][data-value="alpha"]').count(),
      1,
    );
    await query.fill("unmatched");
    await page.waitForTimeout(35);
    assert.equal(await list.getByText("No commands found").count(), 1);
    assert.equal(
      await list.locator("[data-motion-exiting=true]").count(),
      0,
      "cmdk semantic removal remains immediate by design",
    );
    await query.fill("");
    await page.waitForTimeout(220);
    await list.locator('[cmdk-item][data-value="bravo"]').click();
    assert.equal(
      await fixture.locator("#command-selection").innerText(),
      "bravo",
    );
    const revision = await list.getAttribute("data-results-revision");
    await fixture.getByRole("button", { name: "Rename command label" }).click();
    await page.waitForTimeout(220);
    assert.equal(
      await list.getAttribute("data-results-revision"),
      revision,
      "Label-only changes do not animate results",
    );
    await command
      .getByRole("checkbox", { name: "Custom command filter" })
      .check();
    await query.fill("rank");
    await page.waitForTimeout(220);
    assert.equal(
      await list
        .locator("[cmdk-item]:not([aria-disabled=true])")
        .first()
        .getAttribute("data-value"),
      "bravo",
    );
    await command
      .getByRole("checkbox", { name: "External command filter" })
      .check();
    await query.fill("unmatched");
    await page.waitForTimeout(220);
    assert.equal(
      await list.getByRole("option").count(),
      4,
      "shouldFilter=false preserves external membership",
    );
    await command
      .getByRole("checkbox", { name: "External command filter" })
      .uncheck();
    await command
      .getByRole("checkbox", { name: "Custom command filter" })
      .uncheck();
    await query.fill("");
    await page.waitForTimeout(220);
    const comboInput = fixture
      .locator("#combobox-fixture")
      .getByRole("combobox");
    await comboInput.fill("Bravo");
    const comboList = page.locator("[data-slot=combobox-content]");
    await comboList.waitFor();
    await page.waitForTimeout(35);
    assert.equal(
      await comboList
        .getByRole("option", { name: "Collection Bravo", exact: true })
        .count(),
      1,
    );
    await comboInput.press("Home");
    await comboInput.press("Enter");
    assert.equal(
      await fixture.locator("#combobox-selection").innerText(),
      "bravo",
    );
    await comboInput.fill("Alpha");
    await comboList
      .getByRole("option", { name: "Collection Alpha", exact: true })
      .click();
    assert.equal(
      await fixture.locator("#combobox-selection").innerText(),
      "alpha",
    );
    await comboInput.fill("unmatched");
    await comboList.getByText("No matches", { exact: true }).waitFor();
    await comboInput.press("Escape");
    const sharedQuiet = [];
    for (const mode of ["off", "reduced"]) {
      await page.emulateMedia({
        reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
      });
      await fixture
        .getByRole("button", {
          name: mode === "off" ? "Motion off" : "Motion on",
          exact: true,
        })
        .click();
      await page.waitForTimeout(60);
      await pagination.getByRole("button", { name: "12", exact: true }).click();
      await page.waitForTimeout(35);
      assert.equal(
        await pagination.locator("[data-motion-exiting=true]").count(),
        0,
      );
      await pagination.getByRole("button", { name: "1", exact: true }).click();
      await query.fill("br");
      await page.waitForTimeout(35);
      assert.equal(
        await list
          .locator("[cmdk-list-sizer]")
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
      await comboInput.fill("Bravo");
      await comboList.waitFor();
      await page.waitForTimeout(35);
      assert.equal(
        await comboList
          .locator("[cmdk-list-sizer]")
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
      await comboInput.press("Escape");
      await query.fill("");
      sharedQuiet.push({
        mode,
        paginationImmediate: true,
        commandImmediate: true,
        comboboxImmediate: true,
      });
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await fixture
      .getByRole("button", { name: "Motion on", exact: true })
      .click();
    await page.waitForTimeout(220);
    await command.screenshot({
      path: path.join(output, "command-" + width + "-" + theme + ".png"),
    });
    await pagination.screenshot({
      path: path.join(output, "pagination-" + width + "-" + theme + ".png"),
    });
    await comboInput.fill("");
    await comboList.waitFor();
    await page.waitForTimeout(350);
    await comboList.screenshot({
      path: path.join(output, "combobox-" + width + "-" + theme + ".png"),
    });
    await comboInput.press("Escape");
    const geometry = await fixture.evaluate((e) => ({
      width: innerWidth,
      document: document.documentElement.scrollWidth,
      table: e
        .querySelector("[data-slot=data-table]")
        .getBoundingClientRect()
        .toJSON(),
    }));
    assert(geometry.document <= width + 1);
    await table.screenshot({
      path: path.join(output, "table-" + width + "-" + theme + ".png"),
    });
    result.checks.push({
      width,
      theme,
      pointerAndEnter: true,
      nestedActionsIsolated: true,
      sourceIdentity: true,
      rapidFilterReversal: filterExit,
      rapidPageReversal: pageExit,
      emptyExit,
      sorting: true,
      quiet,
      rangeExit,
      command: {
        commandPaint,
        nativeKeyboard: true,
        pointer: true,
        keywords: true,
        forceMount: true,
        customRanking: true,
        externalFiltering: true,
        labelChangeDoesNotAnimate: true,
        perItemRetention: false,
      },
      combobox: {
        nativeKeyboard: true,
        pointer: true,
        empty: true,
        perItemRetention: false,
      },
      sharedQuiet,
      geometry,
    });
    save();
    await context.close();
  }
  assert.equal(result.errors.length, 0);
  result.status = "pass";
} catch (error) {
  result.status = "failed";
  result.error = error.stack;
  throw error;
} finally {
  save();
  await browser.close();
}
console.log(
  JSON.stringify({
    status: result.status,
    contexts: result.checks.length,
    errors: result.errors,
  }),
);
