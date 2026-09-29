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
