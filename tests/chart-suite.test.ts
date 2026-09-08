import { test } from "node:test";
import assert from "node:assert/strict";
import { areaPath, arcPath, chartDomain, cleanChartData, finiteValue, linePath, pieAngles, polarPoint, radarPath, scaleValue, stackChartData, tooltipPosition } from "../registry/sahajiv/lib/chart-geometry";

const series = [{ key: "a", label: "A" }, { key: "b", label: "B" }];
test("missing observations remain missing while zero-only charts have a finite domain", () => {
  assert.equal(finiteValue(NaN), null); assert.equal(finiteValue(Infinity), null); assert.equal(finiteValue("12"), null); assert.equal(finiteValue(0), 0);
  assert.deepEqual(cleanChartData([{ label: "A", a: NaN, b: 0 }], series), [{ label: "A", values: [null, 0] }]);
  assert.deepEqual(chartDomain([{ label: "A", a: 0, b: null }], series), [0, 1]);
  assert.deepEqual(chartDomain([], series), [0, 1]);
});
test("diverging stacks preserve positive and negative totals independently", () => {
  const data = [{ label: "A", a: 4, b: -3 }, { label: "B", a: 6, b: 5 }];
  assert.deepEqual(stackChartData(data, series), [[{ start: 0, end: 4, value: 4 }, { start: 0, end: -3, value: -3 }], [{ start: 0, end: 6, value: 6 }, { start: 6, end: 11, value: 5 }]]);
  const domain = chartDomain(data, series, true); assert.ok(domain[0] < -3); assert.ok(domain[1] > 11);
  assert.equal(scaleValue(5, [0, 10], 100, 0), 50);
});
test("line gaps and area gaps remain disconnected across interpolation modes", () => {
  const points = [{ x: 0, y: 10 }, { x: 10, y: 20 }, null, { x: 30, y: 5 }];
  for (const curve of ["linear", "smooth", "step"] as const) {
    const line = linePath(points, curve); assert.equal(line.match(/M/g)?.length, 2); assert.ok(!/NaN|Infinity/.test(line));
    const fill = areaPath(points, points.map(point => point ? { x: point.x, y: 30 } : null), curve); assert.equal(fill.match(/Z/g)?.length, 2);
  }
  assert.match(linePath(points, "step"), /H10V20/); assert.match(linePath(points, "smooth"), /C/);
});
test("pie geometry ignores invalid and negative amounts and handles exact full circles", () => {
  const arcs = pieAngles([{ label: "A", value: 10 }, { label: "B", value: null }, { label: "C", value: -3 }, { label: "D", value: NaN }]);
  assert.equal(arcs[0].total, 10); assert.equal(arcs[0].end - arcs[0].start, Math.PI * 2); assert.equal(arcs[1].value, 0);
  const circle = arcPath(100, 100, 80, 40, 0, Math.PI * 2); assert.equal(circle.match(/A/g)?.length, 4); assert.ok(circle.endsWith("Z"));
  assert.equal(arcPath(0, 0, 50, 20, 0, 0), ""); assert.equal(pieAngles([{ label: "zero", value: 0 }])[0].total, 0);
});
test("radar polygons and rounded geometry retain finite coordinates", () => {
  const points = Array.from({ length: 5 }, (_, i) => polarPoint(150, 150, 90, i / 5 * Math.PI * 2));
  assert.ok(radarPath(points).endsWith("Z")); assert.equal(radarPath(points, true).match(/Q/g)?.length, 5);
  assert.equal(radarPath([]), ""); assert.ok(!/NaN|Infinity/.test(radarPath(points, true)));
});
test("tooltips stay inside narrow and wide plot bounds at every corner", () => {
  for (const width of [200, 390, 900]) for (const height of [180, 300]) for (const x of [-50, 0, width / 2, width + 50]) for (const y of [-50, 0, height / 2, height + 50]) {
    const tipWidth = Math.min(220, width - 16), tipHeight = 100;
    const result = tooltipPosition(x, y, width, height, tipWidth, tipHeight);
    assert.ok(result.x >= 8 && result.x + tipWidth <= width - 8);
    assert.ok(result.y >= 8 && result.y + tipHeight <= height - 8);
  }
});
