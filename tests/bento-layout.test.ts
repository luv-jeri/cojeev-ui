import assert from "node:assert/strict";
import test from "node:test";
import {
  generateBento,
  resizeBentoSeam,
  swapBentoTiles,
  validateBento,
  bentoEdge,
  exportBento,
  type BentoLayout,
} from "../registry/cojeev/lib/bento-layout";

const fixture: BentoLayout = {
  columns: 4,
  rows: 4,
  seed: 7,
  tiles: [
    { id: "a", label: "First", x: 0, y: 0, width: 2, height: 4 },
    { id: "b", label: "Second", x: 2, y: 0, width: 2, height: 4 },
  ],
};
function coverage(layout: BentoLayout) {
  const cells = layout.tiles.flatMap((t) =>
    Array.from({ length: t.height }, (_, y) =>
      Array.from({ length: t.width }, (_, x) => `${t.x + x},${t.y + y}`),
    ).flat(),
  );
  assert.equal(cells.length, layout.columns * layout.rows);
  assert.equal(new Set(cells).size, cells.length);
  assert.equal(validateBento(layout), null);
}
test("moving a shared seam grows its neighbor without holes and rejects collapse", () => {
  const result = resizeBentoSeam(fixture, "a", "right", 3);
  assert.equal(result.error, undefined);
  assert.deepEqual(
    result.layout.tiles.map((t) => [t.x, t.width]),
    [
      [0, 3],
      [3, 1],
    ],
  );
  assert.deepEqual(
    result.layout.tiles.map((t) => t.width * t.height),
    [12, 4],
  );
  coverage(result.layout);
  assert.ok(resizeBentoSeam(fixture, "a", "right", 4).error);
  assert.deepEqual(
    fixture.tiles.map((t) => t.width),
    [2, 2],
  );
});
test("swap exchanges content identities and retains the rectangles", () => {
  const result = swapBentoTiles(fixture, "a", "b");
  assert.deepEqual(
    result.tiles.map((t) => [t.id, t.label, t.x, t.width]),
    [
      ["b", "Second", 0, 2],
      ["a", "First", 2, 2],
    ],
  );
  coverage(result);
});
test("partial neighbors at a T junction resize as one complete boundary", () => {
  const layout = {
    ...fixture,
    tiles: [
      fixture.tiles[0],
      { ...fixture.tiles[1], height: 2 },
      { ...fixture.tiles[1], id: "c", y: 2, height: 2 },
    ],
  };
  const edit = resizeBentoSeam(layout, "b", "left", 3);
  assert.equal(edit.error, undefined);
  assert.deepEqual(
    edit.layout.tiles.map((t) => [t.x, t.width, t.height]),
    [
      [0, 3, 4],
      [3, 1, 2],
      [3, 1, 2],
    ],
  );
  coverage(edit.layout);
});
test("recomposition accepts existing tiles without reusing stale rectangles", () => {
  const resized = generateBento(7, 5, 8, fixture.tiles, "Gallery");
  coverage(resized);
  assert.deepEqual(
    resized.tiles.map((t) => [t.id, t.label]),
    [
      ["a", "First"],
      ["b", "Second"],
    ],
  );
});
test("seeded recursive partitions preserve all content at every supported dimension", () => {
  for (let columns = 2; columns <= 8; columns++)
    for (let rows = 2; rows <= 8; rows++)
      for (let seed = 0; seed < 12; seed++) {
        const content = Array.from(
          { length: Math.min(6, columns * rows) },
          (_, i) => ({ id: `t${i}`, label: `Label ${i}` }),
        );
        const layout = generateBento(columns, rows, seed, content, "Editorial");
        coverage(layout);
        assert.deepEqual(
          layout,
          generateBento(columns, rows, seed, content, "Editorial"),
        );
        assert.deepEqual(
          layout.tiles.map((t) => t.id).sort(),
          content.map((t) => t.id).sort(),
        );
      }
  assert.throws(() =>
    generateBento(
      2,
      2,
      0,
      Array.from({ length: 5 }, (_, i) => ({ id: String(i), label: "x" })),
    ),
  );
  assert.throws(() => generateBento(NaN, 4, 0));
});
test("T junction seams use identical reversed cubic control points", () => {
  const forward = bentoEdge(2, 0, 2, 1, 7, false),
    reverse = bentoEdge(2, 1, 2, 0, 7, false);
  assert.deepEqual(reverse, [forward[3], forward[2], forward[1], forward[0]]);
  assert.deepEqual(bentoEdge(2, 1, 2, 2, 7, false)[0], [2, 1]);
  assert.deepEqual(bentoEdge(0, 0, 1, 0, 7, true), [
    [0, 0],
    [1 / 3, 0],
    [2 / 3, 0],
    [1, 0],
  ]);
});
test("validation rejects duplicate identity, uncovered cells and invalid coordinates", () => {
  assert.ok(validateBento({ ...fixture, tiles: [fixture.tiles[0]] }));
  assert.ok(
    validateBento({
      ...fixture,
      tiles: fixture.tiles.map((t) => ({ ...t, id: "same" })),
    }),
  );
  assert.ok(
    validateBento({
      ...fixture,
      tiles: [{ ...fixture.tiles[0], x: -1 }, fixture.tiles[1]],
    }),
  );
});
test("export contains a usable renderer and exactly JSON-escaped edited content", () => {
  const layout = {
    ...fixture,
    tiles: [
      { ...fixture.tiles[0], label: '</script> " \\ \n' },
      fixture.tiles[1],
    ],
  };
  const source = exportBento(layout, "interlock");
  const json = source.match(/const layout = ([\s\S]*?);\n/)?.[1];
  assert.deepEqual(JSON.parse(json!), layout);
  assert.match(source, /<BentoGrid layout=\{layout\} variant="interlock"/);
});
