import fs from "node:fs";

const root = "reference/expansion";
const filename = `${root}/coverage.json`;
const previous = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : { entries: [] };
const saved = new Map(previous.entries.map(entry => [entry.id, entry]));
const entries = [];
const catalogues = [];
for (const source of ["skiper", "remocn", "canvas", "reactbits"]) {
  const file = `${root}/${source}/inventory.json`;
  const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
  const items = inventory.entries ?? inventory.items;
  catalogues.push({ source, count: items.length, inventory: file, revision: inventory.sourceCommit ?? inventory.revision ?? inventory.provenance });
  for (const item of items) {
    const id = `${source}:${item.id.replace(new RegExp(`^${source}[:/]`), "")}`;
    entries.push({
      id, source, sourceId: item.id, sourceName: item.sourceName, sourceCategory: item.category,
      sourcePage: item.pageUrl, inspection: item.inspectionStatus,
      candidateOverlap: item.cojeevCandidate ?? item.existingOverlapCandidates ?? item.overlapCandidates ?? [],
      adaptation: saved.get(id)?.adaptation ?? {
        status: "pending", targets: [], coreBehavior: "", originalDesign: "",
        missing: ["Individual behavior review", "Cojeev implementation or overlap improvement", "Source comparison", "Runtime and visual checks"],
        evidence: [],
      },
    });
  }
}
if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error("Duplicate expansion source id");
const result = {
  schemaVersion: 1, updatedAt: new Date().toISOString(), catalogues,
  scope: "All canonical source entries; language/framework variants count once. Five Remocn helpers are included separately from components. Discovered is not implemented, source-inspected is not interaction-verified.",
  releaseBoundary: "Owner review first. No production build, publication, dependency installation, commit or push in this expansion pass.",
  totals: { entries: entries.length, completed: entries.filter(entry => entry.adaptation.status === "verified").length, inProgress: entries.filter(entry => entry.adaptation.status === "in-progress").length, pending: entries.filter(entry => entry.adaptation.status === "pending").length },
  entries,
};
fs.writeFileSync(filename, JSON.stringify(result, null, 2) + "\n");
console.log(result.totals);
