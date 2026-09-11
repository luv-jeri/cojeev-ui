import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import ts from "typescript";

test("real Calendar and DatePicker exports discriminate all three selection values", () => {
  const filename = resolve("tests/calendar-modes-consumer.tsx");
  const fixture = `
    import { Calendar } from "../registry/cojeev/ui/calendar";
    import { DatePicker } from "../registry/cojeev/ui/date-picker";
    import { CalendarExample, DatePickerExample } from "../components/examples/calendar-foundations";
    import type { DateRange } from "react-day-picker";
    const date = new Date(2026, 8, 12);
    <CalendarExample variant="range" />;
    <DatePickerExample variant="multiple" />;
    <Calendar defaultSelected={date} required onSelect={value => { const d: Date | undefined = value; }} />;
    <Calendar mode="range" defaultSelected={{from:date}} min={1} max={10} excludeDisabled onSelect={value => { const r: DateRange | undefined = value; }} />;
    <Calendar mode="multiple" defaultSelected={[date]} min={1} max={3} onSelect={value => { const ds: Date[] | undefined = value; }} />;
    <DatePicker date={date} onDateChange={value => { const d: Date | undefined = value; }} />;
    <DatePicker mode="range" defaultDate={{from:date}} calendarProps={{min:1,max:10,excludeDisabled:true}} onDateChange={value => { const r: DateRange | undefined = value; }} />;
    <DatePicker mode="multiple" defaultDate={[date]} calendarProps={{min:1,max:3}} onDateChange={value => { const ds: Date[] | undefined = value; }} />;
    // @ts-expect-error A range is not a single day.
    <Calendar selected={{from:date}} />;
    // @ts-expect-error Multiple selections use an array.
    <Calendar mode="multiple" selected={date} />;
    // @ts-expect-error A picker range uses a range callback.
    <DatePicker mode="range" onDateChange={(value: Date | undefined) => {}} />;
    // @ts-expect-error A single picker cannot accept a dates array.
    <DatePicker date={[date]} />;
  `;
  const config = ts.readConfigFile(resolve("tsconfig.json"), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost({ ...options, incremental: false });
  const source = host.getSourceFile.bind(host);
  host.getSourceFile = (path, version, ...args) => path === filename ? ts.createSourceFile(path, fixture, version, true, ts.ScriptKind.TSX) : source(path, version, ...args);
  const program = ts.createProgram([filename], { ...options, incremental: false }, host);
  const consumer = program.getSourceFile(filename)!;
  const sources = [consumer, ...["registry/cojeev/ui/calendar.tsx", "registry/cojeev/ui/date-picker.tsx", "components/examples/calendar-foundations.tsx"].map(path => program.getSourceFile(resolve(path))!)];
  const errors = sources.flatMap(source => program.getSemanticDiagnostics(source));
  assert.equal(errors.length, 0, errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
});
