import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { componentAPIs } from "../scripts/component-api.mjs";

function fixture(files: Record<string, string>, ids: string[]) {
  const root = mkdtempSync(join(tmpdir(), "sahajiv-component-api-"));
  try {
    const contents = { "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true, jsx: "preserve", moduleResolution: "node", skipLibCheck: true }, include: ["registry/**/*"] }), ...files };
    for (const [name, content] of Object.entries(contents)) { const path = join(root, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }
    // The compiler caches its working directory. Isolate each actual workspace,
    // instead of changing cwd under a live TypeScript compiler in this process.
    const extractor = pathToFileURL(join(process.cwd(), "scripts/component-api.mjs")).href;
    return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `import { componentAPIs } from ${JSON.stringify(extractor)}; console.log(JSON.stringify(componentAPIs(${JSON.stringify(ids)})));`], { cwd: root, encoding: "utf8" }));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("imported aliases and interfaces document shared props while retaining Omit and Partial semantics", () => {
  const rows = fixture({
    "registry/sahajiv/ui/demo.tsx": `import type { Shared as Common } from "../lib/barrel";
export type DemoProps = Omit<Partial<Common>, "hidden"> & { /** Local mode. */ mode: "still" | "moving" };
export interface ExtendedProps extends Common { extra?: boolean }`,
    "registry/sahajiv/lib/barrel.ts": `export type { Shared } from "./shared";`,
    "registry/sahajiv/lib/shared.ts": `import type { Geometry } from "./geometry";
export interface Shared {
/** Source geometry. */
geometry: Geometry; turn?: number; hidden?: boolean }
`,
    "registry/sahajiv/lib/geometry.ts": `export type Geometry = { positions: readonly number[] };`,
  }, ["demo"]).demo;
    const props = rows.find((row: { name: string }) => row.name === "DemoProps")!.props;
    assert.deepEqual(props.map((prop: { name: string }) => prop.name), ["geometry", "turn", "mode"]);
    assert.deepEqual(props[0], { name: "geometry", type: "Geometry", required: false, description: "Source geometry." });
    assert.equal(props[2].required, true);
    assert.deepEqual(rows.find((row: { name: string }) => row.name === "ExtendedProps")!.props.map((prop: { name: string }) => prop.name).sort(), ["extra", "geometry", "hidden", "turn"]);
});

test("unresolved and cyclic local imports retain known authored props without recursing indefinitely", () => {
  const rows = fixture({
    "registry/sahajiv/ui/broken.tsx": `import type { Missing } from "../lib/missing";
import type { Loop } from "../lib/loop";
export type BrokenProps = Missing & { label: string };
export type CyclicProps = Loop & { active?: boolean };`,
    "registry/sahajiv/lib/loop.ts": `import type { Other } from "./other"; export type Loop = Other & { turn?: number };`,
    "registry/sahajiv/lib/other.ts": `import type { Loop } from "./loop"; export type Other = Loop & { pitch?: number };`,
  }, ["broken"]).broken;
    assert.deepEqual(rows[0].props.map((prop: { name: string }) => prop.name), ["label"]);
    assert.deepEqual(rows[1].props.map((prop: { name: string }) => prop.name).sort(), ["active", "pitch", "turn"]);
});

test("sculpture treatment APIs inherit public geometry controls without listing native DOM props", () => {
  const apis = componentAPIs(["dither-sculpture", "ink-sculpture", "button", "slider", "text-reveal"]);
  for (const id of ["dither-sculpture", "ink-sculpture"]) {
    const props = apis[id][0].props;
    for (const name of ["geometry", "turn", "pitch", "zoom", "paused", "pointerTracking", "onGeometryError"]) assert.ok(props.some((prop: { name: string }) => prop.name === name), `${id} should document ${name}`);
    for (const name of ["className", "onClick", "aria-label"]) assert.ok(!props.some((prop: { name: string }) => prop.name === name), `${id} should group native ${name}`);
  }
  assert.deepEqual(apis.button[0].props.map((prop: { name: string }) => prop.name), ["variant", "size", "fullWidth", "asChild", "ref", "loading", "loadingIndicator"]);
  assert.equal(apis.button[0].props[0].type, '\"default\" | \"accent\" | \"secondary\" | \"ghost\" | \"outline\" | \"danger\" | \"block\" | null | undefined');
  assert.deepEqual(apis.slider.map((row: { name: string; props: { name: string }[] }) => [row.name, row.props.map(prop => prop.name)]), [["SliderProps", ["variant", "thumbLabel", "appearance"]], ["SliderWrapperProps", []], ["SliderRowProps", []], ["SliderOutputProps", []]]);
  assert.deepEqual(apis["text-reveal"][0].props.map((prop: { name: string; required: boolean }) => [prop.name, prop.required]), [["text", true], ["as", false], ["replayKey", false], ["variant", false], ["split", false], ["stagger", false], ["direction", false], ["duration", false]]);
});
