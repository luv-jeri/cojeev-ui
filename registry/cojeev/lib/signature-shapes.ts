/** Original mathematical silhouettes inspired by the shared organic-shape moodboard.
 * Every path uses the same 96 cubic segments, so state changes can interpolate.
 */
type Point = readonly [number, number];
const tau = Math.PI * 2;
export function shapeContour(sample: (angle: number) => Point) {
  const points = Array.from({ length: 96 }, (_, i) => sample(i / 96 * tau));
  const f = (n: number) => Number(n.toFixed(3));
  let path = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length; i++) {
    const before = points[(i + 95) % 96], a = points[i], b = points[(i + 1) % 96], after = points[(i + 2) % 96];
    path += `C${f(a[0] + (b[0] - before[0]) / 6)} ${f(a[1] + (b[1] - before[1]) / 6)} ${f(b[0] - (after[0] - a[0]) / 6)} ${f(b[1] - (after[1] - a[1]) / 6)} ${f(b[0])} ${f(b[1])}`;
  }
  return path + "Z";
}
/* The hero flower is a round disc with seven grooves, not a cosine rosette:
 * measured off the reference frame its outline holds one radius right through to
 * the groove, and each groove is deep but narrow, so the petal count and the
 * groove width have to be set independently. `a + b*cos 7t` ties the two
 * together and cannot draw it — it is either a smooth pebble (small b) or a
 * seven-pointed star (large b). Here `grooveDepth7` is how far a groove cuts
 * and `grooveSigma7` how wide it is.
 * The distance is taken to the *nearest* petal centre by rounding the angle to
 * the closest multiple of the period. Folding a modulo instead does not work:
 * the modulo of a negative angle is negative in JavaScript, and `min` over the
 * seven wrapped distances collapses to zero at every angle, which subtracts the
 * groove everywhere and turns the flower inside out. */
const grooveBase7 = 46, grooveDepth7 = 20, grooveSigma7 = 0.44;
const petal7 = (angle: number) => {
  const period = tau / 7;
  const nearest = Math.round(angle / period) * period;
  const offset = angle - nearest;
  const groove = (value: number) =>
    grooveDepth7 * Math.exp(-(value * value) / (2 * grooveSigma7 * grooveSigma7));
  return grooveBase7 - groove(offset) - 0.06 * (groove(offset - period) + groove(offset + period));
};

const radial = (radius: (angle: number) => number, sx = 1, sy = 1) => shapeContour(t => [50 + radius(t) * Math.cos(t) * sx, 50 + radius(t) * Math.sin(t) * sy]);
export const signatureShapePaths = {
  "daisy-12": radial(t => 35 + 10 * Math.cos(12 * t)),
  "petal-7": radial(petal7),
  "aster-9": radial(t => 29 + 16 * Math.pow((1 + Math.cos(9 * t)) / 2, 1.6)),
  "sunburst-24": radial(t => 39 + 7 * Math.cos(24 * t)),
  "clover-soft": radial(t => 35 + 10 * Math.cos(4 * t)),
  "cloud-3": radial(t => 37 + 7 * Math.cos(3 * t - .8), 1, .82),
  "pebble-soft": radial(t => 38 + 5 * Math.cos(3 * t + .6) + 2 * Math.sin(5 * t)),
  "pebble-tall": radial(t => 38 + 5 * Math.cos(3 * t + .2) + 2 * Math.sin(2 * t), .68, 1),
  "ribbon-soft": radial(t => 29 + 15 * Math.cos(2 * t) + 2 * Math.sin(5 * t), 1, .82),
  "scalloped-square": radial(t => (36 / Math.pow(Math.pow(Math.abs(Math.cos(t)), 6) + Math.pow(Math.abs(Math.sin(t)), 6), 1 / 6)) + 2.2 * Math.cos(16 * t)),
  "cushion": radial(t => 37 - 5 * Math.cos(4 * t) + 1.5 * Math.cos(8 * t)),
  "seed-wing": radial(t => 34 + 8 * Math.cos(3 * t) + 4 * Math.sin(2 * t)),
} as const;
export type SignatureShapeName = keyof typeof signatureShapePaths;
