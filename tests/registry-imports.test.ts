import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { rewriteInstalledImports } from "../scripts/registry-imports.mjs";

test("relocated registry helpers retain working static and lazy UI imports", () => {
  const file = "registry/cojeev/lib/preview-backgrounds.tsx";
  const installed = rewriteInstalledImports(file, fs.readFileSync(file, "utf8"));
  for (const name of ["pigment-field", "depth-background", "ambient-background"]) {
    assert(installed.includes(`import("@/components/ui/${name}")`), `${name} resolves from the installed helper, not nonexistent lib/ui`);
  }
  assert(installed.includes('from "@/components/ui/pattern-background"'));
  assert(installed.includes('from "@/lib/cojeev-motion/choreography"'));
  assert(!installed.includes('../ui/'));
});

test("rewrites side-effect imports and preserves external packages", () => {
  const installed = rewriteInstalledImports("registry/cojeev/ui/example.tsx", `import '../motion/flow';\nimport { cx } from '../lib/utils';\nconst menu = import( './dropdown-menu' );\nconst engine = import('motion/react');`);
  assert.equal(installed, `import '@/lib/cojeev-motion/flow';\nimport { cx } from '@/lib/utils';\nconst menu = import( '@/components/ui/dropdown-menu' );\nconst engine = import('motion/react');`);
});
