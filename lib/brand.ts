/** An open seed: an asymmetric zero with a hand-shaped inner contour. */
export const brandViewBox = "0 0 96 96";
export const brandOutline =
  "M58 9C77 10 87 27 86 45C84 66 63 87 43 86C25 85 10 71 10 52C10 33 36 7 58 9Z";
export const brandApertures = [
  "M56 30C47 27 35 36 31 47C26 60 32 70 40 69C52 68 64 54 65 43C66 37 62 32 56 30Z",
];
export const brandPath = [brandOutline, ...brandApertures].join("");
