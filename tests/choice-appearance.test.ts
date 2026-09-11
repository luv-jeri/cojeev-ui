import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import ts from "typescript";

test("choice exports accept reusable appearances and shared radius without losing legacy props", () => {
  const filename = resolve("tests/choice-consumer.tsx");
  const fixture = `
    import { Checkbox } from "../registry/cojeev/ui/checkbox";
    import { RadioGroup, RadioGroupItem } from "../registry/cojeev/ui/radio-group";
    import { Switch } from "../registry/cojeev/ui/switch";
    import { CheckboxExample, RadioGroupExample, SwitchExample } from "../components/examples/choice-foundations";
    <CheckboxExample variant="card" /><RadioGroupExample radius="soft" /><SwitchExample variant="latch" />;
    <Checkbox appearance="card" radius="soft" checked="indeterminate" shape="organic" name="choices" value="one" />;
    <Checkbox appearance="chip" radius="pill" defaultChecked />;
    <RadioGroup appearance="row" radius="round" pictographic defaultValue="a"><RadioGroupItem appearance="card" radius="square" value="a" /></RadioGroup>;
    <Switch appearance="capsule" radius="pill" defaultChecked name="alerts" />;
    <Switch appearance="rocker" radius="soft" checked={false} onCheckedChange={value => { const b: boolean = value; }} />;
    <Switch appearance="latch" radius="square" />;
    // @ts-expect-error A cosmetic tone is not a composition.
    <Checkbox appearance="pink" />;
    // @ts-expect-error Shared corners only.
    <Switch radius="medium" />;
  `;
  const config=ts.readConfigFile(resolve("tsconfig.json"),ts.sys.readFile);
  const {options}=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
  const host=ts.createCompilerHost({...options,incremental:false});
  const read=host.getSourceFile.bind(host);
  host.getSourceFile=(path,version,...args)=>path===filename?ts.createSourceFile(path,fixture,version,true,ts.ScriptKind.TSX):read(path,version,...args);
  const program=ts.createProgram([filename],{...options,incremental:false},host);
  const paths=[filename,resolve("components/examples/choice-foundations.tsx"),...["checkbox","radio-group","switch"].map(name=>resolve(`registry/cojeev/ui/${name}.tsx`))];
  const errors=paths.flatMap(path=>program.getSemanticDiagnostics(program.getSourceFile(path)!));
  assert.equal(errors.length,0,errors.map(error=>ts.flattenDiagnosticMessageText(error.messageText,"\n")).join("\n"));
});
