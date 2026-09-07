import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTypescript,
  // This hook owns mutable DOM/SVG nodes and forwards React object refs.
  // Those mutations occur in ref callbacks and effects, never during render.
  { files: ["registry/sahajiv/motion/use-morph.ts", "registry/sahajiv/motion/flow-press.ts"], rules: { "react-hooks/immutability": "off" } },
  { ignores: ["reference/**", "public/**", "out/**", "artifacts/**", "output/**", ".work/**", ".next/**", "next-env.d.ts"] },
];
