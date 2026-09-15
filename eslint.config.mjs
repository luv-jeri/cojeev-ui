import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTypescript,
  // The coming-soon app is served by Vite, with ordinary document navigation.
  {
    files: ["apps/cojeev-coming-soon/**/*.{ts,tsx}"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // This hook owns mutable DOM/SVG nodes and forwards React object refs.
  // Those mutations occur in ref callbacks and effects, never during render.
  { files: ["registry/cojeev/motion/use-morph.ts", "registry/cojeev/motion/flow-press.ts"], rules: { "react-hooks/immutability": "off" } },
  { ignores: ["reference/**", "public/**", "out/**", "artifacts/**", "output/**", ".work/**", ".next/**", "next-env.d.ts"] },
];
