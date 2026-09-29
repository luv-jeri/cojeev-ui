// The documentation runner already records `layout.error` and `preview.detail` in
// results.json, but its per-entry console line printed only their statuses. Reading a
// failure therefore meant downloading a 256 MB evidence artifact. These helpers put the
// recorded reason on the same line, for failures only, so a passing run stays as compact
// as before.

/** Console lines are read in job logs, so a single entry must not flood them. */
export const docsDetailLimit = 400;
const elision = " …elided… ";

/**
 * Keep a bounded excerpt of a failure message. The head carries the assertion, and the
 * tail carries the stage it reached — for a Playwright call log that last line is the
 * whole diagnosis — so an over-long message loses its middle rather than its end. The
 * result never exceeds `limit`; results.json keeps the untruncated text.
 *
 * This is length bounding and nothing more. It is not redaction and removes no category
 * of content: what falls in the middle depends entirely on the message, and a message at
 * or under the limit is printed exactly as given. Keeping unwanted content out of these
 * strings remains the job of whatever produces them.
 */
export function boundDetail(message, limit = docsDetailLimit) {
  const text = String(message ?? "").trim();
  if (text.length <= limit) return text;
  const keep = limit - elision.length;
  const head = Math.ceil(keep / 2);
  return text.slice(0, head) + elision + text.slice(text.length - (keep - head));
}

/**
 * The per-entry console summary. `id`, `layouts`, `preview`, `behavior` and `detail` keep
 * their existing names and meanings; `layoutFailures` and `previewDetail` are added only
 * when something actually failed.
 */
export function docsEntrySummary(record, limit = docsDetailLimit) {
  const summary = {
    id: record.id,
    layouts: record.layouts.map((l) => `${l.width}/${l.theme}:${l.status}`),
    preview: record.preview.status,
    behavior: record.behavior.status,
    detail: record.behavior.detail,
  };
  const layoutFailures = Object.fromEntries(
    record.layouts
      .filter((l) => l.error)
      .map((l) => [`${l.width}/${l.theme}`, boundDetail(l.error, limit)]),
  );
  if (Object.keys(layoutFailures).length) summary.layoutFailures = layoutFailures;
  if (record.preview.status !== "pass")
    summary.previewDetail = boundDetail(record.preview.detail, limit);
  if (record.runtimeErrors?.length) summary.runtimeErrors = boundDetail(runtimeErrorText(record.runtimeErrors), limit);
  if (record.firstAttempt) summary.attempt = 2;
  return summary;
}

const runtimeErrorText = (errors) => errors.map((e) => `${e.type} ${e.message}`).join(" | ");

/** Why an entry failed, one reason per failing part, unbounded; empty when it passed. */
export function docsFailureReasons(record) {
  const errors = record.runtimeErrors;
  return [
    ...record.layouts
      .filter((l) => l.status !== "pass")
      .map((l) => `layout ${l.width}/${l.theme} ${l.status}${l.error ? `: ${l.error}` : ""}`),
    ...(record.preview.status !== "pass" ? [`preview ${record.preview.status}: ${record.preview.detail}`] : []),
    ...(record.behavior.status === "failed" ? [`behavior failed: ${record.behavior.detail}`] : []),
    ...(errors.length ? [`runtime errors (${errors.length}): ${runtimeErrorText(errors)}`] : []),
  ];
}

/** The one verdict for an entry. The retry decision and the gate's exit status both use it. */
export function docsEntryFailed(record) {
  return docsFailureReasons(record).length > 0;
}

/**
 * Check an entry, and once more if it failed. The check must start from fresh browser
 * state each time. A real defect fails both attempts; a timing flake in a browser check
 * passes the second. `check` is called with no argument, then, only after a failure, with
 * that complete first record, which the second record must keep as `firstAttempt`, so a
 * flaky entry still shows in results.json and GATE.md instead of disappearing. The second
 * attempt decides the verdict.
 */
export async function checkWithOneRetry(check) {
  const first = await check();
  return docsEntryFailed(first) ? check(first) : first;
}
