import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { CodeBlock, CopyButton } from "../registry/cojeev/ui/code-block";
import { InstallCommand } from "../components/install-command";

const source = '\nconst label = "<Cojeev & you>";\n\treturn label;\n';

test("code remains exact selectable plain text within one named keyboard scroll region", () => {
  const $ = load(renderToStaticMarkup(createElement(CodeBlock, {
    code: source, title: "greeting.ts", language: "ts",
  })));
  const viewport = $('[data-slot="scroll-area-viewport"]');
  assert.equal(viewport.length, 1);
  assert.equal(viewport.attr("role"), "region");
  assert.equal(viewport.attr("aria-label"), "greeting.ts source code");
  assert.equal(viewport.attr("tabindex"), "0");
  assert.equal(viewport.find("pre > code").text(), source);
  assert(viewport.find("code .token.keyword").length > 0, "keywords receive syntax color");
  assert(viewport.find("code .token.string").length > 0, "strings receive syntax color");
  assert.equal(viewport.find("code Cojeev").length, 0, "source markup is text, never injected HTML");
  assert.equal($("pre[tabindex]").length, 0, "the viewport is the only code tab stop");
  assert.equal($('[data-slot="copy-button"]').text(), "Copy");
});

test("embedded code retains the source region without duplicate header or copy chrome", () => {
  const $ = load(renderToStaticMarkup(createElement(CodeBlock, {
    code: source, embedded: true, title: "Example", language: "tsx",
  })));
  assert.equal($('[data-slot="code-block"]').attr("data-embedded"), "true");
  assert.equal($('[data-slot="code-block-header"]').length, 0);
  assert.equal($('[data-slot="copy-control"]').length, 0);
  assert.equal($('[role="region"]').attr("aria-label"), "Example source code");
  assert.equal($("code").text(), source);
});

test("wrap, empty text, custom copy labels and figure attributes remain supported", () => {
  const $ = load(renderToStaticMarkup(createElement(CodeBlock, {
    code: "", wrap: true, copyLabel: "Copy command", id: "install", className: "consumer-code",
  })));
  assert.equal($("figure#install.consumer-code").length, 1);
  assert.equal($("figure").attr("data-wrap"), "true");
  assert.equal($("code").text(), "");
  assert.equal($('[role="region"]').attr("aria-label"), "Source code");
  assert.equal($('[data-slot="copy-button"]').text(), "Copy command");
  assert.equal($('[role="status"]').attr("aria-live"), "polite");
});

test("installation commands use terminal chrome without contaminating the copyable command", () => {
  const command = 'npx shadcn@latest add "https://example.com/r/button.json"\n# café & <notes>';
  const $ = load(renderToStaticMarkup(createElement(InstallCommand, { command })));
  assert.equal($('[data-slot="code-block"]').attr("data-variant"), "terminal");
  assert.equal($('[data-slot="code-block-title"]').text(), "Terminal");
  assert.equal($('[data-slot="terminal-prompt"]').attr("aria-hidden"), "true");
  assert.equal($('[data-slot="terminal-window-marks"]').attr("aria-hidden"), "true");
  assert.equal($('[data-slot="code-block-header"] button').length, 1, "window decorations must not become pretend controls");
  assert.equal($("pre > code").text(), command, "no prompt, escape corruption, or fabricated terminal output enters the source");
  assert.equal($('[role="region"]').attr("aria-label"), "Terminal command");
});

test("copy actions include a decorative icon while preserving the visible action name", () => {
  const $ = load(renderToStaticMarkup(createElement(CopyButton, { code: "npx example" }, "Copy command")));
  const button = $('[data-slot="copy-button"]');
  assert.equal(button.text(), "Copy command");
  assert.equal(button.find('[data-icon-name="copy"]').length, 1);
  assert.equal(button.find('[data-icon-name="copy"]').attr("aria-hidden"), "true");
});

test("copy icons preserve native asChild composition rather than adding a second slot child", () => {
  const $ = load(renderToStaticMarkup(createElement(CopyButton, { code: "echo hi", asChild: true },
    createElement("a", { href: "#copy", className: "custom-copy" }, "Copy command"),
  )));
  const action = $('a.custom-copy[data-slot="copy-button"]');
  assert.equal(action.length, 1);
  assert.equal(action.attr("href"), "#copy");
  assert.equal(action.text(), "Copy command");
  assert.equal(action.find('[data-icon-name="copy"]').length, 1);
  assert.equal($("button").length, 0);
});
