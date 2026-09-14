import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const bundle = await build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {DataTable} from './registry/cojeev/ui/data-table';import {Button} from './registry/cojeev/ui/button';
import {setMotionMode,setFlowSettings} from './registry/cojeev/motion/settings';
const data=Array.from({length:8},(_,i)=>({id:String(i),name:'Record '+i,value:i,ready:i%2===0}));
const columns=[{id:'name',header:'Name',accessorKey:'name',sortValue:row=>row.name},{id:'value',header:'Value',accessorKey:'value',numeric:true,sortValue:row=>row.value},{id:'action',header:'Action',cell:row=><Button onClick={()=>window.actions.push(row.id)}>Pin {row.name}</Button>}];
window.rows=[];window.actions=[];window.pages=[];window.filters=[];
const root=createRoot(document.getElementById('root'));
window.show=()=>flushSync(()=>root.render(<div style={{display:'grid',gap:32}}>
<DataTable aria-label="Records" data={data} columns={columns} getRowId={row=>row.id} appearance="ledger" pageSize={3} filters={[{id:'ready',label:'Ready',predicate:row=>row.ready},{id:'empty',label:'Empty',predicate:()=>false}]} onRowClick={row=>window.rows.push(row.id)}/>
<DataTable aria-label="Controlled records" ref={node=>window.tableRef=node} data={data} columns={columns} pageSize={3} page={2} onPageChange={n=>window.pages.push(n)} filter="all" onFilterChange={n=>window.filters.push(n)} filters={[{id:'ready',label:'Ready',predicate:row=>row.ready}]}/>
</div>));
window.quiet=kind=>{setMotionMode(kind==='motion'?'off':'subtle');setFlowSettings({variant:kind==='flow'?'off':'glide'});};window.show();
`,
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const html = await fetch(`${base}/docs/table/`).then((r) => r.text());
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
    viewport: { width: 950, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<div id="root" style="padding:24px"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const table = page.locator('[data-slot="data-table"][aria-label="Records"]');
  const row = table.locator('tr[data-row-id="0"]');
  await row.focus();
  await row.press("Enter");
  await row.press(" ");
  assert.deepEqual(await page.evaluate(() => window.rows), ["0", "0"]);
  assert.ok(
    await row.evaluate(
      (node) => parseFloat(getComputedStyle(node).outlineWidth) >= 2,
    ),
    "native row has visible keyboard focus without requiring a decorative disk",
  );
  await row.getByRole("button", { name: "Pin Record 0", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.actions), ["0"]);
  assert.deepEqual(
    await page.evaluate(() => window.rows),
    ["0", "0"],
    "nested control does not activate the row",
  );
  const controlled = page.locator(
    '[data-slot="data-table"][aria-label="Controlled records"]',
  );
  assert.ok(await controlled.evaluate((node) => node === window.tableRef));
  await controlled.getByRole("button", { name: "Next", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.pages), [3]);
  assert.equal(
    await controlled
      .locator('[data-slot="pagination"]')
      .getAttribute("data-page"),
    "2",
    "controlled refusal is honored",
  );
  await controlled
    .getByRole("button", { name: "Ready 4", exact: true })
    .click();
  assert.deepEqual(await page.evaluate(() => window.filters), ["ready"]);
  assert.equal(await controlled.locator("tbody tr").count(), 3);
  for (const quiet of ["normal", "motion", "flow"]) {
    await page.evaluate((kind) => window.quiet(kind), quiet);
    await table.getByRole("button", { name: "Ready 4", exact: true }).click();
    assert.deepEqual(
      await table
        .locator("tbody tr[data-row-id]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.rowId)),
      ["0", "2", "4"],
    );
    await table.getByRole("button", { name: "Next", exact: true }).click();
    assert.equal(await table.locator("tbody tr").count(), 1);
    await table.getByRole("button", { name: "Empty 0", exact: true }).click();
    assert.match(await table.innerText(), /No matching records/);
    assert.equal(await table.locator("tbody tr[data-row-id]").count(), 0);
    await table
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    assert.equal(await table.locator("tbody tr").count(), 3);
  }
  await table
    .getByRole("button", { name: "Sort Value ascending", exact: true })
    .click();
  assert.equal(
    await table
      .getByRole("columnheader", { name: /Value/ })
      .getAttribute("aria-sort"),
    "ascending",
  );
  await table
    .getByRole("button", { name: "Sort Value descending", exact: true })
    .click();
  assert.equal(
    await table.locator("tbody tr").first().getAttribute("data-row-id"),
    "7",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS native Tables: stable IDs, row keyboard/focus, nested actions, controlled page/filter refusal/ref, empty recovery, sorting, Motion Off and Flow Off",
  );
} finally {
  await browser.close();
}
