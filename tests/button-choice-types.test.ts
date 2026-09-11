import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import ts from "typescript";
import { HeroButton } from "../registry/cojeev/ui/hero-button";

// Regression mutation: intersecting ButtonProps with HeroButton's independent
// shape union makes both existing hero choices impossible for TS consumers.
test("Button and HeroButton retain independently callable shape APIs", () => {
  const filename = resolve("tests/button-choice-consumer.tsx");
  const fixture = `
    import { Button } from "../registry/cojeev/ui/button";
    import { HeroButton } from "../registry/cojeev/ui/hero-button";
    <Button shape="card">Notebook</Button>;
    <Button shape="pill">Continue</Button>;
    <HeroButton shape="organic">Start</HeroButton>;
    <HeroButton shape="capsule">Start</HeroButton>;
    <HeroButton>Start</HeroButton>;
    // @ts-expect-error Card is a Button shape, not a HeroButton contour.
    <HeroButton shape="card">Start</HeroButton>;
    // @ts-expect-error Organic is a HeroButton contour, not a Button shape.
    <Button shape="organic">Continue</Button>;
  `;
  const config = ts.readConfigFile(resolve("tsconfig.json"), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost({ ...options, incremental: false });
  const source = host.getSourceFile.bind(host);
  host.getSourceFile = (path, languageVersion, ...args) => path === filename
    ? ts.createSourceFile(path, fixture, languageVersion, true, ts.ScriptKind.TSX)
    : source(path, languageVersion, ...args);
  const program = ts.createProgram([filename], { ...options, incremental: false }, host);
  const consumer = program.getSourceFile(filename);
  assert.ok(consumer);
  const errors = program.getSemanticDiagnostics(consumer);
  assert.equal(errors.length, 0, errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
});

test("HeroButton keeps organic as default and capsule as its regular contour", () => {
  for (const [shape, expectedShape, lobes, depth] of [
    [undefined, "organic", "3", "0.024"],
    ["organic", "organic", "3", "0.024"],
    ["capsule", "capsule", "0", "0"],
  ] as const) {
    const $ = load(renderToStaticMarkup(createElement(HeroButton, { shape }, "Start")));
    const button = $("button");
    assert.equal(button.attr("data-hero-shape"), expectedShape);
    assert.equal(button.attr("data-lobes"), lobes);
    assert.equal(button.attr("data-depth"), depth);
    assert.equal(button.attr("data-r"), undefined, "hero does not receive card geometry");
    assert.equal(button.attr("type"), "button");
    assert.equal($('[data-slot="hero-button-label"]').text(), "Start");
  }
});
