import type { Pin } from "./contracts";

/** A pin as kept in the draft: `label` is display-only and never leaves the device. */
export type DraftPin = Pin & { label?: string };

export type PinKind =
  | "Button" | "Link" | "Heading" | "Paragraph" | "Image" | "List item"
  | "Input" | "Section" | "Code" | "Table" | "Element";

const BY_TAG: Record<string, PinKind> = {
  button: "Button", a: "Link", p: "Paragraph", li: "List item",
  img: "Image", picture: "Image", svg: "Image",
  input: "Input", textarea: "Input", select: "Input",
  pre: "Code", code: "Code",
};
for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) BY_TAG[tag] = "Heading";
for (const tag of ["section", "article", "main", "aside", "nav", "header", "footer"]) BY_TAG[tag] = "Section";
for (const tag of ["table", "thead", "tbody", "tr", "td", "th"]) BY_TAG[tag] = "Table";

export function kindFromTag(tag: string, role?: string | null): PinKind {
  if (role === "button") return "Button";
  return BY_TAG[tag.toLowerCase()] ?? "Element";
}

export const pinChipText = (pin: DraftPin, n: number) => `${n} · ${pin.label ?? kindFromTag(pin.tag)}`;

/** The only draft-to-submitted conversion for pins: exactly the four contract keys. */
export const submittedPins = (pins: DraftPin[]): Pin[] => pins.map(({ path, tag, x, y }) => ({ path, tag, x, y }));

const FIELD = "input,textarea,select,[contenteditable]";
// Never read: a field's value or typed content, private regions, code that is not page text.
const SKIP = `${FIELD},[data-private],script,style`;
const MAX_TEXT = 60;

/** Collapse whitespace, then keep the first 60 characters (trimmed) plus an ellipsis when longer. */
export function capLabelText(raw: string): string {
  const chars = Array.from(raw.replace(/\s+/g, " ").trim());
  return chars.length > MAX_TEXT ? `${chars.slice(0, MAX_TEXT).join("").trimEnd()}…` : chars.join("");
}

/** Visible text of a subtree, skipping every field, private, script and style subtree (root included). */
function visibleText(root: Node): string {
  let text = "";
  const walk = (node: Node) => {
    if (text.length > 2000) return;
    if (node.nodeType === 3) { text += `${node.nodeValue ?? ""} `; return; }
    if (node.nodeType !== 1 || (node as Element).matches(SKIP)) return;
    for (const child of Array.from(node.childNodes)) walk(child);
  };
  walk(root);
  return text;
}

function labelText(element: Element): string {
  const aria = element.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const ids = element.getAttribute("aria-labelledby")?.split(/\s+/).filter(Boolean) ?? [];
  const named = ids.map(id => { const target = element.ownerDocument.getElementById(id); return target ? visibleText(target) : ""; }).join(" ").trim();
  if (named) return named;
  const tag = element.tagName.toLowerCase();
  if (tag === "img") return element.getAttribute("alt")?.trim() ?? "";
  if (element.matches(FIELD)) {
    // A field itself yields only its label or placeholder, never its value or content.
    const labels = Array.from((element as HTMLInputElement).labels ?? []).map(visibleText).join(" ").trim();
    return labels || element.getAttribute("placeholder")?.trim() || "";
  }
  if (element.closest("[data-private]")) return "";
  return visibleText(element);
}

/** `<Kind> “<text>”`, or `<Kind>` when there is no text. Display only; never sent. */
export function pinLabel(element: Element): string {
  const kind = kindFromTag(element.tagName, element.getAttribute("role"));
  const text = capLabelText(labelText(element));
  return text ? `${kind} “${text}”` : kind;
}

export function resolvePin(path: string): Element | null {
  try { return document.querySelector(path); } catch { return null; }
}

/** PN1 after a pin, PN2 after an unpin. `n` is the pin's number when it happened. */
export const pinAnnouncement = (action: "pinned" | "removed", n: number, pin?: DraftPin) =>
  action === "removed" ? `Removed pin ${n}` : `Pinned ${pin ? pinChipText(pin, n) : n}`;
