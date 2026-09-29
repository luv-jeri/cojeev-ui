/** Pure selection rules for scripts/check-mobile-webkit.mjs, so they test without a browser. */

/** `ids` is the raw --ids value or undefined. Unknown ids are an error, never silently skipped. */
export function selectMobileCases({ ids, caseIds, registryNames }) {
  if (ids === undefined) return { run: [...caseIds] };
  const requested = String(ids).split(",");
  const known = new Set([...registryNames, ...caseIds]);
  if (requested.some(id => !known.has(id))) return { error: "--ids names an id that is neither a registry item nor a mobile case" };
  return { run: caseIds.filter(id => requested.includes(id)), requested };
}

/** With --ids and no matching case there is nothing to test: PASS with a note. Otherwise zero cases stay FAIL. */
export function mobileVerdict({ selection, records }) {
  if (selection.requested && !selection.run.length) {
    return { status: "PASS", note: `no mobile case for the selected ids: ${selection.requested.join(", ")}` };
  }
  return { status: records.length && records.every(record => record.status === "PASS") ? "PASS" : "FAIL" };
}
