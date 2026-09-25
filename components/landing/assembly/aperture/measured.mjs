/**
 * Scanline measurements of the visible band in artboards/01-hero.png.
 *
 * Every entry is [x, y] in artboard pixels at 1536x1024, read by
 * a scratch Python/NumPy read of the PNG in `.work/hero-aperture/` (the previous pass used
 * a lum > 70 threshold with a minimum run of 4, and the bottom edges below use
 * an explicit dark-run / luminance-drop read because shading defeats a single
 * threshold there).
 *
 * These are the ACCEPTANCE measurements: the profile is derived from them and
 * `verify.mjs` compares the rendered mesh back against them. They are kept in
 * one place so the derivation and the check cannot drift apart.
 *
 * Known limits, stated rather than hidden:
 *   - the heading copy and the lit reflective floor both sit above the same
 *     luminance threshold, so a naive bright-run scan is contaminated below
 *     y = 800 on the left and across the whole floor band. The base is
 *     therefore measured by its own two boundaries (HOLE_BOTTOM / BASE_LOWER)
 *     rather than by a band-width scan;
 *   - the right leg's OUTER edge is entirely off-frame, so only its inner edge
 *     is measurable. Its outer edge is authored in `generate-profile.mjs`;
 *   - the crown of the arch is above the frame and cannot be measured at all.
 */
export const LEFT_OUTER = [
  [959, 0], [950, 8], [941, 16], [933, 24], [924, 32], [895, 64], [871, 96], [850, 128], [832, 160], [818, 192],
  [807, 224], [799, 256], [792, 288], [787, 320], [784, 352], [781, 384],
  [779, 416], [777, 448], [775, 480], [773, 512], [771, 544], [769, 576],
  [767, 608], [765, 640], [763, 672], [761, 704], [759, 736], [756, 768],
  [754, 800], [750, 832],
];

export const LEFT_INNER = [
  [1131, 0], [1122, 8], [1113, 16], [1104, 24], [1096, 32], [1070, 64], [1057, 96], [1052, 128], [1044, 160],
  [1017, 192], [963, 224], [924, 256], [905, 288], [895, 320], [893, 352],
  [893, 384], [896, 416], [907, 448], [911, 544], [896, 576], [883, 608],
  [877, 640], [879, 672], [887, 704], [904, 736], [931, 768], [981, 800],
];

export const RIGHT_INNER = [
  [1528, 416], [1518, 448], [1507, 480], [1496, 512], [1486, 544],
  [1475, 576], [1464, 608], [1451, 640], [1437, 672], [1421, 704],
  [1403, 736], [1382, 768], [1356, 800], [1319, 832],
];

/** band width measured horizontally across the band, per scanline */
export const LEFT_WIDTH = [
  [172, 0], [172, 8], [172, 16], [171, 24], [172, 32], [175, 64], [186, 96], [202, 128], [212, 160],
  [199, 192], [156, 224], [125, 256], [113, 288], [108, 320], [109, 352],
  [112, 384], [117, 416], [130, 448], [126, 512], [124, 544], [127, 576],
  [116, 608], [112, 640], [116, 672], [126, 704], [145, 736], [175, 768],
  [227, 800],
];

/**
 * The lower cream base, measured below the contaminated scanline.
 *
 * HOLE_BOTTOM is where the niche ends: the lowest y whose luminance is still
 * under 45. The niche is empty space and is dark; the shadowed inner wall above
 * it is beige at roughly lum 110, so this is a clean edge. It descends to a
 * deepest point near x = 1250 — the bottom of the opening — and rises again on
 * both sides, which is what makes the opening a horseshoe rather than a slot.
 *
 * BASE_LOWER is where the band ends and the lit floor begins: the steepest
 * 8-row luminance drop in each column, 56-76 counts at every column sampled
 * from x = 760 to x = 1536. The drop is unambiguous — the band's face is ~205
 * and the floor beneath it ~130 — so the edge reads to about a pixel.
 *
 * Together these are the base's two boundaries; the band is the strip between
 * them, exactly as LEFT_OUTER/LEFT_INNER bound the left leg higher up.
 */
export const HOLE_BOTTOM = [
  [880, 674], [900, 728], [920, 756], [940, 774], [960, 788], [980, 798],
  [1000, 806], [1020, 812], [1040, 817], [1060, 821], [1080, 826], [1100, 830],
  [1120, 834], [1140, 837], [1160, 841], [1180, 845], [1200, 849], [1220, 852],
  [1240, 854], [1260, 854], [1280, 849], [1300, 842], [1319, 832],
];

export const BASE_LOWER = [
  [760, 823], [780, 826], [800, 829], [820, 832], [840, 836], [860, 839],
  [880, 842], [900, 845], [920, 848], [940, 852], [960, 855], [980, 858],
  [1000, 862], [1020, 865], [1040, 869], [1060, 873], [1080, 877], [1100, 881],
  [1120, 885], [1140, 889], [1160, 893], [1180, 897], [1200, 901], [1220, 906],
  [1240, 910], [1260, 915], [1280, 919], [1300, 923], [1320, 928], [1340, 933],
  [1360, 938], [1380, 942], [1400, 947], [1420, 952], [1440, 957], [1460, 962],
  [1480, 966], [1500, 972], [1520, 976], [1536, 980],
];

/** linear interpolation of an [x, y] table as x(y) */
export function atY(points, y) {
  const sorted = [...points].sort((a, b) => a[1] - b[1]);
  if (y <= sorted[0][1]) return sorted[0][0];
  if (y >= sorted[sorted.length - 1][1]) return sorted[sorted.length - 1][0];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (y >= sorted[i][1] && y <= sorted[i + 1][1]) {
      const t = (y - sorted[i][1]) / (sorted[i + 1][1] - sorted[i][1]);
      return sorted[i][0] + (sorted[i + 1][0] - sorted[i][0]) * t;
    }
  }
  return sorted[sorted.length - 1][0];
}
