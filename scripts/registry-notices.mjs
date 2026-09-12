/**
 * The shadcn installer re-prints the TypeScript it copies and drops the comment
 * a file opens with, so a notice written there never reaches a consumer. (One
 * placed after a `"use client"` directive survives, and is left where it is.)
 * Collect the notices that are lost into a text file the base installs verbatim.
 */

// The run of comments a file opens with, before any statement or directive.
const opening = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*/;

export function leadingNotice(source) {
  const comment = source.match(opening)?.[0].trim();
  return comment && /copyright/i.test(comment) ? comment : undefined;
}

export function noticeText(licence, sources) {
  const notices = new Map();
  for (const [file, content] of sources) {
    const notice = leadingNotice(content);
    if (notice) notices.set(notice, [...(notices.get(notice) ?? []), file]);
  }
  return [
    "Cojeev UI notices",
    "",
    "Installed with every Cojeev entry. The installer rewrites the TypeScript it",
    "copies and does not keep the notice a file opens with, so this file repeats",
    "those notices verbatim.",
    "",
    licence.trim(),
    ...[...notices].flatMap(([notice, files]) => ["", "-".repeat(76), `Retained from ${files.join(", ")}:`, "", notice]),
    "",
  ].join("\n");
}
