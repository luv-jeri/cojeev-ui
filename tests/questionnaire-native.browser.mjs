import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const origin = process.env.DOCS_ORIGIN ?? "http://127.0.0.1:4321";
const html = await (
  await fetch(`${origin}/cojeev-ui/docs/questionnaire/`)
).text();
const css = (
  await Promise.all(
    [...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(async (m) =>
      (await fetch(new URL(m[1], origin))).text(),
    ),
  )
).join("\n");
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{Questionnaire,QuestionnaireQuestion,QuestionnaireOptions,QuestionnaireOption,QuestionnaireOptionBody}from'./registry/cojeev/ui/questionnaire';
import{AgentChatOptions}from'./registry/cojeev/ui/agent-chat';
const root=createRoot(document.getElementById('root'));window.changes=[];
function Fixture({refuse=false,disabled=false,resetKey=0}){return <form key={resetKey} onSubmit={e=>e.preventDefault()} onReset={e=>{if(window.cancelReset)e.preventDefault()}}><Questionnaire><QuestionnaireQuestion disabled={disabled}><legend>Working rhythm</legend><QuestionnaireOptions name="rhythm" defaultValue="daily" value={refuse?'daily':undefined} onValueChange={v=>window.changes.push(v)} ref={n=>window.group=n} aria-label="Working rhythm">{[['daily','Daily',false],['locked','Locked',true],['weekly','Weekly',false]].map(([value,label,disabled])=><QuestionnaireOption key={value} value={value} disabled={disabled} inputProps={{required:true}}><QuestionnaireOptionBody>{label}</QuestionnaireOptionBody></QuestionnaireOption>)}</QuestionnaireOptions></QuestionnaireQuestion></Questionnaire><button type="reset">Reset</button></form>};window.renderQuestionnaire=p=>flushSync(()=>root.render(<Fixture {...p}/>));window.renderChat=()=>flushSync(()=>root.render(<AgentChatOptions title="Next step" options={[{value:'a',label:'First'},{value:'b',label:'Second',disabled:true}]} value="a" onValueChange={v=>window.changes.push(v)} onConfirm={v=>window.confirmed=v}/>));window.renderQuestionnaire({});`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 850 },
    reducedMotion: "no-preference",
  });
  await page.setContent(
    '<style>form{padding:32px;max-width:520px}</style><div id="root"></div>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const group = page.getByRole("radiogroup", { name: "Working rhythm" }),
    weekly = page.getByRole("radio", { name: "Weekly", exact: true });
  const label = page.locator('[data-slot="questionnaire-option"]').last();
  const box = await label.boundingBox();
  await label.hover();
  await page.mouse.down();
  await page.waitForTimeout(120);
  const held = await label.boundingBox();
  await page.mouse.up();
  assert.ok(
    Math.abs(box.width - held.width) < 0.5 && Math.abs(box.x - held.x) < 0.5,
    "The label hit target does not shrink during a held press",
  );
  await weekly.check();
  assert.equal(
    await page.evaluate(() =>
      new FormData(document.querySelector("form")).get("rhythm"),
    ),
    "weekly",
  );
  await page.evaluate(() => (window.cancelReset = true));
  await page.getByRole("button", { name: "Reset" }).click();
  await page.waitForTimeout(20);
  assert.equal(
    await weekly.isChecked(),
    true,
    "Cancelled reset retains the answer",
  );
  await page.evaluate(() => (window.cancelReset = false));
  await page.getByRole("button", { name: "Reset" }).click();
  await page.waitForTimeout(30);
  assert.equal(
    await page.getByRole("radio", { name: "Daily", exact: true }).isChecked(),
    true,
    "Native reset restores the default answer and selector",
  );
  assert.equal(
    await page
      .locator('[data-slot="questionnaire-option"]')
      .first()
      .getAttribute("data-state"),
    "checked",
    "The painted selection also resets",
  );
  assert.equal(
    await label.getAttribute("data-state"),
    "unchecked",
    "The old selection paint is cleared",
  );
  await page.getByRole("radio", { name: "Daily", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await weekly.isChecked(),
    true,
    "Native arrows skip a disabled radio",
  );
  assert.equal(
    await group.evaluate((el) => el === window.group),
    true,
    "The group ref remains the actual group",
  );
  await page.evaluate(() =>
    window.renderQuestionnaire({ refuse: true, resetKey: "controlled" }),
  );
  await page.locator('[data-slot="questionnaire-option"]').last().click();
  assert.equal(
    await page.getByRole("radio", { name: "Daily", exact: true }).isChecked(),
    true,
    "Controlled refusal is respected",
  );
  await page.evaluate(() =>
    window.renderQuestionnaire({ disabled: true, resetKey: "disabled" }),
  );
  assert.equal(
    await weekly.isDisabled(),
    true,
    "Native fieldset disabling reaches its radios",
  );
  await page.evaluate(() => window.renderChat());
  await page.getByRole("button", { name: "Continue" }).click();
  assert.equal(await page.evaluate(() => window.confirmed), "a");
  assert.equal(
    await page.getByRole("radio", { name: "Second" }).isDisabled(),
    true,
  );
  console.log(
    "PASS questionnaire native: stable press, accepted/cancelled form reset, keys/disabled/ref/controlled, legacy AgentChat caller",
  );
} finally {
  await browser.close();
}
