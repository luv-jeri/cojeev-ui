import assert from "node:assert/strict";
import test from "node:test";
import {
  BOUNDARY_ARCS,
  BOUNDARY_BAND,
  BOUNDARY_LEAD,
  CHAPTERS,
  CHAPTER_IDS,
  HOME_PARTS,
  SPECIMEN_COUNT,
  chapterWeights,
  clamp01,
  evaluate,
  focusFromScroll,
  restingProgress,
  scrollProgress,
  smootherstep,
} from "../components/landing/assembly/choreography";
import {
  CONTOUR_NUMBER,
  CONTOUR_PRESETS,
  CONTOUR_SEGMENTS,
  CONTOUR_TARGET,
  CONTOUR_VIEWBOX,
  blendContour,
  contourExtent,
  contourFileName,
  contourPath,
  contourPoints,
  contourReactComponent,
  contourSvgDocument,
  isContourPreset,
  parseContour,
} from "../components/landing/assembly/contour-export";
import { signatureShapePaths } from "../registry/cojeev/lib/signature-shapes";
import {
  FEATURED_SPECIMEN,
  INSTRUMENT,
  LIGHT_RIG,
  SPECIMEN_FILTERS,
  SPECIMEN_TRAYS,
  specimenFilter,
  specimenMatchesFilter,
  sourceSummaryLines,
} from "../components/landing/assembly/canonical";
import { SPECIMEN_API } from "../components/landing/assembly/specimen-api.generated";
import {
  CUES,
  CUE_IDS,
  FADE_RANGE,
  VOICE_LIMIT,
  VOICE_PEAK_BUDGET,
  auditCues,
} from "../components/landing/assembly/audio-manifest";

/* The assembly route is choreography, contour export and audio scheduling with no
 * DOM in the loop. Everything below is pure, so it can be pinned exactly — which
 * is the only way "the exported outline is the sculpted outline" and "the resting
 * pose is exact at every chapter" can be claimed rather than hoped for. */

const PART_IDS = Object.keys(HOME_PARTS) as (keyof typeof HOME_PARTS)[];
const SHAPE_NAMES = Object.keys(signatureShapePaths) as (keyof typeof signatureShapePaths)[];
const NUMBERS_PER_SEGMENT = 6;

/* ------------------------------------------------------------------ contour */

test("every offered preset is a real signature shape", () => {
  for (const preset of CONTOUR_PRESETS) assert.ok(preset in signatureShapePaths, preset);
  assert.ok(CONTOUR_TARGET in signatureShapePaths);
  assert.equal(CONTOUR_TARGET, "cushion");
  assert.equal(isContourPreset("daisy-12"), true);
  assert.equal(isContourPreset("cushion"), false);
  assert.equal(isContourPreset(undefined), false);
});

test("every canonical silhouette flattens to 578 finite numbers", () => {
  for (const name of SHAPE_NAMES) {
    const values = parseContour(signatureShapePaths[name]);
    assert.equal(values.length, 2 + CONTOUR_SEGMENTS * NUMBERS_PER_SEGMENT, name);
    assert.ok(values.every(Number.isFinite), name);
  }
});

test("a path of the wrong length is rejected rather than silently resampled", () => {
  assert.throws(() => parseContour("M0 0C1 1 2 2 3 3Z"), /Contour must carry/);
  const numbers = signatureShapePaths["daisy-12"].match(CONTOUR_NUMBER) ?? [];
  assert.equal(numbers.length, 2 + CONTOUR_SEGMENTS * NUMBERS_PER_SEGMENT);
});

test("a flattened contour rebuilds into an exact 96-segment path", () => {
  const path = contourPath(parseContour(signatureShapePaths["daisy-12"]));
  const segment = /C-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+/g;
  assert.match(path, /^M-?[\d.]+ -?[\d.]+/);
  assert.equal(path.match(segment)?.length, CONTOUR_SEGMENTS);
  assert.ok(path.endsWith("Z"));
});

test("the sampled walk matches the segments it came from", () => {
  const values = parseContour(signatureShapePaths["petal-7"]);
  // One seed point, `perSegment` samples per segment, and the last sample is
  // dropped because it coincides with the next segment's seed.
  assert.equal(contourPoints(values, 5).length, CONTOUR_SEGMENTS * 5);
  assert.equal(contourPoints(values, 1).length, CONTOUR_SEGMENTS);
  assert.equal(contourPoints(values, 12).length, CONTOUR_SEGMENTS * 12);
});

test("blending is exact at both ends and moves at every step between", () => {
  for (const preset of CONTOUR_PRESETS) {
    assert.deepEqual(blendContour(preset, 0), parseContour(signatureShapePaths[preset]));
    assert.deepEqual(blendContour(preset, 100), parseContour(signatureShapePaths[CONTOUR_TARGET]));
  }
  let previous = contourPath(blendContour("daisy-12", 0));
  for (let amount = 1; amount <= 100; amount++) {
    const path = contourPath(blendContour("daisy-12", amount));
    assert.notEqual(path, previous, `no movement at ${amount}`);
    previous = path;
  }
});

test("blending clamps instead of extrapolating, and survives a bad amount", () => {
  assert.deepEqual(blendContour("daisy-12", -50), blendContour("daisy-12", 0));
  assert.deepEqual(blendContour("daisy-12", 500), blendContour("daisy-12", 100));
  assert.deepEqual(blendContour("daisy-12", Number.NaN), blendContour("daisy-12", 0));
});

test("every blended contour stays inside the authored viewBox", () => {
  for (const preset of CONTOUR_PRESETS) {
    for (const amount of [0, 20, 40, 60, 80, 100]) {
      for (const point of contourPoints(blendContour(preset, amount), 4)) {
        assert.ok(point.x >= -2 && point.x <= CONTOUR_VIEWBOX + 2, `${preset} ${amount} x=${point.x}`);
        assert.ok(point.y >= -2 && point.y <= CONTOUR_VIEWBOX + 2, `${preset} ${amount} y=${point.y}`);
      }
    }
  }
});

test("contourExtent is a fraction of the viewBox, never a raw radius", () => {
  /* The 3D flower scales its mesh by `diameter / 2 / extent`, so an extent in
   * viewBox units rather than fractions would make every sculpted contour fifty
   * times too large. A shape that fills the box must therefore report about 0.5,
   * not about 50. */
  for (const name of ["cushion", "daisy-12", "clover-soft", "pebble-soft"] as const) {
    const extent = contourExtent(parseContour(signatureShapePaths[name]));
    assert.ok(extent > 0.2 && extent < 0.6, `${name} extent ${extent}`);
  }
});

test("the exported SVG carries the same outline the preview draws", () => {
  const outline = { preset: "clover-soft" as const, amount: 30 };
  const document = contourSvgDocument({ ...outline, fill: "#F5D867" });
  assert.ok(document.includes(contourPath(blendContour(outline.preset, outline.amount))));
  assert.ok(document.includes('viewBox="0 0 100 100"'));
  assert.ok(document.includes('fill="#F5D867"'));
  assert.ok(document.startsWith("<svg"));
  assert.ok(document.trimEnd().endsWith("</svg>"));
});

test("the exported component is plain SVG with no registry dependency", () => {
  const source = contourReactComponent({ preset: "pebble-soft", amount: 12, fill: "#B6CAEB" });
  assert.ok(source.includes("export function ContourMark"));
  assert.ok(source.includes(contourPath(blendContour("pebble-soft", 12))));
  assert.ok(source.includes('fill="#B6CAEB"'));
  assert.ok(!source.includes("@/registry"));
  assert.ok(!source.includes("import "));
});

test("exported markup escapes anything a visitor could inject through the title", () => {
  const document = contourSvgDocument({
    preset: "daisy-12",
    amount: 0,
    fill: "#F5D867",
    title: '<script>alert("x")</script>',
  });
  assert.ok(!document.includes("<script>"));
  assert.ok(document.includes("&lt;script&gt;"));
  assert.ok(document.includes("&quot;"));
});

test("file names are stable and filesystem-safe", () => {
  const name = contourFileName({ preset: "daisy-12", amount: 33.6 });
  assert.equal(name, "000h-daisy-12-34.svg");
  assert.match(name, /^[a-z0-9.-]+$/);
  assert.equal(contourFileName({ preset: "daisy-12", amount: 33.6 }), name);
});

/* -------------------------------------------------------------- choreography */

test("scroll progress is monotone and stays within the chapter range", () => {
  const tops = [0, 1000, 2000, 3000, 4000, 5000];
  const height = 1000;
  assert.equal(scrollProgress(0, tops, height), 0);
  let previous = -1;
  for (let scroll = -500; scroll <= 7000; scroll += 13) {
    const progress = scrollProgress(scroll, tops, height);
    assert.ok(progress >= 0 && progress <= CHAPTERS.length - 1, `progress ${progress}`);
    assert.ok(progress >= previous - 1e-9, `non-monotone at ${scroll}`);
    previous = progress;
  }
});

test("the scroll helpers are total on degenerate input", () => {
  assert.equal(clamp01(-4), 0);
  assert.equal(clamp01(4), 1);
  assert.equal(smootherstep(0), 0);
  assert.equal(smootherstep(1), 1);
  assert.equal(smootherstep(0.5), 0.5);
  assert.ok(smootherstep(0.25) < 0.25);
  assert.ok(smootherstep(0.75) > 0.75);
  assert.equal(focusFromScroll(0, 0), 0);
  assert.equal(focusFromScroll(400, 800), 800);
  assert.equal(scrollProgress(0, [], 1000), 0);
  assert.equal(scrollProgress(0, [0], 0), 0);
  assert.equal(restingProgress(0), 0);
  assert.equal(restingProgress(-3), 0);
  assert.equal(restingProgress(99), CHAPTERS.length - 1);
  assert.ok(BOUNDARY_BAND > 0 && BOUNDARY_LEAD > 0 && BOUNDARY_LEAD < BOUNDARY_BAND);
});

test("weights are a partition of unity at every progress", () => {
  for (let progress = 0; progress <= CHAPTERS.length - 1; progress += 0.007) {
    const weights = chapterWeights(progress);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total} at ${progress}`);
    for (const weight of weights) assert.ok(weight >= 0 && weight <= 1, `${weight}`);
    // At most two chapters ever carry weight, which is what makes a boundary a
    // single blend rather than a crowd.
    assert.ok(weights.filter((weight) => weight > 0).length <= 2, `at ${progress}`);
  }
  assert.deepEqual(chapterWeights(-10), chapterWeights(0));
  assert.deepEqual(chapterWeights(99), chapterWeights(CHAPTERS.length - 1));
});

test("each chapter's resting pose is reproduced exactly", () => {
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    const frame = evaluate(restingProgress(chapter));
    const authored = CHAPTERS[chapter];
    assert.equal(frame.chapterIndex, chapter);
    assert.equal(frame.chapter, CHAPTER_IDS[chapter]);
    assert.equal(frame.weights[chapter], 1, `weights at ${chapter}`);
    assert.equal(frame.boundary, null, `boundary at ${chapter}`);
    assert.deepEqual(frame.pose.position, authored.camera.position, `camera at ${chapter}`);
    assert.deepEqual(frame.pose.target, authored.camera.target, `target at ${chapter}`);
    assert.equal(frame.pose.fov, authored.camera.fov, `fov at ${chapter}`);
    assert.equal(frame.backdrop, authored.backdrop, `backdrop at ${chapter}`);
    assert.deepEqual(frame.instrument.position, authored.instrument.position, `instrument ${chapter}`);
    assert.equal(frame.floor, authored.floor, `floor at ${chapter}`);
    assert.equal(frame.field, authored.field, `field at ${chapter}`);
    assert.equal(frame.spread, authored.spread, `spread at ${chapter}`);
    assert.equal(frame.aperture.opacity, authored.aperture.opacity, `aperture ${chapter}`);
  }
});

test("a boundary names its two chapters and lands between them", () => {
  const midpoint = evaluate(2.5);
  assert.ok(midpoint.boundary);
  assert.equal(midpoint.boundary?.from, CHAPTER_IDS[2]);
  assert.equal(midpoint.boundary?.to, CHAPTER_IDS[3]);
  assert.ok(midpoint.weights[2] > 0 && midpoint.weights[3] > 0);
  // The boundary offset is an arc, so both endpoint poses are still exact.
  const before = evaluate(2);
  const after = evaluate(3);
  assert.deepEqual(before.pose.target, CHAPTERS[2].camera.target);
  assert.deepEqual(after.pose.target, CHAPTERS[3].camera.target);
});

test("every part pose is finite, opaque-or-hidden and sanely scaled", () => {
  for (let progress = 0; progress <= CHAPTERS.length - 1; progress += 0.019) {
    const frame = evaluate(progress);
    for (const id of PART_IDS) {
      const pose = frame.parts[id];
      for (const value of [...pose.position, ...pose.rotation, pose.scale]) {
        assert.ok(Number.isFinite(value), `${id} at ${progress}`);
      }
      assert.ok(pose.opacity >= 0 && pose.opacity <= 1, `${id} opacity ${pose.opacity}`);
      assert.ok(pose.scale > 0 && pose.scale < 12, `${id} scale ${pose.scale}`);
    }
  }
});

test("the fade channels the scene consumes stay in range", () => {
  for (let progress = 0; progress <= CHAPTERS.length - 1; progress += 0.016) {
    const frame = evaluate(progress);
    for (const value of [
      frame.aperture.opacity,
      frame.floor,
      frame.field,
      frame.stage,
      frame.closing,
    ]) {
      assert.ok(value >= 0 && value <= 1, `${value} at ${progress}`);
    }
    assert.ok(frame.aperture.scale > 0, `aperture scale at ${progress}`);
    assert.ok(frame.spread >= 0, `spread at ${progress}`);
    assert.match(frame.backdrop, /^#[0-9A-Fa-f]{6}$/, `backdrop at ${progress}`);
    for (const value of [frame.lights.key, frame.lights.fill, frame.lights.rim]) {
      assert.ok(Number.isFinite(value) && value >= 0, `light at ${progress}`);
    }
  }
});

test("evaluation is pure: the same progress always yields the same frame", () => {
  for (const progress of [0, 0.31, 1.5, 2.999, 4.2, 5]) {
    assert.deepEqual(evaluate(progress), evaluate(progress));
  }
});

test("hero and motion retain the shared face while hero placement stays chapter-local", () => {
  const hero = evaluate(restingProgress(0));
  const motion = evaluate(restingProgress(2));
  for (const id of PART_IDS.filter((part) => part !== "drawers" && part !== "sourcePlate")) {
    assert.deepEqual(hero.parts[id], motion.parts[id], id);
  }
  for (const id of ["drawers", "sourcePlate"] as const) {
    assert.equal(hero.parts[id].opacity, motion.parts[id].opacity, `${id} stays visible`);
    assert.notDeepEqual(hero.parts[id].position, motion.parts[id].position, `${id} is staged for the artboard`);
  }
  assert.notDeepEqual(hero.instrument.position, motion.instrument.position);
  assert.notDeepEqual(hero.pose.position, motion.pose.position);
});

test("no two adjacent chapters share a backdrop", () => {
  /* A boundary is a colour event. Two identical backdrops in a row would make a
   * transition invisible and read as a stall. */
  for (let index = 1; index < CHAPTERS.length; index++) {
    assert.notEqual(CHAPTERS[index - 1].backdrop, CHAPTERS[index].backdrop, `chapters ${index - 1}/${index}`);
  }
});

test("each chapter hides what the next one needs, and shows what it needs itself", () => {
  for (const chapter of CHAPTERS) {
    for (const id of PART_IDS) {
      const declared = chapter.parts[id];
      const opacity = declared?.opacity ?? (declared ? 1 : 0);
      assert.ok(opacity === 0 || opacity === 1, `${chapter.id}/${id} opacity ${opacity}`);
    }
  }
});

/* ------------------------------------------------------------------ catalogue */

test("the bench is exactly the authored specimen list", () => {
  const ids = SPECIMEN_TRAYS.map((tray) => tray.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate specimen id");
  assert.equal(ids.length, SPECIMEN_COUNT);
  assert.ok(ids.includes(FEATURED_SPECIMEN));
  for (const tray of SPECIMEN_TRAYS) {
    assert.ok(tray.label.length > 0 && tray.category.length > 0, tray.id);
    assert.ok(tray.tray.every(Number.isFinite), tray.id);
  }
});

test("filters partition the bench without ever emptying it", () => {
  const reachable = new Set<string>();
  for (const filter of SPECIMEN_FILTERS) {
    const matched = SPECIMEN_TRAYS.filter((tray) => specimenMatchesFilter(tray.category, filter.id));
    assert.ok(matched.length > 0, `${filter.id} matches nothing`);
    for (const tray of matched) reachable.add(tray.id);
    assert.equal(specimenFilter(filter.id).id, filter.id);
  }
  for (const tray of SPECIMEN_TRAYS) {
    assert.ok(reachable.has(tray.id), `${tray.id} is unreachable from every filter`);
  }
});

test("an unknown filter falls back to the first rather than matching nothing", () => {
  assert.equal(specimenFilter("nope").id, SPECIMEN_FILTERS[0].id);
});

test("the instrument's parts agree with their own geometry", () => {
  const { panel, create, switch: gate, slider, drawers, flower, aperture } = INSTRUMENT;
  assert.ok(create.width < panel.width && create.height < panel.height);
  assert.ok(create.pressCompression > 0 && create.pressCompression < 0.2);
  assert.ok(gate.thumbTravel > 0 && gate.thumbTravel * 2 < gate.width);
  assert.ok(slider.travel > 0 && slider.travel < slider.track.width);
  assert.ok(slider.thumb < slider.track.height || slider.thumb < slider.track.width);
  assert.ok(drawers.count > 1 && drawers.plate.height > 0);
  assert.ok(flower.diameter > 0 && flower.depth > 0);
  assert.ok(aperture.inner[0] < aperture.outer[0] && aperture.inner[1] < aperture.outer[1]);
  assert.ok(INSTRUMENT.floor.y < 0 && INSTRUMENT.floor.size > 4);
  assert.ok(INSTRUMENT.home.position.every(Number.isFinite));
});

/* ---------------------------------------------------------------------- audio */

test("the cue manifest is complete and auditable", () => {
  assert.deepEqual(auditCues(), []);
  assert.equal(CUE_IDS.length, Object.keys(CUES).length);
  assert.ok(CUE_IDS.length > 0);
  for (const id of CUE_IDS) {
    assert.equal(CUES[id].voice.kind.length > 0, true, `${id} voice`);
  }
});

test("no cue can clip the bus on its own", () => {
  for (const id of CUE_IDS) {
    assert.ok(CUES[id].gain > 0 && CUES[id].gain <= VOICE_PEAK_BUDGET, `${id} gain ${CUES[id].gain}`);
    assert.ok(CUES[id].cooldown >= 0, `${id} cooldown`);
    assert.ok(CUES[id].intent.length > 8, `${id} needs a stated intent`);
  }
});

test("a cue only ever names real cues to release", () => {
  for (const id of CUE_IDS) {
    for (const other of CUES[id].replaces) {
      assert.ok(CUE_IDS.includes(other), `${id} -> ${other}`);
    }
  }
});

test("a cue that can repeat quickly retriggers instead of stacking", () => {
  /* `replaces` naming the cue's own id is a retrigger: the engine releases the
   * sounding voice before it builds the new one. Without it a fast gesture
   * stacks voices until the ceiling evicts the oldest, which reads as a stutter. */
  for (const id of CUE_IDS) {
    const cue = CUES[id];
    if (cue.cooldown <= 160) assert.ok(cue.replaces.includes(id), `${id} would stack`);
  }
});

test("voice limits and fade times are mobile-aware", () => {
  assert.ok(VOICE_LIMIT.mobile < VOICE_LIMIT.desktop);
  assert.ok(VOICE_LIMIT.mobile >= 4);
  assert.ok(FADE_RANGE.min > 0 && FADE_RANGE.min < FADE_RANGE.max);
});

/* ------------------------------------------------------- interpolation maths */

/* `evaluate()` is the only thing standing between an authored chapter and what
 * the visitor sees, and the failure mode that matters is silent: a chained-lerp
 * blend still returns every endpoint exactly, still stays inside the authored
 * range, and still passes a purity check — while pulling every midpoint toward
 * the origin. These assertions are on the *midpoints* for that reason.
 *
 * The camera pose is `blend + arc`, so every expected value below applies the
 * authored arc itself rather than trusting the implementation to. */

const arcAt = (boundary: number, t: number) => {
  const arc = BOUNDARY_ARCS[boundary] ?? { offset: [0, 0, 0] as const, fov: 0 };
  const weight = Math.sin(Math.PI * t);
  return { offset: arc.offset, fov: arc.fov, weight };
};

test("a boundary midpoint is the true weighted mean of its two chapters", () => {
  for (let boundary = 0; boundary < CHAPTERS.length - 1; boundary++) {
    const from = CHAPTERS[boundary];
    const to = CHAPTERS[boundary + 1];
    const { offset, weight } = arcAt(boundary, 0.5);
    const frame = evaluate(boundary + 0.5);
    const keys = ["position", "target"] as const;
    for (const key of keys) {
      for (let axis = 0; axis < 3; axis++) {
        const mid = (from.camera[key][axis] + to.camera[key][axis]) / 2;
        const expected = key === "position" ? mid + offset[axis] * weight : mid;
        assert.ok(
          Math.abs(frame.pose[key][axis] - expected) < 1e-9,
          `boundary ${boundary} camera.${key}[${axis}]: ${frame.pose[key][axis]} != ${expected}`,
        );
      }
    }
    /* The drift a chained lerp introduces scales with the magnitude of the
     * authored value, so assert the targets actually carry magnitude — otherwise
     * this test could pass on two origin-valued endpoints. */
    assert.ok(
      Math.hypot(...to.camera.target) > 0.1 || Math.hypot(...from.camera.target) > 0.1,
      `boundary ${boundary} has no target magnitude to drift`,
    );
    assert.ok(
      Math.abs(frame.lights.key - ((from.lights.key + to.lights.key) / 2) * LIGHT_RIG.key.intensity) < 1e-9,
      `boundary ${boundary} key light is not the midpoint`,
    );
    assert.ok(
      Math.abs(frame.aperture.opacity - (from.aperture.opacity + to.aperture.opacity) / 2) < 1e-9,
      `boundary ${boundary} aperture opacity is not the midpoint`,
    );
    assert.ok(
      Math.abs(frame.field - (from.field + to.field) / 2) < 1e-9,
      `boundary ${boundary} field is not the midpoint`,
    );
  }
});

test("a midpoint backdrop is the component-wise sRGB mean, never darker", () => {
  const channels = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  for (let boundary = 0; boundary < CHAPTERS.length - 1; boundary++) {
    const lower = channels(CHAPTERS[boundary].backdrop);
    const upper = channels(CHAPTERS[boundary + 1].backdrop);
    const actual = channels(evaluate(boundary + 0.5).backdrop);
    for (let axis = 0; axis < 3; axis++) {
      const expected = Math.round((lower[axis] + upper[axis]) / 2);
      assert.ok(
        Math.abs(actual[axis] - expected) <= 1,
        `boundary ${boundary} channel ${axis}: ${actual[axis]} != ${expected}`,
      );
    }
    /* A chained lerp lands on `0.25A + 0.5B` — always below the lighter endpoint
     * and never the mean. Assert the midpoint is not the broken value. */
    const broken = lower.map((value, axis) => Math.round(0.25 * value + 0.5 * upper[axis]));
    assert.notDeepEqual(actual, broken, `boundary ${boundary} backdrop is the chained-lerp value`);
  }
});

test("the chapter weights are a partition of unity at every progress", () => {
  /* The mathematical contract the blend depends on, asserted on its own so a
   * regression here is named rather than showing up as a mystery pose drift.
   * A tent partition degenerates whenever a chapter is skipped, so the count is
   * checked too: at most two chapters may carry weight at any instant. */
  for (let step = 0; step <= 100; step++) {
    const progress = (step / 100) * (CHAPTERS.length - 1);
    const weights = chapterWeights(progress);
    assert.equal(weights.length, CHAPTERS.length);
    assert.ok(
      Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9,
      `weights are not a partition of unity at ${progress}`,
    );
    assert.ok(
      weights.filter((weight) => weight > 1e-9).length <= 2,
      `more than two chapters carry weight at ${progress}`,
    );
    for (const weight of weights) assert.ok(weight >= 0, `negative weight at ${progress}`);
  }
});

test("equal endpoints interpolate to themselves at every fraction", () => {
  /* Two chapters that declare the same camera value must produce that value at
   * every blend fraction. A chained lerp returns half of it at the midpoint, so
   * this is the assertion that catches the original defect directly. */
  let checked = 0;
  for (let boundary = 0; boundary < CHAPTERS.length - 1; boundary++) {
    const from = CHAPTERS[boundary];
    const to = CHAPTERS[boundary + 1];
    if (from.camera.fov !== to.camera.fov) continue;
    for (const fraction of [0.25, 0.5, 0.75]) {
      const { fov, weight } = arcAt(boundary, fraction);
      const expected = from.camera.fov + fov * weight;
      const actual = evaluate(boundary + fraction).pose.fov;
      assert.ok(
        Math.abs(actual - expected) < 1e-9,
        `boundary ${boundary} fov ${actual} != ${expected} at ${fraction}`,
      );
      checked++;
    }
  }
  assert.ok(checked >= 12, `expected shared-fov boundaries to be exercised, checked ${checked}`);
});

test("a chapter that overrides an opacity blends toward that override, never past it", () => {
  /* Every chapter lists the panel, and the two that show the daylight bench set
   * it to zero. Blending between a shown and a hidden chapter must therefore move
   * monotonically between the two authored values and hit neither side's
   * midpoint-by-accident. */
  const catalogue = CHAPTERS.findIndex((chapter) => chapter.id === "catalogue");
  const hero = CHAPTERS.findIndex((chapter) => chapter.id === "hero");
  assert.ok(catalogue === hero + 1, "the hero/catalogue boundary moved");
  const atRest = evaluate(hero).parts.panel.opacity;
  const hidden = evaluate(catalogue).parts.panel.opacity;
  assert.equal(atRest, 1);
  assert.equal(hidden, 0);
  const midpoint = evaluate(hero + 0.5).parts.panel.opacity;
  assert.ok(Math.abs(midpoint - 0.5) < 1e-9, `panel midpoint opacity ${midpoint}`);
});

test("the plate summary is driven by the selection, not a fixed snippet", () => {
  /* R10. The plate used to draw `<Button>Create</Button>` for every selection —
   * measured at 0 px of change in the plate region while the bench showed Slider.
   * The tag must now be the specimen's own label, and the body a prop that
   * `registry/cojeev/ui/<id>.tsx` really declares. */
  const button = sourceSummaryLines("button");
  const slider = sourceSummaryLines("slider");

  assert.deepEqual(button, ["<Button>", "variant", "</Button>"]);
  assert.deepEqual(slider, ["<Slider>", "variant", "</Slider>"]);

  /* The whole point of the fix: two selections may not render the same plate. */
  assert.notDeepEqual(button, slider);
  assert.notEqual(button[0], slider[0]);

  /* The body is the first prop the registry ships, not copy invented here. */
  for (const [id, lines] of [
    ["button", button],
    ["slider", slider],
  ] as const) {
    const declared = SPECIMEN_API[id]?.[0]?.props?.[0]?.name;
    assert.ok(declared, `${id} declares no props to summarise`);
    assert.equal(lines[1], declared);
  }

  /* Every specimen on the bench must produce a distinct, renderable tag. A tag
   * with a space in it is not JSX, and a duplicate means the plate cannot tell
   * two selections apart. */
  const tags = SPECIMEN_TRAYS.map((specimen) => sourceSummaryLines(specimen.id)[0]);
  assert.equal(new Set(tags).size, tags.length, `duplicate plate tags: ${tags.join(", ")}`);
  for (const tag of tags) {
    assert.match(tag, /^<[A-Za-z][A-Za-z0-9]*>$/, `"${tag}" is not a usable tag`);
  }

  /* A multiword catalogue label must survive as one PascalCase identifier. */
  const pattern = sourceSummaryLines("pattern-background");
  assert.equal(pattern[0], "<PatternBackground>");
  assert.equal(pattern[2], "</PatternBackground>");

  /* An id the catalogue does not know still yields three usable lines rather
   * than throwing or emitting `undefined` into the texture. */
  const unknown = sourceSummaryLines("definitely-not-a-specimen");
  assert.equal(unknown[0], "<DefinitelyNotASpecimen>");
  for (const line of unknown) assert.ok(line.length > 0 && !line.includes("undefined"));
});
