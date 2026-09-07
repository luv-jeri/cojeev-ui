import fs from "node:fs";

const interactions = JSON.parse(fs.readFileSync("artifacts/gate-interactions/results.json", "utf8"));
const lifecycle = JSON.parse(fs.readFileSync("artifacts/gate-lifecycle/results.json", "utf8"));
if (interactions.some(row => !["PASS", "ACCEPTED"].includes(row.verdict)) || lifecycle.some(row => row.verdict !== "PASS")) throw new Error("Cannot append passing evidence: a behavior check failed.");
const accepted = interactions.filter(row => row.verdict === "ACCEPTED").length;
const appendix = [
  "", "## Component interactions", "",
  `${interactions.length} measured component/variant/size/theme/motion scenarios. ${interactions.length - accepted} exact matches; ${accepted} accepted reduced-motion differences. Every side was independently loaded twice.`, "",
  "Accepted reason: the owner approved static bodies under reduced motion, as required by the reference's [MOTION.md section 7](reference/sahajiv-handoff-v4/docs/MOTION.md#7--what-never-moves). The reference still deforms on press. Only transform and SVG-path differences are accepted, and only when the candidate remains static and its initial body exactly matches. Other properties must match. See [the decision](PHASE-0-DECISION.md).", "",
  "| Component | Variant | Size | Theme | Motion preference | Verdict | Raw differences |",
  "| --- | --- | --- | --- | --- | --- | ---: |",
  ...interactions.map(row => `| ${row.id} | ${row.variant} | ${row.size} | ${row.mode} | ${row.motion} | ${row.verdict} | ${row.differences.length} |`),
  "", "## Hook lifecycle", "",
  "PASS: initial focus, rerender during focus and press, text replacement, variant/theme changes, StrictMode ref balance and unmount cleanup. The same diagnostic verifies that unrelated data-morph elements retain their transitions and that Card watermark masks paint.", "",
  "Raw behavior evidence is retained under artifacts/gate-interactions and artifacts/gate-lifecycle and uploaded by CI. Group-flow motion and other component behaviors are covered by their respective phase gates.", "",
].join("\n");
const current = fs.readFileSync("GATE.md", "utf8").split("\n## Component interactions")[0]
  .replace("Motion and keyboard coverage are separate and pending.", "Button and Card interaction and hook-lifecycle evidence follows below.");
fs.writeFileSync("GATE.md", current + appendix);
