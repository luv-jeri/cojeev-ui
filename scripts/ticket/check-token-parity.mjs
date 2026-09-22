#!/usr/bin/env node
/**
 * Token-contract parity check.
 *
 * The supplied design system (reference/cojeev-handoff-v4/tokens/tokens.css) is the
 * byte-level baseline. Any candidate token that differs from it is a divergence that
 * every component inherits, so this is the cheapest meaningful acceptance check a
 * token ticket has.
 *
 * Exit 0 when the candidate declares the same values as the handoff (a candidate-only
 * addition such as --z-popover is reported, not failed).
 */

import { tokenDivergence } from "./lib.mjs";

const d = tokenDivergence();

console.log(
  `tokens     handoff=${d.handoffTokens} candidate=${d.candidateTokens} differing=${d.differing.length} missing=${d.missingFromCandidate.length} candidateOnly=${d.candidateOnly.length}`,
);
console.log(`palette    reconciled=${d.paletteReconciled}`);

if (d.candidateOnly.length) {
  console.log(`candidate-only (informational): ${d.candidateOnly.join(", ")}`);
}
if (d.missingFromCandidate.length) {
  console.log(`MISSING from candidate: ${d.missingFromCandidate.join(", ")}`);
}
for (const x of d.differing) {
  console.log(`DIVERGES    ${x.token}\n              handoff   = ${x.handoff}\n              candidate = ${x.candidate}`);
}

const failing = d.differing.length + d.missingFromCandidate.length;
if (failing) {
  console.log(`\nFAIL — ${failing} token(s) diverge from the supplied handoff.`);
  process.exit(1);
}
console.log("\nPASS — candidate token contract matches the supplied handoff.");
